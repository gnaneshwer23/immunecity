import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { requireNeonAuth } from "@/integrations/neon/auth-middleware";
import {
  COMMUNITY_WRITE_TABLES,
  decideReferenceStorage,
  displayNameFromIdentity,
  membershipRoleForNewMember,
  parseCitationFields,
  planEntityLinks,
  planModeration,
  POST_KINDS,
  requireMember,
  validateCommentBody,
  validatePostDraft,
  validateReportReason,
  type CitationLookup,
} from "@/lib/community/rules";
import { getDb } from "@/lib/db.server";
import {
  communityComments,
  communityEntityLinks,
  communityMemberships,
  communityModerationActions,
  communityPosts,
  communityProfiles,
  communityReferences,
  communityReports,
  communityTopics,
} from "@/lib/db/schema.server";
import { loadAccountPowers } from "@/lib/access/roles.server";
import { checkRecord } from "@/lib/evidenceCheck";
import { byId } from "@/lib/immune/engine";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function iso(v: Date | string | null | undefined): string {
  if (!v) return "";
  return v instanceof Date ? v.toISOString() : String(v);
}

function missingCommunity(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  if (code === "42P01") return true;
  const msg = err instanceof Error ? err.message : "";
  return /does not exist/i.test(msg) && /community_/i.test(msg);
}

function mapWriteError(err: unknown): Error {
  if (missingCommunity(err)) return new Error("Community storage is not available yet.");
  const code = (err as { code?: string })?.code;
  if (code === "23505") return new Error("That community record already exists.");
  if (code === "23503") return new Error("That topic or post is no longer available.");
  if (code === "23514") return new Error("That value is not allowed.");
  return new Error("Community request failed.");
}

function knownConceptIds(): Set<string> {
  return new Set(Object.keys(byId));
}

async function ensureProfile(userId: string, displayName: string) {
  const db = getDb();
  await db.insert(communityProfiles).values({ userId, displayName }).onConflictDoNothing();
}

export const listCommunityTopics = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = getDb();
    const topics = await db.select().from(communityTopics).orderBy(asc(communityTopics.sortOrder), asc(communityTopics.title));
    const counts = await db
      .select({ topicId: communityPosts.topicId, n: sql<number>`count(*)::int` })
      .from(communityPosts)
      .where(eq(communityPosts.status, "visible"))
      .groupBy(communityPosts.topicId);
    const byTopic = new Map(counts.map((c) => [c.topicId, Number(c.n) || 0]));
    return {
      available: true as const,
      topics: topics.map((t) => ({
        slug: t.slug,
        title: t.title,
        description: t.description,
        visiblePosts: byTopic.get(t.id) ?? 0,
      })),
    };
  } catch (err) {
    if (missingCommunity(err)) return { available: false as const, topics: [] };
    console.error("community_topics_failed", (err as { code?: string })?.code ?? "error");
    return { available: false as const, topics: [] };
  }
});

export const getCommunityTopic = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const db = getDb();
      const [topic] = await db.select().from(communityTopics).where(eq(communityTopics.slug, data.slug)).limit(1);
      if (!topic) return { available: true as const, topic: null, posts: [] };
      const posts = await db
        .select({
          id: communityPosts.id,
          kind: communityPosts.kind,
          title: communityPosts.title,
          createdAt: communityPosts.createdAt,
          authorName: communityProfiles.displayName,
        })
        .from(communityPosts)
        .leftJoin(communityProfiles, eq(communityPosts.authorId, communityProfiles.userId))
        .where(and(eq(communityPosts.topicId, topic.id), eq(communityPosts.status, "visible")))
        .orderBy(desc(communityPosts.createdAt))
        .limit(50);
      const ids = posts.map((p) => p.id);
      const refs = ids.length
        ? await db
            .select({
              postId: communityReferences.postId,
              verificationStatus: communityReferences.verificationStatus,
            })
            .from(communityReferences)
            .where(inArray(communityReferences.postId, ids))
        : [];
      const links = ids.length
        ? await db
            .select({ postId: communityEntityLinks.postId, conceptId: communityEntityLinks.conceptId })
            .from(communityEntityLinks)
            .where(inArray(communityEntityLinks.postId, ids))
        : [];
      const refByPost = new Map(refs.map((r) => [r.postId, r.verificationStatus]));
      const conceptsByPost = new Map<string, string[]>();
      for (const link of links) {
        const list = conceptsByPost.get(link.postId) ?? [];
        list.push(link.conceptId);
        conceptsByPost.set(link.postId, list);
      }
      return {
        available: true as const,
        topic: { slug: topic.slug, title: topic.title, description: topic.description },
        posts: posts.map((p) => ({
          id: p.id,
          kind: p.kind,
          title: p.title,
          createdAt: iso(p.createdAt),
          authorName: p.authorName ?? "Member",
          referenceStatus: refByPost.get(p.id) ?? null,
          conceptIds: conceptsByPost.get(p.id) ?? [],
        })),
      };
    } catch (err) {
      if (missingCommunity(err)) return { available: false as const, topic: null, posts: [] };
      console.error("community_topic_failed", (err as { code?: string })?.code ?? "error");
      return { available: false as const, topic: null, posts: [] };
    }
  });

export const getCommunityPost = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ postId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const db = getDb();
      const [row] = await db
        .select({
          id: communityPosts.id,
          topicId: communityPosts.topicId,
          kind: communityPosts.kind,
          title: communityPosts.title,
          body: communityPosts.body,
          createdAt: communityPosts.createdAt,
          authorName: communityProfiles.displayName,
          topicSlug: communityTopics.slug,
          topicTitle: communityTopics.title,
        })
        .from(communityPosts)
        .leftJoin(communityProfiles, eq(communityPosts.authorId, communityProfiles.userId))
        .innerJoin(communityTopics, eq(communityPosts.topicId, communityTopics.id))
        .where(and(eq(communityPosts.id, data.postId), eq(communityPosts.status, "visible")))
        .limit(1);
      if (!row) return { available: true as const, post: null };
      const comments = await db
        .select({
          id: communityComments.id,
          parentId: communityComments.parentId,
          body: communityComments.body,
          createdAt: communityComments.createdAt,
          authorName: communityProfiles.displayName,
        })
        .from(communityComments)
        .leftJoin(communityProfiles, eq(communityComments.authorId, communityProfiles.userId))
        .where(and(eq(communityComments.postId, row.id), eq(communityComments.status, "visible")))
        .orderBy(asc(communityComments.createdAt));
      const references = await db.select().from(communityReferences).where(eq(communityReferences.postId, row.id));
      const links = await db.select().from(communityEntityLinks).where(eq(communityEntityLinks.postId, row.id));
      return {
        available: true as const,
        post: {
          id: row.id,
          kind: row.kind,
          title: row.title,
          body: row.body,
          createdAt: iso(row.createdAt),
          authorName: row.authorName ?? "Member",
          topicSlug: row.topicSlug,
          topicTitle: row.topicTitle,
          comments: comments.map((c) => ({
            id: c.id,
            parentId: c.parentId,
            body: c.body,
            createdAt: iso(c.createdAt),
            authorName: c.authorName ?? "Member",
          })),
          references: references.map((r) => ({
            pmid: r.pmid,
            doi: r.doi,
            title: r.title,
            journal: r.journal,
            year: r.year,
            verificationStatus: r.verificationStatus,
            verificationDetail: r.verificationDetail,
          })),
          conceptIds: links.map((l) => l.conceptId),
        },
      };
    } catch (err) {
      if (missingCommunity(err)) return { available: false as const, post: null };
      console.error("community_post_failed", (err as { code?: string })?.code ?? "error");
      return { available: false as const, post: null };
    }
  });

export const listConceptDiscussions = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ conceptId: z.string().min(1).max(40) }).parse(d))
  .handler(async ({ data }) => {
    if (!byId[data.conceptId]) return { posts: [] as { id: string; title: string; topicSlug: string }[] };
    try {
      const db = getDb();
      const rows = await db
        .select({
          id: communityPosts.id,
          title: communityPosts.title,
          topicSlug: communityTopics.slug,
        })
        .from(communityEntityLinks)
        .innerJoin(communityPosts, eq(communityEntityLinks.postId, communityPosts.id))
        .innerJoin(communityTopics, eq(communityPosts.topicId, communityTopics.id))
        .where(and(eq(communityEntityLinks.conceptId, data.conceptId), eq(communityPosts.status, "visible")))
        .orderBy(desc(communityPosts.createdAt))
        .limit(5);
      return { posts: rows };
    } catch (err) {
      console.error("community_concept_lookup_failed", (err as { code?: string })?.code ?? "error");
      return { posts: [] as { id: string; title: string; topicSlug: string }[] };
    }
  });

const createPostInput = z.object({
  topicSlug: z.string().min(1).max(80),
  kind: z.enum(POST_KINDS),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(8000),
  pmid: z.string().max(40).optional(),
  doi: z.string().max(240).optional(),
  conceptIds: z.array(z.string().max(40)).max(8).optional(),
});

export const createCommunityPost = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => createPostInput.parse(d))
  .handler(async ({ data, context }) => {
    const member = requireMember(context.userId);
    if (!member.ok) throw new Error(member.error);
    if (!UUID_RE.test(member.userId)) throw new Error("Sign in to post. Visitors can read.");
    const draft = validatePostDraft(data);
    if (!draft.ok) throw new Error(draft.error);
    const citation = parseCitationFields({ pmid: data.pmid, doi: data.doi });
    if (!citation.ok) throw new Error(citation.error);
    const links = planEntityLinks(data.conceptIds ?? [], knownConceptIds());
    if (!links.ok) throw new Error(links.error);
    // Touch the allow-list so a future write cannot drift without a test noticing the export.
    if (!COMMUNITY_WRITE_TABLES.includes("community_posts")) throw new Error("Community request failed.");

    let stored: ReturnType<typeof decideReferenceStorage> | null = null;
    if (citation.pmid || citation.doi) {
      try {
        const lookup = await checkRecord({
          id: "community",
          node_name: draft.title.slice(0, 120),
          source_ref: null,
          pmid: citation.pmid,
          doi: citation.doi,
        });
        const shaped: CitationLookup = {
          status: lookup.status,
          detail: lookup.detail as CitationLookup["detail"],
        };
        stored = decideReferenceStorage(citation, shaped);
      } catch {
        stored = decideReferenceStorage(citation, { failed: true });
      }
    }

    const db = getDb();
    try {
      const [topic] = await db.select().from(communityTopics).where(eq(communityTopics.slug, data.topicSlug)).limit(1);
      if (!topic) throw new Error("Topic not found.");
      const displayName = displayNameFromIdentity(
        typeof context.claims?.name === "string" ? context.claims.name : null,
        context.email,
      );
      const postId = await db.transaction(async (tx) => {
        await tx.insert(communityProfiles).values({ userId: member.userId, displayName }).onConflictDoNothing();
        const [post] = await tx
          .insert(communityPosts)
          .values({
            topicId: topic.id,
            authorId: member.userId,
            kind: draft.kind,
            title: draft.title,
            body: draft.body,
            status: "visible",
          })
          .returning({ id: communityPosts.id });
        await tx
          .insert(communityMemberships)
          .values({ topicId: topic.id, userId: member.userId, membershipRole: membershipRoleForNewMember() })
          .onConflictDoNothing({ target: [communityMemberships.topicId, communityMemberships.userId] });
        if (stored && post) {
          await tx.insert(communityReferences).values({
            postId: post.id,
            pmid: stored.pmid,
            doi: stored.doi,
            title: stored.title,
            journal: stored.journal,
            year: stored.year,
            verificationStatus: stored.verificationStatus,
            verificationDetail: stored.verificationDetail,
          });
        }
        if (post && links.ids.length) {
          await tx.insert(communityEntityLinks).values(links.ids.map((conceptId) => ({ postId: post.id, conceptId })));
        }
        return post?.id ?? null;
      });
      if (!postId) throw new Error("Community request failed.");
      return { id: postId };
    } catch (err) {
      if (err instanceof Error && /Topic not found|Community request failed/.test(err.message)) throw err;
      throw mapWriteError(err);
    }
  });

export const createCommunityComment = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z.object({
      postId: z.string().uuid(),
      parentId: z.string().uuid().nullable().optional(),
      body: z.string().min(1).max(4000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const member = requireMember(context.userId);
    if (!member.ok) throw new Error(member.error);
    if (!UUID_RE.test(member.userId)) throw new Error("Sign in to reply. Visitors can read.");
    const body = validateCommentBody(data.body);
    if (!body.ok) throw new Error(body.error);
    const db = getDb();
    try {
      const [post] = await db
        .select({ id: communityPosts.id, topicId: communityPosts.topicId })
        .from(communityPosts)
        .where(and(eq(communityPosts.id, data.postId), eq(communityPosts.status, "visible")))
        .limit(1);
      if (!post) throw new Error("Post not found.");
      if (data.parentId) {
        const [parent] = await db.select().from(communityComments).where(eq(communityComments.id, data.parentId)).limit(1);
        if (!parent || parent.postId !== post.id || parent.status !== "visible") {
          throw new Error("Reply target is not on this post.");
        }
      }
      const displayName = displayNameFromIdentity(
        typeof context.claims?.name === "string" ? context.claims.name : null,
        context.email,
      );
      const commentId = await db.transaction(async (tx) => {
        await tx.insert(communityProfiles).values({ userId: member.userId, displayName }).onConflictDoNothing();
        const [comment] = await tx
          .insert(communityComments)
          .values({
            postId: post.id,
            parentId: data.parentId ?? null,
            authorId: member.userId,
            body: body.body,
            status: "visible",
          })
          .returning({ id: communityComments.id });
        await tx
          .insert(communityMemberships)
          .values({ topicId: post.topicId, userId: member.userId, membershipRole: membershipRoleForNewMember() })
          .onConflictDoNothing({ target: [communityMemberships.topicId, communityMemberships.userId] });
        return comment?.id ?? null;
      });
      if (!commentId) throw new Error("Community request failed.");
      return { id: commentId };
    } catch (err) {
      if (err instanceof Error && /Post not found|Reply target|Community request failed/.test(err.message)) throw err;
      throw mapWriteError(err);
    }
  });

export const reportCommunityTarget = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z.object({
      targetType: z.enum(["post", "comment"]),
      targetId: z.string().uuid(),
      reason: z.string().min(1).max(1000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const member = requireMember(context.userId);
    if (!member.ok) throw new Error(member.error);
    if (!UUID_RE.test(member.userId)) throw new Error("Sign in to report. Visitors can read.");
    const reason = validateReportReason(data.reason);
    if (!reason.ok) throw new Error(reason.error);
    const db = getDb();
    try {
      if (data.targetType === "post") {
        const [post] = await db.select({ id: communityPosts.id }).from(communityPosts).where(and(eq(communityPosts.id, data.targetId), eq(communityPosts.status, "visible"))).limit(1);
        if (!post) throw new Error("Post not found.");
      } else {
        const [comment] = await db.select({ id: communityComments.id }).from(communityComments).where(and(eq(communityComments.id, data.targetId), eq(communityComments.status, "visible"))).limit(1);
        if (!comment) throw new Error("Comment not found.");
      }
      await ensureProfile(member.userId, displayNameFromIdentity(
        typeof context.claims?.name === "string" ? context.claims.name : null,
        context.email,
      ));
      await db.insert(communityReports).values({
        targetType: data.targetType,
        targetId: data.targetId,
        reporterId: member.userId,
        reason: reason.reason,
        status: "open",
      });
      return { ok: true as const };
    } catch (err) {
      if (err instanceof Error && /not found/.test(err.message)) throw err;
      throw mapWriteError(err);
    }
  });

export const followCommunityTopic = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const member = requireMember(context.userId);
    if (!member.ok) throw new Error(member.error);
    if (!UUID_RE.test(member.userId)) throw new Error("Sign in to join a topic. Visitors can read.");
    const db = getDb();
    try {
      const [topic] = await db.select().from(communityTopics).where(eq(communityTopics.slug, data.slug)).limit(1);
      if (!topic) throw new Error("Topic not found.");
      await ensureProfile(member.userId, displayNameFromIdentity(
        typeof context.claims?.name === "string" ? context.claims.name : null,
        context.email,
      ));
      await db
        .insert(communityMemberships)
        .values({ topicId: topic.id, userId: member.userId, membershipRole: membershipRoleForNewMember() })
        .onConflictDoNothing({ target: [communityMemberships.topicId, communityMemberships.userId] });
      return { role: membershipRoleForNewMember() };
    } catch (err) {
      if (err instanceof Error && err.message === "Topic not found.") throw err;
      throw mapWriteError(err);
    }
  });

export const getCommunityModerationQueue = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .handler(async ({ context }) => {
    const powers = await loadAccountPowers(context.userId);
    if (!powers.moderator) {
      throw new Error("Only moderators can hide or restore posts. Signup does not grant moderator.");
    }
    const db = getDb();
    try {
      const reports = await db
        .select({
          id: communityReports.id,
          targetType: communityReports.targetType,
          targetId: communityReports.targetId,
          reason: communityReports.reason,
          createdAt: communityReports.createdAt,
        })
        .from(communityReports)
        .where(eq(communityReports.status, "open"))
        .orderBy(asc(communityReports.createdAt))
        .limit(100);
      const hiddenPosts = await db
        .select({ id: communityPosts.id, title: communityPosts.title })
        .from(communityPosts)
        .where(eq(communityPosts.status, "hidden"))
        .orderBy(desc(communityPosts.updatedAt))
        .limit(50);
      return {
        reports: reports.map((r) => ({ ...r, createdAt: iso(r.createdAt) })),
        hiddenPosts,
      };
    } catch (err) {
      throw mapWriteError(err);
    }
  });

export const moderateCommunityTarget = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z.object({
      targetType: z.enum(["post", "comment"]),
      targetId: z.string().uuid(),
      action: z.enum(["hide", "restore"]),
      reason: z.string().min(1).max(500),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const powers = await loadAccountPowers(context.userId);
    const plan = planModeration({ actorCanModerate: powers.moderator, action: data.action, reason: data.reason });
    if (!plan.ok) throw new Error(plan.error);
    const db = getDb();
    try {
      await db.transaction(async (tx) => {
        if (data.targetType === "post") {
          const [post] = await tx.select({ id: communityPosts.id }).from(communityPosts).where(eq(communityPosts.id, data.targetId)).limit(1);
          if (!post) throw new Error("Post not found.");
          await tx
            .update(communityPosts)
            .set({ status: plan.action === "hide" ? "hidden" : "visible", updatedAt: new Date() })
            .where(eq(communityPosts.id, data.targetId));
        } else {
          const [comment] = await tx.select({ id: communityComments.id }).from(communityComments).where(eq(communityComments.id, data.targetId)).limit(1);
          if (!comment) throw new Error("Comment not found.");
          await tx
            .update(communityComments)
            .set({ status: plan.action === "hide" ? "hidden" : "visible", updatedAt: new Date() })
            .where(eq(communityComments.id, data.targetId));
        }
        await tx.insert(communityModerationActions).values({
          targetType: data.targetType,
          targetId: data.targetId,
          moderatorId: context.userId,
          action: plan.action,
          reason: plan.reason,
        });
        await tx
          .update(communityReports)
          .set({ status: "resolved" })
          .where(and(
            eq(communityReports.targetType, data.targetType),
            eq(communityReports.targetId, data.targetId),
            eq(communityReports.status, "open"),
          ));
      });
      return { ok: true as const };
    } catch (err) {
      if (err instanceof Error && /not found/.test(err.message)) throw err;
      throw mapWriteError(err);
    }
  });

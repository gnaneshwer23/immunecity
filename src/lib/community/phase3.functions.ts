import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { requireNeonAuth } from "@/integrations/neon/auth-middleware";
import { loadAccountPowers } from "@/lib/access/roles.server";
import { matchApprovedPaper } from "@/lib/community/approvedPaper.server";
import {
  appealDecisionRecipient,
  displayNameFromIdentity,
  membershipRoleForNewMember,
  paperStatusForClub,
  planAppeal,
  planAppealDecision,
  planJournalClub,
  planPostEdit,
  planPostFollow,
  planSaveTarget,
  profileViewFor,
  replyNotificationRecipients,
  requireMember,
  validateProfileDraft,
  type CommunityProfileFields,
} from "@/lib/community/rules";
import { getDb } from "@/lib/db.server";
import {
  communityAppeals,
  communityComments,
  communityJournalClubs,
  communityMemberships,
  communityModerationActions,
  communityNotifications,
  communityPostFollows,
  communityPostRevisions,
  communityPosts,
  communityProfiles,
  communityReferences,
  communitySaves,
  communityTopics,
} from "@/lib/db/schema.server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function iso(v: Date | string | null | undefined): string {
  if (!v) return "";
  return v instanceof Date ? v.toISOString() : String(v);
}

function missingCommunity(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  if (code === "42P01" || code === "42703") return true;
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

function memberId(userId: string | null | undefined): string {
  const member = requireMember(userId);
  if (!member.ok) throw new Error(member.error);
  if (!UUID_RE.test(member.userId)) throw new Error("Sign in to continue. Visitors can read.");
  return member.userId;
}

function nameFrom(context: { claims?: { name?: unknown }; email?: string | null }): string {
  return displayNameFromIdentity(typeof context.claims?.name === "string" ? context.claims.name : null, context.email);
}

function asProfile(row: {
  userId: string;
  displayName: string;
  bio: string | null;
  interests: string[] | null;
  affiliation: string | null;
  visibility: string;
  credential: string | null;
  notificationsPaused: boolean;
}): CommunityProfileFields {
  return {
    userId: row.userId,
    displayName: row.displayName,
    bio: row.bio,
    interests: row.interests ?? [],
    affiliation: row.affiliation,
    visibility: row.visibility === "members" ? "members" : "public",
    credential: row.credential,
    credentialStatus: "unverified",
    notificationsPaused: Boolean(row.notificationsPaused),
  };
}

async function topicSlugSet() {
  const db = getDb();
  const topics = await db.select({ slug: communityTopics.slug, title: communityTopics.title }).from(communityTopics).orderBy(asc(communityTopics.sortOrder));
  return topics;
}

/** In-app only. A missing table must not undo the reply that already saved. */
export async function notifyFollowersOfReply(input: {
  postId: string;
  postTitle: string;
  commentAuthorId: string;
  postAuthorId: string;
}) {
  try {
    const db = getDb();
    const follows = await db
      .select({ userId: communityPostFollows.userId })
      .from(communityPostFollows)
      .where(eq(communityPostFollows.postId, input.postId));
    const ids = follows.map((row) => row.userId);
    const recipientSeed = [...new Set([...ids, input.postAuthorId].filter(Boolean))];
    if (!recipientSeed.length) return;
    const profiles = await db
      .select({ userId: communityProfiles.userId, paused: communityProfiles.notificationsPaused })
      .from(communityProfiles)
      .where(inArray(communityProfiles.userId, recipientSeed));
    const paused = new Set(profiles.filter((row) => row.paused).map((row) => row.userId));
    const recipients = replyNotificationRecipients({
      followerIds: ids,
      commentAuthorId: input.commentAuthorId,
      postAuthorId: input.postAuthorId,
      pausedUserIds: paused,
    });
    if (!recipients.length) return;
    const title = input.postTitle.replace(/\s+/g, " ").trim().slice(0, 140) || "a post";
    await db.insert(communityNotifications).values(
      recipients.map((userId) => ({
        userId,
        kind: "post_reply" as const,
        body: `New reply on “${title}”.`,
        href: `/community/post/${input.postId}`,
      })),
    );
  } catch (err) {
    if (!missingCommunity(err)) console.error("community_notify_failed", (err as { code?: string })?.code ?? "error");
  }
}

async function notifyAppealDecision(appellantId: string, body: string) {
  try {
    const db = getDb();
    const [profile] = await db
      .select({ paused: communityProfiles.notificationsPaused })
      .from(communityProfiles)
      .where(eq(communityProfiles.userId, appellantId))
      .limit(1);
    const recipient = appealDecisionRecipient({ appellantId, paused: Boolean(profile?.paused) });
    if (!recipient) return;
    await db.insert(communityNotifications).values({
      userId: recipient,
      kind: "appeal_decision",
      body,
      href: "/community/profile",
    });
  } catch (err) {
    if (!missingCommunity(err)) console.error("community_appeal_notify_failed", (err as { code?: string })?.code ?? "error");
  }
}

export const getPublicCommunityProfile = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const db = getDb();
      const [row] = await db.select().from(communityProfiles).where(eq(communityProfiles.userId, data.userId)).limit(1);
      if (!row) return { available: true as const, access: "missing" as const };
      const view = profileViewFor(asProfile(row), { signedIn: false, userId: null });
      if (view.access === "restricted") return { available: true as const, access: "restricted" as const };
      const topics = await topicSlugSet();
      const titles = new Map(topics.map((topic) => [topic.slug, topic.title]));
      return {
        available: true as const,
        access: "full" as const,
        profile: view.profile,
        interestTitles: view.profile.interests.map((slug) => titles.get(slug) ?? slug),
      };
    } catch (err) {
      if (missingCommunity(err)) return { available: false as const, access: "missing" as const };
      console.error("community_profile_failed", (err as { code?: string })?.code ?? "error");
      return { available: false as const, access: "missing" as const };
    }
  });

export const getMemberCommunityProfile = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const viewerId = memberId(context.userId);
    const db = getDb();
    try {
      const [row] = await db.select().from(communityProfiles).where(eq(communityProfiles.userId, data.userId)).limit(1);
      if (!row) return { available: true as const, access: "missing" as const };
      const view = profileViewFor(asProfile(row), { signedIn: true, userId: viewerId });
      if (view.access === "restricted") return { available: true as const, access: "restricted" as const };
      const topics = await topicSlugSet();
      const titles = new Map(topics.map((topic) => [topic.slug, topic.title]));
      return {
        available: true as const,
        access: "full" as const,
        owner: view.owner,
        profile: view.profile,
        interestTitles: view.profile.interests.map((slug) => titles.get(slug) ?? slug),
      };
    } catch (err) {
      throw mapWriteError(err);
    }
  });

export const getMyCommunityProfile = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .handler(async ({ context }) => {
    const userId = memberId(context.userId);
    const db = getDb();
    try {
      const topics = await topicSlugSet();
      const [row] = await db.select().from(communityProfiles).where(eq(communityProfiles.userId, userId)).limit(1);
      const profile = row
        ? asProfile(row)
        : {
            userId,
            displayName: nameFrom(context),
            bio: null,
            interests: [] as string[],
            affiliation: null,
            visibility: "public" as const,
            credential: null,
            credentialStatus: "unverified" as const,
            notificationsPaused: false,
          };
      const hiddenPosts = await db
        .select({ id: communityPosts.id, title: communityPosts.title, body: communityPosts.body })
        .from(communityPosts)
        .where(and(eq(communityPosts.authorId, userId), eq(communityPosts.status, "hidden")))
        .orderBy(desc(communityPosts.updatedAt))
        .limit(20);
      const hiddenComments = await db
        .select({ id: communityComments.id, postId: communityComments.postId, body: communityComments.body })
        .from(communityComments)
        .where(and(eq(communityComments.authorId, userId), eq(communityComments.status, "hidden")))
        .orderBy(desc(communityComments.updatedAt))
        .limit(20);
      const targetIds = [...hiddenPosts.map((post) => post.id), ...hiddenComments.map((comment) => comment.id)];
      const openAppeals = targetIds.length
        ? await db
            .select({ targetId: communityAppeals.targetId, targetType: communityAppeals.targetType })
            .from(communityAppeals)
            .where(and(eq(communityAppeals.appellantId, userId), eq(communityAppeals.status, "open"), inArray(communityAppeals.targetId, targetIds)))
        : [];
      const openKeys = new Set(openAppeals.map((appeal) => `${appeal.targetType}:${appeal.targetId}`));
      return {
        profile,
        topics,
        hiddenPosts: hiddenPosts.map((post) => ({ ...post, appealOpen: openKeys.has(`post:${post.id}`) })),
        hiddenComments: hiddenComments.map((comment) => ({ ...comment, appealOpen: openKeys.has(`comment:${comment.id}`) })),
      };
    } catch (err) {
      throw mapWriteError(err);
    }
  });

const profileInput = z.object({
  displayName: z.string().max(80),
  bio: z.string().max(500),
  interests: z.array(z.string().max(80)).max(12),
  affiliation: z.string().max(120),
  visibility: z.enum(["public", "members"]),
  credential: z.string().max(160),
  notificationsPaused: z.boolean(),
});

export const updateMyCommunityProfile = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => profileInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = memberId(context.userId);
    const db = getDb();
    try {
      const topics = await topicSlugSet();
      const draft = validateProfileDraft({ ...data, topicSlugs: new Set(topics.map((topic) => topic.slug)) });
      if (!draft.ok) throw new Error(draft.error);
      await db
        .insert(communityProfiles)
        .values({
          userId,
          displayName: draft.displayName,
          bio: draft.bio,
          interests: draft.interests,
          affiliation: draft.affiliation,
          visibility: draft.visibility,
          credential: draft.credential,
          credentialStatus: "unverified",
          notificationsPaused: draft.notificationsPaused,
        })
        .onConflictDoUpdate({
          target: communityProfiles.userId,
          set: {
            displayName: draft.displayName,
            bio: draft.bio,
            interests: draft.interests,
            affiliation: draft.affiliation,
            visibility: draft.visibility,
            credential: draft.credential,
            credentialStatus: "unverified",
            notificationsPaused: draft.notificationsPaused,
            updatedAt: new Date(),
          },
        });
      return { ok: true as const, credentialStatus: "unverified" as const };
    } catch (err) {
      if (err instanceof Error && /Display name|Bio|Affiliation|Credential|Visibility|Interest|Notification|medical|patient/.test(err.message)) throw err;
      throw mapWriteError(err);
    }
  });

export const editCommunityPost = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => z.object({ postId: z.string().uuid(), body: z.string().max(8000) }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = memberId(context.userId);
    const db = getDb();
    try {
      const [post] = await db
        .select({ id: communityPosts.id, authorId: communityPosts.authorId, body: communityPosts.body, status: communityPosts.status })
        .from(communityPosts)
        .where(eq(communityPosts.id, data.postId))
        .limit(1);
      if (!post) throw new Error("Post not found.");
      const plan = planPostEdit({
        actorId: userId,
        authorId: post.authorId,
        currentBody: post.body,
        nextBody: data.body,
        status: post.status,
      });
      if (!plan.ok) throw new Error(plan.error);
      await db.transaction(async (tx) => {
        await tx.insert(communityPostRevisions).values({
          postId: post.id,
          editorId: userId,
          previousBody: plan.previousBody,
        });
        await tx
          .update(communityPosts)
          .set({ body: plan.nextBody, status: plan.status, updatedAt: new Date() })
          .where(eq(communityPosts.id, post.id));
      });
      return { ok: true as const, status: plan.status };
    } catch (err) {
      if (err instanceof Error && /Post not found|Only the author|Body|Personal medical|patient|unchanged|not editable/.test(err.message)) throw err;
      throw mapWriteError(err);
    }
  });

export const getCommunityEngagement = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => z.object({ postId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = memberId(context.userId);
    const db = getDb();
    try {
      const [savedPost] = await db
        .select({ id: communitySaves.id })
        .from(communitySaves)
        .where(and(eq(communitySaves.userId, userId), eq(communitySaves.targetType, "post"), eq(communitySaves.targetId, data.postId)))
        .limit(1);
      const [follow] = await db
        .select({ id: communityPostFollows.id })
        .from(communityPostFollows)
        .where(and(eq(communityPostFollows.userId, userId), eq(communityPostFollows.postId, data.postId)))
        .limit(1);
      const savedComments = await db
        .select({ targetId: communitySaves.targetId })
        .from(communitySaves)
        .innerJoin(communityComments, eq(communitySaves.targetId, communityComments.id))
        .where(and(eq(communitySaves.userId, userId), eq(communitySaves.targetType, "comment"), eq(communityComments.postId, data.postId)));
      return {
        savedPost: Boolean(savedPost),
        followingPost: Boolean(follow),
        savedCommentIds: savedComments.map((row) => row.targetId),
      };
    } catch (err) {
      if (missingCommunity(err)) return { savedPost: false, followingPost: false, savedCommentIds: [] as string[] };
      throw mapWriteError(err);
    }
  });

export const toggleCommunitySave = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => z.object({ targetType: z.enum(["post", "comment"]), targetId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = memberId(context.userId);
    const plan = planSaveTarget({ signedIn: true, targetType: data.targetType });
    if (!plan.ok) throw new Error(plan.error);
    const db = getDb();
    try {
      if (plan.targetType === "post") {
        const [post] = await db.select({ id: communityPosts.id }).from(communityPosts).where(and(eq(communityPosts.id, data.targetId), eq(communityPosts.status, "visible"))).limit(1);
        if (!post) throw new Error("Post not found.");
      } else {
        const [comment] = await db.select({ id: communityComments.id }).from(communityComments).where(and(eq(communityComments.id, data.targetId), eq(communityComments.status, "visible"))).limit(1);
        if (!comment) throw new Error("Comment not found.");
      }
      const [existing] = await db
        .select({ id: communitySaves.id })
        .from(communitySaves)
        .where(and(eq(communitySaves.userId, userId), eq(communitySaves.targetType, plan.targetType), eq(communitySaves.targetId, data.targetId)))
        .limit(1);
      if (existing) {
        await db.delete(communitySaves).where(eq(communitySaves.id, existing.id));
        return { saved: false as const };
      }
      await db.insert(communityProfiles).values({ userId, displayName: nameFrom(context) }).onConflictDoNothing();
      await db.insert(communitySaves).values({ userId, targetType: plan.targetType, targetId: data.targetId });
      return { saved: true as const };
    } catch (err) {
      if (err instanceof Error && /not found|Sign in|Save a/.test(err.message)) throw err;
      throw mapWriteError(err);
    }
  });

export const toggleCommunityPostFollow = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => z.object({ postId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = memberId(context.userId);
    const plan = planPostFollow({ signedIn: true });
    if (!plan.ok) throw new Error(plan.error);
    const db = getDb();
    try {
      const [post] = await db
        .select({ id: communityPosts.id, topicId: communityPosts.topicId })
        .from(communityPosts)
        .where(and(eq(communityPosts.id, data.postId), eq(communityPosts.status, "visible")))
        .limit(1);
      if (!post) throw new Error("Post not found.");
      const [existing] = await db
        .select({ id: communityPostFollows.id })
        .from(communityPostFollows)
        .where(and(eq(communityPostFollows.postId, post.id), eq(communityPostFollows.userId, userId)))
        .limit(1);
      if (existing) {
        await db.delete(communityPostFollows).where(eq(communityPostFollows.id, existing.id));
        return { following: false as const, role: membershipRoleForNewMember() };
      }
      await db.insert(communityProfiles).values({ userId, displayName: nameFrom(context) }).onConflictDoNothing();
      await db.insert(communityPostFollows).values({ postId: post.id, userId });
      await db
        .insert(communityMemberships)
        .values({ topicId: post.topicId, userId, membershipRole: membershipRoleForNewMember() })
        .onConflictDoNothing({ target: [communityMemberships.topicId, communityMemberships.userId] });
      return { following: true as const, role: membershipRoleForNewMember() };
    } catch (err) {
      if (err instanceof Error && /not found|Sign in/.test(err.message)) throw err;
      throw mapWriteError(err);
    }
  });

export const listCommunitySaves = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .handler(async ({ context }) => {
    const userId = memberId(context.userId);
    const db = getDb();
    try {
      const saves = await db.select().from(communitySaves).where(eq(communitySaves.userId, userId)).orderBy(desc(communitySaves.createdAt)).limit(100);
      const postIds = saves.filter((row) => row.targetType === "post").map((row) => row.targetId);
      const commentIds = saves.filter((row) => row.targetType === "comment").map((row) => row.targetId);
      const posts = postIds.length
        ? await db.select({ id: communityPosts.id, title: communityPosts.title, status: communityPosts.status }).from(communityPosts).where(inArray(communityPosts.id, postIds))
        : [];
      const comments = commentIds.length
        ? await db
            .select({ id: communityComments.id, body: communityComments.body, status: communityComments.status, postId: communityComments.postId, postStatus: communityPosts.status })
            .from(communityComments)
            .innerJoin(communityPosts, eq(communityComments.postId, communityPosts.id))
            .where(inArray(communityComments.id, commentIds))
        : [];
      const postById = new Map(posts.map((post) => [post.id, post]));
      const commentById = new Map(comments.map((comment) => [comment.id, comment]));
      return {
        items: saves.map((save) => {
          if (save.targetType === "post") {
            const post = postById.get(save.targetId);
            const hidden = !post || post.status !== "visible";
            return { id: save.id, kind: "post" as const, title: hidden ? "Hidden post" : post.title, href: hidden ? null : `/community/post/${post.id}` };
          }
          const comment = commentById.get(save.targetId);
          const hidden = !comment || comment.status !== "visible" || comment.postStatus !== "visible";
          return {
            id: save.id,
            kind: "comment" as const,
            title: hidden ? "Hidden reply" : comment.body.slice(0, 140),
            href: hidden ? null : `/community/post/${comment.postId}`,
          };
        }),
      };
    } catch (err) {
      throw mapWriteError(err);
    }
  });

export const appealCommunityTarget = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => z.object({
    targetType: z.enum(["post", "comment"]),
    targetId: z.string().uuid(),
    reason: z.string().max(500),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = memberId(context.userId);
    const db = getDb();
    try {
      let status: "visible" | "hidden" | "missing" = "missing";
      if (data.targetType === "post") {
        const [post] = await db.select({ status: communityPosts.status }).from(communityPosts).where(eq(communityPosts.id, data.targetId)).limit(1);
        status = post ? (post.status === "hidden" ? "hidden" : "visible") : "missing";
      } else {
        const [comment] = await db.select({ status: communityComments.status }).from(communityComments).where(eq(communityComments.id, data.targetId)).limit(1);
        status = comment ? (comment.status === "hidden" ? "hidden" : "visible") : "missing";
      }
      const [open] = await db
        .select({ id: communityAppeals.id })
        .from(communityAppeals)
        .where(and(
          eq(communityAppeals.appellantId, userId),
          eq(communityAppeals.targetType, data.targetType),
          eq(communityAppeals.targetId, data.targetId),
          eq(communityAppeals.status, "open"),
        ))
        .limit(1);
      const plan = planAppeal({ signedIn: true, targetStatus: status, reason: data.reason, openAppealExists: Boolean(open) });
      if (!plan.ok) throw new Error(plan.error);
      await db.insert(communityProfiles).values({ userId, displayName: nameFrom(context) }).onConflictDoNothing();
      await db.insert(communityAppeals).values({
        targetType: data.targetType,
        targetId: data.targetId,
        appellantId: userId,
        reason: plan.reason,
        status: "open",
      });
      return { ok: true as const };
    } catch (err) {
      if (err instanceof Error && /Sign in|not found|hidden|Appeal|open appeal/.test(err.message)) throw err;
      throw mapWriteError(err);
    }
  });

export const listOpenCommunityAppeals = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .handler(async ({ context }) => {
    const powers = await loadAccountPowers(context.userId);
    if (!powers.moderator) throw new Error("Only moderators can decide an appeal.");
    const db = getDb();
    try {
      const appeals = await db
        .select({
          id: communityAppeals.id,
          targetType: communityAppeals.targetType,
          targetId: communityAppeals.targetId,
          reason: communityAppeals.reason,
          createdAt: communityAppeals.createdAt,
        })
        .from(communityAppeals)
        .where(eq(communityAppeals.status, "open"))
        .orderBy(asc(communityAppeals.createdAt))
        .limit(100);
      return { appeals: appeals.map((appeal) => ({ ...appeal, createdAt: iso(appeal.createdAt) })) };
    } catch (err) {
      if (missingCommunity(err)) return { appeals: [] as { id: string; targetType: string; targetId: string; reason: string; createdAt: string }[] };
      throw mapWriteError(err);
    }
  });

export const decideCommunityAppeal = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => z.object({
    appealId: z.string().uuid(),
    decision: z.enum(["uphold", "restore"]),
    reason: z.string().max(500),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const powers = await loadAccountPowers(context.userId);
    const db = getDb();
    try {
      const [appeal] = await db.select().from(communityAppeals).where(eq(communityAppeals.id, data.appealId)).limit(1);
      if (!appeal) throw new Error("Appeal not found.");
      const plan = planAppealDecision({
        actorCanModerate: powers.moderator,
        decision: data.decision,
        reason: data.reason,
        appealOpen: appeal.status === "open",
      });
      if (!plan.ok) throw new Error(plan.error);
      await db.transaction(async (tx) => {
        if (plan.decision === "restore") {
          if (appeal.targetType === "post") {
            await tx.update(communityPosts).set({ status: "visible", updatedAt: new Date() }).where(eq(communityPosts.id, appeal.targetId));
          } else {
            await tx.update(communityComments).set({ status: "visible", updatedAt: new Date() }).where(eq(communityComments.id, appeal.targetId));
          }
          await tx.insert(communityModerationActions).values({
            targetType: appeal.targetType,
            targetId: appeal.targetId,
            moderatorId: context.userId,
            action: "restore",
            reason: plan.reason,
          });
        }
        await tx
          .update(communityAppeals)
          .set({
            status: plan.decision === "restore" ? "restored" : "upheld",
            decisionReason: plan.reason,
            decidedBy: context.userId,
            decidedAt: new Date(),
          })
          .where(eq(communityAppeals.id, appeal.id));
      });
      await notifyAppealDecision(
        appeal.appellantId,
        plan.decision === "restore"
          ? "A moderator restored the item you appealed."
          : "A moderator upheld the decision to keep the item hidden.",
      );
      return { ok: true as const, status: plan.nextStatus };
    } catch (err) {
      if (err instanceof Error && /Appeal|moderator|Decision|reason|already decided/.test(err.message)) throw err;
      throw mapWriteError(err);
    }
  });

export const listCommunityNotifications = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .handler(async ({ context }) => {
    const userId = memberId(context.userId);
    const db = getDb();
    try {
      const rows = await db
        .select()
        .from(communityNotifications)
        .where(eq(communityNotifications.userId, userId))
        .orderBy(desc(communityNotifications.createdAt))
        .limit(50);
      const unread = rows.filter((row) => !row.readAt).length;
      return {
        unread,
        items: rows.map((row) => ({
          id: row.id,
          kind: row.kind,
          body: row.body,
          href: row.href,
          read: Boolean(row.readAt),
          createdAt: iso(row.createdAt),
        })),
      };
    } catch (err) {
      if (missingCommunity(err)) return { unread: 0, items: [] as { id: string; kind: string; body: string; href: string | null; read: boolean; createdAt: string }[] };
      throw mapWriteError(err);
    }
  });

export const getCommunityUnreadCount = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .handler(async ({ context }) => {
    const userId = memberId(context.userId);
    try {
      const db = getDb();
      const [row] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(communityNotifications)
        .where(and(eq(communityNotifications.userId, userId), isNull(communityNotifications.readAt)));
      return { count: Number(row?.n ?? 0) };
    } catch (err) {
      if (missingCommunity(err)) return { count: 0 };
      console.error("community_unread_failed", (err as { code?: string })?.code ?? "error");
      return { count: 0 };
    }
  });

export const markCommunityNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = memberId(context.userId);
    const db = getDb();
    try {
      if (data.id) {
        await db
          .update(communityNotifications)
          .set({ readAt: new Date() })
          .where(and(eq(communityNotifications.id, data.id), eq(communityNotifications.userId, userId), isNull(communityNotifications.readAt)));
      } else {
        await db
          .update(communityNotifications)
          .set({ readAt: new Date() })
          .where(and(eq(communityNotifications.userId, userId), isNull(communityNotifications.readAt)));
      }
      return { ok: true as const };
    } catch (err) {
      throw mapWriteError(err);
    }
  });

export const listCommunityJournalClubs = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().max(80).optional() }).parse(d ?? {}))
  .handler(async ({ data }) => {
    try {
      const db = getDb();
      const rows = await db
        .select({
          id: communityJournalClubs.id,
          title: communityJournalClubs.title,
          scheduledAt: communityJournalClubs.scheduledAt,
          paperStatus: communityJournalClubs.paperStatus,
          postId: communityJournalClubs.postId,
          topicSlug: communityTopics.slug,
          topicTitle: communityTopics.title,
          facilitatorName: communityProfiles.displayName,
        })
        .from(communityJournalClubs)
        .innerJoin(communityPosts, eq(communityJournalClubs.postId, communityPosts.id))
        .innerJoin(communityTopics, eq(communityJournalClubs.topicId, communityTopics.id))
        .leftJoin(communityProfiles, eq(communityJournalClubs.facilitatorId, communityProfiles.userId))
        .where(and(eq(communityPosts.status, "visible"), data.slug ? eq(communityTopics.slug, data.slug) : undefined))
        .orderBy(asc(communityJournalClubs.scheduledAt))
        .limit(50);
      return {
        available: true as const,
        clubs: rows.map((row) => ({
          id: row.id,
          title: row.title,
          scheduledAt: iso(row.scheduledAt),
          paperStatus: row.paperStatus,
          postId: row.postId,
          topicSlug: row.topicSlug,
          topicTitle: row.topicTitle,
          facilitatorName: row.facilitatorName ?? "Moderator",
        })),
      };
    } catch (err) {
      if (missingCommunity(err)) return { available: false as const, clubs: [] };
      console.error("community_clubs_failed", (err as { code?: string })?.code ?? "error");
      return { available: false as const, clubs: [] };
    }
  });

export const createCommunityJournalClub = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => z.object({
    topicSlug: z.string().min(1).max(80),
    title: z.string().max(180),
    agenda: z.string().max(4000),
    scheduledAt: z.string().max(40),
    facilitatorId: z.string().uuid().optional(),
    pmid: z.string().max(40).optional(),
    doi: z.string().max(240).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = memberId(context.userId);
    const powers = await loadAccountPowers(userId);
    const requestedId = data.facilitatorId?.trim() || null;
    const requestedCanModerate = !requestedId || requestedId === userId
      ? powers.moderator
      : (await loadAccountPowers(requestedId)).moderator;
    const plan = planJournalClub({
      actorCanModerate: powers.moderator,
      actorId: userId,
      title: data.title,
      agenda: data.agenda,
      scheduledAt: data.scheduledAt,
      requestedFacilitatorId: requestedId,
      requestedFacilitatorCanModerate: requestedCanModerate,
      pmid: data.pmid,
      doi: data.doi,
    });
    if (!plan.ok) throw new Error(plan.error);
    let approvedMatch = false;
    if (plan.pmid || plan.doi) {
      try {
        approvedMatch = await matchApprovedPaper({ pmid: plan.pmid, doi: plan.doi });
      } catch {
        approvedMatch = false;
      }
    }
    const paper = paperStatusForClub({ pmid: plan.pmid, doi: plan.doi, approvedMatch });
    const db = getDb();
    try {
      const [topic] = await db.select().from(communityTopics).where(eq(communityTopics.slug, data.topicSlug)).limit(1);
      if (!topic) throw new Error("Topic not found.");
      const created = await db.transaction(async (tx) => {
        await tx.insert(communityProfiles).values({ userId, displayName: nameFrom(context) }).onConflictDoNothing();
        const [post] = await tx
          .insert(communityPosts)
          .values({
            topicId: topic.id,
            authorId: userId,
            kind: plan.postKind,
            title: plan.title,
            body: plan.agenda,
            status: "visible",
          })
          .returning({ id: communityPosts.id });
        if (!post) return null;
        await tx
          .insert(communityMemberships)
          .values({ topicId: topic.id, userId, membershipRole: plan.membershipRole })
          .onConflictDoNothing({ target: [communityMemberships.topicId, communityMemberships.userId] });
        await tx
          .insert(communityPostFollows)
          .values({ postId: post.id, userId })
          .onConflictDoNothing({ target: [communityPostFollows.postId, communityPostFollows.userId] });
        const [club] = await tx
          .insert(communityJournalClubs)
          .values({
            topicId: topic.id,
            postId: post.id,
            title: plan.title,
            agenda: plan.agenda,
            scheduledAt: new Date(plan.scheduledAt),
            facilitatorId: plan.facilitatorId,
            pmid: plan.pmid,
            doi: plan.doi,
            paperStatus: paper.paperStatus,
          })
          .returning({ id: communityJournalClubs.id });
        if ((plan.pmid || plan.doi) && paper.paperStatus) {
          await tx.insert(communityReferences).values({
            postId: post.id,
            pmid: plan.pmid,
            doi: plan.doi,
            title: paper.title,
            verificationStatus: paper.paperStatus,
            verificationDetail: paper.detail,
          });
        }
        return { postId: post.id, clubId: club?.id ?? null };
      });
      if (!created?.postId) throw new Error("Community request failed.");
      return created;
    } catch (err) {
      if (err instanceof Error && /Topic not found|Community request failed|moderator|Title|Agenda|Scheduled|Facilitator|DOI|PMID|patient|medical/.test(err.message)) throw err;
      throw mapWriteError(err);
    }
  });

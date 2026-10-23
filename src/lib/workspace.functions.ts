import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireNeonAuth } from "@/integrations/neon/auth-middleware";
import {
  planConceptSave,
  requireMember,
  workspaceForMember,
  type WorkspacePostRow,
} from "@/lib/community/rules";
import { getDb } from "@/lib/db.server";
import {
  communityMemberships,
  communityPostFollows,
  communityPosts,
  communityTopics,
  conceptSaves,
} from "@/lib/db/schema.server";
import { byId } from "@/lib/immune/engine";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function knownConceptIds(): Set<string> {
  return new Set(Object.keys(byId));
}

function missingRelation(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  if (code === "42P01" || code === "42703") return true;
  const msg = err instanceof Error ? err.message : "";
  return /does not exist/i.test(msg);
}

function mapSaveError(err: unknown): Error {
  if (missingRelation(err)) return new Error("Concept save is not available on this database yet.");
  const code = (err as { code?: string })?.code;
  if (code === "23505") return new Error("That concept is already saved.");
  return new Error("Workspace request failed.");
}

function memberId(userId: string | null | undefined): string {
  const member = requireMember(userId);
  if (!member.ok) throw new Error("Sign in to save a concept.");
  if (!UUID_RE.test(member.userId)) throw new Error("Sign in to save a concept.");
  return member.userId;
}

export const getConceptSaved = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => z.object({ conceptId: z.string().min(1).max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = memberId(context.userId);
    const plan = planConceptSave({ userId, conceptId: data.conceptId, known: knownConceptIds() });
    if (!plan.ok) return { saved: false as const, available: true as const };
    try {
      const db = getDb();
      const [row] = await db
        .select({ id: conceptSaves.id })
        .from(conceptSaves)
        .where(and(eq(conceptSaves.userId, userId), eq(conceptSaves.conceptId, plan.conceptId)))
        .limit(1);
      return { saved: Boolean(row), available: true as const };
    } catch (err) {
      if (missingRelation(err)) return { saved: false as const, available: false as const };
      console.error("concept_save_read_failed", (err as { code?: string })?.code ?? "error");
      throw mapSaveError(err);
    }
  });

export const toggleConceptSave = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => z.object({ conceptId: z.string().min(1).max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = memberId(context.userId);
    const plan = planConceptSave({ userId, conceptId: data.conceptId, known: knownConceptIds() });
    if (!plan.ok) throw new Error(plan.error);
    const db = getDb();
    try {
      const [existing] = await db
        .select({ id: conceptSaves.id })
        .from(conceptSaves)
        .where(and(eq(conceptSaves.userId, userId), eq(conceptSaves.conceptId, plan.conceptId)))
        .limit(1);
      if (existing) {
        await db.delete(conceptSaves).where(and(eq(conceptSaves.id, existing.id), eq(conceptSaves.userId, userId)));
        return { saved: false as const };
      }
      await db.insert(conceptSaves).values({ userId, conceptId: plan.conceptId });
      return { saved: true as const };
    } catch (err) {
      if (err instanceof Error && /Unknown concept|Sign in|not available/.test(err.message)) throw err;
      console.error("concept_save_write_failed", (err as { code?: string })?.code ?? "error");
      throw mapSaveError(err);
    }
  });

export const getMyWorkspace = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .handler(async ({ context }) => {
    const userId = memberId(context.userId);
    const known = knownConceptIds();
    const db = getDb();
    let conceptsAvailable = true;
    let conceptSavesRows: { userId: string; conceptId: string }[] = [];
    try {
      const rows = await db
        .select({ userId: conceptSaves.userId, conceptId: conceptSaves.conceptId })
        .from(conceptSaves)
        .where(eq(conceptSaves.userId, userId))
        .orderBy(desc(conceptSaves.createdAt));
      conceptSavesRows = rows;
    } catch (err) {
      if (!missingRelation(err)) {
        console.error("workspace_concepts_failed", (err as { code?: string })?.code ?? "error");
        throw mapSaveError(err);
      }
      conceptsAvailable = false;
    }

    let communityAvailable = true;
    let topicFollows: { userId: string; slug: string; title: string }[] = [];
    let posts: WorkspacePostRow[] = [];
    let postFollows: { userId: string; postId: string }[] = [];
    try {
      topicFollows = await db
        .select({
          userId: communityMemberships.userId,
          slug: communityTopics.slug,
          title: communityTopics.title,
        })
        .from(communityMemberships)
        .innerJoin(communityTopics, eq(communityMemberships.topicId, communityTopics.id))
        .where(eq(communityMemberships.userId, userId))
        .orderBy(asc(communityTopics.sortOrder), asc(communityTopics.title));

      const authored = await db
        .select({
          id: communityPosts.id,
          title: communityPosts.title,
          authorId: communityPosts.authorId,
          status: communityPosts.status,
        })
        .from(communityPosts)
        .where(eq(communityPosts.authorId, userId))
        .orderBy(desc(communityPosts.createdAt));

      const followed = await db
        .select({
          id: communityPosts.id,
          title: communityPosts.title,
          authorId: communityPosts.authorId,
          status: communityPosts.status,
        })
        .from(communityPostFollows)
        .innerJoin(communityPosts, eq(communityPostFollows.postId, communityPosts.id))
        .where(eq(communityPostFollows.userId, userId))
        .orderBy(desc(communityPosts.createdAt));

      const authoredIds = new Set(authored.map((post) => post.id));
      posts = [...authored, ...followed.filter((post) => !authoredIds.has(post.id))];
      postFollows = followed.map((post) => ({ userId, postId: post.id }));
    } catch (err) {
      if (!missingRelation(err)) {
        console.error("workspace_community_failed", (err as { code?: string })?.code ?? "error");
        throw mapSaveError(err);
      }
      communityAvailable = false;
    }

    const view = workspaceForMember({
      userId,
      conceptSaves: conceptSavesRows,
      topicFollows,
      posts,
      postFollows,
      known,
    });
    return {
      conceptsAvailable,
      communityAvailable,
      concepts: view.concepts.filter((row) => byId[row.id]),
      topics: view.topics,
      discussions: view.discussions,
    };
  });

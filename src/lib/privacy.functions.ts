import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireNeonAuth } from "@/integrations/neon/auth-middleware";
import { requireMember } from "@/lib/community/rules";
import { getDb } from "@/lib/db.server";
import {
  communityComments,
  communityMemberships,
  communityNotifications,
  communityPostFollows,
  communityPosts,
  communityProfiles,
  communitySaves,
  conceptSaves,
} from "@/lib/db/schema.server";
import {
  DELETE_CONFIRMATION,
  REMOVED_MEMBER_NAME,
  exportForMember,
  planMemberDeletion,
  type PrivacyBundle,
} from "@/lib/privacy";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function memberId(userId: string | null | undefined): string {
  const member = requireMember(userId);
  if (!member.ok) throw new Error("Sign in to use your own data.");
  if (!UUID_RE.test(member.userId)) throw new Error("Sign in to use your own data.");
  return member.userId;
}

function missingRelation(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  if (code === "42P01" || code === "42703") return true;
  const msg = err instanceof Error ? err.message : "";
  return /does not exist/i.test(msg);
}

async function optional<T>(fn: () => Promise<T>, empty: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (missingRelation(err)) return empty;
    console.error("privacy_read_failed", (err as { code?: string })?.code ?? "error");
    throw new Error("Your data could not be read.");
  }
}

async function loadBundle(userId: string): Promise<PrivacyBundle> {
  const db = getDb();
  const [profiles, posts, comments, saves, postFollows, memberships, notifications, concepts] = await Promise.all([
    optional(
      () => db.select().from(communityProfiles).where(eq(communityProfiles.userId, userId)),
      [],
    ),
    optional(
      () => db.select().from(communityPosts).where(eq(communityPosts.authorId, userId)),
      [],
    ),
    optional(
      () => db.select().from(communityComments).where(eq(communityComments.authorId, userId)),
      [],
    ),
    optional(
      () => db.select().from(communitySaves).where(eq(communitySaves.userId, userId)),
      [],
    ),
    optional(
      () => db.select().from(communityPostFollows).where(eq(communityPostFollows.userId, userId)),
      [],
    ),
    optional(
      () => db.select().from(communityMemberships).where(eq(communityMemberships.userId, userId)),
      [],
    ),
    optional(
      () => db.select().from(communityNotifications).where(eq(communityNotifications.userId, userId)),
      [],
    ),
    optional(
      () => db.select().from(conceptSaves).where(eq(conceptSaves.userId, userId)),
      [],
    ),
  ]);
  return {
    profiles: profiles.map((row) => ({
      userId: row.userId,
      displayName: row.displayName,
      bio: row.bio,
      affiliation: row.affiliation,
      credential: row.credential,
      interests: row.interests ?? [],
      visibility: row.visibility,
    })),
    posts: posts.map((row) => ({
      id: row.id,
      authorId: row.authorId,
      title: row.title,
      body: row.body,
      status: row.status,
    })),
    comments: comments.map((row) => ({
      id: row.id,
      authorId: row.authorId,
      postId: row.postId,
      body: row.body,
      status: row.status,
    })),
    saves: saves.map((row) => ({
      id: row.id,
      userId: row.userId,
      targetType: row.targetType,
      targetId: row.targetId,
    })),
    follows: [
      ...postFollows.map((row) => ({ id: row.id, userId: row.userId, kind: "post" as const, targetId: row.postId })),
      ...memberships.map((row) => ({ id: row.id, userId: row.userId, kind: "topic" as const, targetId: row.topicId })),
    ],
    notifications: notifications.map((row) => ({
      id: row.id,
      userId: row.userId,
      kind: row.kind,
      body: row.body,
    })),
    conceptSaves: concepts.map((row) => ({
      id: row.id,
      userId: row.userId,
      conceptId: row.conceptId,
    })),
  };
}

export const exportMyData = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .handler(async ({ context }) => {
    const userId = memberId(context.userId);
    const bundle = await loadBundle(userId);
    return exportForMember(userId, bundle);
  });

export const deleteMyData = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => z.object({ confirm: z.literal(DELETE_CONFIRMATION) }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.confirm !== DELETE_CONFIRMATION) throw new Error("Confirm deletion to continue.");
    const userId = memberId(context.userId);
    const bundle = await loadBundle(userId);
    const plan = planMemberDeletion(userId, bundle);
    const db = getDb();
    const skipMissing = async (fn: () => Promise<unknown>) => {
      try {
        await fn();
      } catch (err) {
        if (missingRelation(err)) return;
        throw err;
      }
    };
    try {
      if (plan.anonymizedProfile) {
        await skipMissing(() => db
          .update(communityProfiles)
          .set({
            displayName: REMOVED_MEMBER_NAME,
            bio: null,
            affiliation: null,
            credential: null,
            interests: [],
            updatedAt: new Date(),
          })
          .where(eq(communityProfiles.userId, userId)));
      }
      await skipMissing(() => db.delete(communityNotifications).where(eq(communityNotifications.userId, userId)));
      await skipMissing(() => db.delete(communitySaves).where(eq(communitySaves.userId, userId)));
      await skipMissing(() => db.delete(communityPostFollows).where(eq(communityPostFollows.userId, userId)));
      await skipMissing(() => db.delete(communityMemberships).where(eq(communityMemberships.userId, userId)));
      await skipMissing(() => db.delete(conceptSaves).where(eq(conceptSaves.userId, userId)));
    } catch (err) {
      if (missingRelation(err)) throw new Error("Account data is not available on this database yet.");
      console.error("privacy_delete_failed", (err as { code?: string })?.code ?? "error");
      throw new Error("Your data could not be removed.");
    }
    return {
      anonymized: Boolean(plan.anonymizedProfile),
      retainedPosts: plan.retainedPostIds.length,
      writesGraph: plan.writesGraph,
      changesRoles: plan.changesRoles,
    };
  });

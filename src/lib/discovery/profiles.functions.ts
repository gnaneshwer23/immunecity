/**
 * Neon-backed research profiles for Discovery Radar.
 * Ownership-scoped to signed-in user_id — no casual admin list-all.
 * Entitlement is read/normalized server-side; never elevated from client body.
 * No sensitive PII required. Does not write the knowledge graph.
 */
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireNeonAuth } from "@/integrations/neon/auth-middleware";
import { requireMember } from "@/lib/community/rules";
import { getDb } from "@/lib/db.server";
import { researchProfiles } from "@/lib/db/schema.server";
import { normalizeEntitlement, radarListLimit } from "@/lib/discovery/entitlements";
import {
  PROFILE_ACCESS,
  planResearchProfile,
  profileOwnershipSpec,
} from "@/lib/discovery/profiles";
import type { ResearchEntitlement, ResearchProfileRow } from "@/lib/discovery/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export { PROFILE_ACCESS, profileOwnershipSpec };

function memberId(userId: string | null | undefined): string {
  const member = requireMember(userId);
  if (!member.ok) throw new Error("Sign in to manage your research profile.");
  if (!UUID_RE.test(member.userId)) throw new Error("Sign in to manage your research profile.");
  return member.userId;
}

function missingRelation(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  if (code === "42P01" || code === "42703") return true;
  const msg = err instanceof Error ? err.message : "";
  return /does not exist/i.test(msg);
}

function mapError(err: unknown): Error {
  if (missingRelation(err)) {
    return new Error("Research profiles are not available on this database yet (apply migration 0019).");
  }
  return new Error("Research profile request failed.");
}

function toRow(row: typeof researchProfiles.$inferSelect): ResearchProfileRow {
  const interests =
    row.interestsJson && typeof row.interestsJson === "object" && !Array.isArray(row.interestsJson)
      ? (row.interestsJson as Record<string, unknown>)
      : {};
  return {
    id: row.id,
    userId: row.userId,
    displayLabel: row.displayLabel,
    focusDiseases: row.focusDiseases ?? [],
    focusDomains: row.focusDomains ?? [],
    modalities: row.modalities ?? [],
    interests,
    entitlement: normalizeEntitlement(row.entitlement) as ResearchEntitlement,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const upsertInput = z.object({
  displayLabel: z.string().max(80).nullable().optional(),
  focusDiseases: z.array(z.string().min(1).max(40)).max(20).optional(),
  focusDomains: z.array(z.string().min(1).max(40)).max(20).optional(),
  modalities: z.array(z.string().min(1).max(40)).max(20).optional(),
  interests: z.record(z.string(), z.unknown()).optional(),
  /** Client cannot elevate — ignored if present. */
  entitlement: z.string().optional(),
});

export const getMyResearchProfile = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .handler(async ({ context }) => {
    const userId = memberId(context.userId);
    try {
      const db = getDb();
      const [row] = await db
        .select()
        .from(researchProfiles)
        .where(eq(researchProfiles.userId, userId))
        .limit(1);
      if (!row) {
        return {
          profile: null as ResearchProfileRow | null,
          radarLimit: radarListLimit("free"),
          ownership: profileOwnershipSpec("get"),
        };
      }
      const profile = toRow(row);
      return {
        profile,
        radarLimit: radarListLimit(profile.entitlement),
        ownership: profileOwnershipSpec("get"),
      };
    } catch (err) {
      throw mapError(err);
    }
  });

export const upsertMyResearchProfile = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => upsertInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const userId = memberId(context.userId);
    const planned = planResearchProfile({ userId, ...data });
    if (!planned.ok) throw new Error(planned.error);
    // Entitlement is never taken from the client body.
    void data.entitlement;
    try {
      const db = getDb();
      const [existing] = await db
        .select()
        .from(researchProfiles)
        .where(eq(researchProfiles.userId, userId))
        .limit(1);

      if (!existing) {
        const [inserted] = await db
          .insert(researchProfiles)
          .values({
            userId,
            displayLabel: planned.draft.displayLabel,
            focusDiseases: planned.draft.focusDiseases,
            focusDomains: planned.draft.focusDomains,
            modalities: planned.draft.modalities,
            interestsJson: planned.draft.interests,
            entitlement: "free",
            updatedAt: new Date(),
          })
          .returning();
        return {
          profile: toRow(inserted!),
          created: true as const,
          ownership: profileOwnershipSpec("create"),
          kgWrite: false as const,
        };
      }

      const [updated] = await db
        .update(researchProfiles)
        .set({
          displayLabel: planned.draft.displayLabel,
          focusDiseases: planned.draft.focusDiseases,
          focusDomains: planned.draft.focusDomains,
          modalities: planned.draft.modalities,
          interestsJson: planned.draft.interests,
          updatedAt: new Date(),
        })
        .where(eq(researchProfiles.userId, userId))
        .returning();
      return {
        profile: toRow(updated!),
        created: false as const,
        ownership: profileOwnershipSpec("update"),
        kgWrite: false as const,
      };
    } catch (err) {
      throw mapError(err);
    }
  });

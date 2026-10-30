/**
 * Curator-entry path for ontology_mappings (migration 0017).
 * Never invents external accessions. New rows default to unreviewed/draft.
 * Empty tables are OK — prefer human entry over fabricated seed data.
 */
import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireNeonAuth } from "@/integrations/neon/auth-middleware";
import { assertCanReview, loadAccountPowers } from "@/lib/access/roles.server";
import { getDb } from "@/lib/db.server";
import { ontologyMappings } from "@/lib/db/schema.server";
import { byId } from "@/lib/immune/engine";
import { ONTOLOGY_SYSTEMS } from "@/data/ontologyMappings";

const systemSchema = z.enum(ONTOLOGY_SYSTEMS);

function missingRelation(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  if (code === "42P01" || code === "42703") return true;
  const msg = err instanceof Error ? err.message : "";
  return /does not exist/i.test(msg);
}

function toClient(r: typeof ontologyMappings.$inferSelect) {
  return {
    id: r.id,
    isiId: r.isiId,
    system: r.system,
    externalId: r.externalId,
    label: r.label,
    reviewStatus: r.reviewStatus as "unreviewed" | "approved" | "rejected",
    notes: r.notes,
    reviewedBy: r.reviewedBy,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    /** Seed honesty — curator verification still required unless approved. */
    verificationRequired: r.reviewStatus !== "approved",
  };
}

/** List mappings (optionally for one ISI id). Empty is OK. */
export const listOntologyMappings = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        isiId: z.string().min(1).max(40).optional(),
        limit: z.number().int().min(1).max(200).optional(),
      })
      .optional()
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await loadAccountPowers(context.userId);
    try {
      const db = getDb();
      const limit = data?.limit ?? 100;
      const rows = data?.isiId
        ? await db
            .select()
            .from(ontologyMappings)
            .where(eq(ontologyMappings.isiId, data.isiId))
            .orderBy(asc(ontologyMappings.system))
            .limit(limit)
        : await db.select().from(ontologyMappings).orderBy(asc(ontologyMappings.isiId)).limit(limit);
      return {
        available: true as const,
        mappings: rows.map(toClient),
        fabricatedSeed: false as const,
        note: "Empty is OK. External IDs must be curator-supplied — never invented.",
      };
    } catch (err) {
      if (missingRelation(err)) {
        return {
          available: false as const,
          mappings: [],
          fabricatedSeed: false as const,
          note: "ontology_mappings table not applied yet (migration 0017).",
        };
      }
      throw new Error("Ontology mappings could not be loaded.");
    }
  });

/**
 * Insert or update a draft/unreviewed mapping. Approval is a separate reviewer step.
 * Refuses unknown ISI graph ids. Never auto-approves.
 */
export const upsertOntologyMappingDraft = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        isiId: z.string().min(1).max(40),
        system: systemSchema,
        externalId: z.string().min(1).max(120),
        label: z.string().max(200).nullable().optional(),
        notes: z.string().max(2000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCanReview(context.userId);
    if (!byId[data.isiId]) throw new Error("Unknown ISI concept id — refuse invented graph ids.");
    const externalId = data.externalId.trim();
    if (!externalId) throw new Error("External ontology id is required (curator-supplied).");
    try {
      const db = getDb();
      const actor = context.email ?? context.userId;
      const [existing] = await db
        .select()
        .from(ontologyMappings)
        .where(
          and(
            eq(ontologyMappings.isiId, data.isiId),
            eq(ontologyMappings.system, data.system),
            eq(ontologyMappings.externalId, externalId),
          ),
        )
        .limit(1);
      if (existing) {
        const [updated] = await db
          .update(ontologyMappings)
          .set({
            label: data.label ?? existing.label,
            notes: data.notes ?? existing.notes,
            // Keep review_status unless already set — never silent-approve on upsert.
            updatedAt: new Date(),
          })
          .where(eq(ontologyMappings.id, existing.id))
          .returning();
        return { mapping: toClient(updated!), created: false as const, autoApprove: false as const };
      }
      const [inserted] = await db
        .insert(ontologyMappings)
        .values({
          isiId: data.isiId,
          system: data.system,
          externalId,
          label: data.label ?? null,
          notes: data.notes
            ? `${data.notes} [entered by ${actor}; verification required]`
            : `Draft mapping entered by ${actor}; curator verification required.`,
          reviewStatus: "unreviewed",
        })
        .returning();
      return { mapping: toClient(inserted!), created: true as const, autoApprove: false as const };
    } catch (err) {
      if (missingRelation(err)) throw new Error("ontology_mappings table not available yet.");
      throw new Error("Ontology mapping could not be saved.");
    }
  });

/** Human review of a mapping — never bulk, never invent. */
export const setOntologyMappingReview = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        reviewStatus: z.enum(["unreviewed", "approved", "rejected"]),
        notes: z.string().max(2000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCanReview(context.userId);
    const db = getDb();
    const actor = context.email ?? context.userId;
    const [updated] = await db
      .update(ontologyMappings)
      .set({
        reviewStatus: data.reviewStatus,
        notes: data.notes ?? undefined,
        reviewedBy: data.reviewStatus === "unreviewed" ? null : actor,
        reviewedAt: data.reviewStatus === "unreviewed" ? null : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(ontologyMappings.id, data.id))
      .returning();
    if (!updated) throw new Error("Mapping not found.");
    return { mapping: toClient(updated), autoApprove: false as const };
  });

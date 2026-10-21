import { createServerFn } from "@tanstack/react-start";
import { and, eq, gt, ilike, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { requireNeonAuth } from "@/integrations/neon/auth-middleware";
import { getDb, getSqlClient } from "@/lib/db.server";
import { evidenceAuditEvents, evidenceRecords } from "@/lib/db/schema.server";
import { edgeByRel } from "./immune/engine";
import { computeEvidenceUpdate } from "./immune/evidenceInvariants";
import { checkRecord, suggestFor, type CheckInput } from "./evidenceCheck";
import { evidencePage, evidencePageSchema } from "./immune/evidencePagination";

function auditSnapshot(r: typeof evidenceRecords.$inferSelect) {
  return {
    curation: r.curation,
    claim_support: r.claimSupport,
    relationship_id: r.relationshipId,
    check_status: r.checkStatus,
    pmid: r.pmid,
    doi: r.doi,
    source_ref: r.sourceRef,
    reviewed_by: r.reviewedBy,
    reviewed_at: r.reviewedAt?.toISOString?.() ?? r.reviewedAt ?? null,
  };
}

function auditReason(patch: Record<string, unknown>, set: Record<string, unknown>): string {
  if ("pmid" in patch || "doi" in patch || "source_ref" in patch) return "source_edit_invalidated_approval";
  if (set.curation === "approved") return "claim_approved";
  if (set.curation === "rejected") return "claim_rejected";
  if (set.curation === "unreviewed" && "relationshipId" in set) return "relationship_remap_cleared_approval";
  if ("claimSupport" in set) return "claim_support_updated";
  if ("curation" in set) return "curation_updated";
  return "evidence_updated";
}

async function assertAdmin(userId: string) {
  const rows = await getSqlClient()`SELECT public.has_role(${userId}::uuid, 'admin'::public.app_role) AS ok`;
  if (!rows[0]?.ok) throw new Error("Only atlas admins can change curation records.");
}

function rowToClient(r: typeof evidenceRecords.$inferSelect) {
  return {
    id: r.id,
    evidence_id: r.evidenceId,
    node_id: r.nodeId,
    node_name: r.nodeName,
    node_type: r.nodeType,
    source_type: r.sourceType,
    source_ref: r.sourceRef,
    pmid: r.pmid,
    doi: r.doi,
    search_query: r.searchQuery,
    manifest_status: r.manifestStatus,
    check_status: r.checkStatus,
    check_detail: r.checkDetail as Record<string, string | number | boolean | null> | null,
    checked_at: r.checkedAt?.toISOString() ?? null,
    curation: r.curation,
    notes: r.notes,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
    relationship_id: r.relationshipId,
    claim_support: r.claimSupport,
    reviewed_by: r.reviewedBy,
    reviewed_at: r.reviewedAt?.toISOString() ?? null,
  };
}

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .handler(async ({ context }) => {
    const rows = await getSqlClient()`SELECT public.has_role(${context.userId}::uuid, 'admin'::public.app_role) AS ok`;
    return { role: rows[0]?.ok ? "admin" : "reader", email: context.email ?? null };
  });

/** Signed-in readers browse bounded pages (admin gates writes separately). */
export const listEvidenceRecords = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => evidencePageSchema.parse(d))
  .handler(async ({ data }) => {
    const db = getDb();
    const term = `%${data.q.replace(/[\\%_]/g, "\\$&")}%`;
    const rows = await db.select().from(evidenceRecords).where(and(
      data.after ? gt(evidenceRecords.evidenceId, data.after) : undefined,
      data.status !== "all" ? eq(evidenceRecords.checkStatus, data.status) : undefined,
      data.type !== "all" ? eq(evidenceRecords.nodeType, data.type) : undefined,
      data.curation !== "all" ? eq(evidenceRecords.curation, data.curation) : undefined,
      data.q
        ? or(
            ilike(evidenceRecords.nodeName, term),
            ilike(evidenceRecords.evidenceId, term),
            ilike(evidenceRecords.sourceRef, term),
            ilike(evidenceRecords.relationshipId, term),
          )
        : undefined,
    )).orderBy(evidenceRecords.evidenceId).limit(data.limit + 1);
    const page = evidencePage(rows, data.limit);
    return { items: page.items.map(rowToClient), nextCursor: page.nextCursor };
  });

const pmidRe = /PMID[:\s]*(\d+)/i;
const doiRe = /(10\.\d{4,9}\/\S+)/;

const claimSupportSchema = z.enum(["unassessed", "supports", "partial", "contradicts", "unrelated"]);

const manifestSchema = z.object({
  /** Optional literature-workflow envelope; ignored for persistence. */
  meta: z
    .object({
      kind: z.string().optional(),
      curation: z.literal("unreviewed").optional(),
      project_id: z.string().optional(),
      note: z.string().optional(),
    })
    .optional(),
  evidence_records: z.array(
    z.object({
      node_id: z.string(),
      node_type: z.string(),
      node_name: z.string(),
      evidence: z.array(
        z.object({
          evidence_id: z.string(),
          source_ref: z.string().nullable().optional(),
          status: z.string(),
          source_type: z.string().optional(),
          search_query: z.string().optional(),
          pmid: z.string().optional(),
          doi: z.string().optional(),
          /** Proposed mapping from literature workflow — never treated as approved curation. */
          relationship_id: z.string().max(200).nullable().optional(),
          claim_support: claimSupportSchema.optional(),
          claim_text: z.string().max(2000).optional(),
        }),
      ),
    }),
  ),
});

export const importManifest = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => manifestSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const rows = data.evidence_records.flatMap((r) =>
      r.evidence.map((e) => {
        const ref = e.source_ref ?? null;
        const rid = e.relationship_id && edgeByRel[e.relationship_id] ? e.relationship_id : null;
        const notes = e.claim_text
          ? `[literature candidate] ${e.claim_text}`.slice(0, 2000)
          : null;
        return {
          evidenceId: e.evidence_id,
          nodeId: r.node_id,
          nodeName: r.node_name,
          nodeType: r.node_type,
          sourceType: e.source_type ?? null,
          sourceRef: ref,
          pmid: e.pmid ?? (ref ? ref.match(pmidRe)?.[1] ?? null : null),
          doi: e.doi ?? (ref ? ref.match(doiRe)?.[1] ?? null : null),
          searchQuery: e.search_query ?? null,
          manifestStatus: e.status,
          checkStatus: ref || e.pmid || e.doi ? "pending" : "research_required",
          // Always unreviewed on insert — scientific claim approval is a separate human step.
          curation: "unreviewed",
          relationshipId: rid,
          claimSupport: rid ? (e.claim_support ?? "unassessed") : "unassessed",
          notes,
        };
      }),
    );
    const db = getDb();
    // Existing records keep their curation decisions; only new evidence IDs are added.
    const inserted = await db
      .insert(evidenceRecords)
      .values(rows)
      .onConflictDoNothing({ target: evidenceRecords.evidenceId })
      .returning({ evidenceId: evidenceRecords.evidenceId });
    return { received: rows.length, added: inserted.length };
  });

export const runChecks = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).max(8) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const db = getDb();
    const recs = await db
      .select({
        id: evidenceRecords.id,
        node_name: evidenceRecords.nodeName,
        source_ref: evidenceRecords.sourceRef,
        pmid: evidenceRecords.pmid,
        doi: evidenceRecords.doi,
      })
      .from(evidenceRecords)
      .where(inArray(evidenceRecords.id, data.ids));
    const results = [];
    for (const r of recs as CheckInput[]) {
      const res = await checkRecord(r);
      await db
        .update(evidenceRecords)
        .set({
          checkStatus: res.status,
          checkDetail: res.detail as Record<string, unknown>,
          checkedAt: new Date(),
        })
        .where(eq(evidenceRecords.id, r.id));
      results.push({ id: r.id, status: res.status });
    }
    return results;
  });

export const updateRecord = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        curation: z.enum(["unreviewed", "approved", "rejected"]).optional(),
        pmid: z.string().max(20).nullable().optional(),
        doi: z.string().max(200).nullable().optional(),
        source_ref: z.string().max(500).nullable().optional(),
        notes: z.string().max(2000).nullable().optional(),
        relationship_id: z
          .string()
          .max(200)
          .nullable()
          .optional()
          .refine((v) => !v || !!edgeByRel[v], "Unknown relationship ID"),
        claim_support: z.enum(["unassessed", "supports", "partial", "contradicts", "unrelated"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { id, ...patch } = data;
    const db = getDb();
    const [existing] = await db.select().from(evidenceRecords).where(eq(evidenceRecords.id, id)).limit(1);
    if (!existing) throw new Error("Record not found.");

    const actor = context.email ?? context.userId;
    const result = computeEvidenceUpdate(
      {
        curation: existing.curation,
        claimSupport: existing.claimSupport,
        relationshipId: existing.relationshipId,
        pmid: existing.pmid,
        doi: existing.doi,
        sourceRef: existing.sourceRef,
        checkStatus: existing.checkStatus,
      },
      patch,
      actor,
    );
    if (result.error) throw new Error(result.error);
    if (!Object.keys(result.set).length) {
      throw new Error("No evidence fields changed.");
    }

    const previous = auditSnapshot(existing);
    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(evidenceRecords)
        .set(result.set)
        .where(eq(evidenceRecords.id, id))
        .returning();
      if (!updated) throw new Error("Evidence update failed — no row written.");
      await tx.insert(evidenceAuditEvents).values({
        evidenceRecordId: existing.id,
        evidenceId: existing.evidenceId,
        actor,
        reason: auditReason(patch as Record<string, unknown>, result.set as Record<string, unknown>),
        previousState: previous,
        newState: auditSnapshot(updated),
      });
    });
    return { ok: true };
  });

export const suggestSources = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).max(6) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const db = getDb();
    const recs = await db
      .select({
        id: evidenceRecords.id,
        node_name: evidenceRecords.nodeName,
        search_query: evidenceRecords.searchQuery,
      })
      .from(evidenceRecords)
      .where(inArray(evidenceRecords.id, data.ids));
    let found = 0;
    for (const r of recs) {
      const detail = await suggestFor(r);
      if (detail.candidates.length) found++;
      await db
        .update(evidenceRecords)
        .set({ checkDetail: detail as Record<string, unknown>, checkedAt: new Date() })
        .where(eq(evidenceRecords.id, r.id));
    }
    return { found, total: recs.length };
  });

/** Admin: PubMed preview for P0 PD-1 / IFN exemplar gaps — no writes. */
export const previewP0ExemplarDrafts = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { previewP0ExemplarPubmedDrafts } = await import("@/lib/p0ExemplarDrafts.server");
    return previewP0ExemplarPubmedDrafts();
  });

/**
 * Admin: insert unreviewed drafts only when PubMed returns a real PMID whose title
 * passes a conservative heuristic. Never approves; claim_support stays unassessed.
 */
export const seedP0ExemplarDrafts = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { seedP0ExemplarPubmedDrafts } = await import("@/lib/p0ExemplarDrafts.server");
    return seedP0ExemplarPubmedDrafts();
  });

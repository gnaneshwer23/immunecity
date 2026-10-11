import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { edgeByRel } from "./immune/engine";
import { checkRecord, suggestFor, type CheckInput } from "./evidenceCheck";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Only atlas admins can change curation records.");
}

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { role: data ? "admin" : "reader", email: (context.claims as any)?.email ?? null };
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
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => manifestSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const rows = data.evidence_records.flatMap((r) =>
      r.evidence.map((e) => {
        const ref = e.source_ref ?? null;
        const rid = e.relationship_id && edgeByRel[e.relationship_id] ? e.relationship_id : null;
        const notes = e.claim_text
          ? `[literature candidate] ${e.claim_text}`.slice(0, 2000)
          : null;
        return {
          evidence_id: e.evidence_id,
          node_id: r.node_id,
          node_name: r.node_name,
          node_type: r.node_type,
          source_type: e.source_type ?? null,
          source_ref: ref,
          pmid: e.pmid ?? (ref ? ref.match(pmidRe)?.[1] ?? null : null),
          doi: e.doi ?? (ref ? ref.match(doiRe)?.[1] ?? null : null),
          search_query: e.search_query ?? null,
          manifest_status: e.status,
          check_status: ref || e.pmid || e.doi ? "pending" : "research_required",
          // Always unreviewed on insert — scientific claim approval is a separate human step.
          curation: "unreviewed",
          relationship_id: rid,
          claim_support: rid ? (e.claim_support ?? "unassessed") : "unassessed",
          notes,
        };
      }),
    );
    // Existing records keep their curation decisions; only new evidence IDs are added.
    const { error, count } = await context.supabase
      .from("evidence_records")
      .upsert(rows, { onConflict: "evidence_id", ignoreDuplicates: true, count: "exact" });
    if (error) throw new Error(error.message);
    return { received: rows.length, added: count ?? 0 };
  });

export const runChecks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).max(8) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: recs, error } = await context.supabase
      .from("evidence_records")
      .select("id, node_name, source_ref, pmid, doi")
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    const results = [];
    for (const r of recs as CheckInput[]) {
      const res = await checkRecord(r);
      await context.supabase
        .from("evidence_records")
        .update({ check_status: res.status, check_detail: res.detail as any, checked_at: new Date().toISOString() })
        .eq("id", r.id);
      results.push({ id: r.id, status: res.status });
    }
    return results;
  });

export const updateRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      curation: z.enum(["unreviewed", "approved", "rejected"]).optional(),
      pmid: z.string().max(20).nullable().optional(),
      doi: z.string().max(200).nullable().optional(),
      source_ref: z.string().max(500).nullable().optional(),
      notes: z.string().max(2000).nullable().optional(),
      relationship_id: z.string().max(200).nullable().optional().refine((v) => !v || !!edgeByRel[v], "Unknown relationship ID"),
      claim_support: z.enum(["unassessed", "supports", "partial", "contradicts", "unrelated"]).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, ...patch } = data;
    const touchesSource = "pmid" in patch || "doi" in patch || "source_ref" in patch;
    const update: any = { ...patch };
    if (touchesSource) update["check_status"] = "pending";
    if ("relationship_id" in patch && !patch.relationship_id) update["claim_support"] = "unassessed";
    if ("curation" in patch || "claim_support" in patch) {
      update["reviewed_by"] = (context.claims as any)?.email ?? context.userId;
      update["reviewed_at"] = new Date().toISOString();
    }
    const { error } = await context.supabase.from("evidence_records").update(update).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const suggestSources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).max(6) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: recs, error } = await context.supabase
      .from("evidence_records").select("id, node_name, search_query").in("id", data.ids);
    if (error) throw new Error(error.message);
    let found = 0;
    for (const r of recs ?? []) {
      const detail = await suggestFor(r);
      if (detail.candidates.length) found++;
      await context.supabase.from("evidence_records").update({ check_detail: detail as any, checked_at: new Date().toISOString() }).eq("id", r.id);
    }
    return { found, total: recs?.length ?? 0 };
  });

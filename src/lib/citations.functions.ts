import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";

export interface ApprovedCitation {
  node_id: string; label: string; url: string; evidence_id: string;
  relationship_id: string | null; claim_support: string; reviewed_at: string | null;
}

/* Public read of curation decisions marked approved; RLS limits anon to those rows. */
export const getApprovedCitations = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const sb = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await sb
    .from("evidence_records")
    .select("evidence_id, node_id, source_ref, pmid, doi, relationship_id, claim_support, reviewed_at")
    .eq("curation", "approved");
  if (error) return [] as ApprovedCitation[];
  return (data ?? []).map((r): ApprovedCitation => ({
    node_id: r.node_id,
    evidence_id: r.evidence_id,
    relationship_id: r.relationship_id ?? null,
    claim_support: r.claim_support ?? "unassessed",
    reviewed_at: r.reviewed_at ?? null,
    label: r.pmid ? `PMID ${r.pmid}` : r.doi ? `DOI ${r.doi}` : (r.source_ref ?? r.evidence_id),
    url: r.pmid
      ? `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`
      : r.doi ? `https://doi.org/${r.doi}` : `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(r.source_ref ?? "")}`,
  }));
});

export const approvedQuery = queryOptions({
  queryKey: ["approved-citations"],
  queryFn: () => getApprovedCitations(),
  staleTime: 5 * 60_000,
});

import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db.server";
import { evidenceRecords } from "@/lib/db/schema.server";

export interface ApprovedCitation {
  node_id: string;
  label: string;
  url: string;
  evidence_id: string;
  relationship_id: string | null;
  claim_support: string;
  reviewed_at: string | null;
  curation: "approved";
  pmid?: string | null;
  doi?: string | null;
}

/** Typed failure so UI/Ask never treat a DB outage as “zero citations”. */
export class EvidenceServiceError extends Error {
  readonly code = "EVIDENCE_UNAVAILABLE" as const;
  constructor(message = "Evidence service unavailable") {
    super(message);
    this.name = "EvidenceServiceError";
  }
}

export function isEvidenceServiceError(err: unknown): err is EvidenceServiceError {
  return err instanceof EvidenceServiceError || (typeof err === "object" && err !== null && (err as { code?: string }).code === "EVIDENCE_UNAVAILABLE");
}

/** Public read of curation decisions marked approved (server-side filter; no PostgREST/RLS). */
export const getApprovedCitations = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = getDb();
    const data = await db
      .select({
        evidenceId: evidenceRecords.evidenceId,
        nodeId: evidenceRecords.nodeId,
        sourceRef: evidenceRecords.sourceRef,
        pmid: evidenceRecords.pmid,
        doi: evidenceRecords.doi,
        relationshipId: evidenceRecords.relationshipId,
        claimSupport: evidenceRecords.claimSupport,
        reviewedAt: evidenceRecords.reviewedAt,
      })
      .from(evidenceRecords)
      .where(eq(evidenceRecords.curation, "approved"));
    return data.map(
      (r): ApprovedCitation => ({
        node_id: r.nodeId,
        evidence_id: r.evidenceId,
        relationship_id: r.relationshipId ?? null,
        claim_support: r.claimSupport ?? "unassessed",
        reviewed_at: r.reviewedAt?.toISOString?.() ?? (r.reviewedAt as string | null) ?? null,
        curation: "approved",
        pmid: r.pmid,
        doi: r.doi,
        label: r.pmid ? `PMID ${r.pmid}` : r.doi ? `DOI ${r.doi}` : (r.sourceRef ?? r.evidenceId),
        url: r.pmid
          ? `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`
          : r.doi
            ? `https://doi.org/${r.doi}`
            : `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(r.sourceRef ?? "")}`,
      }),
    );
  } catch (err) {
    if (err instanceof EvidenceServiceError) throw err;
    throw new EvidenceServiceError(
      "Evidence database query failed. Coverage and citations are temporarily unavailable — this is not an empty evidence set.",
    );
  }
});

export const approvedQuery = queryOptions({
  queryKey: ["approved-citations"],
  queryFn: () => getApprovedCitations(),
  staleTime: 5 * 60_000,
  retry: 1,
});

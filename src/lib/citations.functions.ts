import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/lib/db.server";
import { evidenceRecords } from "@/lib/db/schema.server";
import { APPROVAL_ELIGIBLE_CHECK, isGateCSupportingEvidence } from "@/lib/immune/evidenceInvariants";

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
  check_status?: string | null;
}

export interface CounterEvidenceCitation {
  node_id: string;
  label: string;
  url: string;
  evidence_id: string;
  relationship_id: string | null;
  claim_support: "contradicts" | "partial";
  reviewed_at: string | null;
  curation: string;
  pmid?: string | null;
  doi?: string | null;
  check_status?: string | null;
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

function citationLabel(pmid: string | null, doi: string | null, sourceRef: string | null, evidenceId: string) {
  return pmid ? `PMID ${pmid}` : doi ? `DOI ${doi}` : (sourceRef ?? evidenceId);
}

function citationUrl(pmid: string | null, doi: string | null, sourceRef: string | null) {
  if (pmid) return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
  if (doi) return `https://doi.org/${doi}`;
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(sourceRef ?? "")}`;
}

/**
 * Public Gate C read: approved + supports + verified/matched identifier only.
 * Fail-closed — never return approved-but-non-supporting or unverified rows as coverage.
 */
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
        checkStatus: evidenceRecords.checkStatus,
        curation: evidenceRecords.curation,
      })
      .from(evidenceRecords)
      .where(
        and(
          eq(evidenceRecords.curation, "approved"),
          eq(evidenceRecords.claimSupport, "supports"),
          inArray(evidenceRecords.checkStatus, [...APPROVAL_ELIGIBLE_CHECK]),
        ),
      );
    return data
      .filter((r) =>
        isGateCSupportingEvidence({
          curation: r.curation,
          claimSupport: r.claimSupport,
          relationshipId: r.relationshipId,
          checkStatus: r.checkStatus,
        }),
      )
      .map(
        (r): ApprovedCitation => ({
          node_id: r.nodeId,
          evidence_id: r.evidenceId,
          relationship_id: r.relationshipId ?? null,
          claim_support: r.claimSupport ?? "unassessed",
          reviewed_at: r.reviewedAt?.toISOString?.() ?? (r.reviewedAt as string | null) ?? null,
          curation: "approved",
          pmid: r.pmid,
          doi: r.doi,
          check_status: r.checkStatus,
          label: citationLabel(r.pmid, r.doi, r.sourceRef, r.evidenceId),
          url: citationUrl(r.pmid, r.doi, r.sourceRef),
        }),
      );
  } catch (err) {
    if (err instanceof EvidenceServiceError) throw err;
    throw new EvidenceServiceError(
      "Evidence database query failed. Coverage and citations are temporarily unavailable — this is not an empty evidence set.",
    );
  }
});

/**
 * Separate counterevidence path (contradicts / partial). Not Gate C support.
 * Identifier must be verified/matched; curation must not be rejected.
 */
export const getCounterEvidenceCitations = createServerFn({ method: "GET" }).handler(async () => {
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
        checkStatus: evidenceRecords.checkStatus,
        curation: evidenceRecords.curation,
      })
      .from(evidenceRecords)
      .where(
        and(
          inArray(evidenceRecords.claimSupport, ["contradicts", "partial"]),
          inArray(evidenceRecords.checkStatus, [...APPROVAL_ELIGIBLE_CHECK]),
          ne(evidenceRecords.curation, "rejected"),
        ),
      );
    return data
      .filter((r) => !!r.relationshipId && (r.claimSupport === "contradicts" || r.claimSupport === "partial"))
      .map(
        (r): CounterEvidenceCitation => ({
          node_id: r.nodeId,
          evidence_id: r.evidenceId,
          relationship_id: r.relationshipId ?? null,
          claim_support: r.claimSupport as "contradicts" | "partial",
          reviewed_at: r.reviewedAt?.toISOString?.() ?? (r.reviewedAt as string | null) ?? null,
          curation: r.curation,
          pmid: r.pmid,
          doi: r.doi,
          check_status: r.checkStatus,
          label: citationLabel(r.pmid, r.doi, r.sourceRef, r.evidenceId),
          url: citationUrl(r.pmid, r.doi, r.sourceRef),
        }),
      );
  } catch (err) {
    if (err instanceof EvidenceServiceError) throw err;
    throw new EvidenceServiceError(
      "Evidence database query failed while loading counterevidence. This is a service outage, not proof that no contradicting sources exist.",
    );
  }
});

export const approvedQuery = queryOptions({
  queryKey: ["approved-citations"],
  queryFn: () => getApprovedCitations(),
  staleTime: 5 * 60_000,
  retry: 1,
});

export const counterEvidenceQuery = queryOptions({
  queryKey: ["counter-evidence-citations"],
  queryFn: () => getCounterEvidenceCitations(),
  staleTime: 5 * 60_000,
  retry: 1,
});

import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb, getSqlClient } from "@/lib/db.server";
import { evidenceRecords } from "@/lib/db/schema.server";
import { APPROVAL_ELIGIBLE_CHECK, isGateCSupportingEvidence } from "@/lib/immune/evidenceInvariants";
import { graphReleaseSnapshot } from "@/lib/immune/graphRelease";
import {
  EXEMPLAR_CURATOR_TARGETS,
  EXEMPLAR_PATHWAYS,
  reportExemplar,
} from "@/lib/immune/exemplarPathways";
import type { CitationLike } from "@/lib/immune/evidenceStatus";

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

export type EvidenceCoverageStats = {
  fetchedAt: string;
  runtimeRelationships: number;
  approvedSupportsRows: number;
  distinctGateCRels: number;
  contradicts: number;
  partial: number;
  unreviewed: number;
  totalEvidenceRows: number;
  exemplar: {
    pathwayId: string;
    title: string;
    uniqueEdges: number;
    approvedEdges: number;
    maturity: string;
    openP0Targets: number;
  }[];
  openP0Targets: number;
};

/**
 * Live Neon coverage dashboard numbers — fail closed with EvidenceServiceError (never fake zeros).
 */
export const getEvidenceCoverageStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<EvidenceCoverageStats> => {
    try {
      const db = getDb();
      const sqlClient = getSqlClient();
      const snap = graphReleaseSnapshot();
      const [agg] = await sqlClient`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (
            WHERE curation = 'approved' AND claim_support = 'supports' AND relationship_id IS NOT NULL
          )::int AS approved_supports,
          COUNT(DISTINCT relationship_id) FILTER (
            WHERE curation = 'approved' AND claim_support = 'supports' AND relationship_id IS NOT NULL
          )::int AS distinct_gate_c,
          COUNT(*) FILTER (WHERE claim_support = 'contradicts')::int AS contradicts,
          COUNT(*) FILTER (WHERE claim_support = 'partial')::int AS partial,
          COUNT(*) FILTER (WHERE curation = 'unreviewed')::int AS unreviewed
        FROM public.evidence_records
      `;

      const approvedRows = await db
        .select({
          evidenceId: evidenceRecords.evidenceId,
          relationshipId: evidenceRecords.relationshipId,
          claimSupport: evidenceRecords.claimSupport,
          curation: evidenceRecords.curation,
          checkStatus: evidenceRecords.checkStatus,
          pmid: evidenceRecords.pmid,
          doi: evidenceRecords.doi,
          sourceRef: evidenceRecords.sourceRef,
          reviewedAt: evidenceRecords.reviewedAt,
        })
        .from(evidenceRecords)
        .where(
          and(
            eq(evidenceRecords.curation, "approved"),
            eq(evidenceRecords.claimSupport, "supports"),
            inArray(evidenceRecords.checkStatus, [...APPROVAL_ELIGIBLE_CHECK]),
          ),
        );

      const cites: CitationLike[] = approvedRows
        .filter((r) =>
          isGateCSupportingEvidence({
            curation: r.curation,
            claimSupport: r.claimSupport,
            relationshipId: r.relationshipId,
            checkStatus: r.checkStatus,
          }),
        )
        .map((r) => ({
          evidence_id: r.evidenceId,
          relationship_id: r.relationshipId,
          claim_support: r.claimSupport,
          curation: "approved" as const,
          label: r.pmid ? `PMID ${r.pmid}` : (r.sourceRef ?? r.evidenceId),
          url: r.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/` : "#",
          reviewed_at: r.reviewedAt?.toISOString?.() ?? null,
        }));

      const exemplar = EXEMPLAR_PATHWAYS.map((p) => {
        const report = reportExemplar(p, cites);
        const openP0 = EXEMPLAR_CURATOR_TARGETS.filter(
          (t) => t.pathwayId === p.id && report.uniqueRelIds.includes(t.relId) && !report.edgeReviews.some((e) => e.relId === t.relId && e.review === "approved"),
        ).length;
        return {
          pathwayId: p.id,
          title: p.title,
          uniqueEdges: report.uniqueRelIds.length,
          approvedEdges: report.approvedEdgeCount,
          maturity: report.maturity,
          openP0Targets: openP0,
        };
      });

      return {
        fetchedAt: new Date().toISOString(),
        runtimeRelationships: snap.runtimeRelationships,
        approvedSupportsRows: Number(agg?.approved_supports ?? 0),
        distinctGateCRels: Number(agg?.distinct_gate_c ?? 0),
        contradicts: Number(agg?.contradicts ?? 0),
        partial: Number(agg?.partial ?? 0),
        unreviewed: Number(agg?.unreviewed ?? 0),
        totalEvidenceRows: Number(agg?.total ?? 0),
        exemplar,
        openP0Targets: exemplar.reduce((n, e) => n + e.openP0Targets, 0),
      };
    } catch (err) {
      if (err instanceof EvidenceServiceError) throw err;
      throw new EvidenceServiceError(
        "Evidence coverage stats unavailable. This is a database/service error — not a finding that coverage is zero.",
      );
    }
  },
);

/** Loader-friendly wrap: never leave marketing panels on eternal “Loading…”. */
export type EvidenceCoverageLoaderData = {
  coverage: EvidenceCoverageStats | null;
  coverageError: string | null;
};

export async function loadEvidenceCoverage(): Promise<EvidenceCoverageLoaderData> {
  try {
    const coverage = await getEvidenceCoverageStats();
    return { coverage, coverageError: null };
  } catch (err) {
    const coverageError =
      err instanceof Error
        ? err.message
        : "Evidence coverage stats unavailable. This is a database/service error — not a finding that coverage is zero.";
    return { coverage: null, coverageError };
  }
}

const COVERAGE_CLIENT_TIMEOUT_MS = 10_000;

export const evidenceCoverageQuery = queryOptions({
  queryKey: ["evidence-coverage-stats"],
  queryFn: async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        getEvidenceCoverageStats(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(
              new EvidenceServiceError(
                "Evidence coverage stats timed out. This is a service error — not a finding that coverage is zero.",
              ),
            );
          }, COVERAGE_CLIENT_TIMEOUT_MS);
        }),
      ]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  },
  staleTime: 60_000,
  retry: 1,
});

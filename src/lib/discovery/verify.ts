/**
 * Phase 3 — Scientific verification (engineering).
 * Deterministic provenance / coverage / conflict checks.
 * Never auto-emits reviewed_gap. LLM drafts are optional and must be labelled.
 */
import { byId, edgeByRel } from "@/lib/immune/engine";
import { assertDetectionEmitStatus, isResearchGapStatus } from "@/lib/discovery/gapStatus";
import type {
  ResearchGapCandidate,
  ResearchGapStatus,
  SearchScope,
} from "@/lib/discovery/types";

export const VERIFICATION_POLICY = {
  autoReviewedGap: false as const,
  fabricatesPapers: false as const,
  prefersDeterministic: true as const,
  /** Any LLM wording must be tagged — never authoritative for status. */
  aiAssistedMustBeLabelled: true as const,
  llmOptional: true as const,
} as const;

export type ProvenanceCheck = {
  id: string;
  ok: boolean;
  detail: string;
};

export type ConflictContext = {
  present: boolean;
  relationshipId: string | null;
  graphEvidenceStatus: string | null;
  note: string;
};

export type SearchCoverageDraft = {
  gapKey: string;
  conceptId: string | null;
  relationshipId: string | null;
  searchAttempted: boolean;
  /** null = unknown — never coerce to 0. */
  hitCount: number | null;
  queryText: string | null;
  scopeNote: string;
};

export type VerificationReport = {
  gapKey: string;
  statusAllowedForDetection: boolean;
  provenance: ProvenanceCheck[];
  conflict: ConflictContext;
  coverage: SearchCoverageDraft;
  /** Always false — promotion is human-only. */
  autoReviewed: false;
  /** Engineering verdict only — not scientific SME sign-off. */
  engineeringReadyForHumanReview: boolean;
  aiAssisted: false | { labelled: true; role: "draft_only" };
  note: string;
};

function hasFabricatedPmid(detail: Record<string, unknown>): boolean {
  const raw = JSON.stringify(detail);
  return /"pmid"\s*:\s*"\d+"/i.test(raw) || /"pmid"\s*:\s*\d+/i.test(raw);
}

function scopeIsDocumented(scope: SearchScope | null | undefined): boolean {
  if (!scope) return false;
  return Boolean(scope.corpus?.trim() && scope.method?.trim() && scope.note?.trim());
}

/** Build conflict context from real graph/detection signals only. */
export function conflictContextForGap(gap: ResearchGapCandidate): ConflictContext {
  const relId = gap.relationshipId;
  const edge = relId ? edgeByRel[relId] : undefined;
  const fromLabel = gap.coverageLabel === "conflicting" || gap.detectionSource === "conflict";
  const graphStatus = edge?.evidence_status ?? null;
  const present = fromLabel || graphStatus === "conflicting";
  return {
    present,
    relationshipId: relId,
    graphEvidenceStatus: graphStatus,
    note: present
      ? "Conflict / competing signals are recorded inside ISI curated coverage — resolve via human review, not auto-promotion."
      : "No conflict signal on this candidate from detection labels or linked graph edge evidence_status.",
  };
}

/** Shape a search-coverage row draft — hitCount stays null unless a real count is supplied. */
export function draftSearchCoverage(
  gap: ResearchGapCandidate,
  opts?: { hitCount?: number | null; searchAttempted?: boolean; queryText?: string | null },
): SearchCoverageDraft {
  const hitCount = opts?.hitCount === undefined ? null : opts.hitCount;
  return {
    gapKey: gap.gapKey,
    conceptId: gap.subjectId ?? gap.diseaseId,
    relationshipId: gap.relationshipId,
    searchAttempted: opts?.searchAttempted ?? Boolean(gap.searchScope?.method),
    hitCount,
    queryText: opts?.queryText ?? (gap.subjectId ? `ISI coverage for ${gap.subjectId}` : null),
    scopeNote: gap.searchScope?.note ??
      "ISI curated coverage — not a claim that literature is absent worldwide.",
  };
}

/**
 * Run deterministic verification for a candidate.
 * Does not write Neon; server fns persist coverage / events separately.
 */
export function verifyGapCandidate(
  gap: ResearchGapCandidate,
  opts?: { aiDraft?: string | null },
): VerificationReport {
  const emitGuard = assertDetectionEmitStatus(gap.status);
  const provenance: ProvenanceCheck[] = [
    {
      id: "documented_search_scope",
      ok: scopeIsDocumented(gap.searchScope),
      detail: scopeIsDocumented(gap.searchScope)
        ? "Search scope corpus/method/note present."
        : "Missing documented search scope.",
    },
    {
      id: "subject_in_graph",
      ok: !gap.subjectId || Boolean(byId[gap.subjectId]),
      detail: gap.subjectId
        ? byId[gap.subjectId]
          ? `Subject ${gap.subjectId} resolves in curated graph.`
          : `Subject ${gap.subjectId} is not a known graph concept id.`
        : "No subject id (allowed for some coverage rows).",
    },
    {
      id: "object_in_graph",
      ok: !gap.objectId || Boolean(byId[gap.objectId]),
      detail: gap.objectId
        ? byId[gap.objectId]
          ? `Object ${gap.objectId} resolves in curated graph.`
          : `Object ${gap.objectId} is not a known graph concept id.`
        : "No object id.",
    },
    {
      id: "relationship_in_graph",
      ok: !gap.relationshipId || Boolean(edgeByRel[gap.relationshipId]),
      detail: gap.relationshipId
        ? edgeByRel[gap.relationshipId]
          ? `Relationship ${gap.relationshipId} resolves in curated graph.`
          : `Relationship ${gap.relationshipId} is not a known graph edge.`
        : "No relationship id.",
    },
    {
      id: "no_fabricated_pmid",
      ok: !hasFabricatedPmid(gap.detectionDetail ?? {}),
      detail: hasFabricatedPmid(gap.detectionDetail ?? {})
        ? "detectionDetail contains a pmid-like field — verification refuses fabricated locators."
        : "No pmid field invented in detectionDetail.",
    },
    {
      id: "not_auto_reviewed",
      ok: gap.autoReviewed === false,
      detail: "Candidate carries autoReviewed=false.",
    },
  ];

  const conflict = conflictContextForGap(gap);
  const coverage = draftSearchCoverage(gap);
  const provenanceOk = provenance.every((p) => p.ok);
  const engineeringReadyForHumanReview = Boolean(emitGuard.ok) && provenanceOk;

  const aiAssisted: VerificationReport["aiAssisted"] =
    opts?.aiDraft && opts.aiDraft.trim()
      ? { labelled: true, role: "draft_only" }
      : false;

  return {
    gapKey: gap.gapKey,
    statusAllowedForDetection: emitGuard.ok,
    provenance,
    conflict,
    coverage,
    autoReviewed: false,
    engineeringReadyForHumanReview,
    aiAssisted,
    note: engineeringReadyForHumanReview
      ? "Engineering verification passed. Human scientific review is still required before reviewed_gap."
      : "Engineering verification found issues — keep as candidate/coverage_insufficient; do not promote.",
  };
}

/** Enforce coverage taxonomy on any proposed status write. */
export function assertCoverageTaxonomyStatus(
  status: string,
): { ok: true; status: ResearchGapStatus } | { ok: false; error: string } {
  if (!isResearchGapStatus(status)) {
    return { ok: false, error: `Unknown gap status '${status}'.` };
  }
  return { ok: true, status };
}

/** Detection path must never propose reviewed_gap. */
export function refuseAutoReviewedGap(status: string): boolean {
  return status === "reviewed_gap";
}

/**
 * Discovery 3.0 — three gap classes (orthogonal to review status).
 * Misclassification of curation debt as scientific absence or opportunity is forbidden.
 * Reviewed decisions are never auto-overwritten.
 */
import type { DetectionSource, ResearchGapCandidate, ResearchGapStatus } from "@/lib/discovery/types";

export const RESEARCH_GAP_CLASSES = [
  "isi_curation_gap",
  "scientific_evidence_gap",
  "research_opportunity",
] as const;
export type ResearchGapClass = (typeof RESEARCH_GAP_CLASSES)[number];

/** Opportunity lifecycle — separate from research_gaps.status. */
export const OPPORTUNITY_STATUSES = [
  "none",
  "draft",
  "assessed",
  "reviewed_opportunity",
  "rejected_opportunity",
] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export const GAP_CLASS_UI: Record<
  ResearchGapClass,
  { label: string; routeHint: "/sme" | "/curation" | "/discovery"; honesty: string }
> = {
  isi_curation_gap: {
    label: "ISI curation gap",
    routeHint: "/sme",
    honesty:
      "Internal ISI coverage / citation / ontology / relationship inconsistency — route to SME or curation. Not worldwide literature absence.",
  },
  scientific_evidence_gap: {
    label: "Scientific evidence gap",
    routeHint: "/discovery",
    honesty:
      "Limited or inconsistent evidence within a documented search scope. Missing ISI data ≠ missing science worldwide.",
  },
  research_opportunity: {
    label: "Research opportunity",
    routeHint: "/discovery",
    honesty:
      "Testable question derived from an assessed evidence gap. Human review required before reviewed opportunity.",
  },
};

export const GAP_CLASS_POLICY = {
  autoPromoteReviewedOpportunity: false as const,
  autoOverwriteReviewedClass: false as const,
  requireEvidenceAssessmentForOpportunity: true as const,
  /** Insufficient documented coverage blocks confident scientific_evidence_gap. */
  blockScientificGapWithoutCoverage: true as const,
} as const;

export function isResearchGapClass(value: unknown): value is ResearchGapClass {
  return typeof value === "string" && (RESEARCH_GAP_CLASSES as readonly string[]).includes(value);
}

export function isOpportunityStatus(value: unknown): value is OpportunityStatus {
  return typeof value === "string" && (OPPORTUNITY_STATUSES as readonly string[]).includes(value);
}

export type CoverageAssessment = {
  /** True when a literature/registry search was actually attempted for this gap. */
  searchAttempted: boolean;
  /** null = unknown / failed — never coerce to zero. */
  hitCount: number | null;
  scopeDocumented: boolean;
  /** Failed adapter/query — must not be treated as zero evidence. */
  queryFailed?: boolean;
};

export type ClassifyGapClassInput = {
  detectionSource: DetectionSource | string;
  coverageLabel: string | null | undefined;
  status: ResearchGapStatus | ResearchGapCandidate["status"];
  detectionDetail?: Record<string, unknown>;
  coverage?: CoverageAssessment | null;
  /** Only set when evidence assessment produced opportunity fields. */
  opportunity?: {
    rationale?: string | null;
    noveltyNote?: string | null;
    feasibilityNote?: string | null;
    opportunityStatus?: OpportunityStatus | null;
  } | null;
};

/**
 * Deterministic class assignment for new/emitted candidates.
 * Does not promote research_opportunity without assessment text.
 */
export function classifyGapClass(input: ClassifyGapClassInput): {
  gapClass: ResearchGapClass;
  opportunityStatus: OpportunityStatus;
  blockedScientificClaim: boolean;
  reason: string;
} {
  const opp = input.opportunity;
  const hasAssessment = Boolean(
    opp?.rationale?.trim() &&
      opp?.noveltyNote?.trim() &&
      opp?.feasibilityNote?.trim(),
  );
  if (
    hasAssessment &&
    (opp?.opportunityStatus === "assessed" ||
      opp?.opportunityStatus === "draft" ||
      opp?.opportunityStatus === "reviewed_opportunity" ||
      opp?.opportunityStatus === "rejected_opportunity")
  ) {
    return {
      gapClass: "research_opportunity",
      opportunityStatus: opp?.opportunityStatus ?? "assessed",
      blockedScientificClaim: false,
      reason: "Evidence assessment fields present — classed as research_opportunity (human review still required for reviewed_opportunity).",
    };
  }

  const flags = Array.isArray(input.detectionDetail?.flags)
    ? (input.detectionDetail!.flags as unknown[]).map(String)
    : [];
  const curationFlags = new Set([
    "S_P_O_MISMATCH",
    "DRAFT_ESTABLISHED",
    "NO_LOCATOR",
    "GATE_C_PROXY",
    "REJECTED_PMID",
    "TO_BE_CURATED",
  ]);
  const isMatrixCuration =
    input.detectionSource === "melanoma_matrix" ||
    flags.some((f) => curationFlags.has(f));

  if (isMatrixCuration) {
    return {
      gapClass: "isi_curation_gap",
      opportunityStatus: "none",
      blockedScientificClaim: false,
      reason: "Melanoma/matrix or curation flags → isi_curation_gap (SME/curation), not scientific absence.",
    };
  }

  const label = input.coverageLabel ?? "";
  if (label === "awaiting_curation") {
    return {
      gapClass: "isi_curation_gap",
      opportunityStatus: "none",
      blockedScientificClaim: false,
      reason: "Unreviewed / awaiting curation mapped material is an ISI curation gap.",
    };
  }

  const coverage = input.coverage;
  const searchAttempted = coverage?.searchAttempted === true;
  const scopeOk = coverage?.scopeDocumented === true;
  const hitKnown = typeof coverage?.hitCount === "number" && Number.isFinite(coverage.hitCount);
  const queryFailed = coverage?.queryFailed === true;
  const blocked =
    GAP_CLASS_POLICY.blockScientificGapWithoutCoverage &&
    (!searchAttempted || !scopeOk || queryFailed || (!hitKnown && searchAttempted));

  if (label === "insufficient_coverage" || input.status === "coverage_insufficient") {
    return {
      gapClass: "isi_curation_gap",
      opportunityStatus: "none",
      blockedScientificClaim: true,
      reason:
        "Insufficient ISI/Gate C coverage — blocks confident scientific_evidence_gap; treat as curation/coverage incompleteness.",
    };
  }

  if (
    label === "no_direct_evidence_after_search" ||
    label === "conflicting" ||
    label === "no_mapped_evidence" ||
    label === "emerging"
  ) {
    if (blocked || !searchAttempted || !scopeOk) {
      return {
        gapClass: "isi_curation_gap",
        opportunityStatus: "none",
        blockedScientificClaim: true,
        reason:
          "Evidence-gap label without adequate documented search coverage — cannot claim scientific_evidence_gap yet.",
      };
    }
    return {
      gapClass: "scientific_evidence_gap",
      opportunityStatus: "none",
      blockedScientificClaim: false,
      reason: "Documented search scope + evidence-gap label → scientific_evidence_gap within ISI/product scope.",
    };
  }

  if (input.detectionSource === "evidence_gap" || input.detectionSource === "conflict") {
    if (blocked) {
      return {
        gapClass: "isi_curation_gap",
        opportunityStatus: "none",
        blockedScientificClaim: true,
        reason: "Evidence-gap detection without coverage assessment — curation/coverage class.",
      };
    }
    return {
      gapClass: "scientific_evidence_gap",
      opportunityStatus: "none",
      blockedScientificClaim: false,
      reason: "Evidence/conflict detection with documented coverage → scientific_evidence_gap.",
    };
  }

  return {
    gapClass: "isi_curation_gap",
    opportunityStatus: "none",
    blockedScientificClaim: false,
    reason: "Default safe class: isi_curation_gap until search assessment supports otherwise.",
  };
}

export type ReclassifyInput = {
  currentClass: ResearchGapClass | null | undefined;
  currentOpportunityStatus: OpportunityStatus | null | undefined;
  /** Human-reviewed gap or opportunity — must not be auto-changed. */
  reviewLocked: boolean;
  proposed: ClassifyGapClassInput;
};

export type ReclassifyResult =
  | {
      ok: true;
      changed: boolean;
      gapClass: ResearchGapClass;
      opportunityStatus: OpportunityStatus;
      previousClass: ResearchGapClass | null;
      reason: string;
      preservedHistory: true;
    }
  | { ok: false; error: string; preservedHistory: true };

/**
 * Reclassify without destroying provenance: refuses to overwrite reviewed locks;
 * callers must append version/change-event snapshots separately.
 */
export function reclassifyGapClass(input: ReclassifyInput): ReclassifyResult {
  const proposed = classifyGapClass(input.proposed);
  const prev = input.currentClass && isResearchGapClass(input.currentClass) ? input.currentClass : null;
  const prevOpp =
    input.currentOpportunityStatus && isOpportunityStatus(input.currentOpportunityStatus)
      ? input.currentOpportunityStatus
      : "none";

  if (input.reviewLocked || prevOpp === "reviewed_opportunity") {
    return {
      ok: false,
      error:
        "Reviewed gap/opportunity class is locked — human decision never auto-overwritten. Append notes via review workflow only.",
      preservedHistory: true,
    };
  }

  if (prev === proposed.gapClass && prevOpp === proposed.opportunityStatus) {
    return {
      ok: true,
      changed: false,
      gapClass: proposed.gapClass,
      opportunityStatus: proposed.opportunityStatus,
      previousClass: prev,
      reason: proposed.reason,
      preservedHistory: true,
    };
  }

  return {
    ok: true,
    changed: true,
    gapClass: proposed.gapClass,
    opportunityStatus: proposed.opportunityStatus,
    previousClass: prev,
    reason: proposed.reason,
    preservedHistory: true,
  };
}

/** Assign class onto a detection candidate (pure). */
export function withGapClass(
  candidate: ResearchGapCandidate,
  coverage?: CoverageAssessment | null,
): ResearchGapCandidate & {
  gapClass: ResearchGapClass;
  opportunityStatus: OpportunityStatus;
  classReason: string;
} {
  const classified = classifyGapClass({
    detectionSource: candidate.detectionSource,
    coverageLabel: candidate.coverageLabel,
    status: candidate.status,
    detectionDetail: candidate.detectionDetail,
    coverage: coverage ?? {
      searchAttempted: false,
      hitCount: null,
      scopeDocumented: Boolean(candidate.searchScope?.note),
    },
  });
  return {
    ...candidate,
    gapClass: classified.gapClass,
    opportunityStatus: classified.opportunityStatus,
    classReason: classified.reason,
  };
}

/** Regression helpers — explicit forbidden transitions. */
export function assertNotMisclassified(input: {
  from: ResearchGapClass;
  to: ResearchGapClass;
  context: string;
}): { ok: true } | { ok: false; error: string } {
  // Curation debt must not jump to opportunity without assessment (enforced elsewhere);
  // scientific gap must not be labelled from failed queries as zero-evidence worldwide.
  if (input.from === "isi_curation_gap" && input.to === "research_opportunity") {
    return {
      ok: false,
      error: `Misclassification blocked (${input.context}): isi_curation_gap → research_opportunity requires evidence assessment, not silent reclass.`,
    };
  }
  return { ok: true };
}

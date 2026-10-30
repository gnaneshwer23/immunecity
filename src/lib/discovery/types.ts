/**
 * Browser-safe Discovery Intelligence types.
 * Persistence lives in Neon via schema.server.ts + *.functions.ts.
 */

export const RESEARCH_ENTITLEMENTS = ["free", "researcher_pro"] as const;
export type ResearchEntitlement = (typeof RESEARCH_ENTITLEMENTS)[number];

export const RESEARCH_GAP_STATUSES = [
  "candidate",
  "coverage_insufficient",
  "needs_context",
  "rejected",
  "reviewed_gap",
  "superseded",
] as const;
export type ResearchGapStatus = (typeof RESEARCH_GAP_STATUSES)[number];

/** Statuses detection may emit without a human reviewer. */
export const AUTO_EMIT_GAP_STATUSES = ["candidate", "coverage_insufficient"] as const;
export type AutoEmitGapStatus = (typeof AUTO_EMIT_GAP_STATUSES)[number];

export const GAP_REVIEW_DECISIONS = [
  "promote_reviewed",
  "reject",
  "needs_context",
  "demote",
] as const;
export type GapReviewDecision = (typeof GAP_REVIEW_DECISIONS)[number];

export const DETECTION_SOURCES = [
  "melanoma_matrix",
  "evidence_gap",
  "conflict",
  "trial_signal",
] as const;
export type DetectionSource = (typeof DETECTION_SOURCES)[number];

export type SearchScope = {
  corpus: string;
  method: string;
  dateScope: string;
  note: string;
};

export const DEFAULT_ISI_SEARCH_SCOPE: SearchScope = {
  corpus: "ISI curated graph + melanoma pilot validation matrix + Neon evidence_records when available",
  method: "deterministic Detection from documented ISI signals",
  dateScope: "repository audit baseline 2026-10-30",
  note: "Reflects ISI curated coverage and documented pilots — not a claim that no literature exists worldwide.",
};

export type ResearchGapCandidate = {
  gapKey: string;
  title: string;
  summary: string;
  status: AutoEmitGapStatus;
  pilot: "melanoma_a" | "coverage_b" | null;
  subjectId: string | null;
  objectId: string | null;
  relationshipId: string | null;
  diseaseId: string | null;
  whyItMatters: string;
  searchScope: SearchScope;
  detectionSource: DetectionSource;
  detectionDetail: Record<string, unknown>;
  coverageLabel: string | null;
  /** Always false until a human reviewer promotes. */
  autoReviewed: false;
};

export type ResearchProfileDraft = {
  displayLabel: string | null;
  focusDiseases: string[];
  focusDomains: string[];
  modalities: string[];
  interests: Record<string, unknown>;
};

export type ResearchProfileRow = ResearchProfileDraft & {
  id: string;
  userId: string;
  entitlement: ResearchEntitlement;
  createdAt: string;
  updatedAt: string;
};

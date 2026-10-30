/**
 * Research gap status transitions.
 * Detection may only emit candidate | coverage_insufficient.
 * reviewed_gap requires an explicit human review decision — never auto.
 */
import {
  AUTO_EMIT_GAP_STATUSES,
  GAP_REVIEW_DECISIONS,
  RESEARCH_GAP_STATUSES,
  type AutoEmitGapStatus,
  type GapReviewDecision,
  type ResearchGapStatus,
} from "@/lib/discovery/types";

export const GAP_STATUS_ACCESS = {
  autoApproveReviewedGap: false as const,
  humanReviewRequiredForReviewedGap: true as const,
  bulkApprovePath: null,
};

export function isResearchGapStatus(value: unknown): value is ResearchGapStatus {
  return typeof value === "string" && (RESEARCH_GAP_STATUSES as readonly string[]).includes(value);
}

export function isAutoEmitGapStatus(value: unknown): value is AutoEmitGapStatus {
  return typeof value === "string" && (AUTO_EMIT_GAP_STATUSES as readonly string[]).includes(value);
}

export function isGapReviewDecision(value: unknown): value is GapReviewDecision {
  return typeof value === "string" && (GAP_REVIEW_DECISIONS as readonly string[]).includes(value);
}

/** Map evidence-gap labels onto Discovery statuses without inventing worldwide absence. */
export function statusFromCoverageLabel(
  label: string | null | undefined,
): AutoEmitGapStatus {
  if (label === "insufficient_coverage") return "coverage_insufficient";
  return "candidate";
}

export type GapTransitionInput = {
  from: ResearchGapStatus;
  decision: GapReviewDecision;
  /** Must be true for promote_reviewed — mirrors reviewer role gate. */
  actorIsReviewer: boolean;
};

export type GapTransitionResult =
  | { ok: true; to: ResearchGapStatus; autoApproved: false }
  | { ok: false; error: string };

/**
 * Apply a human review decision. Refuses promote_reviewed without reviewer power.
 * Never returns reviewed_gap from a non-promote path.
 */
export function applyGapReviewDecision(input: GapTransitionInput): GapTransitionResult {
  const { from, decision, actorIsReviewer } = input;
  if (!isResearchGapStatus(from)) {
    return { ok: false, error: "Unknown current gap status." };
  }
  if (!isGapReviewDecision(decision)) {
    return { ok: false, error: "Unknown review decision." };
  }
  if (from === "superseded") {
    return { ok: false, error: "Superseded gaps cannot be reviewed in place." };
  }
  if (!actorIsReviewer) {
    return { ok: false, error: "Only scientific reviewers and administrators can change gap review status." };
  }

  if (decision === "promote_reviewed") {
    if (from === "rejected" || from === "reviewed_gap") {
      return { ok: false, error: `Cannot promote from status ${from}.` };
    }
    return { ok: true, to: "reviewed_gap", autoApproved: false };
  }
  if (decision === "reject") {
    return { ok: true, to: "rejected", autoApproved: false };
  }
  if (decision === "needs_context") {
    return { ok: true, to: "needs_context", autoApproved: false };
  }
  // demote — return to candidate (honest unreviewed)
  if (from === "reviewed_gap" || from === "needs_context" || from === "rejected") {
    return { ok: true, to: "candidate", autoApproved: false };
  }
  return { ok: true, to: "candidate", autoApproved: false };
}

/** Detection emit guard — never allows reviewed_gap. */
export function assertDetectionEmitStatus(
  status: ResearchGapStatus,
): { ok: true; status: AutoEmitGapStatus } | { ok: false; error: string } {
  if (!isAutoEmitGapStatus(status)) {
    return {
      ok: false,
      error: `Detection cannot emit status '${status}'. Only candidate or coverage_insufficient are allowed; reviewed_gap requires human review.`,
    };
  }
  return { ok: true, status };
}

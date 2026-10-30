/**
 * Human-only opportunity status transitions.
 * Never auto-promotes reviewed_opportunity. Orthogonal to research_gaps.status / Gate C.
 */
import {
  GAP_CLASS_POLICY,
  isOpportunityStatus,
  type OpportunityStatus,
  type ResearchGapClass,
} from "@/lib/discovery/gapClass";

export const OPPORTUNITY_REVIEW_DECISIONS = [
  "promote_reviewed_opportunity",
  "reject_opportunity",
  "demote_opportunity",
] as const;
export type OpportunityReviewDecision = (typeof OPPORTUNITY_REVIEW_DECISIONS)[number];

export function isOpportunityReviewDecision(v: unknown): v is OpportunityReviewDecision {
  return typeof v === "string" && (OPPORTUNITY_REVIEW_DECISIONS as readonly string[]).includes(v);
}

export type OpportunityTransitionInput = {
  from: OpportunityStatus;
  decision: OpportunityReviewDecision;
  actorIsReviewer: boolean;
  gapClass: ResearchGapClass | string | null | undefined;
};

export type OpportunityTransitionResult =
  | { ok: true; to: OpportunityStatus; autoApproved: false }
  | { ok: false; error: string };

/**
 * Apply a human opportunity review. Refuses without reviewer power.
 * Promote only from assessed/draft when class is research_opportunity.
 */
export function applyOpportunityReviewDecision(
  input: OpportunityTransitionInput,
): OpportunityTransitionResult {
  const { from, decision, actorIsReviewer, gapClass } = input;
  if (!isOpportunityStatus(from)) {
    return { ok: false, error: "Unknown current opportunity status." };
  }
  if (!isOpportunityReviewDecision(decision)) {
    return { ok: false, error: "Unknown opportunity review decision." };
  }
  if (!actorIsReviewer) {
    return {
      ok: false,
      error: "Only scientific reviewers and administrators can change opportunity review status.",
    };
  }
  if (GAP_CLASS_POLICY.autoPromoteReviewedOpportunity) {
    return { ok: false, error: "autoPromoteReviewedOpportunity must stay false." };
  }

  if (decision === "promote_reviewed_opportunity") {
    if (gapClass !== "research_opportunity") {
      return {
        ok: false,
        error: "reviewed_opportunity only applies to research_opportunity class gaps.",
      };
    }
    if (from !== "assessed" && from !== "draft") {
      return {
        ok: false,
        error: `Cannot promote opportunity from status ${from} (need assessed or draft).`,
      };
    }
    return { ok: true, to: "reviewed_opportunity", autoApproved: false };
  }

  if (decision === "reject_opportunity") {
    if (gapClass !== "research_opportunity" && from === "none") {
      return { ok: false, error: "No opportunity lifecycle to reject." };
    }
    return { ok: true, to: "rejected_opportunity", autoApproved: false };
  }

  // demote — return to assessed when previously reviewed/rejected; else assessed
  if (from === "reviewed_opportunity" || from === "rejected_opportunity") {
    return { ok: true, to: "assessed", autoApproved: false };
  }
  if (from === "none") {
    return { ok: false, error: "Cannot demote opportunity from none." };
  }
  return { ok: true, to: "assessed", autoApproved: false };
}

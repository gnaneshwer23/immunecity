/**
 * Evidence Intel 4.0 — Confidence-based review routing.
 * Low / moderate / high risk routes; high risk wires to SME.
 * High model confidence never overrides missing evidence or required SME review.
 */
import type { ClaimVerificationBundle } from "@/lib/discovery/claimVerifier";
import type { CrossExaminationReport } from "@/lib/discovery/crossExamine";
import type { VerifiedOpportunityDraft } from "@/lib/discovery/verifiedGaps";

export const REVIEW_ROUTING_POLICY = {
  highConfidenceOverridesMissingEvidence: false as const,
  highConfidenceOverridesSmeReview: false as const,
  autoGateC: false as const,
  autoReviewedOpportunity: false as const,
  autoApprove: false as const,
} as const;

export type ReviewRisk = "low" | "moderate" | "high";

export type ReviewRoute =
  | {
      risk: "low";
      destination: "workbench_queue" | "background_hold";
      smeRequired: false;
      autoApprove: false;
      reason: string;
      href: string;
    }
  | {
      risk: "moderate";
      destination: "discovery_dossier";
      smeRequired: false;
      /** Moderate may *recommend* SME but does not auto-skip human when contested. */
      smeRecommended: true;
      autoApprove: false;
      reason: string;
      href: string;
    }
  | {
      risk: "high";
      destination: "sme";
      smeRequired: true;
      autoApprove: false;
      reason: string;
      href: string;
    };

export type RoutingInput = {
  gapKey: string;
  verification: ClaimVerificationBundle;
  crossExam: CrossExaminationReport;
  draft?: VerifiedOpportunityDraft | null;
  /** Declared model/system confidence — cannot force low-risk when evidence missing. */
  modelConfidence?: "low" | "moderate" | "high";
};

/**
 * Deterministic risk routing.
 *
 * High risk → /sme when: support or contradict present, demotions from prior support,
 * adjudicator route_sme, or causal/clinical stakes with incomplete facets.
 *
 * Moderate → dossier with SME recommended when mixed/uncertain but some verified signal.
 *
 * Low → workbench/background hold when only background or empty after abstain with no claims.
 *
 * Declared high modelConfidence NEVER downgrades high/moderate when evidence insufficient.
 */
export function routeForReview(input: RoutingInput): ReviewRoute {
  const v = input.verification.counts;
  const adj = input.crossExam.adjudicator.recommendedHumanAction;
  const declared = input.modelConfidence ?? "moderate";
  const gapKey = encodeURIComponent(input.gapKey);

  const missingEvidence = v.support + v.contradict === 0;
  const contested =
    v.demotedFromPriorSupport > 0 ||
    (v.support > 0 && v.abstained > 0) ||
    (v.support > 0 && v.contradict > 0) ||
    adj === "route_sme";

  const highStakes =
    contested ||
    v.support > 0 ||
    v.contradict > 0 ||
    adj === "route_sme" ||
    (input.draft?.gapClass === "research_opportunity" && input.draft.opportunityStatus === "assessed");

  // High model confidence cannot override missing evidence → keep/escalate risk.
  if (declared === "high" && missingEvidence) {
    return {
      risk: "high",
      destination: "sme",
      smeRequired: true,
      autoApprove: false,
      reason:
        "Declared high model confidence with missing verified support/contradict — confidence does not override missing evidence; route to SME.",
      href: `/sme?gapKey=${gapKey}`,
    };
  }

  if (highStakes) {
    return {
      risk: "high",
      destination: "sme",
      smeRequired: true,
      autoApprove: false,
      reason: [
        "High-risk scientific claim path: verified support/contradict, prior-support demotion, or adjudicator SME route.",
        `counts support=${v.support} contradict=${v.contradict} demoted=${v.demotedFromPriorSupport}.`,
        "Auto-approve forbidden.",
      ].join(" "),
      href: `/sme?gapKey=${gapKey}`,
    };
  }

  if (
    adj === "needs_more_evidence" ||
    v.insufficient > 0 ||
    v.abstained > 0 ||
    input.draft?.gapClass === "scientific_evidence_gap"
  ) {
    return {
      risk: "moderate",
      destination: "discovery_dossier",
      smeRequired: false,
      smeRecommended: true,
      autoApprove: false,
      reason:
        "Moderate risk: documented uncertainty / abstain-heavy verification — hold on dossier with SME recommended; no auto-approve.",
      href: `/discovery/gaps/${gapKey}`,
    };
  }

  if (adj === "background_only" || (v.background > 0 && missingEvidence)) {
    return {
      risk: "low",
      destination: "background_hold",
      smeRequired: false,
      autoApprove: false,
      reason: "Low risk: background-only topical hits — no support claims to approve.",
      href: `/discovery/gaps/${gapKey}`,
    };
  }

  return {
    risk: "low",
    destination: "workbench_queue",
    smeRequired: false,
    autoApprove: false,
    reason: "Low risk default hold — workbench review queue; never auto-approve.",
    href: `/workbench?gapKey=${gapKey}`,
  };
}

export function assertNoAutoApprove(route: ReviewRoute): { ok: true } | { ok: false; error: string } {
  if (route.autoApprove) {
    return { ok: false, error: "autoApprove must be false — Gate C / reviewed_opportunity forbidden." };
  }
  if ("smeRequired" in route && route.risk === "high" && !route.smeRequired) {
    return { ok: false, error: "High risk routes must require SME." };
  }
  return { ok: true };
}

/**
 * Evidence Intel 4.0 — Gap / opportunity discovery from verified assessments only.
 * Candidate ≠ approved. Novelty scoped. Never auto reviewed_opportunity / Gate C.
 */
import type { ClaimVerificationBundle } from "@/lib/discovery/claimVerifier";
import type { CrossExaminationReport } from "@/lib/discovery/crossExamine";
import {
  classifyGapClass,
  type OpportunityStatus,
  type ResearchGapClass,
} from "@/lib/discovery/gapClass";
import type { ResearchGapCandidate, SearchScope } from "@/lib/discovery/types";

export const VERIFIED_GAP_POLICY = {
  autoReviewedOpportunity: false as const,
  autoGateC: false as const,
  candidateMeansApproved: false as const,
  requireDocumentedUncertainty: true as const,
  requireTestableQuestion: true as const,
  inventPmids: false as const,
} as const;

export type VerifiedOpportunityDraft = {
  gapKey: string;
  title: string;
  researchQuestion: string;
  whyItMatters: string;
  gapClass: ResearchGapClass;
  opportunityStatus: OpportunityStatus;
  /** Always candidate-class status — never reviewed_gap / reviewed_opportunity here. */
  reviewStatus: "candidate";
  rationale: string;
  noveltyNote: string;
  feasibilityNote: string;
  uncertaintyDocumented: boolean;
  testableQuestion: boolean;
  noveltyChecks: {
    literatureScoped: true;
    trialsScoped: true;
    confidentGlobalNovelty: false;
    note: string;
  };
  verificationCounts: ClaimVerificationBundle["counts"];
  adjudicatorAction: CrossExaminationReport["adjudicator"]["recommendedHumanAction"];
  smeConfirmed: false;
  autoApproved: false;
};

export type VerifiedGapDiscoveryResult =
  | { emit: true; draft: VerifiedOpportunityDraft; reason: string }
  | { emit: false; reason: string; draft: null };

export const VERIFIED_SEARCH_SCOPE: SearchScope = {
  corpus: "Evidence Intel 4.0 verified assessments (PubMed / Europe PMC / CT.gov within documented scout strategies)",
  method: "Claim Verifier facets + A/B/C/D cross-examination scaffolds",
  dateScope: "intel4 2026-10-30",
  note: "Opportunities only from documented uncertainty + testable questions after verification. Candidate ≠ approved. Not worldwide literature absence.",
};

/**
 * Emit an opportunity draft only when uncertainty is documented and the question is testable.
 * Uses verified counts — not loose 3.0 keyword support tallies.
 */
export function discoverOpportunityFromVerified(input: {
  gapKey: string;
  title: string;
  researchQuestion: string;
  whyItMatters: string;
  verification: ClaimVerificationBundle;
  crossExam: CrossExaminationReport;
  subjectId?: string | null;
  objectId?: string | null;
  relationshipId?: string | null;
  diseaseId?: string | null;
  pilot?: "melanoma_a" | "coverage_b" | "custom";
}): VerifiedGapDiscoveryResult {
  const q = input.researchQuestion.trim();
  const testableQuestion = q.length > 40 && /\?/.test(q);
  if (!testableQuestion) {
    return {
      emit: false,
      reason: "No testable research question (need substantive question ending with ?).",
      draft: null,
    };
  }

  const uncertaintyDocumented =
    input.verification.counts.abstained > 0 ||
    input.verification.counts.insufficient > 0 ||
    input.verification.counts.contradict > 0 ||
    input.crossExam.adjudicator.openQuestions.length > 0 ||
    (input.verification.counts.support > 0 && input.verification.counts.demotedFromPriorSupport > 0);

  if (!uncertaintyDocumented && input.verification.counts.support === 0) {
    return {
      emit: false,
      reason:
        "No documented uncertainty and no verified support — refuse to invent an opportunity from empty assessment.",
      draft: null,
    };
  }

  // Need at least identifier-validated works in scope — never invent PMIDs.
  if (input.verification.counts.identifierValidated === 0) {
    return {
      emit: false,
      reason: "No identifier-validated works — cannot emit opportunity (no invented PMIDs).",
      draft: null,
    };
  }

  const rationale = [
    `Documented uncertainty from Claim Verifier + adjudicator (not consensus-as-truth).`,
    `Verified counts: support=${input.verification.counts.support}, contradict=${input.verification.counts.contradict},`,
    `insufficient=${input.verification.counts.insufficient}, abstained=${input.verification.counts.abstained},`,
    `demotedFromPriorSupport=${input.verification.counts.demotedFromPriorSupport}.`,
    `Adjudicator: ${input.crossExam.adjudicator.uncertaintySummary.slice(0, 280)}`,
    "Candidate only — human SME required before reviewed_opportunity. No Gate C auto-approve.",
  ].join(" ");

  const noveltyNote = [
    "Scoped novelty check vs literature/trials inside documented scout strategies only.",
    "Not a claim of global scientific novelty. Prior work may exist outside this scope.",
    `Trials scoped hook: CT.gov queries in scout strategy (hit counts may be null if fail-closed).`,
  ].join(" ");

  const feasibilityNote = [
    `Next engineering steps: SME review at /sme?gapKey=${encodeURIComponent(input.gapKey)}`,
    `and dossier /discovery/gaps/${encodeURIComponent(input.gapKey)}.`,
    "Feasibility is structural — SME confirms scientific merit. No auto-approve.",
  ].join(" ");

  const coverageLabel =
    input.verification.counts.contradict > 0 && input.verification.counts.support > 0
      ? "conflicting"
      : input.verification.counts.support > 0
        ? "emerging"
        : "no_direct_evidence_after_search";

  const classified = classifyGapClass({
    detectionSource: "evidence_gap",
    coverageLabel,
    status: "candidate",
    detectionDetail: {
      flags: ["EVIDENCE_INTEL_4_VERIFIED"],
      verificationCounts: input.verification.counts,
      adjudicatorAction: input.crossExam.adjudicator.recommendedHumanAction,
    },
    coverage: {
      searchAttempted: true,
      hitCount: input.verification.counts.retrieved,
      scopeDocumented: true,
      queryFailed: false,
    },
    opportunity: {
      rationale,
      noveltyNote,
      feasibilityNote,
      opportunityStatus: "assessed",
    },
  });

  // Prefer research_opportunity when assessment complete; else scientific_evidence_gap if warranted.
  let gapClass = classified.gapClass;
  let opportunityStatus = classified.opportunityStatus;

  // If verifier found no support/contradict, keep as scientific_evidence_gap with opportunity none
  // when uncertainty is the point (coverage/directness gap).
  if (
    input.verification.counts.support === 0 &&
    input.verification.counts.contradict === 0 &&
    uncertaintyDocumented
  ) {
    gapClass = "scientific_evidence_gap";
    opportunityStatus = "none";
  }

  if (gapClass !== "scientific_evidence_gap" && gapClass !== "research_opportunity") {
    return {
      emit: false,
      reason: `Classification blocked emission: ${classified.reason}`,
      draft: null,
    };
  }

  const draft: VerifiedOpportunityDraft = {
    gapKey: input.gapKey,
    title: input.title,
    researchQuestion: q,
    whyItMatters: input.whyItMatters,
    gapClass,
    opportunityStatus,
    reviewStatus: "candidate",
    rationale,
    noveltyNote,
    feasibilityNote,
    uncertaintyDocumented,
    testableQuestion,
    noveltyChecks: {
      literatureScoped: true,
      trialsScoped: true,
      confidentGlobalNovelty: false,
      note: noveltyNote,
    },
    verificationCounts: input.verification.counts,
    adjudicatorAction: input.crossExam.adjudicator.recommendedHumanAction,
    smeConfirmed: false,
    autoApproved: false,
  };

  return {
    emit: true,
    draft,
    reason:
      gapClass === "research_opportunity"
        ? "Emitted unreviewed research_opportunity candidate from verified assessment (not approved)."
        : "Emitted scientific_evidence_gap candidate from documented uncertainty (not approved).",
  };
}

/** Shape a ResearchGapCandidate from a verified draft — status stays candidate. */
export function candidateFromVerifiedDraft(
  draft: VerifiedOpportunityDraft,
  opts?: {
    subjectId?: string | null;
    objectId?: string | null;
    relationshipId?: string | null;
    diseaseId?: string | null;
    pilot?: "melanoma_a" | "coverage_b" | null;
  },
): ResearchGapCandidate {
  return {
    gapKey: draft.gapKey,
    title: draft.title,
    summary: draft.researchQuestion,
    status: "candidate",
    detectionSource: "evidence_gap",
    pilot: opts?.pilot ?? null,
    subjectId: opts?.subjectId ?? null,
    objectId: opts?.objectId ?? null,
    relationshipId: opts?.relationshipId ?? null,
    diseaseId: opts?.diseaseId ?? null,
    coverageLabel:
      draft.verificationCounts.contradict > 0 && draft.verificationCounts.support > 0
        ? "conflicting"
        : draft.verificationCounts.support > 0
          ? "emerging"
          : "no_direct_evidence_after_search",
    searchScope: VERIFIED_SEARCH_SCOPE,
    whyItMatters: draft.whyItMatters,
    detectionDetail: {
      flags: ["EVIDENCE_INTEL_4_VERIFIED"],
      opportunityStatus: draft.opportunityStatus,
      gapClass: draft.gapClass,
      autoApproved: false,
      verificationCounts: draft.verificationCounts,
    },
    autoReviewed: false,
    gapClass: draft.gapClass,
    opportunityStatus: draft.opportunityStatus,
  };
}

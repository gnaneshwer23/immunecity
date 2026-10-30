/**
 * Evidence Intel 4.0 — Multi-agent cross-examination.
 * Roles: A Advocate / B Skeptic / C Methodology / D Adjudicator.
 * Independently testable; citations + structured reasoning.
 * Adjudicator emits uncertainty — never consensus-as-truth.
 * Deterministic scaffolds by default; optional LLM must be labelled AI-assisted.
 */
import type { ClaimVerification, ClaimVerificationBundle } from "@/lib/discovery/claimVerifier";

export const CROSS_EXAM_POLICY = {
  consensusIsTruth: false as const,
  autoGateC: false as const,
  autoReviewedOpportunity: false as const,
  llmDefault: false as const,
  aiAssistedMustBeLabelled: true as const,
  prefersDeterministicScaffolds: true as const,
} as const;

export type CrossExamRole = "advocate" | "skeptic" | "methodology" | "adjudicator";

export type CrossExamCitation = {
  pmid: string | null;
  doi: string | null;
  workKey: string;
  classification: string;
  passageExcerpt: string;
};

export type RoleBrief = {
  role: CrossExamRole;
  /** Structured reasoning — not a truth claim. */
  reasoning: string[];
  citations: CrossExamCitation[];
  /** Engineering stance only. */
  stance: string;
  aiAssisted: false | { labelled: true; role: "draft_only" };
  smeConfirmed: false;
};

export type AdjudicatorSummary = {
  role: "adjudicator";
  /** Explicitly not a consensus verdict of scientific truth. */
  consensusAsTruth: false;
  uncertaintySummary: string;
  openQuestions: string[];
  agreementNotes: string[];
  disagreementNotes: string[];
  recommendedHumanAction: "route_sme" | "needs_more_evidence" | "background_only" | "hold";
  citations: CrossExamCitation[];
  aiAssisted: false | { labelled: true; role: "draft_only" };
  smeConfirmed: false;
};

export type CrossExaminationReport = {
  questionKey: string;
  proposition: string;
  advocate: RoleBrief;
  skeptic: RoleBrief;
  methodology: RoleBrief;
  adjudicator: AdjudicatorSummary;
  policy: typeof CROSS_EXAM_POLICY;
  /** Bundle counts for provenance — not accuracy metrics. */
  verificationCounts: ClaimVerificationBundle["counts"];
};

function citeFrom(v: ClaimVerification): CrossExamCitation {
  return {
    pmid: v.pmid,
    doi: v.doi,
    workKey: v.workKey,
    classification: v.classification,
    passageExcerpt: v.passage.text.slice(0, 200),
  };
}

/** Role A — Advocate: argues from verified support passages only. */
export function runAdvocate(bundle: ClaimVerificationBundle): RoleBrief {
  const supports = bundle.verifications.filter((v) => v.classification === "support");
  const reasoning: string[] = [
    "Advocate considers only Claim Verifier classifications of support (engineering screen).",
    `Support count in this bundle: ${supports.length} of ${bundle.counts.retrieved} retrieved (not a gold-label accuracy).`,
  ];
  if (supports.length === 0) {
    reasoning.push(
      "No verified support passages — advocate cannot assert the proposition is evidenced. Abstains from advocacy claims.",
    );
  } else {
    for (const s of supports.slice(0, 5)) {
      reasoning.push(
        `Cites ${s.workKey} (${s.directness}): population=[${s.population}]; intervention=[${s.intervention}]; outcome=[${s.outcome}].`,
      );
    }
    reasoning.push(
      "Advocacy is scoped to documented search + verifier facets — not worldwide proof or SME sign-off.",
    );
  }
  return {
    role: "advocate",
    reasoning,
    citations: supports.slice(0, 8).map(citeFrom),
    stance:
      supports.length > 0
        ? "Partial engineering support exists within documented scope — requires SME."
        : "No advocate-grade support after verification — do not promote as evidenced.",
    aiAssisted: false,
    smeConfirmed: false,
  };
}

/** Role B — Skeptic: challenges directness, title-only, keyword topicality, confounders. */
export function runSkeptic(bundle: ClaimVerificationBundle): RoleBrief {
  const risks = bundle.verifications.filter(
    (v) =>
      v.abstained ||
      v.demotedFromPriorSupport ||
      v.passage.source === "title_only" ||
      v.classification === "insufficient" ||
      v.classification === "background" ||
      v.confounders.length > 0 ||
      v.directness !== "direct",
  );
  const reasoning: string[] = [
    "Skeptic flags false-support risks: title-only, keyword-only, demotions from prior appraisal, confounders, indirectness.",
    `Risk-bearing items: ${risks.length}; demotedFromPriorSupport=${bundle.counts.demotedFromPriorSupport}; abstained=${bundle.counts.abstained}.`,
  ];
  for (const r of risks.slice(0, 6)) {
    reasoning.push(
      `${r.workKey}: class=${r.classification}; directness=${r.directness}; abstain=${r.abstained}; confounders=[${r.confounders.join(", ") || "none"}]; prior=${r.priorAppraisalRelation ?? "n/a"}.`,
    );
  }
  if (bundle.counts.support > 0 && bundle.counts.demotedFromPriorSupport > 0) {
    reasoning.push(
      "Prior Discovery 3.0 support labels were demoted — topical keyword screens are not trustworthy alone.",
    );
  }
  reasoning.push("Skeptic does not invent contradicting papers — only challenges available passages.");
  return {
    role: "skeptic",
    reasoning,
    citations: risks.slice(0, 8).map(citeFrom),
    stance:
      bundle.counts.support === 0
        ? "Skeptic prevails on available record — insufficient direct support."
        : "Support remains contested — directness and confounders require SME.",
    aiAssisted: false,
    smeConfirmed: false,
  };
}

/** Role C — Methodology: design / population / intervention / outcome fit. */
export function runMethodology(bundle: ClaimVerificationBundle): RoleBrief {
  const reasoning: string[] = [
    "Methodology reviews design cues and facet alignment — not clinical recommendations.",
  ];
  const citations: CrossExamCitation[] = [];
  for (const v of bundle.verifications.slice(0, 10)) {
    if (!v.identifierValidated) continue;
    citations.push(citeFrom(v));
    reasoning.push(
      `${v.workKey}: design=[${v.design}]; pop=[${v.population}]; int=[${v.intervention}]; out=[${v.outcome}]; directness=${v.directness}.`,
    );
  }
  const direct = bundle.verifications.filter((v) => v.directness === "direct").length;
  reasoning.push(
    `Directness tally (engineering): direct=${direct}, indirect/unclear=${bundle.counts.retrieved - direct}. Not an external validity score.`,
  );
  if (direct === 0) {
    reasoning.push(
      "No direct design+facet alignment — methodology recommends abstaining from strong claims.",
    );
  }
  return {
    role: "methodology",
    reasoning,
    citations: citations.slice(0, 8),
    stance:
      direct > 0
        ? "Some direct engineering alignments — still SME-gated."
        : "Methodology: insufficient direct alignment for confident claim support.",
    aiAssisted: false,
    smeConfirmed: false,
  };
}

/** Role D — Adjudicator: uncertainty summary; never consensus-as-truth. */
export function runAdjudicator(input: {
  bundle: ClaimVerificationBundle;
  advocate: RoleBrief;
  skeptic: RoleBrief;
  methodology: RoleBrief;
}): AdjudicatorSummary {
  const { bundle, advocate, skeptic, methodology } = input;
  const agreementNotes: string[] = [];
  const disagreementNotes: string[] = [];

  if (bundle.counts.support === 0) {
    agreementNotes.push(
      "Advocate, skeptic, and methodology align that verified support is absent or abstained.",
    );
  } else {
    disagreementNotes.push(
      `Advocate cites ${bundle.counts.support} support item(s); skeptic contests directness/confounders; methodology direct count may differ.`,
    );
  }
  if (bundle.counts.demotedFromPriorSupport > 0) {
    agreementNotes.push(
      `${bundle.counts.demotedFromPriorSupport} prior appraisal "support" label(s) demoted — false-support risk documented.`,
    );
  }

  const openQuestions: string[] = [
    "Which passages survive SME full-text review for proposition-level directness?",
    "Are remaining support items causal or correlative within human disease?",
    "What search scope limitations prevent confident worldwide absence claims?",
  ];

  let recommendedHumanAction: AdjudicatorSummary["recommendedHumanAction"] = "hold";
  if (bundle.counts.support > 0 || bundle.counts.contradict > 0) {
    recommendedHumanAction = "route_sme";
  } else if (bundle.counts.abstained > 0 || bundle.counts.insufficient > 0) {
    recommendedHumanAction = "needs_more_evidence";
  } else if (bundle.counts.background > 0) {
    recommendedHumanAction = "background_only";
  }

  const uncertaintySummary = [
    `Adjudicator uncertainty (not scientific truth): support=${bundle.counts.support}, contradict=${bundle.counts.contradict},`,
    `background=${bundle.counts.background}, insufficient/abstained=${bundle.counts.insufficient}/${bundle.counts.abstained}.`,
    "Roles A/B/C are independently reasoned scaffolds — majority agreement ≠ truth.",
    `Advocate stance: ${advocate.stance}`,
    `Skeptic stance: ${skeptic.stance}`,
    `Methodology stance: ${methodology.stance}`,
    "Human SME review required before Gate C or reviewed_opportunity. No auto-approve.",
  ].join(" ");

  return {
    role: "adjudicator",
    consensusAsTruth: false,
    uncertaintySummary,
    openQuestions,
    agreementNotes,
    disagreementNotes,
    recommendedHumanAction,
    citations: [
      ...advocate.citations.slice(0, 3),
      ...skeptic.citations.slice(0, 3),
      ...methodology.citations.slice(0, 2),
    ],
    aiAssisted: false,
    smeConfirmed: false,
  };
}

/** Full A/B/C/D cross-examination from a verification bundle. */
export function runCrossExamination(bundle: ClaimVerificationBundle): CrossExaminationReport {
  const advocate = runAdvocate(bundle);
  const skeptic = runSkeptic(bundle);
  const methodology = runMethodology(bundle);
  const adjudicator = runAdjudicator({ bundle, advocate, skeptic, methodology });
  return {
    questionKey: bundle.questionKey,
    proposition: bundle.proposition,
    advocate,
    skeptic,
    methodology,
    adjudicator,
    policy: CROSS_EXAM_POLICY,
    verificationCounts: bundle.counts,
  };
}

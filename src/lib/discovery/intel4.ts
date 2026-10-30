/**
 * Evidence Intel 4.0 — orchestration, ISI integration hooks, operational safeguards.
 * Reuses Radar/dossier/Ask/SME/retrieve — no silent KG writes; TI flag-off; versioned decisions.
 */
import {
  DEEP_CLAIM_PROPOSITIONS,
  verifyClaimsForQuestion,
  type ClaimVerificationBundle,
  type ClaimProposition,
} from "@/lib/discovery/claimVerifier";
import {
  runCrossExamination,
  type CrossExaminationReport,
} from "@/lib/discovery/crossExamine";
import { DEEP_RESEARCH_QUESTIONS } from "@/lib/discovery/opportunities";
import {
  routeForReview,
  assertNoAutoApprove,
  type ReviewRoute,
} from "@/lib/discovery/reviewRouting";
import {
  buildScoutStrategy,
  runLiteratureScout,
  type ScoutRunReport,
  type ScoutStrategy,
} from "@/lib/discovery/scout";
import {
  discoverOpportunityFromVerified,
  candidateFromVerifiedDraft,
  type VerifiedOpportunityDraft,
  type VerifiedGapDiscoveryResult,
} from "@/lib/discovery/verifiedGaps";
import type { RetrievedWork } from "@/lib/discovery/retrieve";
import type { ResearchGapCandidate } from "@/lib/discovery/types";

export const INTEL4_VERSION = "4.0.0" as const;

export const INTEL4_POLICY = {
  version: INTEL4_VERSION,
  autoGateC: false as const,
  autoReviewedOpportunity: false as const,
  silentKgWrite: false as const,
  trialIntelligenceEnabled: false as const,
  stripe: false as const,
  unboundedScraping: false as const,
  fabricatesIdentifiers: false as const,
  fabricatesAccuracy: false as const,
} as const;

export type Intel4Budget = {
  maxGaps: number;
  maxWorksPerGap: number;
  maxRetries: number;
  maxWallMs: number;
};

export const DEFAULT_INTEL4_BUDGET: Intel4Budget = {
  maxGaps: 5,
  maxWorksPerGap: 40,
  maxRetries: 2,
  maxWallMs: 180_000,
};

export type Intel4DecisionRecord = {
  version: typeof INTEL4_VERSION;
  gapKey: string;
  decisionType:
    | "scout"
    | "verify"
    | "cross_examine"
    | "gap_emit"
    | "route"
    | "integrate";
  idempotencyKey: string;
  summary: string;
  autoApprove: false;
  smeConfirmed: false;
  provenance: Record<string, unknown>;
  createdAt: string;
};

export type Intel4IntegrationHooks = {
  radar: { linked: true; note: string };
  dossier: { linked: true; href: string; note: string };
  kg: { silentWrite: false; linkMode: "unreviewed_candidate_only"; note: string };
  ask: { prefill: string; note: string };
  trialIntelligence: { enabled: false; note: string };
  workbench: { href: string; note: string };
  profiles: { note: string };
  alerts: { note: string };
  sme: { href: string; queued: boolean; note: string };
};

export type Intel4GapResult = {
  gapKey: string;
  scout: ScoutRunReport | null;
  verification: ClaimVerificationBundle;
  crossExam: CrossExaminationReport;
  opportunity: VerifiedGapDiscoveryResult;
  route: ReviewRoute;
  integration: Intel4IntegrationHooks;
  decisions: Intel4DecisionRecord[];
  candidate: ResearchGapCandidate | null;
};

export type Intel4RunResult = {
  version: typeof INTEL4_VERSION;
  policy: typeof INTEL4_POLICY;
  budget: Intel4Budget;
  gaps: Intel4GapResult[];
  metrics: {
    gapsRun: number;
    supportTotal: number;
    contradictTotal: number;
    insufficientTotal: number;
    abstainedTotal: number;
    demotedFromPriorSupportTotal: number;
    highRiskRoutedToSme: number;
    opportunitiesEmitted: number;
    autoApproveCount: 0;
    /** Gold-label accuracy — unknown without SME labels. */
    accuracyVsGold: null;
    accuracyDenominator: "no_gold_labels";
  };
  inventedStudies: false;
  monitoringLog: string[];
};

function decision(
  gapKey: string,
  decisionType: Intel4DecisionRecord["decisionType"],
  idempotencyKey: string,
  summary: string,
  provenance: Record<string, unknown>,
  nowIso: string,
): Intel4DecisionRecord {
  return {
    version: INTEL4_VERSION,
    gapKey,
    decisionType,
    idempotencyKey,
    summary,
    autoApprove: false,
    smeConfirmed: false,
    provenance,
    createdAt: nowIso,
  };
}

export function buildIntel4Integration(input: {
  gapKey: string;
  route: ReviewRoute;
  researchQuestion: string;
  draft: VerifiedOpportunityDraft | null;
}): Intel4IntegrationHooks {
  const q = encodeURIComponent(input.gapKey);
  const askQ = encodeURIComponent(
    `Within ISI Discovery Intel 4.0 (unreviewed): ${input.researchQuestion.slice(0, 200)}`,
  );
  return {
    radar: {
      linked: true,
      note: "Surface as candidate on Research Radar — scores remain navigation aids only.",
    },
    dossier: {
      linked: true,
      href: `/discovery/gaps/${q}`,
      note: "Dossier shows verifier + cross-exam + route — not SME approval.",
    },
    kg: {
      silentWrite: false,
      linkMode: "unreviewed_candidate_only",
      note: "No silent KG write of unreviewed claims. Graph IDs may link as candidates only.",
    },
    ask: {
      prefill: `/ask?q=${askQ}`,
      note: "Ask prefill from documented uncertainty only — grounding still refuses fabricated PMIDs.",
    },
    trialIntelligence: {
      enabled: false,
      note: "TI remains flag-off for Intel 4.0 integration.",
    },
    workbench: {
      href: `/workbench?gapKey=${q}`,
      note: "Workbench may list engineering screens for curator triage.",
    },
    profiles: {
      note: "Personalisation reuses research_profiles ranking — does not change scientific status.",
    },
    alerts: {
      note: "Monitor/alert hooks may reference scout idempotency keys — email still deferred; no auto scientific review.",
    },
    sme: {
      href: `/sme?gapKey=${q}`,
      queued: input.route.risk === "high",
      note:
        input.route.risk === "high"
          ? "High-risk route queued for human SME — agent must not decide."
          : "SME available; not auto-queued for low/moderate unless escalated.",
    },
  };
}

/**
 * Run Intel 4.0 for one gap from pre-fetched works (offline validation / tests).
 * Does not call live network.
 */
export function runIntel4OnWorks(input: {
  gapKey: string;
  title: string;
  researchQuestion: string;
  whyItMatters: string;
  works: Array<
    RetrievedWork & {
      abstractText?: string | null;
      priorAppraisalRelation?: string | null;
    }
  >;
  proposition?: ClaimProposition;
  modelConfidence?: "low" | "moderate" | "high";
  nowIso?: string;
  subjectId?: string | null;
  objectId?: string | null;
  relationshipId?: string | null;
  diseaseId?: string | null;
  pilot?: "melanoma_a" | "coverage_b" | null;
}): Intel4GapResult {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const proposition =
    input.proposition ??
    DEEP_CLAIM_PROPOSITIONS[input.gapKey] ??
    ({
      questionKey: input.gapKey,
      proposition: input.researchQuestion,
      facets: {
        population: [],
        interventionOrExposure: [],
        outcome: [],
      },
    } satisfies ClaimProposition);

  const decisions: Intel4DecisionRecord[] = [];

  const verification = verifyClaimsForQuestion({
    proposition,
    works: input.works,
    modelConfidence: input.modelConfidence,
    nowIso,
  });
  decisions.push(
    decision(
      input.gapKey,
      "verify",
      `verify:${input.gapKey}:${verification.counts.retrieved}`,
      `Verified ${verification.counts.retrieved} works; support=${verification.counts.support}; abstained=${verification.counts.abstained}`,
      { counts: verification.counts },
      nowIso,
    ),
  );

  const crossExam = runCrossExamination(verification);
  decisions.push(
    decision(
      input.gapKey,
      "cross_examine",
      `xexam:${input.gapKey}`,
      crossExam.adjudicator.uncertaintySummary.slice(0, 240),
      {
        recommendedHumanAction: crossExam.adjudicator.recommendedHumanAction,
        consensusAsTruth: false,
      },
      nowIso,
    ),
  );

  const opportunity = discoverOpportunityFromVerified({
    gapKey: input.gapKey,
    title: input.title,
    researchQuestion: input.researchQuestion,
    whyItMatters: input.whyItMatters,
    verification,
    crossExam,
    subjectId: input.subjectId,
    objectId: input.objectId,
    relationshipId: input.relationshipId,
    diseaseId: input.diseaseId,
    pilot: input.pilot ?? undefined,
  });
  decisions.push(
    decision(
      input.gapKey,
      "gap_emit",
      `emit:${input.gapKey}:${opportunity.emit}`,
      opportunity.reason,
      { emit: opportunity.emit, draft: opportunity.draft },
      nowIso,
    ),
  );

  const route = routeForReview({
    gapKey: input.gapKey,
    verification,
    crossExam,
    draft: opportunity.draft,
    modelConfidence: input.modelConfidence,
  });
  const gate = assertNoAutoApprove(route);
  if (!gate.ok) {
    throw new Error(gate.error);
  }
  decisions.push(
    decision(
      input.gapKey,
      "route",
      `route:${input.gapKey}:${route.risk}`,
      route.reason,
      { route },
      nowIso,
    ),
  );

  const integration = buildIntel4Integration({
    gapKey: input.gapKey,
    route,
    researchQuestion: input.researchQuestion,
    draft: opportunity.draft,
  });
  decisions.push(
    decision(
      input.gapKey,
      "integrate",
      `integrate:${input.gapKey}`,
      "ISI hooks wired — no silent KG write; TI off; SME queued iff high risk.",
      { integration },
      nowIso,
    ),
  );

  const candidate = opportunity.emit
    ? candidateFromVerifiedDraft(opportunity.draft, {
        subjectId: input.subjectId,
        objectId: input.objectId,
        relationshipId: input.relationshipId,
        diseaseId: input.diseaseId,
        pilot: input.pilot,
      })
    : null;

  return {
    gapKey: input.gapKey,
    scout: null,
    verification,
    crossExam,
    opportunity,
    route,
    integration,
    decisions,
    candidate,
  };
}

/** Run Intel 4.0 offline reassessment for the five deep dossiers. */
export function runIntel4FiveDossiers(
  dossierWorks: Record<
    string,
    Array<
      RetrievedWork & {
        abstractText?: string | null;
        priorAppraisalRelation?: string | null;
      }
    >
  >,
  opts?: { modelConfidence?: "low" | "moderate" | "high"; nowIso?: string },
): Intel4RunResult {
  const monitoringLog: string[] = [];
  const gaps: Intel4GapResult[] = [];
  const budget = { ...DEFAULT_INTEL4_BUDGET };

  for (const spec of DEEP_RESEARCH_QUESTIONS.slice(0, budget.maxGaps)) {
    const works = (dossierWorks[spec.gapKey] ?? []).slice(0, budget.maxWorksPerGap);
    monitoringLog.push(
      `intel4:start gap=${spec.gapKey} works=${works.length} budgetMax=${budget.maxWorksPerGap}`,
    );
    const result = runIntel4OnWorks({
      gapKey: spec.gapKey,
      title: spec.title,
      researchQuestion: spec.researchQuestion,
      whyItMatters: spec.whyItMatters,
      works,
      proposition: DEEP_CLAIM_PROPOSITIONS[spec.gapKey],
      modelConfidence: opts?.modelConfidence,
      nowIso: opts?.nowIso,
      subjectId: spec.subjectId,
      objectId: spec.objectId,
      relationshipId: spec.relationshipId,
      diseaseId: spec.diseaseId,
      pilot: spec.pilot,
    });
    gaps.push(result);
    monitoringLog.push(
      `intel4:done gap=${spec.gapKey} support=${result.verification.counts.support} demoted=${result.verification.counts.demotedFromPriorSupport} route=${result.route.risk} emit=${result.opportunity.emit}`,
    );
  }

  return {
    version: INTEL4_VERSION,
    policy: INTEL4_POLICY,
    budget,
    gaps,
    metrics: {
      gapsRun: gaps.length,
      supportTotal: gaps.reduce((a, g) => a + g.verification.counts.support, 0),
      contradictTotal: gaps.reduce((a, g) => a + g.verification.counts.contradict, 0),
      insufficientTotal: gaps.reduce((a, g) => a + g.verification.counts.insufficient, 0),
      abstainedTotal: gaps.reduce((a, g) => a + g.verification.counts.abstained, 0),
      demotedFromPriorSupportTotal: gaps.reduce(
        (a, g) => a + g.verification.counts.demotedFromPriorSupport,
        0,
      ),
      highRiskRoutedToSme: gaps.filter((g) => g.route.risk === "high").length,
      opportunitiesEmitted: gaps.filter((g) => g.opportunity.emit).length,
      autoApproveCount: 0,
      accuracyVsGold: null,
      accuracyDenominator: "no_gold_labels",
    },
    inventedStudies: false,
    monitoringLog,
  };
}

/** Operational safeguard helpers */
export function intel4RetryAllowed(attempt: number, budget: Intel4Budget = DEFAULT_INTEL4_BUDGET): boolean {
  return attempt <= budget.maxRetries;
}

export function intel4IdempotentReplay(
  priorKey: string | null | undefined,
  nextKey: string,
): boolean {
  return Boolean(priorKey && priorKey === nextKey);
}

export type SourceLicensingNote = {
  source: "pubmed" | "europe_pmc" | "ctgov" | "isi_internal";
  note: string;
};

export const INTEL4_LICENSING_NOTES: SourceLicensingNote[] = [
  {
    source: "pubmed",
    note: "NCBI E-utilities — respect rate limits & ToS; store PMIDs/metadata for curation; no bulk republish.",
  },
  {
    source: "europe_pmc",
    note: "Europe PMC REST — OA full text only when license allows; abstracts for internal screening.",
  },
  {
    source: "ctgov",
    note: "ClinicalTrials.gov API — public registry; do not invent NCT IDs.",
  },
  {
    source: "isi_internal",
    note: "ISI KG / Gate C / SME audits remain source of curated truth — Intel 4.0 never silent-writes KG.",
  },
];

export async function runIntel4ScoutPhase(input: {
  strategy: ScoutStrategy;
  priorIdempotencyKey?: string | null;
  dryRun?: boolean;
}): Promise<ScoutRunReport> {
  return runLiteratureScout({
    strategy: input.strategy,
    priorIdempotencyKey: input.priorIdempotencyKey,
    dryRun: input.dryRun ?? true,
  });
}

export { buildScoutStrategy, DEEP_CLAIM_PROPOSITIONS, DEEP_RESEARCH_QUESTIONS };

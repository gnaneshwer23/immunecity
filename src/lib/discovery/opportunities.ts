/**
 * Discovery 3.0 — genuine research opportunity candidates (max 5 deep).
 * Promote only after documented retrieval + per-question scientific appraisal.
 * opportunity_status stays assessed/unreviewed until SME approves — never auto reviewed_opportunity.
 */
import {
  APPRAISAL_POLICY,
  type AppraisalThemeLexicon,
  type QuestionAppraisalBundle,
  type ScientificAppraisal,
} from "@/lib/discovery/appraise";
import {
  classifyGapClass,
  type OpportunityStatus,
  type ResearchGapClass,
} from "@/lib/discovery/gapClass";
import type { ResearchGapCandidate, SearchScope } from "@/lib/discovery/types";

export const OPPORTUNITY_SPRINT_POLICY = {
  maxDeepOpportunities: 5 as const,
  autoReviewedOpportunity: false as const,
  autoGateC: false as const,
  inventPmids: false as const,
  preferPilots: ["melanoma_a", "coverage_b"] as const,
  requireScientificEvidenceGapBeforeOpportunity: true as const,
} as const;

export type OpportunityPilot = "melanoma_a" | "coverage_b";

export type ResearchQuestionSpec = {
  gapKey: string;
  pilot: OpportunityPilot;
  title: string;
  researchQuestion: string;
  /** Focused corpus queries — not the broad Pilot A/B OR soup. */
  pubmedQuery: string;
  europePmcQuery: string;
  subjectId: string | null;
  objectId: string | null;
  relationshipId: string | null;
  diseaseId: string | null;
  whyItMatters: string;
  lexicon: AppraisalThemeLexicon;
  themes: string[];
};

/**
 * Five candidate deep questions aligned to Pilot A (melanoma / exhaustion / checkpoint /
 * antigen presentation) and Pilot B (CD28-null / RA / SSc / ageing).
 * Qualification is evidence-gated — fewer than 5 may ship.
 */
export const DEEP_RESEARCH_QUESTIONS: readonly ResearchQuestionSpec[] = [
  {
    gapKey: "GAP-OPP-A-MHC-PD1-RESIST",
    pilot: "melanoma_a",
    title: "MHC-I / antigen presentation loss vs anti-PD-1 resistance in melanoma",
    researchQuestion:
      "In metastatic melanoma, does loss of MHC class I or antigen-presentation machinery causally mediate anti-PD-1 resistance, or is the association primarily correlative without causal evidence in human disease?",
    pubmedQuery:
      '(melanoma[tiab]) AND (PD-1 OR "PD-1" OR pembrolizumab OR nivolumab) AND (MHC OR "HLA class I" OR B2M OR "antigen presentation") AND (resist* OR refractory OR "non-response")',
    europePmcQuery:
      'melanoma AND (PD-1 OR pembrolizumab) AND (MHC OR B2M OR "antigen presentation") AND (resistance OR refractory)',
    subjectId: "R011",
    objectId: "D012",
    relationshipId: null,
    diseaseId: "D012",
    whyItMatters:
      "If antigen-presentation loss is causal, biomarker and combination strategies differ from exhaustion-only models of checkpoint failure.",
    themes: ["melanoma", "checkpoint resistance", "antigen presentation"],
    lexicon: {
      supportTerms: [
        "antigen presentation",
        "MHC class I",
        "HLA class I",
        "B2M",
        "beta2-microglobulin",
        "resistance",
        "resistant",
        "PD-1",
        "pembrolizumab",
        "nivolumab",
        "melanoma",
      ],
      contradictTerms: [
        "independent of MHC",
        "intact antigen presentation",
        "MHC-independent",
        "not associated with resistance",
      ],
      backgroundTerms: ["checkpoint", "immunotherapy", "T cell", "tumor microenvironment"],
      offTopicTerms: ["rheumatoid arthritis", "systemic sclerosis", "CD28null", "CD28-null"],
    },
  },
  {
    gapKey: "GAP-OPP-A-LAG3-TIM3-EXHAUST",
    pilot: "melanoma_a",
    title: "LAG-3/TIM-3 co-blockade vs PD-1 alone in melanoma exhaustion",
    researchQuestion:
      "In PD-1-refractory metastatic melanoma, does dual LAG-3 and/or TIM-3 blockade reverse T-cell exhaustion beyond PD-1 monotherapy in antigen-experienced TILs, or are benefits confined to biomarker-selected subsets?",
    pubmedQuery:
      '(melanoma[tiab]) AND (exhaust* OR "T cell exhaustion" OR "exhausted T") AND (LAG-3 OR LAG3 OR TIM-3 OR TIM3 OR "PD-1") AND (blockade OR inhibitor OR relatlimab)',
    europePmcQuery:
      'melanoma AND exhaustion AND (LAG-3 OR TIM-3 OR relatlimab) AND (PD-1 OR checkpoint)',
    subjectId: "R011",
    objectId: "D012",
    relationshipId: "REL-R011-drives_immune_exhaustion_in-D012",
    diseaseId: "D012",
    whyItMatters:
      "Clarifies whether exhaustion co-inhibitory receptors are obligatory resistance nodes or redundant with PD-1 in melanoma.",
    themes: ["melanoma", "T-cell exhaustion", "checkpoint"],
    lexicon: {
      supportTerms: [
        "exhaustion",
        "exhausted",
        "LAG-3",
        "LAG3",
        "TIM-3",
        "TIM3",
        "relatlimab",
        "PD-1",
        "melanoma",
        "TIL",
      ],
      contradictTerms: [
        "no additional benefit",
        "PD-1 monotherapy sufficient",
        "independent of LAG-3",
        "TIM-3 dispensable",
      ],
      backgroundTerms: ["checkpoint", "immunotherapy", "co-inhibitory", "T cell"],
      offTopicTerms: ["rheumatoid arthritis", "scleroderma", "CD28-null"],
    },
  },
  {
    gapKey: "GAP-OPP-A-AGPRES-UPSTREAM",
    pilot: "melanoma_a",
    title: "Antigen presentation upstream of exhaustion in melanoma",
    researchQuestion:
      "Is impaired antigen presentation upstream of T-cell exhaustion phenotypes in melanoma (causing dysfunction via weak TCR signal), or a parallel resistance axis that can coexist with classical exhaustion markers?",
    pubmedQuery:
      '(melanoma[tiab]) AND ("antigen presentation" OR "MHC class I" OR B2M) AND (exhaust* OR "dysfunctional T" OR "T cell dysfunction")',
    europePmcQuery:
      'melanoma AND ("antigen presentation" OR MHC) AND (exhaustion OR "T cell dysfunction")',
    subjectId: "R011",
    objectId: "D012",
    relationshipId: null,
    diseaseId: "D012",
    whyItMatters:
      "Distinguishes ordering of resistance mechanisms for combination trial design and ISI graph edge semantics.",
    themes: ["antigen presentation", "T-cell exhaustion", "melanoma"],
    lexicon: {
      supportTerms: [
        "antigen presentation",
        "MHC",
        "upstream",
        "exhaustion",
        "dysfunction",
        "TCR",
        "melanoma",
      ],
      contradictTerms: [
        "parallel pathway",
        "independent axis",
        "unrelated to exhaustion",
        "exhaustion precedes",
      ],
      backgroundTerms: ["checkpoint", "PD-1", "tumor antigen", "IFN"],
      offTopicTerms: ["rheumatoid", "scleroderma", "ageing", "aging"],
    },
  },
  {
    gapKey: "GAP-OPP-B-CD28NULL-RA-AGE",
    pilot: "coverage_b",
    title: "CD28-null CD8 T cells in RA vs ageing confound",
    researchQuestion:
      "Do CD28-null (CD28−) CD8+ T cells drive rheumatoid arthritis synovial inflammation independently of chronological ageing, or are expanded CD28-null populations primarily an ageing-associated epiphenomenon without disease-specific pathogenicity?",
    pubmedQuery:
      '("rheumatoid arthritis"[tiab]) AND (CD28null OR "CD28-null" OR "CD28-" OR "CD28 negative") AND (CD8 OR ageing OR aging OR immunosenescence OR pathogenic)',
    europePmcQuery:
      '"rheumatoid arthritis" AND (CD28null OR "CD28-null" OR "CD28 negative") AND (CD8 OR ageing OR aging OR immunosenescence)',
    subjectId: null,
    objectId: null,
    relationshipId: null,
    diseaseId: null,
    whyItMatters:
      "Separating ageing confound from RA-specific CD28-null pathogenicity changes whether CD28-null cells are therapeutic targets or biomarkers of immunosenescence.",
    themes: ["CD28-null", "rheumatoid arthritis", "immune ageing"],
    lexicon: {
      supportTerms: [
        "CD28null",
        "CD28-null",
        "CD28-",
        "rheumatoid arthritis",
        "synovial",
        "pathogenic",
        "cytotoxic",
        "CD8",
      ],
      contradictTerms: [
        "ageing only",
        "aging only",
        "epiphenomenon",
        "not pathogenic",
        "healthy elderly",
        "immunosenescence alone",
      ],
      backgroundTerms: ["immunosenescence", "ageing", "aging", "T cell", "inflammation"],
      offTopicTerms: ["melanoma", "pembrolizumab", "nivolumab", "PD-1 blockade"],
    },
  },
  {
    gapKey: "GAP-OPP-B-CD28NULL-SSC",
    pilot: "coverage_b",
    title: "CD28-null expansion and fibrosis in systemic sclerosis",
    researchQuestion:
      "In systemic sclerosis (SSc), does CD28-null T-cell expansion associate with progressive fibrosis beyond immunosenescence markers shared with healthy ageing, and is the association reproducible across cutaneous vs visceral disease subsets?",
    pubmedQuery:
      '("systemic sclerosis"[tiab] OR scleroderma[tiab]) AND (CD28null OR "CD28-null" OR "CD28-" OR "CD28 negative" OR immunosenescence) AND (fibrosis OR fibrotic OR ageing OR aging)',
    europePmcQuery:
      '("systemic sclerosis" OR scleroderma) AND (CD28null OR "CD28-null" OR immunosenescence) AND (fibrosis OR ageing OR aging)',
    subjectId: null,
    objectId: null,
    relationshipId: null,
    diseaseId: null,
    whyItMatters:
      "If CD28-null cells track SSc fibrosis independently of age, they become a candidate mechanistic node for ISI coverage beyond melanoma pilots.",
    themes: ["CD28-null", "systemic sclerosis", "immune ageing"],
    lexicon: {
      supportTerms: [
        "systemic sclerosis",
        "scleroderma",
        "CD28null",
        "CD28-null",
        "fibrosis",
        "fibrotic",
        "immunosenescence",
      ],
      contradictTerms: [
        "no association with fibrosis",
        "age-matched only",
        "not disease-specific",
        "healthy ageing",
      ],
      backgroundTerms: ["autoimmune", "T cell", "ageing", "aging", "inflammation"],
      offTopicTerms: ["melanoma", "pembrolizumab", "KEYNOTE"],
    },
  },
] as const;

export const OPPORTUNITY_SEARCH_SCOPE: SearchScope = {
  corpus: "Bounded PubMed + Europe PMC queries per deep research question (Discovery appraisal sprint)",
  method: "Focused esearch + Europe PMC core + per-question engineering appraisal",
  dateScope: "sprint 2026-10-30 — live identifiers only when adapters enabled",
  note: "Documented search scope for scientific_evidence_gap / research_opportunity candidates. Not worldwide literature absence. Engineering appraisal ≠ SME review.",
};

export type OpportunityPromotionInput = {
  spec: ResearchQuestionSpec;
  appraisal: QuestionAppraisalBundle;
  /** Optional human-authored drafts; still unreviewed until SME. */
  rationale?: string;
  noveltyNote?: string;
  feasibilityNote?: string;
};

export type OpportunityPromotionResult =
  | {
      qualify: true;
      gapClass: ResearchGapClass;
      opportunityStatus: OpportunityStatus;
      candidate: ResearchGapCandidate & {
        gapClass: ResearchGapClass;
        opportunityStatus: OpportunityStatus;
        classReason: string;
        opportunityRationale: string;
        noveltyNote: string;
        feasibilityNote: string;
      };
      appraisals: ScientificAppraisal[];
      reason: string;
    }
  | {
      qualify: false;
      gapClass: ResearchGapClass | null;
      reason: string;
      appraisalCounts: QuestionAppraisalBundle["counts"];
    };

function defaultRationale(spec: ResearchQuestionSpec, appraisal: QuestionAppraisalBundle): string {
  return [
    `Testable question: ${spec.researchQuestion}`,
    `Within documented search (${OPPORTUNITY_SEARCH_SCOPE.corpus}), retrieval yielded identifierValidated=${appraisal.counts.identifierValidated}, scientificallyAppraised=${appraisal.counts.scientificallyAppraised}`,
    `(support=${appraisal.counts.support}, contradict=${appraisal.counts.contradict}, background=${appraisal.counts.background}).`,
    "Proposed for SME review as an unreviewed opportunity — not Gate C approved.",
  ].join(" ");
}

function defaultNovelty(spec: ResearchQuestionSpec): string {
  return [
    `Scoped novelty only within pilot themes [${spec.themes.join(", ")}] and the listed PubMed/Europe PMC queries.`,
    "Not a claim of global scientific novelty. Prior literature may exist outside this documented scope.",
  ].join(" ");
}

function defaultFeasibility(spec: ResearchQuestionSpec): string {
  return [
    `Engineering-feasible next steps: SME dossier review on /sme and /discovery/gaps/${encodeURIComponent(spec.gapKey)},`,
    "optional Gate C rematch only with PMID+DOI+locator (no auto-approve),",
    "and graph edge clarification if human-confirmed.",
    "Feasibility is structural — SME must confirm scientific merit.",
  ].join(" ");
}

/**
 * Persist/promote only when appraisal warrants scientific_evidence_gap,
 * and upgrade to research_opportunity when assessment fields are complete.
 * Never invents PMIDs; never sets reviewed_opportunity.
 */
export function promoteFromAppraisal(input: OpportunityPromotionInput): OpportunityPromotionResult {
  const { spec, appraisal } = input;
  if (!appraisal.warrantsScientificEvidenceGap) {
    return {
      qualify: false,
      gapClass: null,
      reason:
        "Appraisal did not warrant scientific_evidence_gap (need include_for_sme support/contradict or mixed evidence within documented search). Not forced to fill 5 slots.",
      appraisalCounts: appraisal.counts,
    };
  }
  if (appraisal.counts.identifierValidated === 0) {
    return {
      qualify: false,
      gapClass: null,
      reason: "No validated identifiers — cannot promote (no invented PMIDs).",
      appraisalCounts: appraisal.counts,
    };
  }

  // Empty-string overrides skip opportunity upgrade (caller wants scientific_evidence_gap only).
  const rationaleOverride = input.rationale;
  const noveltyOverride = input.noveltyNote;
  const feasibilityOverride = input.feasibilityNote;
  const rationale =
    rationaleOverride === ""
      ? ""
      : (rationaleOverride ?? defaultRationale(spec, appraisal)).trim();
  const noveltyNote =
    noveltyOverride === "" ? "" : (noveltyOverride ?? defaultNovelty(spec)).trim();
  const feasibilityNote =
    feasibilityOverride === ""
      ? ""
      : (feasibilityOverride ?? defaultFeasibility(spec)).trim();
  const hasAssessment = Boolean(rationale && noveltyNote && feasibilityNote);

  const coverageLabel =
    appraisal.counts.contradict > 0 && appraisal.counts.support > 0
      ? "conflicting"
      : appraisal.counts.support > 0
        ? "emerging"
        : "no_direct_evidence_after_search";

  const classified = classifyGapClass({
    detectionSource: "evidence_gap",
    coverageLabel,
    status: "candidate",
    detectionDetail: {
      flags: ["DEEP_APPRAISAL_SPRINT"],
      themes: spec.themes,
      appraisalCounts: appraisal.counts,
      appraisalPolicy: APPRAISAL_POLICY,
    },
    coverage: {
      searchAttempted: true,
      hitCount: appraisal.counts.retrieved,
      scopeDocumented: true,
      queryFailed: false,
    },
    opportunity: hasAssessment
      ? {
          rationale,
          noveltyNote,
          feasibilityNote,
          opportunityStatus: "assessed",
        }
      : null,
  });

  if (
    classified.gapClass !== "scientific_evidence_gap" &&
    classified.gapClass !== "research_opportunity"
  ) {
    return {
      qualify: false,
      gapClass: classified.gapClass,
      reason: `Classification blocked scientific promotion: ${classified.reason}`,
      appraisalCounts: appraisal.counts,
    };
  }

  const opportunityStatus: OpportunityStatus =
    classified.gapClass === "research_opportunity" ? "assessed" : "none";

  const candidate: ResearchGapCandidate & {
    gapClass: ResearchGapClass;
    opportunityStatus: OpportunityStatus;
    classReason: string;
    opportunityRationale: string;
    noveltyNote: string;
    feasibilityNote: string;
  } = {
    gapKey: spec.gapKey,
    title: spec.title,
    summary: [
      spec.researchQuestion,
      `Pilot ${spec.pilot}; themes: ${spec.themes.join(", ")}.`,
      appraisal.honesty,
    ].join(" "),
    status: "candidate",
    gapClass: classified.gapClass,
    opportunityStatus,
    classReason: classified.reason,
    opportunityRationale: rationale,
    noveltyNote,
    feasibilityNote,
    pilot: spec.pilot,
    subjectId: spec.subjectId,
    objectId: spec.objectId,
    relationshipId: spec.relationshipId,
    diseaseId: spec.diseaseId,
    whyItMatters: spec.whyItMatters,
    searchScope: {
      ...OPPORTUNITY_SEARCH_SCOPE,
      note: `${OPPORTUNITY_SEARCH_SCOPE.note} Query: ${spec.pubmedQuery.slice(0, 160)}`,
    },
    detectionSource: "evidence_gap",
    detectionDetail: {
      flags: ["DEEP_APPRAISAL_SPRINT"],
      themes: spec.themes,
      researchQuestion: spec.researchQuestion,
      pubmedQuery: spec.pubmedQuery,
      europePmcQuery: spec.europePmcQuery,
      appraisalCounts: appraisal.counts,
      autoReviewedOpportunity: false,
      autoGateC: false,
    },
    coverageLabel,
    autoReviewed: false,
  };

  return {
    qualify: true,
    gapClass: classified.gapClass,
    opportunityStatus,
    candidate,
    appraisals: appraisal.works
      .map((w) => w.scientific)
      .filter((s): s is ScientificAppraisal => Boolean(s)),
    reason:
      classified.gapClass === "research_opportunity"
        ? "Promoted to research_opportunity (assessed, unreviewed) after scientific_evidence_gap-quality appraisal + assessment fields."
        : "Promoted to scientific_evidence_gap within documented search; assessment incomplete for opportunity class.",
  };
}

export type DossierSection = {
  gapKey: string;
  researchQuestion: string;
  citations: Array<{
    pmid: string | null;
    doi: string | null;
    title: string | null;
    scientificRelation: string;
    screeningDecision: string;
    supportingPassage: string;
    studyContext: string;
    limitations: string;
  }>;
  coverage: QuestionAppraisalBundle["counts"];
  appraisalHonesty: string;
  whyItMatters: string;
  gapClass: ResearchGapClass;
  opportunityStatus: OpportunityStatus;
  smeHref: string;
  dossierHref: string;
};

export function buildOpportunityDossierSection(
  promotion: Extract<OpportunityPromotionResult, { qualify: true }>,
  appraisal: QuestionAppraisalBundle,
): DossierSection {
  return {
    gapKey: promotion.candidate.gapKey,
    researchQuestion: String(promotion.candidate.detectionDetail.researchQuestion ?? ""),
    citations: promotion.appraisals.map((a) => ({
      pmid: a.pmid,
      doi: a.doi,
      title: a.title,
      scientificRelation: a.scientificRelation,
      screeningDecision: a.screeningDecision,
      supportingPassage: a.supportingPassage,
      studyContext: a.studyContext,
      limitations: a.limitations,
    })),
    coverage: appraisal.counts,
    appraisalHonesty: appraisal.honesty,
    whyItMatters: promotion.candidate.whyItMatters,
    gapClass: promotion.gapClass,
    opportunityStatus: promotion.opportunityStatus,
    smeHref: `/sme?gapKey=${encodeURIComponent(promotion.candidate.gapKey)}`,
    dossierHref: `/discovery/gaps/${encodeURIComponent(promotion.candidate.gapKey)}`,
  };
}

/**
 * Discovery 3.0 — gap assessment pipeline (deterministic stages).
 * detect → retrieve → extract → context compare → classify → novelty → feasibility → expert review → personalise
 * LLM only for labelled synthesis/hypotheses (not wired as authority here).
 */
import { detectDiscoveryCandidates } from "@/lib/discovery/detect";
import {
  classifyGapClass,
  type CoverageAssessment,
  type ResearchGapClass,
  type OpportunityStatus,
} from "@/lib/discovery/gapClass";
import { recommendGapsForProfile, type RecommendReason } from "@/lib/discovery/recommend";
import {
  planRetrievalQueries,
  runBoundedRetrieval,
  resolveRetrievalAdapters,
  type RetrievalRunReport,
  type RetrievedWork,
} from "@/lib/discovery/retrieve";
import { verifyGapCandidate, type VerificationReport } from "@/lib/discovery/verify";
import type { ResearchGapCandidate, ResearchProfileDraft } from "@/lib/discovery/types";
import type { EvidenceGapSignals } from "@/lib/research/evidenceGap";

export const PIPELINE_POLICY = {
  autoGateC: false as const,
  autoReviewedOpportunity: false as const,
  llmAuthority: false as const,
  llmRole: "labelled_synthesis_only" as const,
} as const;

export type PipelineStageId =
  | "detect"
  | "retrieve"
  | "extract"
  | "context_compare"
  | "classify"
  | "novelty"
  | "feasibility"
  | "expert_review"
  | "personalise";

export type ExtractedClaimStub = {
  gapKey: string;
  workKey: string;
  /** Structural extract only — not a scientific conclusion. */
  kind: "identifier_link" | "title_stub";
  text: string;
  pmid: string | null;
  doi: string | null;
  nctId: string | null;
  labelledLlm: false;
};

export type NoveltyAssessment = {
  gapKey: string;
  /** Always scoped — never global novelty. */
  scopedNote: string;
  searchLimitations: string;
  confidentGlobalNovelty: false;
};

export type FeasibilityAssessment = {
  gapKey: string;
  note: string;
  /** Engineering feasibility stub — SME must confirm. */
  engineeringReady: boolean;
  smeConfirmed: false;
};

export type PipelineGapResult = {
  gap: ResearchGapCandidate;
  verification: VerificationReport;
  retrieval: RetrievalRunReport | null;
  extracts: ExtractedClaimStub[];
  gapClass: ResearchGapClass;
  opportunityStatus: OpportunityStatus;
  classReason: string;
  blockedScientificClaim: boolean;
  novelty: NoveltyAssessment;
  feasibility: FeasibilityAssessment;
  /** expert_review always pending unless human already reviewed (not set here). */
  expertReviewStatus: "pending_human" | "skipped_no_auto";
  provenanceOk: boolean;
  coverageOk: boolean;
  statusOk: boolean;
};

export type PipelineRunResult = {
  stages: PipelineStageId[];
  gaps: PipelineGapResult[];
  personalised: RecommendReason[];
  counts: {
    detected: number;
    retrieved: number;
    classified: number;
    blockedScientific: number;
    pendingExpertReview: number;
  };
  policy: typeof PIPELINE_POLICY;
  inventedStudies: false;
};

function extractFromWorks(gapKey: string, works: RetrievedWork[]): ExtractedClaimStub[] {
  const out: ExtractedClaimStub[] = [];
  for (const w of works) {
    if (w.excluded) continue;
    const workKey = w.pmid ? `pmid:${w.pmid}` : w.doi ? `doi:${w.doi}` : w.nctId ? `nct:${w.nctId}` : null;
    if (!workKey) continue;
    out.push({
      gapKey,
      workKey,
      kind: w.title ? "title_stub" : "identifier_link",
      text: w.title
        ? `Retrieved title (unreviewed): ${w.title.slice(0, 240)}`
        : `Retrieved identifier link ${workKey} (unreviewed; not a conclusion).`,
      pmid: w.pmid,
      doi: w.doi,
      nctId: w.nctId,
      labelledLlm: false,
    });
  }
  return out;
}

function coverageFromRetrieval(report: RetrievalRunReport | null, gap: ResearchGapCandidate): CoverageAssessment {
  if (!report) {
    return {
      searchAttempted: false,
      hitCount: null,
      scopeDocumented: Boolean(gap.searchScope?.note),
      queryFailed: false,
    };
  }
  const queryFailed = report.failedQueries > 0 && !report.hitCountKnown;
  return {
    searchAttempted: true,
    hitCount: report.hitCountKnown ? report.found : null,
    scopeDocumented: Boolean(gap.searchScope?.note),
    queryFailed,
  };
}

/**
 * Run the assessment pipeline for detected candidates.
 * `runRetrieval` false skips network (unit tests / dry-run).
 */
export async function runGapAssessmentPipeline(opts?: {
  conceptIds?: readonly string[];
  signalsById?: Record<string, EvidenceGapSignals>;
  profile?: ResearchProfileDraft | null;
  runRetrieval?: boolean;
  maxGaps?: number;
  gapKeys?: string[];
}): Promise<PipelineRunResult> {
  const stages: PipelineStageId[] = [
    "detect",
    "retrieve",
    "extract",
    "context_compare",
    "classify",
    "novelty",
    "feasibility",
    "expert_review",
    "personalise",
  ];

  let detected = detectDiscoveryCandidates({
    conceptIds: opts?.conceptIds,
    signalsById: opts?.signalsById,
  });
  if (opts?.gapKeys?.length) {
    const want = new Set(opts.gapKeys);
    detected = detected.filter((g) => want.has(g.gapKey));
  }
  const maxGaps = opts?.maxGaps ?? 8;
  detected = detected.slice(0, maxGaps);

  const adapters = opts?.runRetrieval ? resolveRetrievalAdapters() : undefined;
  const results: PipelineGapResult[] = [];

  for (const gap of detected) {
    const verification = verifyGapCandidate(gap);
    let retrieval: RetrievalRunReport | null = null;
    if (opts?.runRetrieval) {
      const plan = planRetrievalQueries(gap, {
        interests: Array.isArray(opts.profile?.interests)
          ? []
          : Object.keys(opts.profile?.interests ?? {}).slice(0, 6),
        profileDiseases: opts.profile?.focusDiseases ?? [],
      });
      retrieval = await runBoundedRetrieval(plan, adapters);
    }

    const extracts = retrieval ? extractFromWorks(gap.gapKey, retrieval.works) : [];
    const coverage = coverageFromRetrieval(retrieval, gap);
    const classified = classifyGapClass({
      detectionSource: gap.detectionSource,
      coverageLabel: gap.coverageLabel,
      status: gap.status,
      detectionDetail: gap.detectionDetail,
      coverage,
    });

    const novelty: NoveltyAssessment = {
      gapKey: gap.gapKey,
      scopedNote:
        "Any novelty wording is limited to documented ISI/product search scope and this pilot's query set.",
      searchLimitations: retrieval
        ? `Retrieval failedQueries=${retrieval.failedQueries}; hitCountKnown=${retrieval.hitCountKnown}; corpora=PubMed/EuropePMC/CT.gov bounded.`
        : "Retrieval not run — novelty cannot be assessed beyond ISI curated signals.",
      confidentGlobalNovelty: false,
    };

    const feasibility: FeasibilityAssessment = {
      gapKey: gap.gapKey,
      note: classified.gapClass === "research_opportunity"
        ? "Feasibility fields require human SME confirmation; engineering only drafts structure."
        : "Not an assessed opportunity — feasibility deferred.",
      engineeringReady: verification.engineeringReadyForHumanReview && !classified.blockedScientificClaim,
      smeConfirmed: false,
    };

    results.push({
      gap: {
        ...gap,
        gapClass: classified.gapClass,
        opportunityStatus: classified.opportunityStatus,
        classReason: classified.reason,
      },
      verification,
      retrieval,
      extracts,
      gapClass: classified.gapClass,
      opportunityStatus: classified.opportunityStatus,
      classReason: classified.reason,
      blockedScientificClaim: classified.blockedScientificClaim,
      novelty,
      feasibility,
      expertReviewStatus: "pending_human",
      provenanceOk: verification.provenance.every((p) => p.ok),
      coverageOk: !classified.blockedScientificClaim || gap.status === "coverage_insufficient",
      statusOk: verification.statusAllowedForDetection,
    });
  }

  const candidates = results.map((r) => r.gap);
  const personalised = opts?.profile
    ? recommendGapsForProfile(candidates, opts.profile).slice(0, 20)
    : recommendGapsForProfile(candidates, {
        displayLabel: null,
        focusDiseases: [],
        focusDomains: [],
        modalities: [],
        interests: {},
      }).slice(0, 20);

  return {
    stages,
    gaps: results,
    personalised,
    counts: {
      detected: results.length,
      retrieved: results.filter((r) => r.retrieval).length,
      classified: results.length,
      blockedScientific: results.filter((r) => r.blockedScientificClaim).length,
      pendingExpertReview: results.filter((r) => r.expertReviewStatus === "pending_human").length,
    },
    policy: PIPELINE_POLICY,
    inventedStudies: false,
  };
}

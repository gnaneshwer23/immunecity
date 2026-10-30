/**
 * Discovery 3.0 — persist retrieval + appraisal to Neon (not JSON-only).
 * Idempotent upserts by (gap_id, work key). Never mass-approves Gate C / evidence_records.
 * Never overwrites reviewed gap/opportunity class decisions.
 */
import {
  linkRoleFromAppraisal,
  type AppraisedWork,
  type ScientificAppraisal,
} from "@/lib/discovery/appraise";
import type { OpportunityStatus, ResearchGapClass } from "@/lib/discovery/gapClass";
import { reclassifyGapClass } from "@/lib/discovery/gapClass";
import type { ResearchGapCandidate } from "@/lib/discovery/types";

export const PERSIST_RETRIEVAL_POLICY = {
  autoGateC: false as const,
  massApproveEvidenceRecords: false as const,
  overwriteReviewed: false as const,
  inventIdentifiers: false as const,
} as const;

export type EvidenceLinkUpsertRow = {
  gapKey: string;
  pmid: string | null;
  doi: string | null;
  nctId: string | null;
  title: string | null;
  source: string | null;
  abstractAvailable: boolean | null;
  fullTextAvailable: boolean | null;
  exclusionReason: string | null;
  linkRole: string;
  /** Provenance + appraisal JSON (screening, relation, passage, questionKey). */
  provenanceJson: Record<string, unknown>;
  /** 0025 appraisal columns when present. */
  scientificRelation?: string | null;
  screeningDecision?: string | null;
  supportingPassage?: string | null;
  studyContext?: string | null;
  appraisalLimitations?: string | null;
  questionKey?: string | null;
  identifierValidated?: boolean | null;
};

export type PersistRetrievalPlan = {
  gap: ResearchGapCandidate & {
    gapClass?: ResearchGapClass;
    opportunityStatus?: OpportunityStatus;
    opportunityRationale?: string;
    noveltyNote?: string;
    feasibilityNote?: string;
    classReason?: string;
  };
  links: EvidenceLinkUpsertRow[];
  coverage: {
    searchAttempted: true;
    hitCount: number | null;
    queryText: string;
    scopeNote: string;
  };
  classHistory?: {
    previousClass: ResearchGapClass | null;
    newClass: ResearchGapClass;
    previousOpportunityStatus: OpportunityStatus | null;
    newOpportunityStatus: OpportunityStatus;
    reason: string;
  };
  evidenceRecordsTouched: 0;
  autoGateC: false;
};

/** Stable dedupe key for idempotent link upserts (per gap). */
export function evidenceLinkDedupeKey(row: Pick<EvidenceLinkUpsertRow, "pmid" | "doi" | "nctId" | "questionKey">): string {
  const id = row.pmid
    ? `pmid:${row.pmid}`
    : row.doi
      ? `doi:${row.doi.toLowerCase()}`
      : row.nctId
        ? `nct:${row.nctId}`
        : "unknown";
  // Per-question re-appraisal: same PMID may appear under multiple questionKeys on different gaps;
  // within one gap, questionKey further scopes provenance.
  return `${row.questionKey ?? "gap"}::${id}`;
}

export function appraisedWorksToLinkRows(
  gapKey: string,
  works: AppraisedWork[],
  sourceFallback = "retrieval_sprint",
): EvidenceLinkUpsertRow[] {
  const out: EvidenceLinkUpsertRow[] = [];
  const seen = new Set<string>();
  for (const w of works) {
    const sci = w.scientific;
    if (!sci) continue;
    const row: EvidenceLinkUpsertRow = {
      gapKey,
      pmid: w.identifier.pmid,
      doi: w.identifier.doi,
      nctId: w.identifier.nctId,
      title: sci.title,
      source: sourceFallback,
      abstractAvailable: sci.passageSource === "abstract_sentence" ? true : sci.passageSource === "abstract_unavailable" ? false : null,
      fullTextAvailable: false,
      exclusionReason:
        sci.screeningDecision === "exclude_invalid_id" || sci.screeningDecision === "exclude_off_topic"
          ? sci.screeningDecision
          : null,
      linkRole: linkRoleFromAppraisal(sci),
      provenanceJson: {
        questionKey: sci.questionKey,
        workKey: sci.workKey,
        scientificRelation: sci.scientificRelation,
        screeningDecision: sci.screeningDecision,
        supportingPassage: sci.supportingPassage,
        passageSource: sci.passageSource,
        studyContext: sci.studyContext,
        limitations: sci.limitations,
        identifierValidated: w.identifier.identifierValidated,
        engineeringScreen: true,
        smeConfirmed: false,
        autoGateC: false,
      },
      scientificRelation: sci.scientificRelation,
      screeningDecision: sci.screeningDecision,
      supportingPassage: sci.supportingPassage,
      studyContext: sci.studyContext,
      appraisalLimitations: sci.limitations,
      questionKey: sci.questionKey,
      identifierValidated: w.identifier.identifierValidated,
    };
    const dk = evidenceLinkDedupeKey(row);
    if (seen.has(dk)) continue;
    seen.add(dk);
    out.push(row);
  }
  return out;
}

/**
 * Build a persistence plan. Callers apply with Drizzle; this stays unit-testable without DB.
 * Refuses class overwrite when review-locked.
 */
export function planPersistRetrieval(input: {
  gap: PersistRetrievalPlan["gap"];
  works: AppraisedWork[];
  existing?: {
    status?: string | null;
    gapClass?: string | null;
    opportunityStatus?: string | null;
  } | null;
  queryText: string;
  hitCount: number | null;
  sourceFallback?: string;
}):
  | { ok: true; plan: PersistRetrievalPlan }
  | { ok: false; error: string; evidenceRecordsTouched: 0 } {
  const reviewLocked =
    input.existing?.status === "reviewed_gap" ||
    input.existing?.opportunityStatus === "reviewed_opportunity";

  if (reviewLocked && PERSIST_RETRIEVAL_POLICY.overwriteReviewed === false) {
    const re = reclassifyGapClass({
      currentClass: (input.existing?.gapClass as ResearchGapClass) ?? null,
      currentOpportunityStatus: (input.existing?.opportunityStatus as OpportunityStatus) ?? "none",
      reviewLocked: true,
      proposed: {
        detectionSource: input.gap.detectionSource,
        coverageLabel: input.gap.coverageLabel,
        status: input.gap.status,
        detectionDetail: input.gap.detectionDetail,
        coverage: {
          searchAttempted: true,
          hitCount: input.hitCount,
          scopeDocumented: true,
        },
        opportunity: {
          rationale: input.gap.opportunityRationale,
          noveltyNote: input.gap.noveltyNote,
          feasibilityNote: input.gap.feasibilityNote,
          opportunityStatus: input.gap.opportunityStatus,
        },
      },
    });
    if (!re.ok) {
      return { ok: false, error: re.error, evidenceRecordsTouched: 0 };
    }
  }

  const links = appraisedWorksToLinkRows(input.gap.gapKey, input.works, input.sourceFallback);
  const prevClass = (input.existing?.gapClass as ResearchGapClass) ?? null;
  const prevOpp = (input.existing?.opportunityStatus as OpportunityStatus) ?? null;
  const newClass = input.gap.gapClass ?? prevClass ?? "isi_curation_gap";
  const newOpp = input.gap.opportunityStatus ?? prevOpp ?? "none";

  return {
    ok: true,
    plan: {
      gap: input.gap,
      links,
      coverage: {
        searchAttempted: true,
        hitCount: input.hitCount,
        queryText: input.queryText,
        scopeNote: input.gap.searchScope.note,
      },
      classHistory:
        prevClass !== newClass || prevOpp !== newOpp
          ? {
              previousClass: prevClass,
              newClass: newClass as ResearchGapClass,
              previousOpportunityStatus: prevOpp,
              newOpportunityStatus: newOpp as OpportunityStatus,
              reason: input.gap.classReason ?? "Appraisal sprint class assignment",
            }
          : undefined,
      evidenceRecordsTouched: 0,
      autoGateC: false,
    },
  };
}

/** Summarise appraisals for change-event detail (no PII). */
export function appraisalEventDetail(appraisals: ScientificAppraisal[]) {
  return {
    appraised: appraisals.length,
    support: appraisals.filter((a) => a.scientificRelation === "support").length,
    contradict: appraisals.filter((a) => a.scientificRelation === "contradict").length,
    background: appraisals.filter((a) => a.scientificRelation === "background").length,
    autoGateC: false,
    evidenceRecordsApproved: 0,
  };
}

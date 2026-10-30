/**
 * Discovery 3.0 — scientific evidence appraisal (per research question).
 * Identifier validation ≠ scientific appraisal — keep fields separate.
 * Same PMID on multiple gaps must be re-appraised per question (no shared-hit = multi-support).
 * Engineering screen only — never Gate C approve / never reviewed_opportunity.
 */
import { validateDoi, validateNct, validatePmid, type RetrievedWork } from "@/lib/discovery/retrieve";

export const APPRAISAL_POLICY = {
  identifierValidationIsScientificAppraisal: false as const,
  sharedHitImpliesMultiSupport: false as const,
  autoGateC: false as const,
  autoReviewedOpportunity: false as const,
  engineeringScreenOnly: true as const,
} as const;

/** Relation of a work to the *specific* research question (not global topic). */
export const SCIENTIFIC_RELATIONS = [
  "support",
  "contradict",
  "background",
  "insufficient_context",
] as const;
export type ScientificRelation = (typeof SCIENTIFIC_RELATIONS)[number];

export const SCREENING_DECISIONS = [
  "include_for_sme",
  "background_only",
  "exclude_off_topic",
  "exclude_invalid_id",
  "needs_full_text",
] as const;
export type ScreeningDecision = (typeof SCREENING_DECISIONS)[number];

export type IdentifierAssessment = {
  pmid: string | null;
  doi: string | null;
  nctId: string | null;
  /** Structural ID format/presence check only — not scientific. */
  identifierValidated: boolean;
  validationNotes: string;
};

export type ScientificAppraisal = {
  /** Must include the gap/question key — appraisals are never shared across questions. */
  questionKey: string;
  workKey: string;
  pmid: string | null;
  doi: string | null;
  nctId: string | null;
  title: string | null;
  scientificRelation: ScientificRelation;
  screeningDecision: ScreeningDecision;
  /** Study type / setting as read from title+abstract cues. */
  studyContext: string;
  limitations: string;
  /** Exact supporting sentence when available; else honest unavailable note. */
  supportingPassage: string;
  passageSource: "abstract_sentence" | "title_only" | "abstract_unavailable" | "full_text_unavailable";
  /** Engineering relevance screen — not SME scientific conclusion. */
  engineeringScreen: true;
  smeConfirmed: false;
  appraisedAt: string;
};

export type AppraisedWork = {
  identifier: IdentifierAssessment;
  scientific: ScientificAppraisal | null;
};

export type QuestionAppraisalBundle = {
  questionKey: string;
  researchQuestion: string;
  works: AppraisedWork[];
  counts: {
    retrieved: number;
    identifierValidated: number;
    scientificallyAppraised: number;
    support: number;
    contradict: number;
    background: number;
    insufficientContext: number;
    excludedInvalidId: number;
  };
  /** True when ≥1 include_for_sme appraisal exists with support or contradict. */
  warrantsScientificEvidenceGap: boolean;
  honesty: string;
};

export type AppraisalThemeLexicon = {
  supportTerms: string[];
  contradictTerms: string[];
  backgroundTerms: string[];
  offTopicTerms?: string[];
};

function workKeyOf(w: {
  pmid?: string | null;
  doi?: string | null;
  nctId?: string | null;
  title?: string | null;
}): string | null {
  if (w.pmid) return `pmid:${w.pmid}`;
  if (w.doi) return `doi:${w.doi.toLowerCase()}`;
  if (w.nctId) return `nct:${w.nctId}`;
  if (w.title) return `title:${w.title.slice(0, 80).toLowerCase()}`;
  return null;
}

/** Identifier validation only — never counts as scientific appraisal. */
export function assessIdentifier(work: Pick<RetrievedWork, "pmid" | "doi" | "nctId">): IdentifierAssessment {
  const pmid = validatePmid(work.pmid);
  const doi = validateDoi(work.doi);
  const nctId = validateNct(work.nctId);
  const identifierValidated = Boolean(pmid || doi || nctId);
  return {
    pmid,
    doi,
    nctId,
    identifierValidated,
    validationNotes: identifierValidated
      ? "Identifier format validated (PMID/DOI/NCT). Not a scientific appraisal."
      : "No valid PMID/DOI/NCT — excluded from scientific appraisal.",
  };
}

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function termHits(hay: string, terms: readonly string[]): string[] {
  const h = norm(hay);
  return terms.filter((t) => {
    const n = norm(t);
    return n.length >= 3 && h.includes(n);
  });
}

function firstMatchingSentence(abstract: string, terms: readonly string[]): string | null {
  const sentences = abstract
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40);
  for (const s of sentences) {
    if (termHits(s, terms).length > 0) return s.slice(0, 480);
  }
  return sentences[0]?.slice(0, 480) ?? null;
}

function inferStudyContext(title: string, abstract: string | null): string {
  const blob = `${title} ${abstract ?? ""}`;
  const cues: string[] = [];
  if (/\brandomi[sz]ed\b|\brct\b/i.test(blob)) cues.push("randomized/RCT cue");
  if (/\bmeta-?analysis\b|\bsystematic review\b/i.test(blob)) cues.push("review/meta-analysis cue");
  if (/\bmouse\b|\bmurine\b|\bin vivo\b/i.test(blob)) cues.push("preclinical/in vivo cue");
  if (/\bpatient\b|\bcohort\b|\bclinical\b/i.test(blob)) cues.push("clinical/human cue");
  if (/\bin vitro\b|\bcell line\b/i.test(blob)) cues.push("in vitro cue");
  if (!cues.length) cues.push("study design not clear from title/abstract cues");
  return cues.join("; ");
}

/**
 * Appraise one retrieved work against one research question.
 * Must be called again when the same PMID appears on another question.
 */
export function appraiseWorkForQuestion(input: {
  questionKey: string;
  researchQuestion: string;
  work: RetrievedWork & { abstractText?: string | null };
  lexicon: AppraisalThemeLexicon;
  nowIso?: string;
}): AppraisedWork {
  const identifier = assessIdentifier(input.work);
  const key = workKeyOf(identifier);
  if (!identifier.identifierValidated || !key) {
    return {
      identifier,
      scientific: {
        questionKey: input.questionKey,
        workKey: workKeyOf(input.work) ?? "invalid",
        pmid: identifier.pmid,
        doi: identifier.doi,
        nctId: identifier.nctId,
        title: input.work.title,
        scientificRelation: "insufficient_context",
        screeningDecision: "exclude_invalid_id",
        studyContext: "n/a",
        limitations: "Invalid or missing identifier — no scientific appraisal performed.",
        supportingPassage: "passage unavailable — identifier invalid",
        passageSource: "abstract_unavailable",
        engineeringScreen: true,
        smeConfirmed: false,
        appraisedAt: input.nowIso ?? new Date().toISOString(),
      },
    };
  }

  const title = input.work.title?.trim() || "";
  const abstract = input.work.abstractText?.trim() || null;
  const hay = `${title}\n${abstract ?? ""}`;
  const supportHits = termHits(hay, input.lexicon.supportTerms);
  const contradictHits = termHits(hay, input.lexicon.contradictTerms);
  const backgroundHits = termHits(hay, input.lexicon.backgroundTerms);
  const offHits = termHits(hay, input.lexicon.offTopicTerms ?? []);

  let scientificRelation: ScientificRelation = "insufficient_context";
  let screeningDecision: ScreeningDecision = "needs_full_text";
  let supportingPassage: string;
  let passageSource: ScientificAppraisal["passageSource"];

  if (!abstract && !title) {
    scientificRelation = "insufficient_context";
    screeningDecision = "needs_full_text";
    supportingPassage = "abstract-only / passage unavailable — no title or abstract retrieved";
    passageSource = "abstract_unavailable";
  } else if (offHits.length >= 2 && supportHits.length === 0 && contradictHits.length === 0) {
    scientificRelation = "background";
    screeningDecision = "exclude_off_topic";
    supportingPassage = abstract
      ? (firstMatchingSentence(abstract, offHits) ?? title.slice(0, 240))
      : `title_only: ${title.slice(0, 240)}`;
    passageSource = abstract ? "abstract_sentence" : "title_only";
  } else if (contradictHits.length > supportHits.length && contradictHits.length > 0) {
    scientificRelation = "contradict";
    screeningDecision = "include_for_sme";
    supportingPassage = abstract
      ? (firstMatchingSentence(abstract, contradictHits) ??
        "abstract-only / matching contradict sentence unavailable")
      : `title_only: ${title.slice(0, 240)}`;
    passageSource = abstract ? "abstract_sentence" : "title_only";
  } else if (supportHits.length > 0) {
    scientificRelation = "support";
    screeningDecision = "include_for_sme";
    supportingPassage = abstract
      ? (firstMatchingSentence(abstract, supportHits) ??
        "abstract-only / matching support sentence unavailable")
      : `title_only: ${title.slice(0, 240)}`;
    passageSource = abstract ? "abstract_sentence" : "title_only";
  } else if (backgroundHits.length > 0 || title) {
    scientificRelation = "background";
    screeningDecision = "background_only";
    supportingPassage = abstract
      ? (firstMatchingSentence(abstract, backgroundHits.length ? backgroundHits : input.lexicon.backgroundTerms) ??
        title.slice(0, 240))
      : `title_only: ${title.slice(0, 240)}`;
    passageSource = abstract ? "abstract_sentence" : "title_only";
  } else {
    scientificRelation = "insufficient_context";
    screeningDecision = "needs_full_text";
    supportingPassage = "abstract-only / passage unavailable";
    passageSource = abstract ? "full_text_unavailable" : "abstract_unavailable";
  }

  const limitations = [
    "Engineering relevance screen against the specific research question — not SME peer review.",
    abstract ? "Passage taken from abstract (full text not reviewed)." : "Abstract unavailable — title/identifier only.",
    `Support hits=[${supportHits.slice(0, 6).join("; ")}]; contradict=[${contradictHits.slice(0, 6).join("; ")}].`,
    "Does not approve Gate C or invent claim support.",
  ].join(" ");

  return {
    identifier,
    scientific: {
      questionKey: input.questionKey,
      workKey: key,
      pmid: identifier.pmid,
      doi: identifier.doi,
      nctId: identifier.nctId,
      title: title || null,
      scientificRelation,
      screeningDecision,
      studyContext: inferStudyContext(title, abstract),
      limitations,
      supportingPassage,
      passageSource,
      engineeringScreen: true,
      smeConfirmed: false,
      appraisedAt: input.nowIso ?? new Date().toISOString(),
    },
  };
}

/**
 * Bundle appraisals for one question. Re-runs per work; does not reuse another question's verdict.
 */
export function appraiseWorksForQuestion(input: {
  questionKey: string;
  researchQuestion: string;
  works: Array<RetrievedWork & { abstractText?: string | null }>;
  lexicon: AppraisalThemeLexicon;
  nowIso?: string;
}): QuestionAppraisalBundle {
  const works = input.works.map((w) =>
    appraiseWorkForQuestion({
      questionKey: input.questionKey,
      researchQuestion: input.researchQuestion,
      work: w,
      lexicon: input.lexicon,
      nowIso: input.nowIso,
    }),
  );
  const scientific = works.map((w) => w.scientific).filter(Boolean) as ScientificAppraisal[];
  const counts = {
    retrieved: works.length,
    identifierValidated: works.filter((w) => w.identifier.identifierValidated).length,
    scientificallyAppraised: scientific.filter((s) => s.screeningDecision !== "exclude_invalid_id").length,
    support: scientific.filter((s) => s.scientificRelation === "support").length,
    contradict: scientific.filter((s) => s.scientificRelation === "contradict").length,
    background: scientific.filter((s) => s.scientificRelation === "background").length,
    insufficientContext: scientific.filter((s) => s.scientificRelation === "insufficient_context").length,
    excludedInvalidId: scientific.filter((s) => s.screeningDecision === "exclude_invalid_id").length,
  };
  const warrantsScientificEvidenceGap =
    scientific.some(
      (s) =>
        s.screeningDecision === "include_for_sme" &&
        (s.scientificRelation === "support" || s.scientificRelation === "contradict"),
    ) ||
    (counts.identifierValidated > 0 &&
      counts.support + counts.contradict + counts.background >= 2 &&
      counts.support + counts.contradict >= 1);

  return {
    questionKey: input.questionKey,
    researchQuestion: input.researchQuestion,
    works,
    counts,
    warrantsScientificEvidenceGap,
    honesty:
      "identifierValidated counts structural IDs only. scientificallyAppraised is per-question engineering screen. Shared PMID across gaps does not imply multi-support.",
  };
}

/** Map appraisal → Neon link_role (additive roles already on 0024). */
export function linkRoleFromAppraisal(a: ScientificAppraisal): string {
  if (a.screeningDecision === "exclude_invalid_id" || a.screeningDecision === "exclude_off_topic") {
    return "excluded_hit";
  }
  if (a.nctId && !a.pmid && !a.doi) return "trial_hit";
  if (a.scientificRelation === "support") return "supports_uncertainty";
  if (a.scientificRelation === "contradict") return "conflicting";
  if (a.screeningDecision === "include_for_sme") return "retrieved_hit";
  return "background";
}

/**
 * Prove same PMID can receive different relations on different questions.
 * Used in tests — not a claim about real papers.
 */
export function assertPerQuestionReappraisal(input: {
  appraisals: Array<Pick<ScientificAppraisal, "questionKey" | "pmid" | "scientificRelation">>;
  pmid: string;
}): { ok: true; relationsByQuestion: Record<string, ScientificRelation> } | { ok: false; error: string } {
  const forPmid = input.appraisals.filter((a) => a.pmid === input.pmid);
  if (forPmid.length < 2) {
    return { ok: false, error: "Need ≥2 question appraisals for the same PMID to verify re-appraisal." };
  }
  const relationsByQuestion: Record<string, ScientificRelation> = {};
  for (const a of forPmid) {
    relationsByQuestion[a.questionKey] = a.scientificRelation;
  }
  return { ok: true, relationsByQuestion };
}

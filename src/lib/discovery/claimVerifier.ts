/**
 * Evidence Intel 4.0 — Claim Verifier.
 * Structured proposition ↔ passage check with abstain path.
 * Title-only ≠ direct support; keyword hit ≠ support.
 * Identifier-validated ≠ scientifically verified.
 * High confidence never overrides missing evidence.
 */
import { assessIdentifier, type IdentifierAssessment } from "@/lib/discovery/appraise";
import { validateDoi, validateNct, validatePmid, type RetrievedWork } from "@/lib/discovery/retrieve";

export const CLAIM_VERIFIER_POLICY = {
  titleOnlyMeansSupport: false as const,
  keywordHitMeansSupport: false as const,
  identifierValidatedMeansAppraised: false as const,
  highConfidenceOverridesMissingEvidence: false as const,
  autoGateC: false as const,
  autoReviewedOpportunity: false as const,
  abstainWhenInsufficient: true as const,
} as const;

export const CLAIM_CLASSIFICATIONS = [
  "support",
  "contradict",
  "background",
  "insufficient",
] as const;
export type ClaimClassification = (typeof CLAIM_CLASSIFICATIONS)[number];

/** Facet terms that must co-occur for direct support/contradict (not mere topicality). */
export type ClaimFacetLexicon = {
  population: string[];
  interventionOrExposure: string[];
  outcome: string[];
  /** Optional design cues that strengthen directness when present. */
  designCues?: string[];
  contradictMarkers?: string[];
  confounderMarkers?: string[];
};

export type ClaimProposition = {
  questionKey: string;
  /** Full research question / claim text. */
  proposition: string;
  facets: ClaimFacetLexicon;
};

export type PassageEvidence = {
  text: string;
  source: "abstract_sentence" | "abstract_span" | "title_only" | "unavailable";
};

export type ClaimVerification = {
  questionKey: string;
  workKey: string;
  pmid: string | null;
  doi: string | null;
  nctId: string | null;
  title: string | null;
  /** Structural ID check only. */
  identifierValidated: boolean;
  identifier: IdentifierAssessment;
  /** True only when a scientific classification other than pure ID-fail was produced. */
  scientificallyVerified: boolean;
  proposition: string;
  passage: PassageEvidence;
  design: string;
  population: string;
  intervention: string;
  outcome: string;
  directness: "direct" | "indirect" | "unclear";
  confounders: string[];
  classification: ClaimClassification;
  /** Engineering confidence — never overrides abstain / missing evidence. */
  modelConfidence: "low" | "moderate" | "high";
  abstained: boolean;
  abstainReason: string | null;
  limitations: string;
  engineeringScreen: true;
  smeConfirmed: false;
  verifiedAt: string;
  /** Prior 3.0 appraisal relation if re-scored — for false-support audit. */
  priorAppraisalRelation?: string | null;
  demotedFromPriorSupport?: boolean;
};

export type ClaimVerificationBundle = {
  questionKey: string;
  proposition: string;
  verifications: ClaimVerification[];
  counts: {
    retrieved: number;
    identifierValidated: number;
    scientificallyVerified: number;
    support: number;
    contradict: number;
    background: number;
    insufficient: number;
    abstained: number;
    titleOnlyBlocked: number;
    keywordOnlyBlocked: number;
    demotedFromPriorSupport: number;
  };
  honesty: string;
};

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

function workKeyOf(w: {
  pmid?: string | null;
  doi?: string | null;
  nctId?: string | null;
  title?: string | null;
}): string {
  if (w.pmid && validatePmid(w.pmid)) return `pmid:${w.pmid}`;
  if (w.doi && validateDoi(w.doi)) return `doi:${w.doi.toLowerCase()}`;
  if (w.nctId && validateNct(w.nctId)) return `nct:${w.nctId}`;
  if (w.title) return `title:${w.title.slice(0, 80).toLowerCase()}`;
  return "unknown";
}

function inferDesign(blob: string): string {
  const cues: string[] = [];
  if (/\brandomi[sz]ed\b|\brct\b/i.test(blob)) cues.push("randomized/RCT");
  if (/\bmeta-?analysis\b|\bsystematic review\b/i.test(blob)) cues.push("review/meta-analysis");
  if (/\bmouse\b|\bmurine\b|\bin vivo\b/i.test(blob)) cues.push("preclinical/in vivo");
  if (/\bpatient\b|\bcohort\b|\bclinical\b/i.test(blob)) cues.push("clinical/human");
  if (/\bin vitro\b|\bcell line\b/i.test(blob)) cues.push("in vitro");
  return cues.length ? cues.join("; ") : "design unclear from available text";
}

function pickPassage(title: string, abstract: string | null, terms: string[]): PassageEvidence {
  if (!abstract?.trim() && !title.trim()) {
    return { text: "passage unavailable", source: "unavailable" };
  }
  if (!abstract?.trim()) {
    return { text: `title_only: ${title.slice(0, 280)}`, source: "title_only" };
  }
  const sentences = abstract
    .replace(/<[^>]+>/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40);
  for (const s of sentences) {
    if (termHits(s, terms).length > 0) {
      return { text: s.slice(0, 480), source: "abstract_sentence" };
    }
  }
  return {
    text: (sentences[0] ?? abstract).slice(0, 480),
    source: "abstract_span",
  };
}

/**
 * Verify one work against one proposition.
 * Abstains when facets incomplete, title-only, or only keyword topicality.
 */
export function verifyClaimAgainstPassage(input: {
  proposition: ClaimProposition;
  work: RetrievedWork & { abstractText?: string | null };
  /** Optional prior 3.0 relation for demotion audit. */
  priorAppraisalRelation?: string | null;
  /** Declared model confidence — cannot force support when evidence insufficient. */
  modelConfidence?: "low" | "moderate" | "high";
  nowIso?: string;
}): ClaimVerification {
  const id = assessIdentifier(input.work);
  const declaredConfidence = input.modelConfidence ?? "moderate";
  const title = input.work.title?.trim() || "";
  const abstract = input.work.abstractText?.trim() || null;
  const blob = `${title}\n${abstract ?? ""}`;
  const facets = input.proposition.facets;

  const popHits = termHits(blob, facets.population);
  const intHits = termHits(blob, facets.interventionOrExposure);
  const outHits = termHits(blob, facets.outcome);
  const designHits = termHits(blob, facets.designCues ?? []);
  const contradictHits = termHits(blob, facets.contradictMarkers ?? []);
  const confounderHits = termHits(blob, facets.confounderMarkers ?? []);

  const base = {
    questionKey: input.proposition.questionKey,
    workKey: workKeyOf({ ...id, title }),
    pmid: id.pmid,
    doi: id.doi,
    nctId: id.nctId,
    title: title || null,
    identifierValidated: id.identifierValidated,
    identifier: id,
    proposition: input.proposition.proposition,
    design: inferDesign(blob),
    population: popHits.length ? popHits.join("; ") : "population facet not evidenced in passage",
    intervention: intHits.length
      ? intHits.join("; ")
      : "intervention/exposure facet not evidenced in passage",
    outcome: outHits.length ? outHits.join("; ") : "outcome facet not evidenced in passage",
    confounders: confounderHits,
    engineeringScreen: true as const,
    smeConfirmed: false as const,
    verifiedAt: input.nowIso ?? new Date().toISOString(),
    priorAppraisalRelation: input.priorAppraisalRelation ?? null,
  };

  const passage = pickPassage(title, abstract, [
    ...popHits,
    ...intHits,
    ...outHits,
    ...contradictHits,
  ]);

  // Invalid ID → insufficient (not scientific support).
  if (!id.identifierValidated) {
    return {
      ...base,
      scientificallyVerified: false,
      passage,
      directness: "unclear",
      classification: "insufficient",
      modelConfidence: declaredConfidence,
      abstained: true,
      abstainReason: "No valid PMID/DOI/NCT — identifier-validated false; scientific verification withheld.",
      limitations: "Identifier validation failed. Not a scientific appraisal.",
      demotedFromPriorSupport: input.priorAppraisalRelation === "support",
    };
  }

  // Title-only cannot be direct support/contradict.
  if (passage.source === "title_only" || !abstract) {
    const demoted = input.priorAppraisalRelation === "support";
    return {
      ...base,
      scientificallyVerified: true,
      passage,
      directness: "unclear",
      classification: "insufficient",
      modelConfidence: declaredConfidence,
      abstained: true,
      abstainReason:
        "Title-only (or abstract unavailable) — cannot classify as support/contradict. Abstain.",
      limitations:
        "Title-only ≠ direct support per CLAIM_VERIFIER_POLICY. Full text / abstract required for support claims.",
      demotedFromPriorSupport: demoted,
    };
  }

  const facetCoverage =
    (popHits.length > 0 ? 1 : 0) + (intHits.length > 0 ? 1 : 0) + (outHits.length > 0 ? 1 : 0);

  // Keyword topicality alone (1 facet) ≠ support.
  if (facetCoverage < 2) {
    const demoted = input.priorAppraisalRelation === "support";
    const classification: ClaimClassification =
      facetCoverage === 1 || title ? "background" : "insufficient";
    return {
      ...base,
      scientificallyVerified: true,
      passage,
      directness: "indirect",
      classification: facetCoverage === 0 ? "insufficient" : classification,
      modelConfidence: declaredConfidence,
      abstained: facetCoverage === 0,
      abstainReason:
        facetCoverage === 0
          ? "No population / intervention / outcome facets evidenced — abstain."
          : null,
      limitations:
        "Keyword hit ≠ support. Need ≥2 of {population, intervention/exposure, outcome} co-present in abstract for support/contradict. High model confidence does not override.",
      demotedFromPriorSupport: demoted,
    };
  }

  // Contradict path — still requires facet coverage.
  if (contradictHits.length > 0 && facetCoverage >= 2) {
    return {
      ...base,
      scientificallyVerified: true,
      passage: pickPassage(title, abstract, contradictHits),
      directness: facetCoverage === 3 && designHits.length > 0 ? "direct" : "indirect",
      classification: "contradict",
      modelConfidence: declaredConfidence,
      abstained: false,
      abstainReason: null,
      limitations:
        "Engineering contradict screen from facet co-occurrence + markers — not SME confirmation. Does not approve Gate C.",
      demotedFromPriorSupport: false,
    };
  }

  // Support requires all three facets for "direct"; 2 facets → still abstain as insufficient for support claim
  // (background if topical) unless outcome+intervention+population all present.
  if (facetCoverage === 3) {
    return {
      ...base,
      scientificallyVerified: true,
      passage,
      directness: designHits.length > 0 ? "direct" : "indirect",
      classification: "support",
      modelConfidence: declaredConfidence,
      abstained: false,
      abstainReason: null,
      limitations: [
        "Engineering support screen: population + intervention/exposure + outcome co-present in abstract.",
        "Not causal proof; not SME peer review; not Gate C approve.",
        declaredConfidence === "high"
          ? "Declared high model confidence recorded but does not waive SME review."
          : "",
      ]
        .filter(Boolean)
        .join(" "),
      demotedFromPriorSupport: false,
    };
  }

  // Exactly 2 facets — abstain from support; classify background (topical but not direct).
  const demoted = input.priorAppraisalRelation === "support";
  return {
    ...base,
    scientificallyVerified: true,
    passage,
    directness: "indirect",
    classification: "insufficient",
    modelConfidence: declaredConfidence,
    abstained: true,
    abstainReason:
      "Only 2/3 claim facets evidenced — abstain from support/contradict (insufficient for direct claim).",
    limitations:
      "Partial facet match is insufficient for support. Keyword co-occurrence without full proposition alignment ≠ support.",
    demotedFromPriorSupport: demoted,
  };
}

export function verifyClaimsForQuestion(input: {
  proposition: ClaimProposition;
  works: Array<
    RetrievedWork & {
      abstractText?: string | null;
      priorAppraisalRelation?: string | null;
    }
  >;
  modelConfidence?: "low" | "moderate" | "high";
  nowIso?: string;
}): ClaimVerificationBundle {
  const verifications = input.works.map((w) =>
    verifyClaimAgainstPassage({
      proposition: input.proposition,
      work: w,
      priorAppraisalRelation: w.priorAppraisalRelation,
      modelConfidence: input.modelConfidence,
      nowIso: input.nowIso,
    }),
  );

  const counts = {
    retrieved: verifications.length,
    identifierValidated: verifications.filter((v) => v.identifierValidated).length,
    scientificallyVerified: verifications.filter((v) => v.scientificallyVerified).length,
    support: verifications.filter((v) => v.classification === "support").length,
    contradict: verifications.filter((v) => v.classification === "contradict").length,
    background: verifications.filter((v) => v.classification === "background").length,
    insufficient: verifications.filter((v) => v.classification === "insufficient").length,
    abstained: verifications.filter((v) => v.abstained).length,
    titleOnlyBlocked: verifications.filter((v) => v.passage.source === "title_only").length,
    keywordOnlyBlocked: verifications.filter((v) => v.demotedFromPriorSupport).length,
    demotedFromPriorSupport: verifications.filter((v) => v.demotedFromPriorSupport).length,
  };

  return {
    questionKey: input.proposition.questionKey,
    proposition: input.proposition.proposition,
    verifications,
    counts,
    honesty:
      "identifierValidated ≠ scientificallyVerified. support requires population+intervention/exposure+outcome in abstract. Title-only and keyword-only hits abstain or background. Accuracy vs gold labels is unknown until SME labels exist — never invent accuracy %.",
  };
}

/** Facet lexicons for the five deep dossiers — proposition-aligned, not broad topical OR soup. */
export const DEEP_CLAIM_PROPOSITIONS: Record<string, ClaimProposition> = {
  "GAP-OPP-A-MHC-PD1-RESIST": {
    questionKey: "GAP-OPP-A-MHC-PD1-RESIST",
    proposition:
      "In metastatic melanoma, does loss of MHC class I or antigen-presentation machinery causally mediate anti-PD-1 resistance, or is the association primarily correlative without causal evidence in human disease?",
    facets: {
      population: ["melanoma", "metastatic melanoma"],
      interventionOrExposure: [
        "MHC",
        "MHC class I",
        "HLA class I",
        "B2M",
        "beta2-microglobulin",
        "antigen presentation",
        "antigen-presentation",
      ],
      outcome: [
        "PD-1 resistance",
        "anti-PD-1",
        "anti-PD1",
        "pembrolizumab",
        "nivolumab",
        "checkpoint resistance",
        "ICI resistance",
        "resistant",
        "resistance",
        "refractory",
        "non-response",
        "nonresponse",
      ],
      designCues: ["causal", "causally", "mediates", "mediation", "knockout", "loss of"],
      contradictMarkers: ["independent of MHC", "intact antigen presentation", "MHC-independent"],
      confounderMarkers: ["correlative", "association only", "observational"],
    },
  },
  "GAP-OPP-A-LAG3-TIM3-EXHAUST": {
    questionKey: "GAP-OPP-A-LAG3-TIM3-EXHAUST",
    proposition:
      "In PD-1-refractory metastatic melanoma, does dual LAG-3 and/or TIM-3 blockade reverse T-cell exhaustion beyond PD-1 monotherapy in antigen-experienced TILs, or are benefits confined to biomarker-selected subsets?",
    facets: {
      population: ["melanoma", "TIL", "tumor-infiltrating"],
      interventionOrExposure: ["LAG-3", "LAG3", "TIM-3", "TIM3", "relatlimab", "dual blockade"],
      outcome: ["exhaustion", "exhausted", "revers", "PD-1", "PD1", "checkpoint"],
      designCues: ["randomized", "clinical trial", "biomarker"],
      contradictMarkers: ["no benefit", "redundant with PD-1", "failed to reverse"],
      confounderMarkers: ["biomarker-selected", "subset only"],
    },
  },
  "GAP-OPP-A-AGPRES-UPSTREAM": {
    questionKey: "GAP-OPP-A-AGPRES-UPSTREAM",
    proposition:
      "Is impaired antigen presentation upstream of T-cell exhaustion phenotypes in melanoma (causing dysfunction via weak TCR signal), or a parallel resistance axis that can coexist with classical exhaustion markers?",
    facets: {
      population: ["melanoma"],
      interventionOrExposure: [
        "antigen presentation",
        "MHC",
        "TCR",
        "upstream",
        "impaired antigen",
      ],
      outcome: ["exhaustion", "exhausted", "dysfunction", "resistance"],
      designCues: ["upstream", "causal order", "precedes", "parallel"],
      contradictMarkers: ["independent axes", "parallel only", "not upstream"],
      confounderMarkers: ["correlative", "coexist"],
    },
  },
  "GAP-OPP-B-CD28NULL-RA-AGE": {
    questionKey: "GAP-OPP-B-CD28NULL-RA-AGE",
    proposition:
      "Do CD28-null (CD28−) CD8+ T cells drive rheumatoid arthritis synovial inflammation independently of chronological ageing, or are expanded CD28-null populations primarily an ageing-associated epiphenomenon without disease-specific pathogenicity?",
    facets: {
      population: ["rheumatoid arthritis", "RA", "synovial"],
      interventionOrExposure: ["CD28-null", "CD28null", "CD28−", "CD28-", "CD28 null"],
      outcome: ["inflammation", "pathogenicity", "pathogenic", "ageing", "aging", "immunosenescence"],
      designCues: ["independently of age", "age-matched", "chronological"],
      contradictMarkers: ["epiphenomenon", "not pathogenic", "ageing only", "aging only"],
      confounderMarkers: ["ageing", "aging", "CMV", "immunosenescence"],
    },
  },
  "GAP-OPP-B-CD28NULL-SSC": {
    questionKey: "GAP-OPP-B-CD28NULL-SSC",
    proposition:
      "In systemic sclerosis (SSc), does CD28-null T-cell expansion associate with progressive fibrosis beyond immunosenescence markers shared with healthy ageing, and is the association reproducible across cutaneous vs visceral disease subsets?",
    facets: {
      population: ["systemic sclerosis", "scleroderma", "SSc", "dcSSc"],
      interventionOrExposure: ["CD28-null", "CD28null", "CD28−", "CD28-", "CD28 null"],
      outcome: ["fibrosis", "fibrotic", "progressive", "skin", "visceral"],
      designCues: ["subset", "cutaneous", "age-matched"],
      contradictMarkers: ["no association", "ageing only", "not reproducible"],
      confounderMarkers: ["ageing", "aging", "immunosenescence", "abatacept"],
    },
  },
};

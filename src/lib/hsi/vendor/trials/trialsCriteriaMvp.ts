/**
 * HSI Trials MVP — criterion five-state assessment (Path B / Cap 8).
 * Never emits “confirmed eligible” / “patient eligible” / “AI confirmed eligible”.
 * Synthetic patient attributes only; no live PHI.
 */
import { HSI_CDS_PHI_INVARIANTS, type HsiCdsPhiInvariants } from "./cdsPhiBoundary";

export const TRIALS_CRITERIA_MVP_SCHEMA = "hsi-trials-criteria-mvp-1" as const;

/** Binding five states from HSI_BIOLOGY_TO_TRIALS_WORKFLOW Path B. */
export const CRITERION_STATES = [
  "satisfied",
  "not_satisfied",
  "unknown",
  "ambiguous",
  "requires_investigator_review",
] as const;
export type CriterionState = (typeof CRITERION_STATES)[number];

/** UI / docs legend — five Path B states; none imply enrolment suitability. */
export const CRITERION_STATE_LEGEND: readonly {
  state: CriterionState;
  label: string;
  meaning: string;
}[] = [
  {
    state: "satisfied",
    label: "satisfied",
    meaning: "Structured attribute meets the rule — still not ‘confirmed eligible’.",
  },
  {
    state: "not_satisfied",
    label: "not satisfied",
    meaning: "Structured attribute fails the rule — investigator still owns enrolment.",
  },
  {
    state: "unknown",
    label: "unknown",
    meaning: "Attribute missing; gap is meta about absence — not a negative clinical fact.",
  },
  {
    state: "ambiguous",
    label: "ambiguous",
    meaning: "Value or criterion cannot be evaluated cleanly without clarification.",
  },
  {
    state: "requires_investigator_review",
    label: "requires investigator review",
    meaning: "Unstructured or judgment-heavy criterion — never auto-resolved by HSI.",
  },
] as const;

export const FORBIDDEN_ELIGIBILITY_PHRASES = [
  "confirmed eligible",
  "patient eligible",
  "ai confirmed eligible",
  "fully eligible",
  "eligible for enrolment",
  "eligible for enrollment",
] as const;

export type TrialCriterion = {
  id: string;
  text: string;
  attributeKey: string;
  /** When true, unstructured — force ambiguous or investigator review. */
  unstructured?: boolean;
  operator: "eq" | "gte" | "lte" | "includes" | "present";
  expected?: string | number | boolean;
};

export type SyntheticPatientAttrs = {
  fixtureId: string;
  syntheticOnly: true;
  containsPhi: false;
  /** Sparse map — omitted keys → unknown. */
  attrs: Record<string, string | number | boolean | undefined>;
};

export type CriterionAssessment = {
  criterionId: string;
  criterionText: string;
  state: CriterionState;
  attributeKey: string;
  attributePresent: boolean;
  attributeValue: string | number | boolean | null;
  method: string;
  /** Provenance chip — fixture source only in this MVP. */
  provenanceSource: string;
  evaluatedAt: string;
  majorityVote: false;
  confirmedEligible: false;
};

export type TrialsCriteriaReport = {
  schemaVersion: typeof TRIALS_CRITERIA_MVP_SCHEMA;
  product: "HSI Trials";
  maturity: "planned";
  trialId: string;
  patientFixtureId: string;
  syntheticOnly: true;
  containsPhi: false;
  assessments: CriterionAssessment[];
  missingAttributes: string[];
  /** Aggregate — never “confirmed eligible”. */
  overallLabel: "criterion_assessment_only";
  confirmedEligible: false;
  patientEligible: false;
  invariants: HsiCdsPhiInvariants;
  honesty: string[];
};

/** Demo trial criteria — melanoma / PD-1 educational stub (not a live registry). */
export const DEMO_TRIAL_CRITERIA: readonly TrialCriterion[] = [
  {
    id: "c-age-18",
    text: "Age ≥ 18 years",
    attributeKey: "age_years",
    operator: "gte",
    expected: 18,
  },
  {
    id: "c-diagnosis",
    text: "Histologically confirmed melanoma",
    attributeKey: "diagnosis_melanoma",
    operator: "eq",
    expected: true,
  },
  {
    id: "c-ecog",
    text: "ECOG performance status 0–1",
    attributeKey: "ecog",
    operator: "lte",
    expected: 1,
  },
  {
    id: "c-ldh",
    text: "LDH within protocol range (requires structured value)",
    attributeKey: "ldh_u_l",
    operator: "present",
  },
  {
    id: "c-narrative",
    text: "Investigator judgment on prior immunotherapy exposure (narrative)",
    attributeKey: "prior_io_narrative",
    operator: "present",
    unstructured: true,
  },
] as const;

/** Second educational stub — RA / anti-TNF criteria (not a live registry). */
export const DEMO_TRIAL_CRITERIA_RA: readonly TrialCriterion[] = [
  {
    id: "c-ra-age-18",
    text: "Age ≥ 18 years",
    attributeKey: "age_years",
    operator: "gte",
    expected: 18,
  },
  {
    id: "c-ra-diagnosis",
    text: "Diagnosis of rheumatoid arthritis (structured)",
    attributeKey: "diagnosis_ra",
    operator: "eq",
    expected: true,
  },
  {
    id: "c-ra-das28",
    text: "DAS28 ≥ 3.2 (requires structured score)",
    attributeKey: "das28",
    operator: "gte",
    expected: 3.2,
  },
  {
    id: "c-ra-mtx",
    text: "Prior methotrexate exposure recorded",
    attributeKey: "prior_mtx",
    operator: "eq",
    expected: true,
  },
  {
    id: "c-ra-narrative",
    text: "Investigator judgment on infection risk / comorbidity narrative",
    attributeKey: "infection_risk_narrative",
    operator: "present",
    unstructured: true,
  },
] as const;

export type DemoTrialStub = {
  trialId: string;
  displayLabel: string;
  /** Educational registry stub — never a live CT.gov match. */
  registryNote: string;
  criteria: readonly TrialCriterion[];
};

/** ≥2 synthetic trial assessment fixtures for the multi-trial picker. */
export const DEMO_TRIAL_STUBS: readonly DemoTrialStub[] = [
  {
    trialId: "DEMO-NCT-SYNTH",
    displayLabel: "Melanoma / PD-1 educational stub",
    registryNote: "Educational melanoma criteria — not a live CT.gov match.",
    criteria: DEMO_TRIAL_CRITERIA,
  },
  {
    trialId: "DEMO-NCT-RA-TNF",
    displayLabel: "RA / anti-TNF educational stub",
    registryNote: "Educational RA criteria — not a live CT.gov match.",
    criteria: DEMO_TRIAL_CRITERIA_RA,
  },
] as const;

export const DEMO_PATIENT_FIXTURES: readonly SyntheticPatientAttrs[] = [
  {
    fixtureId: "syn-trial-patient-partial",
    syntheticOnly: true,
    containsPhi: false,
    attrs: {
      age_years: 54,
      diagnosis_melanoma: true,
      ecog: 0,
      // ldh omitted → unknown
      prior_io_narrative: "Prior PD-1 exposure noted in free text",
      // RA attrs for second trial — sparse so unknowns surface
      diagnosis_ra: true,
      prior_mtx: true,
      // das28 omitted → unknown
      infection_risk_narrative: "Prior TB screen noted in free text",
    },
  },
  {
    fixtureId: "syn-trial-patient-fail-age",
    syntheticOnly: true,
    containsPhi: false,
    attrs: {
      age_years: 16,
      diagnosis_melanoma: true,
      ecog: 1,
      ldh_u_l: 180,
      diagnosis_ra: false,
      das28: 5.1,
      prior_mtx: false,
    },
  },
] as const;

export function listDemoTrialStubs(): readonly DemoTrialStub[] {
  return DEMO_TRIAL_STUBS;
}

export function getDemoTrialStub(trialId: string): DemoTrialStub | null {
  return DEMO_TRIAL_STUBS.find((t) => t.trialId === trialId) ?? null;
}

export function containsForbiddenEligibilityLanguage(text: string): boolean {
  const n = text.toLowerCase();
  return FORBIDDEN_ELIGIBILITY_PHRASES.some((p) => n.includes(p));
}

function evalCriterion(
  c: TrialCriterion,
  attrs: Record<string, string | number | boolean | undefined>,
  now: string,
): CriterionAssessment {
  const raw = attrs[c.attributeKey];
  const present = raw !== undefined && raw !== null && raw !== "";

  if (c.unstructured) {
    return {
      criterionId: c.id,
      criterionText: c.text,
      state: present ? "requires_investigator_review" : "ambiguous",
      attributeKey: c.attributeKey,
      attributePresent: present,
      attributeValue: present ? (raw as string | number | boolean) : null,
      method: "unstructured_criterion_force_review",
      provenanceSource: "fixture://trials-attrs",
      evaluatedAt: now,
      majorityVote: false,
      confirmedEligible: false,
    };
  }

  if (!present) {
    return {
      criterionId: c.id,
      criterionText: c.text,
      state: "unknown",
      attributeKey: c.attributeKey,
      attributePresent: false,
      attributeValue: null,
      method: "attribute_missing",
      provenanceSource: "fixture://trials-attrs",
      evaluatedAt: now,
      majorityVote: false,
      confirmedEligible: false,
    };
  }

  let state: CriterionState = "ambiguous";
  let method = "rule_eval";

  switch (c.operator) {
    case "present":
      state = "satisfied";
      method = "attribute_present";
      break;
    case "eq":
      state = raw === c.expected ? "satisfied" : "not_satisfied";
      method = "equality";
      break;
    case "gte":
      state =
        typeof raw === "number" && typeof c.expected === "number" && raw >= c.expected
          ? "satisfied"
          : typeof raw === "number"
            ? "not_satisfied"
            : "ambiguous";
      method = "gte";
      break;
    case "lte":
      state =
        typeof raw === "number" && typeof c.expected === "number" && raw <= c.expected
          ? "satisfied"
          : typeof raw === "number"
            ? "not_satisfied"
            : "ambiguous";
      method = "lte";
      break;
    case "includes":
      state =
        typeof raw === "string" && typeof c.expected === "string" && raw.includes(c.expected)
          ? "satisfied"
          : "not_satisfied";
      method = "includes";
      break;
    default:
      state = "ambiguous";
      method = "unknown_operator";
  }

  return {
    criterionId: c.id,
    criterionText: c.text,
    state,
    attributeKey: c.attributeKey,
    attributePresent: true,
    attributeValue: raw as string | number | boolean,
    method,
    provenanceSource: "fixture://trials-attrs",
    evaluatedAt: now,
    majorityVote: false,
    confirmedEligible: false,
  };
}

/**
 * Assess trial criteria against synthetic patient attrs.
 * Fail closed on PHI flags. Never sets confirmedEligible.
 */
export function assessTrialCriteria(input: {
  trialId: string;
  criteria?: readonly TrialCriterion[];
  patient: SyntheticPatientAttrs;
  now?: Date;
}): TrialsCriteriaReport {
  if (!input.patient.syntheticOnly || input.patient.containsPhi) {
    throw new Error("Fail closed: Trials MVP accepts syntheticOnly non-PHI fixtures only.");
  }
  const now = (input.now ?? new Date()).toISOString();
  const stub = getDemoTrialStub(input.trialId);
  const criteria = input.criteria ?? stub?.criteria ?? DEMO_TRIAL_CRITERIA;
  const assessments = criteria.map((c) => evalCriterion(c, input.patient.attrs, now));

  // Safety: strip any accidental forbidden language from criterion text copies
  for (const a of assessments) {
    if (containsForbiddenEligibilityLanguage(a.criterionText)) {
      a.state = "requires_investigator_review";
      a.method = "forbidden_eligibility_language_in_criterion";
    }
  }

  const missingAttributes = [
    ...new Set(assessments.filter((a) => a.state === "unknown").map((a) => a.attributeKey)),
  ];

  const report: TrialsCriteriaReport = {
    schemaVersion: TRIALS_CRITERIA_MVP_SCHEMA,
    product: "HSI Trials",
    maturity: "planned",
    trialId: input.trialId,
    patientFixtureId: input.patient.fixtureId,
    syntheticOnly: true,
    containsPhi: false,
    assessments,
    missingAttributes,
    overallLabel: "criterion_assessment_only",
    confirmedEligible: false,
    patientEligible: false,
    invariants: { ...HSI_CDS_PHI_INVARIANTS },
    honesty: [
      "HSI Trials MVP — criterion-level assessment only (Planned product).",
      "confirmedEligible=false · patientEligible=false always.",
      "Do not emit affirmative enrolment suitability labels; investigator owns enrolment.",
      "Unknown/ambiguous/requires_investigator_review used when data or criteria unclear.",
      "Synthetic fixtures only — no live registry matcher; no PHI.",
    ],
  };

  // Final assert — assessments + aggregate labels only (honesty may discuss the ban).
  const publicBlob = JSON.stringify({
    overallLabel: report.overallLabel,
    assessments: report.assessments.map((a) => ({
      criterionText: a.criterionText,
      state: a.state,
      method: a.method,
    })),
  });
  if (containsForbiddenEligibilityLanguage(publicBlob)) {
    throw new Error("Fail closed: forbidden eligibility language leaked into Trials report.");
  }
  return report;
}

export function getDemoPatientFixture(fixtureId: string): SyntheticPatientAttrs | null {
  return DEMO_PATIENT_FIXTURES.find((p) => p.fixtureId === fixtureId) ?? null;
}

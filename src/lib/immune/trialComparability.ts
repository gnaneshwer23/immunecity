/**
 * ISI-A08 light — contextual trial/arm comparability checks.
 * Surfaces mismatches only. Never declares treatment superiority or comparative efficacy.
 * Educational — association ≠ causation; not clinical decision support.
 */
import type { ClinicalTrialRecord, EndpointResultRecord, TrialArmRecord } from "@/data/trialIntelligence";
import { NON_CAUSAL_TRIAL_WARNING } from "@/data/trialIntelligence";

export type ComparabilityDimension =
  | "disease_stage"
  | "treatment_line"
  | "endpoint_definition"
  | "follow_up"
  | "analysis_population";

export interface ComparabilityFacet {
  diseaseStage: string;
  treatmentLine: string;
  /** Distinct endpoint type keys present across arms (sorted). */
  endpointTypes: string[];
  /** Human labels for endpoint types (sorted). */
  endpointLabels: string[];
  /** Representative follow-up / timepoint strings from verified endpoints. */
  followUpNotes: string[];
  analysisPopulation: string;
}

export interface ComparabilityMismatch {
  dimension: ComparabilityDimension;
  label: string;
  left: string;
  right: string;
  detail: string;
}

export interface ComparabilityReport {
  leftId: string;
  rightId: string;
  leftLabel: string;
  rightLabel: string;
  mismatches: ComparabilityMismatch[];
  /** Always true for cross-trial / cross-arm contextual views — never claim superiority. */
  forbidsSuperiorityClaim: true;
  warning: string;
}

const DIMENSION_LABEL: Record<ComparabilityDimension, string> = {
  disease_stage: "Disease stage / condition",
  treatment_line: "Treatment line / prior therapy",
  endpoint_definition: "Endpoint definition",
  follow_up: "Follow-up / timepoint",
  analysis_population: "Analysis population",
};

/** Derive structured facets from curated trial text — no invented clinical claims. */
export function trialComparabilityFacet(trial: ClinicalTrialRecord): ComparabilityFacet {
  const endpointTypes = new Set<string>();
  const endpointLabels = new Set<string>();
  const followUpNotes = new Set<string>();
  for (const arm of trial.arms) {
    for (const ep of arm.endpoints) {
      endpointTypes.add(ep.endpointType);
      endpointLabels.add(`${ep.endpointType}: ${ep.label}`);
      const fu = [ep.followUp, ep.timepoint].filter(Boolean).join(" · ");
      if (fu) followUpNotes.add(fu);
    }
  }
  return {
    diseaseStage: trial.conditionLabel.trim() || "Not recorded",
    treatmentLine: inferTreatmentLine(trial),
    endpointTypes: [...endpointTypes].sort(),
    endpointLabels: [...endpointLabels].sort(),
    followUpNotes: [...followUpNotes].sort(),
    analysisPopulation: trial.analysisSetNote.trim() || "Not recorded",
  };
}

/**
 * Treatment-line facet from existing population / condition prose.
 * Only encodes distinctions already present in curated summaries.
 */
function inferTreatmentLine(trial: ClinicalTrialRecord): string {
  const blob = `${trial.populationSummary} ${trial.conditionLabel} ${trial.title}`.toLowerCase();
  if (/previously untreated|treatment-naive|treatment naïve|first-line|no prior/.test(blob)) {
    return "Previously untreated / first-line (as stated in curated summary)";
  }
  if (/prior systemic|up to one prior|previously treated|ipilimumab-naive|ipilimumab-naïve/.test(blob)) {
    return "Prior systemic therapy allowed (as stated in curated summary)";
  }
  return "Not classified from curated summary";
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function setEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Cross-trial contextual compare — mismatches only; never ranks regimens. */
export function compareTrials(left: ClinicalTrialRecord, right: ClinicalTrialRecord): ComparabilityReport {
  const L = trialComparabilityFacet(left);
  const R = trialComparabilityFacet(right);
  const mismatches: ComparabilityMismatch[] = [];

  if (norm(L.diseaseStage) !== norm(R.diseaseStage)) {
    mismatches.push({
      dimension: "disease_stage",
      label: DIMENSION_LABEL.disease_stage,
      left: L.diseaseStage,
      right: R.diseaseStage,
      detail: "Condition / stage wording differs — do not treat populations as interchangeable.",
    });
  }
  if (norm(L.treatmentLine) !== norm(R.treatmentLine)) {
    mismatches.push({
      dimension: "treatment_line",
      label: DIMENSION_LABEL.treatment_line,
      left: L.treatmentLine,
      right: R.treatmentLine,
      detail: "Prior-therapy / line context differs across these trials.",
    });
  }
  if (!setEqual(L.endpointTypes, R.endpointTypes)) {
    mismatches.push({
      dimension: "endpoint_definition",
      label: DIMENSION_LABEL.endpoint_definition,
      left: L.endpointTypes.join(", ") || "—",
      right: R.endpointTypes.join(", ") || "—",
      detail:
        "Endpoint types differ (e.g. median PFS vs landmark rate; grade 3–4 vs 3–5). Figures are not interchangeable.",
    });
  }
  if (!setEqual(L.followUpNotes, R.followUpNotes)) {
    mismatches.push({
      dimension: "follow_up",
      label: DIMENSION_LABEL.follow_up,
      left: L.followUpNotes.join("; ") || "Not recorded on endpoints",
      right: R.followUpNotes.join("; ") || "Not recorded on endpoints",
      detail: "Follow-up durations / timepoints differ — landmark rates are not head-to-head.",
    });
  }
  if (norm(L.analysisPopulation) !== norm(R.analysisPopulation)) {
    mismatches.push({
      dimension: "analysis_population",
      label: DIMENSION_LABEL.analysis_population,
      left: L.analysisPopulation,
      right: R.analysisPopulation,
      detail: "Analysis-set notes differ (e.g. ITT vs treated safety populations).",
    });
  }

  return {
    leftId: left.graphNodeId,
    rightId: right.graphNodeId,
    leftLabel: left.acronym,
    rightLabel: right.acronym,
    mismatches,
    forbidsSuperiorityClaim: true,
    warning: NON_CAUSAL_TRIAL_WARNING,
  };
}

/** Within-trial arm pairs: flag when shared endpoint types disagree on analysis set or follow-up. */
export function compareArms(
  trial: ClinicalTrialRecord,
  leftArmId: string,
  rightArmId: string,
): ComparabilityReport | null {
  const left = trial.arms.find((a) => a.armId === leftArmId);
  const right = trial.arms.find((a) => a.armId === rightArmId);
  if (!left || !right) return null;

  const mismatches: ComparabilityMismatch[] = [];
  const byType = (arm: TrialArmRecord) => {
    const m = new Map<string, EndpointResultRecord>();
    for (const ep of arm.endpoints) m.set(ep.endpointType, ep);
    return m;
  };
  const L = byType(left);
  const R = byType(right);
  const types = new Set([...L.keys(), ...R.keys()]);
  for (const t of types) {
    const le = L.get(t);
    const re = R.get(t);
    if (!le || !re) {
      mismatches.push({
        dimension: "endpoint_definition",
        label: DIMENSION_LABEL.endpoint_definition,
        left: le ? `${le.label} (${le.endpointType})` : `Missing ${t}`,
        right: re ? `${re.label} (${re.endpointType})` : `Missing ${t}`,
        detail: "Endpoint type is not present on both arms in the curated record.",
      });
      continue;
    }
    if (norm(le.analysisSet) !== norm(re.analysisSet)) {
      mismatches.push({
        dimension: "analysis_population",
        label: DIMENSION_LABEL.analysis_population,
        left: `${left.label}: ${le.analysisSet || "—"}`,
        right: `${right.label}: ${re.analysisSet || "—"}`,
        detail: `Analysis set differs for ${le.label}.`,
      });
    }
    const lFu = [le.followUp, le.timepoint].filter(Boolean).join(" · ") || "—";
    const rFu = [re.followUp, re.timepoint].filter(Boolean).join(" · ") || "—";
    if (norm(lFu) !== norm(rFu)) {
      mismatches.push({
        dimension: "follow_up",
        label: DIMENSION_LABEL.follow_up,
        left: `${left.label}: ${lFu}`,
        right: `${right.label}: ${rFu}`,
        detail: `Follow-up / timepoint wording differs for ${le.label}.`,
      });
    }
  }

  return {
    leftId: left.armId,
    rightId: right.armId,
    leftLabel: `${trial.acronym} — ${left.label}`,
    rightLabel: `${trial.acronym} — ${right.label}`,
    mismatches,
    forbidsSuperiorityClaim: true,
    warning: NON_CAUSAL_TRIAL_WARNING,
  };
}

/** Melanoma pilot pair used by the Atlas related-trial fold. */
export function melanomaPilotComparability(
  focus: ClinicalTrialRecord,
  peer: ClinicalTrialRecord,
): ComparabilityReport {
  return compareTrials(focus, peer);
}

export { DIMENSION_LABEL };

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

export const TREATMENT_LINE_NOT_CURATED = "Not curated";

/**
 * Prefer explicit curated treatment-line fields on arm → trial.
 * Never invent line from free-text population/title regexes.
 */
export function curatedTreatmentLine(trial: ClinicalTrialRecord, arm?: TrialArmRecord): string {
  const fromArm = arm?.treatmentLine?.trim();
  if (fromArm) return fromArm;
  const fromTrial = trial.treatmentLine?.trim();
  if (fromTrial) return fromTrial;
  return TREATMENT_LINE_NOT_CURATED;
}

/**
 * Full endpoint identity for within-trial maps — type alone overwrites peers of the same type.
 * Includes analysis context so multiple endpoints of one type coexist.
 */
export function endpointIdentityKey(ep: EndpointResultRecord): string {
  return [
    ep.endpointType,
    norm(ep.label),
    norm(ep.analysisSet),
    norm(ep.timepoint ?? ""),
    norm(ep.followUp ?? ""),
    norm(ep.populationNote ?? ""),
  ].join("\u0001");
}

/** Soft pairing key (type + label + timepoint) so analysis-set diffs still surface across arms. */
export function endpointPairingKey(ep: EndpointResultRecord): string {
  return [ep.endpointType, norm(ep.label), norm(ep.timepoint ?? "")].join("\u0001");
}

/** Derive structured facets from curated trial fields — no invented clinical claims. */
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
    treatmentLine: curatedTreatmentLine(trial),
    endpointTypes: [...endpointTypes].sort(),
    endpointLabels: [...endpointLabels].sort(),
    followUpNotes: [...followUpNotes].sort(),
    analysisPopulation: trial.analysisSetNote.trim() || "Not recorded",
  };
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
      detail: "Prior-therapy / line context differs across these trials (curated fields only).",
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

function groupByPairing(arm: TrialArmRecord): Map<string, EndpointResultRecord[]> {
  const m = new Map<string, EndpointResultRecord[]>();
  const seenIdentity = new Set<string>();
  for (const ep of arm.endpoints) {
    const idKey = endpointIdentityKey(ep);
    // Exact duplicates collapse; distinct analysis/timepoint contexts coexist.
    if (seenIdentity.has(idKey)) continue;
    seenIdentity.add(idKey);
    const pair = endpointPairingKey(ep);
    const list = m.get(pair) ?? [];
    list.push(ep);
    m.set(pair, list);
  }
  return m;
}

/**
 * Pair endpoints within a soft pairing group by full identity first.
 * Never rely on array insertion order alone (positional mismatch risk).
 * Remainders soft-pair after sorting by identity for stable analysis-set diffs.
 */
export function pairEndpointsByIdentity(
  leftEps: readonly EndpointResultRecord[],
  rightEps: readonly EndpointResultRecord[],
): Array<{ left?: EndpointResultRecord; right?: EndpointResultRecord }> {
  const rightById = new Map<string, EndpointResultRecord>();
  for (const re of rightEps) {
    rightById.set(endpointIdentityKey(re), re);
  }
  const usedRight = new Set<string>();
  const usedLeft = new Set<string>();
  const pairs: Array<{ left?: EndpointResultRecord; right?: EndpointResultRecord }> = [];

  for (const le of leftEps) {
    const key = endpointIdentityKey(le);
    const re = rightById.get(key);
    if (re) {
      pairs.push({ left: le, right: re });
      usedLeft.add(key);
      usedRight.add(key);
    }
  }

  const leftRemain = leftEps
    .filter((e) => !usedLeft.has(endpointIdentityKey(e)))
    .slice()
    .sort((a, b) => endpointIdentityKey(a).localeCompare(endpointIdentityKey(b)));
  const rightRemain = rightEps
    .filter((e) => !usedRight.has(endpointIdentityKey(e)))
    .slice()
    .sort((a, b) => endpointIdentityKey(a).localeCompare(endpointIdentityKey(b)));
  const n = Math.max(leftRemain.length, rightRemain.length);
  for (let i = 0; i < n; i++) {
    pairs.push({ left: leftRemain[i], right: rightRemain[i] });
  }
  return pairs;
}

/** Within-trial arm pairs: full endpoint identity — never key only by endpointType. */
export function compareArms(
  trial: ClinicalTrialRecord,
  leftArmId: string,
  rightArmId: string,
): ComparabilityReport | null {
  const left = trial.arms.find((a) => a.armId === leftArmId);
  const right = trial.arms.find((a) => a.armId === rightArmId);
  if (!left || !right) return null;

  const mismatches: ComparabilityMismatch[] = [];
  const L = groupByPairing(left);
  const R = groupByPairing(right);
  const keys = new Set([...L.keys(), ...R.keys()]);

  for (const k of keys) {
    const leftEps = L.get(k) ?? [];
    const rightEps = R.get(k) ?? [];
    for (const { left: le, right: re } of pairEndpointsByIdentity(leftEps, rightEps)) {
      if (!le || !re) {
        mismatches.push({
          dimension: "endpoint_definition",
          label: DIMENSION_LABEL.endpoint_definition,
          left: le ? `${le.label} (${le.endpointType}${le.timepoint ? ` · ${le.timepoint}` : ""})` : `Missing peer for ${k.split("\u0001")[0]}`,
          right: re
            ? `${re.label} (${re.endpointType}${re.timepoint ? ` · ${re.timepoint}` : ""})`
            : `Missing peer for ${k.split("\u0001")[0]}`,
          detail: "Endpoint definition / analysis context is not present on both arms in the curated record.",
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
      if (norm(le.populationNote ?? "") !== norm(re.populationNote ?? "")) {
        mismatches.push({
          dimension: "analysis_population",
          label: DIMENSION_LABEL.analysis_population,
          left: `${left.label}: ${le.populationNote || "—"}`,
          right: `${right.label}: ${re.populationNote || "—"}`,
          detail: `Population note differs for ${le.label}.`,
        });
      }
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

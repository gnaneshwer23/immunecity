/**
 * Phase A — Trial Intelligence fixture ↔ schema ↔ server read-model contract.
 *
 * Migration 0015 tables hold arm/endpoint numerics. Some ClinicalTrialRecord
 * fields are fixture-only overlays in `loadTrialIntelligenceFromDb` until a
 * later additive migration persists them. This module documents that matrix
 * so positional / silent field drift is caught in tests — not at runtime UI.
 *
 * Educational product — not CDS. Never invents treatment lines or assays.
 */
import { MELANOMA_PILOT_TRIALS, type ClinicalTrialRecord } from "@/data/trialIntelligence";

/** Fields stored in Neon `clinical_trials` / `trial_arms` / `endpoint_results` (0015). */
export const TRIAL_DB_PERSISTED_FIELDS = [
  "trialId",
  "graphNodeId",
  "nctId",
  "acronym",
  "title",
  "phase",
  "design",
  "sponsor",
  "status",
  "conditionLabel",
  "populationSummary",
  "analysisSetNote",
  "verificationState",
  "primaryPmid",
  "primaryDoi",
  "notes",
  "arms.armId",
  "arms.label",
  "arms.regimen",
  "arms.doseSchedule",
  "arms.comparatorRole",
  "arms.enrolledN",
  "arms.treatedN",
  "arms.sortOrder",
  "arms.endpoints.*",
] as const;

/**
 * Fields on ClinicalTrialRecord that 0015 does NOT persist.
 * Postgres read path must overlay these from fixtures (or leave empty stubs).
 */
export const TRIAL_FIXTURE_ONLY_FIELDS = [
  "treatmentLine",
  "arms.treatmentLine",
  "sources",
  "biomarkerContext",
] as const;

export type TrialFieldSource = "postgres" | "fixture_overlay" | "empty_stub";

export interface TrialReadModelField {
  path: string;
  source: TrialFieldSource;
  note: string;
}

/** Authoritative matrix for melanoma pilot read assembly. */
export const TRIAL_READ_MODEL_FIELDS: TrialReadModelField[] = [
  { path: "trialId", source: "postgres", note: "clinical_trials.trial_id" },
  { path: "graphNodeId", source: "postgres", note: "clinical_trials.graph_node_id" },
  { path: "nctId", source: "postgres", note: "clinical_trials.nct_id" },
  { path: "arms[].endpoints[]", source: "postgres", note: "endpoint_results (honesty-validated)" },
  {
    path: "treatmentLine",
    source: "fixture_overlay",
    note: "No 0015 column — loadTrialIntelligenceFromDb overlays MELANOMA_PILOT_TRIALS; never regex-inferred",
  },
  {
    path: "arms[].treatmentLine",
    source: "fixture_overlay",
    note: "No 0015 column — arm-level line stays fixture-only until additive migration",
  },
  {
    path: "sources",
    source: "fixture_overlay",
    note: "Bibliography not in 0015 — sourcesForTrial(fixture)",
  },
  {
    path: "biomarkerContext",
    source: "empty_stub",
    note: "Assays not migrated (ISI-A07); keep [] unless curated; never invent cut-offs",
  },
];

/** Pilot graph node ids expected in both fixture and (when seeded) Postgres. */
export const MELANOMA_PILOT_GRAPH_NODE_IDS = MELANOMA_PILOT_TRIALS.map((t) => t.graphNodeId);

export function fixtureTrialByGraphNode(graphNodeId: string): ClinicalTrialRecord | undefined {
  return MELANOMA_PILOT_TRIALS.find((t) => t.graphNodeId === graphNodeId);
}

/**
 * Simulate the Postgres→record overlay for fixture-only fields.
 * Used in unit tests without a live DB — mirrors loadTrialIntelligenceFromDb contract.
 */
export function applyFixtureOverlays(
  dbShaped: Omit<ClinicalTrialRecord, "treatmentLine" | "sources" | "biomarkerContext"> & {
    treatmentLine?: string | null;
    sources?: ClinicalTrialRecord["sources"];
    biomarkerContext?: ClinicalTrialRecord["biomarkerContext"];
  },
): ClinicalTrialRecord {
  const fixture = MELANOMA_PILOT_TRIALS.find((t) => t.trialId === dbShaped.trialId);
  return {
    ...dbShaped,
    treatmentLine: fixture?.treatmentLine ?? null,
    sources: fixture?.sources ?? [],
    biomarkerContext: fixture?.biomarkerContext ?? [],
    arms: dbShaped.arms.map((arm) => {
      const fixArm = fixture?.arms.find((a) => a.armId === arm.armId);
      return {
        ...arm,
        treatmentLine: fixArm?.treatmentLine ?? arm.treatmentLine ?? null,
      };
    }),
  };
}

/** Count endpoints across pilot fixtures — must match seeded endpoint_results when DB is up. */
export function melanomaPilotEndpointCount(): number {
  return MELANOMA_PILOT_TRIALS.reduce(
    (n, t) => n + t.arms.reduce((m, a) => m + a.endpoints.length, 0),
    0,
  );
}

export function melanomaPilotArmCount(): number {
  return MELANOMA_PILOT_TRIALS.reduce((n, t) => n + t.arms.length, 0);
}

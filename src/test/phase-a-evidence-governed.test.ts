/**
 * Phase A — Evidence-governed KG immediate corrections.
 * Run: bun test src/test/phase-a-evidence-governed.test.ts
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  MELANOMA_PILOT_TRIALS,
  type ClinicalTrialRecord,
  type EndpointResultRecord,
  type TrialArmRecord,
} from "@/data/trialIntelligence";
import {
  compareArms,
  endpointIdentityKey,
  endpointPairingKey,
  pairEndpointsByIdentity,
} from "@/lib/immune/trialComparability";
import {
  MELANOMA_PILOT_GRAPH_NODE_IDS,
  TRIAL_FIXTURE_ONLY_FIELDS,
  TRIAL_READ_MODEL_FIELDS,
  applyFixtureOverlays,
  melanomaPilotArmCount,
  melanomaPilotEndpointCount,
} from "@/lib/immune/trialReadModelContract";
import {
  classifyEvidenceGap,
  classifySearchCoverage,
  evidenceGapLabelDescription,
  evidenceGapLabelText,
} from "@/lib/research/evidenceGap";

const root = (...p: string[]) => resolve(process.cwd(), ...p);
const source = (rel: string) => readFileSync(root(rel), "utf8");

function ep(
  partial: Pick<EndpointResultRecord, "resultId" | "endpointType" | "label" | "analysisSet"> &
    Partial<EndpointResultRecord>,
): EndpointResultRecord {
  return {
    valueNum: null,
    valueText: null,
    unit: null,
    ciLower: null,
    ciUpper: null,
    pValue: null,
    timepoint: null,
    followUp: null,
    populationNote: null,
    verificationState: "verified",
    sourcePmid: null,
    sourceDoi: null,
    sourceLocator: null,
    notes: null,
    ...partial,
  };
}

function stubArm(armId: string, endpoints: EndpointResultRecord[]): TrialArmRecord {
  return {
    armId,
    label: armId,
    regimen: "x",
    doseSchedule: null,
    comparatorRole: "experimental",
    enrolledN: null,
    treatedN: null,
    sortOrder: 1,
    endpoints,
  };
}

function stubTrial(arms: TrialArmRecord[]): ClinicalTrialRecord {
  return {
    trialId: "CT-STUB",
    graphNodeId: "TR999",
    nctId: "NCT00000000",
    acronym: "STUB",
    title: "Stub",
    phase: "Phase 3",
    design: "x",
    sponsor: null,
    status: "x",
    conditionLabel: "Melanoma",
    populationSummary: "x",
    analysisSetNote: "ITT",
    treatmentLine: null,
    verificationState: "partial",
    primaryPmid: "00000000",
    primaryDoi: "10.0/stub",
    notes: null,
    sources: [],
    biomarkerContext: [],
    arms,
  };
}

describe("Phase A1 — endpoint pairing (no positional mismatch)", () => {
  it("positive: identical identities pair across reversed insertion order", () => {
    const itt = ep({
      resultId: "itt",
      endpointType: "orr",
      label: "ORR",
      analysisSet: "ITT",
      timepoint: "Primary",
    });
    const treated = ep({
      resultId: "tr",
      endpointType: "orr",
      label: "ORR",
      analysisSet: "Treated",
      timepoint: "Primary",
    });
    // Soft pairing key matches (type+label+timepoint); identities differ by analysis set.
    expect(endpointPairingKey(itt)).toBe(endpointPairingKey(treated));
    expect(endpointIdentityKey(itt)).not.toBe(endpointIdentityKey(treated));

    // Left: ITT then Treated; Right: Treated then ITT — positional would cross-wire.
    const pairs = pairEndpointsByIdentity([itt, treated], [treated, itt]);
    expect(pairs).toHaveLength(2);
    expect(pairs.every((p) => p.left && p.right)).toBe(true);
    expect(pairs.every((p) => endpointIdentityKey(p.left!) === endpointIdentityKey(p.right!))).toBe(
      true,
    );

    const report = compareArms(
      stubTrial([stubArm("L", [itt, treated]), stubArm("R", [treated, itt])]),
      "L",
      "R",
    )!;
    expect(report.mismatches.filter((m) => m.dimension === "analysis_population")).toEqual([]);
    expect(report.mismatches.filter((m) => m.dimension === "endpoint_definition")).toEqual([]);
  });

  it("negative: type-only keying must not exist; missing peer still flagged", () => {
    const cmp = source("src/lib/immune/trialComparability.ts");
    expect(cmp).toContain("pairEndpointsByIdentity");
    expect(cmp).not.toMatch(/m\.set\(ep\.endpointType/);
    const report = compareArms(
      stubTrial([
        stubArm("L", [
          ep({
            resultId: "1",
            endpointType: "orr",
            label: "ORR",
            analysisSet: "ITT",
            timepoint: "6 months",
          }),
          ep({
            resultId: "2",
            endpointType: "orr",
            label: "ORR",
            analysisSet: "ITT",
            timepoint: "12 months",
          }),
        ]),
        stubArm("R", [
          ep({
            resultId: "3",
            endpointType: "orr",
            label: "ORR",
            analysisSet: "ITT",
            timepoint: "6 months",
          }),
        ]),
      ]),
      "L",
      "R",
    )!;
    expect(report.mismatches.some((m) => m.dimension === "endpoint_definition")).toBe(true);
  });

  it("boundary: same soft key, different analysis sets → analysis_population mismatch (order-stable)", () => {
    const leftItt = ep({
      resultId: "1",
      endpointType: "pfs",
      label: "Median PFS",
      analysisSet: "ITT",
      timepoint: "Primary",
    });
    const rightTreated = ep({
      resultId: "2",
      endpointType: "pfs",
      label: "Median PFS",
      analysisSet: "Treated only",
      timepoint: "Primary",
    });
    const report = compareArms(
      stubTrial([stubArm("L", [leftItt]), stubArm("R", [rightTreated])]),
      "L",
      "R",
    )!;
    expect(report.mismatches.some((m) => m.dimension === "analysis_population")).toBe(true);
  });
});

describe("Phase A2 — insufficient coverage ≠ verified absence", () => {
  // C002 (Monocyte): no draft/bib/emerging incident material — clean coverage-signal probe.
  const CLEAN = "C002";

  it("positive: explicit zeros → no_mapped_evidence (verified ISI absence)", () => {
    expect(
      classifyEvidenceGap(CLEAN, {
        approvedSupportsCount: 0,
        unreviewedMappedCount: 0,
      }),
    ).toBe("no_mapped_evidence");
    expect(evidenceGapLabelText("no_mapped_evidence")).toMatch(/No ISI-mapped/i);
    expect(evidenceGapLabelDescription("no_mapped_evidence")).toMatch(/Verified within ISI/i);
  });

  it("negative: missing Gate C counts → insufficient_coverage (never claim verified absence)", () => {
    expect(classifyEvidenceGap(CLEAN, {})).toBe("insufficient_coverage");
    expect(classifyEvidenceGap(CLEAN)).toBe("insufficient_coverage");
    // Concepts with bibliographic/draft edges stay awaiting_curation even without Neon counts.
    expect(classifyEvidenceGap("D012")).toBe("awaiting_curation");
    expect(evidenceGapLabelDescription("insufficient_coverage")).toMatch(/Not a verified finding/i);
    expect(classifySearchCoverage({ searchAttempted: true })).toBe("unknown");
  });

  it("boundary: approved support nullifies gap; search unknown does not invent zero hits", () => {
    expect(classifyEvidenceGap(CLEAN, { approvedSupportsCount: 1, unreviewedMappedCount: 0 })).toBeNull();
    expect(
      classifyEvidenceGap(CLEAN, {
        searchAttempted: true,
        approvedSupportsCount: 0,
        unreviewedMappedCount: 0,
      }),
    ).not.toBe("no_direct_evidence_after_search");
    expect(
      classifyEvidenceGap(CLEAN, {
        searchAttempted: true,
        searchHitCount: 0,
        approvedSupportsCount: 0,
        unreviewedMappedCount: 0,
      }),
    ).toBe("no_direct_evidence_after_search");
  });
});

describe("Phase A3 — trial fixture / schema / read-model consistency", () => {
  it("positive: pilot counts and graph ids are stable", () => {
    expect(MELANOMA_PILOT_TRIALS.length).toBe(2);
    expect(MELANOMA_PILOT_GRAPH_NODE_IDS).toEqual(["TR003", "TR020"]);
    expect(melanomaPilotArmCount()).toBe(6);
    expect(melanomaPilotEndpointCount()).toBe(24);
    for (const t of MELANOMA_PILOT_TRIALS) {
      expect(t.treatmentLine?.trim().length).toBeGreaterThan(0);
      expect(t.nctId).toMatch(/^NCT\d{8}$/);
      expect(t.primaryPmid).toMatch(/^\d+$/);
    }
  });

  it("negative: 0015 schema lacks treatment_line; read path must overlay fixture (source contract)", () => {
    expect([...TRIAL_FIXTURE_ONLY_FIELDS]).toContain("treatmentLine");
    const mig = source("drizzle/migrations/0015_clinical_trial_intelligence.sql");
    expect(mig).not.toMatch(/treatment_line/);
    const schema = source("src/lib/db/schema.server.ts");
    expect(schema).toContain("clinicalTrials");
    expect(schema).not.toMatch(/treatmentLine:/);
    const fns = source("src/lib/trialIntelligence.functions.ts");
    expect(fns).toMatch(/treatmentLine:\s*MELANOMA_PILOT_TRIALS/);
    expect(fns).toMatch(/fixture_overlay|No DB column|fixture-curated treatmentLine/i);
  });

  it("boundary: applyFixtureOverlays restores treatmentLine/sources without inventing assays", () => {
    const kn = MELANOMA_PILOT_TRIALS[0]!;
    const dbShaped = {
      ...kn,
      treatmentLine: undefined,
      sources: [],
      biomarkerContext: [{ biomarkerGraphNodeId: null, label: "invented", assayLabel: "fake cutoff", notes: null }],
    };
    // Overlay replaces biomarkerContext from fixture (empty stub for pilots).
    const assembled = applyFixtureOverlays({
      ...dbShaped,
      biomarkerContext: undefined,
    });
    expect(assembled.treatmentLine).toBe(kn.treatmentLine);
    expect(assembled.sources.length).toBe(kn.sources.length);
    expect(assembled.biomarkerContext ?? []).toEqual(kn.biomarkerContext ?? []);
    expect(TRIAL_READ_MODEL_FIELDS.some((f) => f.path === "treatmentLine" && f.source === "fixture_overlay")).toBe(
      true,
    );
    expect(TRIAL_READ_MODEL_FIELDS.some((f) => f.path === "biomarkerContext" && f.source === "empty_stub")).toBe(
      true,
    );
  });
});

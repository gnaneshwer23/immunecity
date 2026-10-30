/**
 * Architecture audit correction sprint — six engineering fixes (30 Oct 2026).
 * Run: bun test src/test/correction-sprint.test.ts
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
  TREATMENT_LINE_NOT_CURATED,
  compareArms,
  compareTrials,
  curatedTreatmentLine,
  endpointIdentityKey,
  endpointPairingKey,
  trialComparabilityFacet,
} from "@/lib/immune/trialComparability";
import {
  MAX_COLLECTIONS_PER_MEMBER,
  assertEvidenceRefsKnown,
  collectionLimitReached,
  planEvidenceCollection,
} from "@/lib/research/collections";
import {
  classifyEvidenceGap,
  classifySearchCoverage,
  evidenceGapLabelDescription,
} from "@/lib/research/evidenceGap";
import { isTrialIntelligenceEnabled } from "@/lib/trialIntelligenceFlag";

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

function stubArm(armId: string, endpoints: EndpointResultRecord[], treatmentLine?: string | null): TrialArmRecord {
  return {
    armId,
    label: armId,
    regimen: "x",
    doseSchedule: null,
    comparatorRole: "experimental",
    enrolledN: null,
    treatedN: null,
    sortOrder: 1,
    treatmentLine,
    endpoints,
  };
}

function stubTrial(overrides: Partial<ClinicalTrialRecord> & { arms: TrialArmRecord[] }): ClinicalTrialRecord {
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
    populationSummary: "Previously untreated adults with advanced melanoma (free-text only — must not invent line).",
    analysisSetNote: "ITT",
    treatmentLine: null,
    verificationState: "partial",
    primaryPmid: "00000000",
    primaryDoi: "10.0/stub",
    notes: null,
    sources: [],
    biomarkerContext: [],
    ...overrides,
  };
}

describe("1 — Evidence-gap: unknown search hits ≠ zero", () => {
  it("positive: known zero hits → no_direct_evidence_after_search", () => {
    expect(classifySearchCoverage({ searchAttempted: true, searchHitCount: 0 })).toBe("zero_hits");
    expect(
      classifyEvidenceGap("D012", {
        searchAttempted: true,
        searchHitCount: 0,
        approvedSupportsCount: 0,
        unreviewedMappedCount: 0,
      }),
    ).toBe("no_direct_evidence_after_search");
  });

  it("negative: searchAttempted without hit count stays unknown — never zero-implies absence", () => {
    expect(classifySearchCoverage({ searchAttempted: true })).toBe("unknown");
    expect(classifySearchCoverage({ searchAttempted: true, searchHitCount: Number.NaN })).toBe("unknown");
    const gap = classifyEvidenceGap("D012", {
      searchAttempted: true,
      // searchHitCount omitted → incomplete
      approvedSupportsCount: 0,
      unreviewedMappedCount: 0,
    });
    expect(gap).not.toBe("no_direct_evidence_after_search");
    expect(evidenceGapLabelDescription("no_direct_evidence_after_search")).toMatch(/known empty hit count/i);
    expect(evidenceGapLabelDescription("no_direct_evidence_after_search")).toMatch(/missing\/unknown/i);
  });

  it("boundary: has_hits and not_attempted do not claim empty search", () => {
    expect(classifySearchCoverage({ searchAttempted: true, searchHitCount: 3 })).toBe("has_hits");
    expect(classifySearchCoverage({})).toBe("not_attempted");
    expect(
      classifyEvidenceGap("D012", {
        searchAttempted: true,
        searchHitCount: 2,
        approvedSupportsCount: 0,
        unreviewedMappedCount: 0,
      }),
    ).not.toBe("no_direct_evidence_after_search");
  });
});

describe("2 — Evidence ID verification", () => {
  it("positive: known ids pass", () => {
    const known = new Set(["EV-real-1", "EV-real-2"]);
    expect(assertEvidenceRefsKnown(["EV-real-1", "EV-real-2"], known)).toEqual({ ok: true });
  });

  it("negative: unknown ids rejected with clear error", () => {
    const known = new Set(["EV-real-1"]);
    const bad = assertEvidenceRefsKnown(["EV-real-1", "EV-invented", "EV-ghost"], known);
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.unknownIds).toEqual(["EV-invented", "EV-ghost"]);
    expect(bad.error).toMatch(/Unknown evidence id/);
    expect(bad.error).toMatch(/evidence_records/);
  });

  it("boundary: empty refs ok; create/update verify against evidence_records (source)", () => {
    expect(assertEvidenceRefsKnown([], new Set())).toEqual({ ok: true });
    const fns = source("src/lib/research/collections.functions.ts");
    expect(fns).toContain("assertEvidenceRefsKnown");
    expect(fns).toContain("evidenceRecords");
    expect(fns).toMatch(/Unknown evidence id/);
    expect(fns).toContain("verifyEvidenceRefsExist");
  });
});

describe("3 — Collection limits concurrency-safe + edit UI", () => {
  it("positive/boundary: limit helper at max", () => {
    expect(collectionLimitReached(0)).toBe(false);
    expect(collectionLimitReached(MAX_COLLECTIONS_PER_MEMBER - 1)).toBe(false);
    expect(collectionLimitReached(MAX_COLLECTIONS_PER_MEMBER)).toBe(true);
    expect(collectionLimitReached(MAX_COLLECTIONS_PER_MEMBER + 1)).toBe(true);
    expect(collectionLimitReached(-1)).toBe(true);
  });

  it("negative: create uses advisory lock + transactional count (source contract)", () => {
    const fns = source("src/lib/research/collections.functions.ts");
    expect(fns).toMatch(/pg_advisory_xact_lock/);
    expect(fns).toMatch(/db\.transaction/);
    expect(fns).toContain("collectionLimitReached");
    // Must not rely solely on naive read-then-insert outside a lock.
    expect(fns).toMatch(/hashtext/);
  });

  it("exposes edit/update in Research collections UI", () => {
    const ui = source("src/components/immune/EvidenceCollectionsPanel.tsx");
    expect(ui).toContain("updateEvidenceCollection");
    expect(ui).toContain("Edit");
    expect(ui).toContain("setEditingId");
    expect(ui).toContain("Update collection");
    expect(ui).toContain("Cancel edit");
  });
});

describe("4 — Treatment-line labels: curated only", () => {
  it("positive: explicit curated field is used", () => {
    const kn = MELANOMA_PILOT_TRIALS[0]!;
    const cm = MELANOMA_PILOT_TRIALS[1]!;
    expect(kn.treatmentLine).toBeTruthy();
    expect(cm.treatmentLine).toBeTruthy();
    expect(curatedTreatmentLine(kn)).toBe(kn.treatmentLine);
    expect(trialComparabilityFacet(kn).treatmentLine).toBe(kn.treatmentLine);
    const report = compareTrials(kn, cm);
    expect(report.mismatches.some((m) => m.dimension === "treatment_line")).toBe(true);
  });

  it("negative: free-text population alone does not invent a line", () => {
    const t = stubTrial({
      treatmentLine: null,
      populationSummary: "Previously untreated first-line melanoma; no prior systemic therapy.",
      title: "First-line treatment-naive advanced melanoma study",
      arms: [stubArm("a", [])],
    });
    expect(curatedTreatmentLine(t)).toBe(TREATMENT_LINE_NOT_CURATED);
    expect(trialComparabilityFacet(t).treatmentLine).toBe(TREATMENT_LINE_NOT_CURATED);
    const cmp = source("src/lib/immune/trialComparability.ts");
    expect(cmp).not.toMatch(/previously untreated\|treatment-naive|inferTreatmentLine/);
  });

  it("boundary: arm curated line overrides trial; absent → Not curated", () => {
    const t = stubTrial({
      treatmentLine: "Trial-level line",
      arms: [stubArm("a", [], "Arm-level line")],
    });
    expect(curatedTreatmentLine(t, t.arms[0])).toBe("Arm-level line");
    expect(curatedTreatmentLine(stubTrial({ treatmentLine: "  ", arms: [stubArm("a", [])] }))).toBe(
      TREATMENT_LINE_NOT_CURATED,
    );
  });
});

describe("5 — Endpoint comparison: full identity key", () => {
  it("positive: multiple endpoints of same type coexist (no overwrite)", () => {
    const a = ep({
      resultId: "1",
      endpointType: "orr",
      label: "Objective response rate",
      analysisSet: "ITT",
      timepoint: "6 months",
    });
    const b = ep({
      resultId: "2",
      endpointType: "orr",
      label: "Objective response rate",
      analysisSet: "ITT",
      timepoint: "12 months",
    });
    expect(endpointIdentityKey(a)).not.toBe(endpointIdentityKey(b));
    expect(endpointPairingKey(a)).not.toBe(endpointPairingKey(b));

    const trial = stubTrial({
      arms: [
        stubArm("L", [a, b]),
        stubArm("R", [
          ep({ ...a, resultId: "3" }),
          ep({ ...b, resultId: "4" }),
        ]),
      ],
    });
    const report = compareArms(trial, "L", "R");
    expect(report).not.toBeNull();
    // Matching full contexts → no missing-endpoint mismatches for ORR peers.
    expect(report!.mismatches.filter((m) => m.dimension === "endpoint_definition")).toEqual([]);
  });

  it("negative: type-only keying is gone; missing peer still flagged", () => {
    const trial = stubTrial({
      arms: [
        stubArm("L", [
          ep({
            resultId: "1",
            endpointType: "orr",
            label: "Objective response rate",
            analysisSet: "ITT",
            timepoint: "6 months",
          }),
          ep({
            resultId: "2",
            endpointType: "orr",
            label: "Objective response rate",
            analysisSet: "ITT",
            timepoint: "12 months",
          }),
        ]),
        stubArm("R", [
          ep({
            resultId: "3",
            endpointType: "orr",
            label: "Objective response rate",
            analysisSet: "ITT",
            timepoint: "6 months",
          }),
        ]),
      ],
    });
    const report = compareArms(trial, "L", "R")!;
    expect(report.mismatches.some((m) => m.dimension === "endpoint_definition")).toBe(true);
    const cmp = source("src/lib/immune/trialComparability.ts");
    expect(cmp).toContain("endpointIdentityKey");
    expect(cmp).not.toMatch(/m\.set\(ep\.endpointType/);
  });

  it("boundary: analysis-set diff for same type+label+timepoint still surfaces", () => {
    const trial = stubTrial({
      arms: [
        stubArm("L", [
          ep({
            resultId: "1",
            endpointType: "pfs",
            label: "Median PFS",
            analysisSet: "ITT",
            timepoint: "Primary",
          }),
        ]),
        stubArm("R", [
          ep({
            resultId: "2",
            endpointType: "pfs",
            label: "Median PFS",
            analysisSet: "Treated only",
            timepoint: "Primary",
          }),
        ]),
      ],
    });
    const report = compareArms(trial, "L", "R")!;
    expect(report.mismatches.some((m) => m.dimension === "analysis_population")).toBe(true);
  });
});

describe("6 — Light: persistence clarity + flag kill switch", () => {
  it("keeps Neon vs localStorage copy clear", () => {
    const ui = source("src/components/immune/EvidenceCollectionsPanel.tsx");
    expect(ui).toMatch(/sync across devices/i);
    expect(ui).toMatch(/localStorage/);
    expect(ui).toMatch(/evidence_records/);
  });

  it("documents env-driven flag; runtime kill = unset/redeploy", () => {
    delete process.env.VITE_TRIAL_INTELLIGENCE;
    delete process.env.TRIAL_INTELLIGENCE;
    expect(isTrialIntelligenceEnabled()).toBe(false);
    const flag = source("src/lib/trialIntelligenceFlag.ts");
    expect(flag).toContain("VITE_TRIAL_INTELLIGENCE");
    const hardening = source("docs/ISI_HARDENING_SPRINT_2026-10-30.md");
    expect(hardening).toMatch(/unset|redeploy/i);
  });

  it("planEvidenceCollection still drops PMID-shaped inventables", () => {
    const plan = planEvidenceCollection({
      userId: "11111111-1111-4111-8111-111111111111",
      name: "x",
      conceptIds: ["D012"],
      evidenceRefs: ["EV-format-ok", "PMID 12345678"],
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.evidenceRefs).toEqual(["EV-format-ok"]);
  });
});

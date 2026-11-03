import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import provenance from "@/lib/hsi/vendor/trials/provenance.json";
import { generateSyntheticProgramme, syntheticProgrammeSchema, parseSyntheticProgramme, programmeTrials, programmeDiscovery, exportProgrammeCase, applyProgrammeScenario } from "@/lib/research/syntheticProgramme";

const data = generateSyntheticProgramme();
describe("20-condition synthetic programme", () => {
  test("generates complete linked longitudinal cases with reproducible provenance", () => {
    expect(data.conditions).toHaveLength(20);
    expect(data.patients).toHaveLength(120);
    expect(data.patients.flatMap((p) => p.visits)).toHaveLength(360);
    expect(data.patients.flatMap((p) => p.visits.flatMap((v) => v.labs))).toHaveLength(1440);
    expect(data.conditions.every((c) => data.patients.filter((p) => p.conditionId === c.id).length === 6)).toBe(true);
    expect(generateSyntheticProgramme()).toEqual(data);
    expect(generateSyntheticProgramme(123).patients[0]!.visits).not.toEqual(data.patients[0]!.visits);
    expect(parseSyntheticProgramme(JSON.stringify(data))).toEqual(data);
  });
  test("every clinical fixture and nested measurement is explicitly synthetic", () => {
    for (const p of data.patients) {
      expect(p.data_class).toBe("synthetic");
      for (const v of p.visits) {
        expect(v.data_class).toBe("synthetic");
        expect(v.lifestyle.data_class).toBe("synthetic");
        expect(v.labs.every((l) => l.data_class === "synthetic")).toBe(true);
        expect(v.immuneMeasurements.every((m) => m.data_class === "synthetic")).toBe(true);
      }
      expect(p.medications.every((m) => m.data_class === "synthetic")).toBe(true);
    }
  });
  test("validation rejects real data, dangling IDs, duplicated records, invalid intervals and future specimens", () => {
    const variants = [
      { ...data, data_class: "public_real" },
      { ...data, patients: [{ ...data.patients[0]!, conditionId: "SYN-COND-NONE" }, ...data.patients.slice(1)] },
      { ...data, patients: [data.patients[0]!, data.patients[0]!, ...data.patients.slice(2)] },
      { ...data, patientName: "not accepted" },
    ];
    for (const v of variants) expect(() => syntheticProgrammeSchema.parse(v)).toThrow();
    for (const mutate of [
      (d: typeof data) => { d.patients[0]!.visits[0]!.labs[0]!.specimenDay = 1000; },
      (d: typeof data) => { d.patients[0]!.medications[0]!.endDay = -50; },
      (d: typeof data) => { d.patients[0]!.visits[1]!.day = 0; },
      (d: typeof data) => { d.patients[1]!.visits[0]!.labs[0]!.value = 10; },
    ]) {
      const copy = structuredClone(data); mutate(copy); expect(() => syntheticProgrammeSchema.parse(copy)).toThrow();
    }
    expect(() => parseSyntheticProgramme(" ".repeat(5_000_001))).toThrow();
  });
  test("five-state screening preserves missingness, conflicts, specimen staleness and human judgement", () => {
    const states = new Set<string>();
    for (const p of data.patients) {
      for (const t of programmeTrials(data, p, "2026-11-03T12:00:00Z")) {
        expect(t.registryStatus).toBe("not_a_registered_trial");
        expect(t.report.confirmedEligible).toBe(false);
        expect(t.report.patientEligible).toBe(false);
        t.report.assessments.forEach((a) => states.add(a.state));
      }
    }
    expect([...states].sort()).toEqual(["ambiguous", "not_satisfied", "requires_investigator_review", "satisfied", "unknown"].sort());
    const markerState = (i: number) => programmeTrials(data, data.patients[i]!, "2026-11-03T12:00:00Z")[0]!.report.assessments.find((a) => a.attributeKey === "marker_value")!.state;
    expect(markerState(1)).toBe("unknown");
    expect(markerState(2)).toBe("ambiguous");
    expect(markerState(3)).toBe("unknown");
  });
  test("discovery is honest about deterministic execution and preserves uncertainty", () => {
    const plan = programmeDiscovery(data, data.patients[1]!, "2026-11-03T12:00:00Z");
    expect(plan.audit.aiInferencePerformed).toBe(false);
    expect(plan.audit.model).toBeNull();
    expect(plan.audit.literatureRetrievalPerformed).toBe(false);
    expect(plan.observations.unusableLabs).toHaveLength(3);
    expect(plan.status).toBe("unvalidated_research_plan");
    expect(plan.controls.length).toBeGreaterThan(0);
    expect(plan.falsification).toBeTruthy();
    const output = exportProgrammeCase(data, data.patients[0]!, "2026-11-03T12:00:00Z");
    expect(output.productionEligible).toBe(false);
    expect(output.kgWrite).toBe(false);
    expect(output.watermark).toContain("SYNTHETIC");
    expect(output.trials).toHaveLength(2);
  });
  test("reuses the pinned HSI criterion engine without source modifications", () => {
    for (const [file, expected] of Object.entries(provenance.files)) {
      const actual = createHash("sha256").update(readFileSync(`src/lib/hsi/vendor/trials/${file}`)).digest("hex");
      expect(actual).toBe(expected);
    }
  });
  test("interactive edits change assessments, preserve original fixtures and retain audit provenance", () => {
    const p = data.patients[1]!;
    const updated = applyProgrammeScenario(data, p.id, { value: 15, quality: "valid", sleepHours: 8, reason: "Testing a completed marker record" }, "2026-11-03T13:00:00Z");
    expect(data.scenarioEdits).toHaveLength(0);
    expect(data.patients[1]!.visits[2]!.labs[0]!.quality).toBe("missing");
    expect(updated.scenarioEdits).toHaveLength(1);
    expect(updated.scenarioEdits[0]!.before.quality).toBe("missing");
    expect(updated.scenarioEdits[0]!.after.quality).toBe("valid");
    expect(updated.patients[1]!.visits[2]!.labs[0]!.source).toBe("synthetic_scenario_edit");
    const report = programmeTrials(updated, updated.patients[1]!, "2026-11-03T13:00:00Z")[0]!.report;
    expect(report.assessments.find((a) => a.attributeKey === "marker_value")!.state).toBe("satisfied");
    expect(report.confirmedEligible).toBe(false);
    expect(exportProgrammeCase(updated, updated.patients[1]!, "2026-11-03T13:00:00Z").scenarioEdits).toHaveLength(1);
    expect(() => applyProgrammeScenario(data, p.id, { value: -1, quality: "valid", sleepHours: 8, reason: "Invalid" }, "2026-11-03T13:00:00Z")).toThrow();
    expect(() => applyProgrammeScenario(data, p.id, { value: 1, quality: "valid", sleepHours: 25, reason: "Invalid" }, "2026-11-03T13:00:00Z")).toThrow();
  });
});

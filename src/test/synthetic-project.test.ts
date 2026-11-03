import { describe, expect, test } from "bun:test";
import fixture from "@/data/syntheticMelanomaProject.json";
import { syntheticDatasetSchema, newSyntheticProject, parseSyntheticDataset, parseSyntheticProject,
  syntheticConflicts, recordDemoDecision, buildSyntheticBrief, syntheticBriefMarkdown, MAX_DEMO_BYTES,
} from "@/lib/research/syntheticProject";

const dataset = syntheticDatasetSchema.parse(fixture);
function completed() {
  const project = newSyntheticProject(dataset);
  project.selectedEvidenceIds = ["SYN-EV-001"];
  project.hypothesis = "Processing differences might explain the scenario finding.";
  project.prediction = "Matched processing reduces the observed difference.";
  project.experiment = "Matched aliquots, blinded scoring and batch controls.";
  project.falsification = "The difference persists under matched processing.";
  return recordDemoDecision(project, { evidenceId: "SYN-EV-001", disposition: "retain", note: "Exploratory hypothesis only." });
}
describe("synthetic research project", () => {
  test("fixtures are synthetic with no real paper or patient identifiers", () => {
    expect(dataset.evidence).toHaveLength(6);
    expect(dataset.sources.every((s) => s.provenance === "invented_demo_source_not_a_publication")).toBe(true);
    expect(dataset.evidence.every((e) => e.id.startsWith("SYN-") && e.sourceId.startsWith("SYN-"))).toBe(true);
    expect(JSON.stringify(dataset)).not.toMatch(/\b(pmid|nctId|patient_id|dateOfBirth)\b/i);
  });
  test("import rejects real-mode, unknown fields, broken source references and duplicate IDs", () => {
    const variants = [
      { ...fixture, dataClass: "real" },
      { ...fixture, pmid: "25891173" },
      { ...fixture, evidence: [{ ...fixture.evidence[0], sourceId: "SYN-MISSING" }] },
      { ...fixture, evidence: [fixture.evidence[0], fixture.evidence[0]] },
      { ...fixture, sources: [fixture.sources[0], fixture.sources[0]] },
      { ...fixture, cohorts: [fixture.cohorts[0], fixture.cohorts[0]] },
    ];
    variants.forEach((v) => expect(() => parseSyntheticDataset(JSON.stringify(v))).toThrow());
  });
  test("impossible cohort denominators, negative counts and oversize uploads fail closed", () => {
    for (const edit of [{ sampleSize: 0 }, { responseCount: 81 }, { biomarkerAvailable: 81 }, { responseCount: -1 }, { sampleSize: 1.5 }]) {
      expect(() => parseSyntheticDataset(JSON.stringify({ ...fixture, cohorts: [{ ...fixture.cohorts[0], ...edit }] }))).toThrow();
    }
    expect(() => parseSyntheticDataset(" ".repeat(MAX_DEMO_BYTES + 1))).toThrow();
    expect(() => parseSyntheticProject("{" )).toThrow();
  });
  test("project backup round-trips with decisions and rejects orphan selections", () => {
    const p = completed();
    expect(parseSyntheticProject(JSON.stringify(p))).toEqual(p);
    expect(() => parseSyntheticProject(JSON.stringify({ ...p, selectedEvidenceIds: ["SYN-UNKNOWN"] }))).toThrow();
    expect(() => parseSyntheticProject(JSON.stringify({ ...p, selectedEvidenceIds: ["SYN-EV-001", "SYN-EV-001"] }))).toThrow();
    expect(() => recordDemoDecision(p, { evidenceId: "SYN-UNKNOWN", disposition: "retain", note: "invalid" })).toThrow();
    expect(() => recordDemoDecision(p, { evidenceId: "SYN-EV-001", disposition: "retain", note: " " })).toThrow();
  });
  test("updating a decision replaces it rather than accumulating inconsistent states", () => {
    const p = recordDemoDecision(completed(), { evidenceId: "SYN-EV-001", disposition: "context_only", note: "Revised interpretation" });
    expect(p.decisions).toHaveLength(1);
    expect(p.decisions[0]!.disposition).toBe("context_only");
  });
  test("brief requires selected evidence, explicit decisions and a complete proposal", () => {
    const p = completed();
    for (const edit of [{ selectedEvidenceIds: [] }, { decisions: [] }, { hypothesis: " " }, { prediction: "" }, { experiment: "" }, { falsification: "" }]) {
      expect(() => buildSyntheticBrief({ ...p, ...edit }, "2026-11-03T12:00:00Z")).toThrow();
    }
    expect(() => buildSyntheticBrief(recordDemoDecision(p, { evidenceId: "SYN-EV-001", disposition: "exclude", note: "Not used" }), "2026-11-03")).toThrow();
  });
  test("brief retains unselected opposing findings, source passages and simulation status", () => {
    const brief = buildSyntheticBrief(completed(), "2026-11-03T12:00:00Z");
    expect(brief.evidence).toHaveLength(1);
    expect(brief.conflicts).toHaveLength(2);
    expect(brief.conflicts[0]!.opposing.map((e) => e.id)).toContain("SYN-EV-002");
    expect(brief.evidence[0]!.passage).toBe(dataset.evidence[0]!.passage);
    expect(brief.evidence[0]!.source.id).toBe("SYN-SOURCE-A");
    expect(brief.productionEligible).toBe(false);
    expect(brief.kgWrite).toBe(false);
    expect(brief.scientificReviewStatus).toBe("unreviewed");
    expect(brief.reviewSimulation).toBe(true);
    expect(brief.cohorts[0]!.responsePercent).toBe(35);
    expect(brief.cohorts[0]!.biomarkerMissing).toBe(18);
    const markdown = syntheticBriefMarkdown(brief);
    expect(markdown).toContain("SYNTHETIC DEMONSTRATION");
    expect(markdown).toContain("SYN-EV-002");
    expect(markdown).toContain("80 (35.0%)");
  });
  test("conflicts are same-claim comparisons and deterministic exports are stable", () => {
    const conflicts = syntheticConflicts(dataset);
    expect(conflicts.every((c) => [...c.supporting, ...c.opposing].every((e) => e.claimId === c.claimId))).toBe(true);
    const p = completed();
    expect(buildSyntheticBrief(p, "2026-11-03T12:00:00Z")).toEqual(buildSyntheticBrief(p, "2026-11-03T12:00:00Z"));
    expect(() => buildSyntheticBrief(p, "invalid")).toThrow();
  });
});

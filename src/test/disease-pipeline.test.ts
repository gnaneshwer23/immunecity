import { describe, expect, it } from "vitest";
import { buildPipeline, isPipelineDisease, matchTherapies, pipelineDiseases, type RegistryStudy } from "@/lib/immune/pipeline";

const study = (nctId: string, interventions: string[]): RegistryStudy => ({
  nctId,
  title: `Study ${nctId}`,
  phase: "3",
  status: "RECRUITING",
  sponsor: null,
  url: `https://clinicaltrials.gov/study/${nctId}`,
  interventions,
});

describe("therapy matching", () => {
  it("matches exact drug names and brands, whole-word only", () => {
    expect(matchTherapies("Experimental: Tezepelumab").map((n) => n.id)).toEqual(["I022"]);
    expect(matchTherapies("Benlysta 10 mg/kg IV").map((n) => n.id)).toEqual(["I018"]);
    expect(matchTherapies("adalimumab-biosimilar").map((n) => n.id)).toEqual(["I002"]);
  });

  it("never guesses from generic aliases, classes or short abbreviations", () => {
    expect(matchTherapies("anti-CD20 antibody")).toEqual([]);
    expect(matchTherapies("JAK inhibitor")).toEqual([]);
    expect(matchTherapies("Inhaled corticosteroid (ICS) therapy")).toEqual([]);
    expect(matchTherapies("IFX")).toEqual([]);
    expect(matchTherapies("Placebo")).toEqual([]);
    expect(matchTherapies("BMS-986165")).toEqual([]); // code name not in the graph -> unmapped
  });
});

describe("pipeline grouping", () => {
  it("groups curated RA therapies by the target they act on", () => {
    const groups = buildPipeline("D001");
    const tnf = groups.find((g) => g.target?.id === "M001");
    expect(tnf?.curated.map((r) => r.therapy.id)).toEqual(expect.arrayContaining(["I001", "I002"]));
    expect(groups.every((g) => g.target || g.curated.length === 0)).toBe(true);
  });

  it("slots live studies under the mechanism of the therapy they name, else Other", () => {
    const groups = buildPipeline("D001", [
      study("NCT00000001", ["Adalimumab", "Placebo"]),
      study("NCT00000002", ["GenSci120 Injection"]),
    ]);
    expect(groups.find((g) => g.target?.id === "M001")?.studies.map((s) => s.nctId)).toContain("NCT00000001");
    const other = groups.find((g) => !g.target)!;
    expect(other.studies.map((s) => s.nctId)).toEqual(["NCT00000002"]);
    expect(groups[groups.length - 1]).toBe(other);
  });

  it("lists a combination study under each distinct mechanism, once per group", () => {
    const groups = buildPipeline("D001", [study("NCT00000003", ["Baricitinib", "Adalimumab", "adalimumab"])]);
    const hits = groups.filter((g) => g.studies.some((s) => s.nctId === "NCT00000003"));
    expect(hits.length).toBe(2);
    for (const g of hits) expect(g.studies.filter((s) => s.nctId === "NCT00000003")).toHaveLength(1);
  });

  it("publishes pipelines only for diseases with curated therapies", () => {
    const list = pipelineDiseases();
    expect(list.length).toBeGreaterThan(5);
    expect(list.every((d) => d.therapies > 0 && isPipelineDisease(d.node.id))).toBe(true);
    expect(isPipelineDisease("M001")).toBe(false);
  });
});

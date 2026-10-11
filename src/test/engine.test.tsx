import { describe, expect, it } from "vitest";
import { KG, byId, edgeRef, propagate, shortestPath, edgeTissues } from "@/lib/immune/engine";
import { run } from "@/lib/immune/sim";
import { agreement } from "@/lib/evidenceCheck";
import { graphHealth } from "@/lib/immune/health";
import { graphToCytoscape, graphToGraphML, graphToCSV, simToCSV, simSummaryJSON } from "@/lib/immune/export";
import { EXT_BIOMARKERS } from "@/data/extensions";
import { CONTENT } from "@/data/content";

const P0 = { inoculum: 0.02, growth: 1.2, innate: 1, adaptive: 1, cytokineGain: 1, regulation: 1, memory: 0, lag: 5 };

describe("knowledge graph", () => {
  it("merges draft extensions without breaking references", () => {
    expect(byId["EM02"]?.draft).toBe(true);
    KG.relationships.forEach((r) => { expect(byId[r.subject_id], r.subject_id).toBeTruthy(); expect(byId[r.object_id], r.object_id).toBeTruthy(); });
  });
  it("propagates sign: blocking a producer lowers its product", () => {
    const fx = propagate("EM01", "inhibit");
    expect(fx.find((e) => e.id === "EM02")!.v).toBeLessThan(0);
  });
  it("finds a path along the microbiome route", () => {
    expect(shortestPath("EM01", "C014")?.length).toBeGreaterThan(0);
  });
  it("buckets link locations into tissues", () => {
    expect(edgeTissues({ location: "gut mucosa" } as never)).toContain("gut");
  });
  it("builds permalinks for PMIDs and DOIs", () => {
    expect(edgeRef({ reference: "PMID 12345678" })!.url).toBe("https://pubmed.ncbi.nlm.nih.gov/12345678/");
    expect(edgeRef({ reference: "10.1056/NEJMoa0912345" })!.kind).toBe("doi");
    expect(edgeRef({ source_refs: ["TO_BE_CURATED"] })).toBeNull();
  });
  it("reports graph health", () => {
    const h = graphHealth();
    expect(h.edges).toBe(KG.relationships.length);
    expect(h.isolated).toEqual([]);
  });
});

describe("citation agreement", () => {
  const c = { pmid: "1", title: "Rituximab versus cyclophosphamide for ANCA-associated vasculitis", journal: "N Engl J Med", year: "2010", first_author: "Stone JH" };
  it("accepts matching author and year", () => { expect(agreement("Stone 2010 NEJM", c).agrees).toBe(true); });
  it("flags a wrong year and author", () => { expect(agreement("Smith 2015 Lancet", c).agrees).toBe(false); });
});

describe("infection simulator", () => {
  it("clears a moderate infection with defaults", () => { expect(run(P0).summary.outcome).not.toBe("overwhelming"); });
  it("antibiotics lower peak pathogen", () => {
    expect(run(P0, { antibiotic: { strength: 1, day: 1 } }).summary.Pmax).toBeLessThanOrEqual(run(P0).summary.Pmax);
  });
  it("builds memory that is used on re-challenge", () => {
    const r = run({ ...P0, rechallenge: 20 });
    expect(r.summary.Mend).toBeGreaterThan(0);
  });
});

describe("exports", () => {
  const ns = KG.nodes.slice(0, 5);
  const ls = KG.relationships.filter((r) => ns.some((n) => n.id === r.subject_id) && ns.some((n) => n.id === r.object_id));
  it("serialises the graph as Cytoscape JSON", () => {
    const j = JSON.parse(graphToCytoscape(ns, ls));
    expect(j.elements.nodes).toHaveLength(5);
    expect(j.elements.edges.length).toBe(ls.length);
  });
  it("serialises the graph as GraphML with escaped names", () => {
    const xml = graphToGraphML(ns, ls);
    expect(xml).toContain("<graphml");
    expect(xml).not.toContain("<data key=\"name\">A & B</data>");
  });
  it("serialises the graph and a run as CSV", () => {
    const { nodes, links } = graphToCSV(ns, ls);
    expect(nodes.split("\n")).toHaveLength(6);
    expect(links.split("\n")).toHaveLength(ls.length + 1);
    expect(simToCSV(run(P0).series).split("\n").length).toBeGreaterThan(10);
  });
  it("summarises a run as JSON", () => {
    const j = JSON.parse(simSummaryJSON(P0, {}, run(P0).summary as unknown as Record<string, unknown>));
    expect(j.summary.outcome).toBeTruthy();
  });
});

describe("patient biomarkers", () => {
  it("maps slider values onto rule flags at their thresholds", () => {
    const fired = (id: string, v: number) =>
      EXT_BIOMARKERS.find((b) => b.id === id)!.thresholds.filter((t) => (t.above != null && v >= t.above) || (t.below != null && v < t.below)).map((t) => t.flag);
    expect(fired("pdl1", 60)).toContain("pdl1_hi");
    expect(fired("pdl1", 10)).toEqual([]);
    expect(fired("tmb", 12)).toContain("tmb_hi");
    expect(fired("lymph", 0.8)).toContain("lymph_lo");
    expect(fired("eos", 400)).toContain("eos_hi");
  });
  it("every biomarker threshold flag has at least one rule", () => {
    const flags = new Set(EXT_BIOMARKERS.flatMap((b) => b.thresholds.map((t) => t.flag)));
    flags.forEach((f) => expect(CONTENT.rules.some((r) => r.flag === f), f).toBe(true));
  });
});

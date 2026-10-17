import { describe, expect, it } from "vitest";
import { KG, byId } from "@/lib/immune/engine";
import { DOMAINS, askPrefill, conceptNeighbours, conceptPath } from "@/lib/immune/concepts";
import { JOURNALS, buildCrossrefUrl, librarySearchSchema, parseCrossrefItem, parseDoiRecord, DOI_RE } from "@/lib/research/crossref";

describe("concept layer", () => {
  it("gives every one of the graph's concepts a stable page path by ID", () => {
    expect(KG.nodes.length).toBeGreaterThanOrEqual(260);
    for (const n of KG.nodes) expect(conceptPath(n.id)).toBe(`/atlas/${encodeURIComponent(n.id)}`);
  });
  it("neighbours always resolve to real concepts", () => {
    for (const n of KG.nodes) for (const x of conceptNeighbours(n.id)) expect(byId[x.node.id]).toBeDefined();
  });
  it("has eight domains that never list a missing concept", () => {
    expect(DOMAINS).toHaveLength(8);
    for (const d of DOMAINS) for (const id of d.conceptIds) expect(byId[id]).toBeDefined();
  });
  it("reports research-methods topics as gaps rather than inventing them", () => {
    const m = DOMAINS.find((d) => d.id === "methods")!;
    expect(m.topics.find((t) => t.label === "Flow cytometry")?.covered).toBe(false);
  });
});

describe("Ask context prefill", () => {
  it("uses the concept name for ?about and lets an explicit question win", () => {
    const id = KG.nodes[0]!.id;
    expect(askPrefill(id, "")).toContain(byId[id]!.name);
    expect(askPrefill(id, "Why?")).toBe("Why?");
    expect(askPrefill("NOPE", "")).toBe("");
  });
});

describe("five-journal library", () => {
  it("searches all five journals by ISSN unless one is chosen", () => {
    expect(JOURNALS).toHaveLength(5);
    const all = buildCrossrefUrl(librarySearchSchema.parse({}));
    for (const j of JOURNALS) expect(all).toContain(`issn%3A${j.issn}`);
    const one = buildCrossrefUrl(librarySearchSchema.parse({ journal: "1474-1733" }));
    expect(one).toContain("/journals/1474-1733/works");
  });
  it("labels Nature Reviews Immunology as Review and leaves others unknown", () => {
    const base = { DOI: "10.1038/x", title: ["T"] };
    expect(parseCrossrefItem({ ...base, ISSN: ["1474-1733"] })!.articleKind).toBe("Review");
    expect(parseCrossrefItem({ ...base, ISSN: ["1529-2908"] })!.articleKind).toBeNull();
  });
  it("drops DOI lookups from journals outside the library", () => {
    expect(parseDoiRecord({ message: { DOI: "10.1/x", title: ["T"], ISSN: ["0000-0000"] } }, "t").articles).toHaveLength(0);
    expect(DOI_RE.test("https://doi.org/10.1038/ni.1234")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { byId } from "@/lib/immune/engine";
import { NODE_XREFS, XREF_SOURCES, conceptSameAs } from "@/data/xrefs";

const SOURCE_BY_TYPE: Record<string, string[]> = {
  MOLECULE: ["HGNC", "UniProt"],
  RECEPTOR: ["HGNC", "UniProt"],
  CELL: ["CL"],
  PATHWAY: ["GO"],
  DISEASE: ["MONDO", "MeSH"],
  INTERVENTION: ["ChEMBL"],
};

describe("concept external identifiers", () => {
  it("only maps existing, non-draft graph concepts", () => {
    for (const id of Object.keys(NODE_XREFS)) {
      expect(byId[id], id).toBeDefined();
      expect(byId[id]!.draft, id).toBeFalsy();
    }
  });

  it("keeps every identifier well formed and typed to its concept", () => {
    for (const [id, xrefs] of Object.entries(NODE_XREFS)) {
      expect(xrefs.length, id).toBeGreaterThan(0);
      const seen = new Set<string>();
      for (const x of xrefs) {
        expect(x.id, `${id} ${x.source}`).toMatch(XREF_SOURCES[x.source].pattern);
        expect(x.label.trim(), `${id} ${x.id}`).not.toBe("");
        expect(SOURCE_BY_TYPE[byId[id]!.node_type], `${id} ${x.source}`).toContain(x.source);
        expect(seen.has(x.source + x.id), `${id} duplicate ${x.id}`).toBe(false);
        seen.add(x.source + x.id);
      }
    }
  });

  it("asserts sameAs only for exact matches, as absolute https IRIs", () => {
    expect(conceptSameAs("M001")).toEqual(["https://www.uniprot.org/uniprotkb/P01375"]);
    expect(conceptSameAs("P003")).toEqual([]);
    for (const [id, xrefs] of Object.entries(NODE_XREFS)) {
      const expected = xrefs
        .filter((x) => x.match === "exact")
        .map((x) => XREF_SOURCES[x.source].iri(x.id));
      expect(conceptSameAs(id), id).toEqual(expected);
      for (const iri of conceptSameAs(id)) expect(iri).toMatch(/^https:\/\//);
    }
  });
});

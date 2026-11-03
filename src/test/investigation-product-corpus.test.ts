import { test, expect } from "bun:test";
import { loadIsiInvestigationRelease } from "@/lib/hsi/investigation-corpus.server";
import { getGraphNeighbourhood } from "@/lib/immune/neighbourhood";
test("internal corpus defaults to the existing RA graph and preserves exact relationship IDs", async () => {
  const corpus = await loadIsiInvestigationRelease("isi-core-graph", null);
  expect(corpus.context.conceptIds).toEqual(["D001"]);
  expect(corpus.relationships.map((r) => r.id)).toEqual(getGraphNeighbourhood("D001", { depth: 1, maxEdges: 120, includeDraft: false })!.edges.map((r) => r.relId));
  expect(corpus.passages).toHaveLength(0); expect(corpus.claims).toHaveLength(0);
  expect(corpus.entities.some((e) => e.label === "Rheumatoid arthritis")).toBe(true);
});
test("internal corpus accepts only known server releases and existing core concepts", async () => {
  for (const [release, concept] of [["client-upload",null],["isi-core-graph","unknown-id"],["isi-core-graph","CXF03"]] as const) await expect(loadIsiInvestigationRelease(release, concept)).rejects.toThrow();
});

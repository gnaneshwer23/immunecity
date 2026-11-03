import { test, expect } from "bun:test";
import { isiInvestigationReleases, loadIsiInvestigationRelease } from "@/lib/hsi/investigation-corpus.server";
import { getGraphNeighbourhood } from "@/lib/immune/neighbourhood";
import { InvestigationRequestError } from "@/lib/hsi/vendor/investigationBackend";
import { RA_RELEASE_ID } from "@/lib/hsi/vendor/raEvidenceRelease";
import { RA_RESEARCH_RELEASE_ID } from "@/lib/hsi/vendor/raResearchEvidenceRelease";

test("internal corpus defaults to the existing RA graph and preserves exact relationship IDs", async () => {
  const corpus = await loadIsiInvestigationRelease("isi-core-graph", null);
  expect(corpus.context.conceptIds).toEqual(["D001"]);
  expect(corpus.relationships.map((r) => r.id)).toEqual(
    getGraphNeighbourhood("D001", { depth: 1, maxEdges: 120, includeDraft: false })!.edges.map((r) => r.relId),
  );
  expect(corpus.passages).toHaveLength(0);
  expect(corpus.claims).toHaveLength(0);
  expect(corpus.entities.some((e) => e.label === "Rheumatoid arthritis")).toBe(true);
});

test("internal corpus accepts only known server releases and existing core concepts", async () => {
  for (const [release, concept] of [
    ["client-upload", null],
    ["isi-core-graph", "unknown-id"],
    ["isi-core-graph", "CXF03"],
  ] as const) {
    await expect(loadIsiInvestigationRelease(release, concept)).rejects.toThrow();
  }
});

test("RA evidence corpus is registered with explicit pending readiness and fails as evidence_not_ready", async () => {
  const listing = isiInvestigationReleases.find((release) => release.id === RA_RELEASE_ID);
  expect(listing).toBeTruthy();
  expect(listing?.readiness?.available).toBe(false);
  expect(listing?.readiness?.reason).toContain("Creative Commons URI");
  try {
    await loadIsiInvestigationRelease(RA_RELEASE_ID, null);
    throw new Error("expected evidence_not_ready");
  } catch (error) {
    expect(error).toBeInstanceOf(InvestigationRequestError);
    expect((error as InvestigationRequestError).status).toBe(422);
    expect((error as InvestigationRequestError).code).toBe("evidence_not_ready");
  }
  // Existing corpus remains usable beside the pending RA release.
  const core = await loadIsiInvestigationRelease("isi-core-graph", "D001");
  expect(core.passages).toHaveLength(0);
  expect(core.relationships.some((r) => r.id === "REL-I032-treats-D001")).toBe(true);
});

test("RA research corpus is registered and loads synthetic passages", async () => {
  const listing = isiInvestigationReleases.find((release) => release.id === RA_RESEARCH_RELEASE_ID);
  expect(listing).toBeTruthy();
  expect(listing?.readiness?.available).toBe(true);
  expect(listing?.title).toBe("RA / anti-TNF research corpus");
  expect(listing?.title).not.toMatch(/demo/i);
  expect(listing?.description).toContain("unreviewed");
  expect(listing?.description).not.toMatch(/demo|fixture|smoke/i);
  const research = await loadIsiInvestigationRelease(RA_RESEARCH_RELEASE_ID, null);
  expect(research.context.dataClass).toBe("synthetic");
  expect(research.passages.length).toBeGreaterThanOrEqual(2);
  expect(research.sources.every((source) => source.kind === "synthetic_fixture" && source.pmid === null)).toBe(true);
  expect(research.claims).toHaveLength(0);
});

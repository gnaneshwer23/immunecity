import { test, expect } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import fixture from "./fixtures/shared-research-contract.json";
import provenance from "@/lib/hsi/vendor/researchContracts.provenance.json";
import { parseResearchBundle, researchRunState, RESEARCH_CONTRACT_VERSION } from "@/lib/hsi/vendor/researchContracts";

test("ISI pins the canonical research validator without source drift", () => {
  expect(createHash("sha256").update(readFileSync("src/lib/hsi/vendor/researchContracts.ts")).digest("hex")).toBe(provenance.sha256);
  expect(provenance.version).toBe(RESEARCH_CONTRACT_VERSION);
  expect(provenance.commit).toMatch(/^[a-f0-9]{40}$/);
  expect(provenance.includesProductData).toBe(false);
});
test("ISI accepts shared contract fixture and preserves existing graph references", () => {
  const bundle = parseResearchBundle(fixture);
  expect(bundle.relationships[0]!.id).toBe(fixture.relationships[0]!.id);
  expect(bundle.claims[0]!.relationshipId).toBe(bundle.relationships[0]!.id);
  expect(researchRunState(bundle.runs[0]!)).toBe("pending");
  expect(bundle.claims[0]!.curation).toBe("unreviewed");
});
test("ISI rejects clinical transport, broken joins, model approval and false completed runs", () => {
  for (const mutate of [
    (b: any) => { b.containsPhi = true; },
    (b: any) => { b.relationships[0].subjectId = "SYN-MISSING"; },
    (b: any) => { b.claims[0].curation = "approved"; b.claims[0].assessmentKind = "model_draft"; },
    (b: any) => { b.runs[0].status = "completed"; },
  ]) {
    const b = structuredClone(fixture); mutate(b);
    expect(() => parseResearchBundle(b)).toThrow();
  }
});

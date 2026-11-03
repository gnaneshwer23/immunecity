import { test, expect } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import provenance from "@/lib/hsi/vendor/sharedTechnology.provenance.json";
import { getGraphNeighbourhood } from "@/lib/immune/neighbourhood";
import { typedIncidentRelations } from "@/lib/immune/typedRelations";

test("ISI executes the pinned canonical HSI source without drift", () => {
  expect(createHash("sha256").update(readFileSync("src/lib/hsi/vendor/sharedTechnology.ts")).digest("hex")).toBe(provenance.sha256);
  expect(provenance.executable).toBe(true);
  expect(provenance.includesProductData).toBe(false);
});
test("ISI adapter keeps relationship identity and scientific metadata from its sole graph", () => {
  const result = getGraphNeighbourhood("D012", { depth: 1, maxEdges: 120 })!;
  expect(result.edges.map((e) => e.relId).sort()).toEqual(typedIncidentRelations("D012").map((e) => e.relId).sort());
  expect(result.edges.every((e) => e.typed.relId === e.relId && e.typed.subjectId === e.subjectId)).toBe(true);
  expect(result.seed.id).toBe("D012");
});

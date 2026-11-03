import { test, expect } from "bun:test";
import { caseGraphContext, conditionGraphMapping, searchCaseGraph } from "@/lib/research/caseGraph";
import { byId, edgeByRel } from "@/lib/immune/engine";
test("case graph uses real endpoints and bounded relationships", () => {
  const c = caseGraphContext("SYN-COND-RA");
  expect(c.anchorId).toBe("D001");
  expect(c.nodes.length).toBeLessThanOrEqual(60);
  expect(c.relations.length).toBeLessThanOrEqual(100);
  expect(c.relations.length).toBeGreaterThan(0);
  expect(c.relations.every((r) => edgeByRel[r.id] === r.edge && byId[r.edge.subject_id] && byId[r.edge.object_id])).toBe(true);
});
test("coverage gaps and broader mappings never create disease associations", () => {
  expect(conditionGraphMapping("SYN-COND-CROHN")?.scope).toBe("broader_disease_family");
  expect(caseGraphContext("SYN-COND-ALZ").anchorId).toBeNull();
  expect(caseGraphContext("SYN-COND-ALZ", "D001").userSelectedExploration).toBe(true);
  expect(() => caseGraphContext("SYN-COND-RA", "fake")).toThrow();
  expect(searchCaseGraph("rheumatoid")[0]?.id).toBe("D001");
});

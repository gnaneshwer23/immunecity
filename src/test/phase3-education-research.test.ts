/**
 * Phase 3 — Integrated education and research (ISI audit v1.0).
 * Run: bun test src/test/phase3-education-research.test.ts
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  fromLessonSearch,
  knownGraphIdsForLesson,
  lessonForGraphConcept,
  resolveLessonId,
} from "@/lib/academy/graphBridge";
import { ACADEMY_TRACKS, moduleForLesson } from "@/data/academyCurriculum";
import { byId } from "@/lib/immune/engine";
import {
  MAX_PATH_CONCEPTS,
  pathTitleFromIds,
  sanitizePathConceptIds,
} from "@/lib/research/savedPaths";
import { SCIENTIFIC_EVAL_SET } from "@/test/eval/scientific-eval-set";
import { summariseAskEvaluations } from "@/lib/askQualityDashboard";
import { PROMPT_VERSION } from "@/lib/askGrounding";

const root = (...p: string[]) => resolve(process.cwd(), ...p);
const source = (rel: string) => readFileSync(root(rel), "utf8");

describe("Phase 3 exit gate — learning and research share graph ids", () => {
  it("maps Academy lessons to existing KG concept ids only", () => {
    for (const track of ACADEMY_TRACKS) {
      for (const mod of track.modules) {
        const ids = knownGraphIdsForLesson(mod.lessonId);
        expect(ids.length).toBeGreaterThan(0);
        for (const id of ids) expect(byId[id]).toBeTruthy();
        for (const id of mod.graphIds) expect(ids).toContain(id);
      }
    }
    expect(knownGraphIdsForLesson("not-a-real-lesson")).toEqual([]);
    expect(resolveLessonId("tlr4")).toBe("tlr4");
    expect(resolveLessonId("invented-biology")).toBeNull();
    expect(fromLessonSearch("tlr4")).toEqual({ fromLesson: "tlr4" });
  });

  it("wires lesson → atlas deep links and return without inventing nodes", () => {
    const academy = source("src/components/immune/AcademyTrack.tsx");
    expect(academy).toContain("fromLesson={hit.lessonId}");
    const chip = source("src/components/immune/ui.tsx");
    expect(chip).toContain('to="/atlas/$id"');
    expect(chip).toContain("fromLesson");
    const atlas = source("src/routes/atlas.$id.tsx");
    expect(atlas).toContain("LessonReturn");
    expect(atlas).toContain("fromLesson");
    const lessonReturn = source("src/components/immune/LessonReturn.tsx");
    expect(lessonReturn).toContain('to="/mechanism/$id"');
    expect(lessonReturn).toMatch(/progress stay/i);
    expect(lessonForGraphConcept("R001")).toBe(moduleForLesson("tlr4")?.module.lessonId);
  });

  it("does not claim a second store of scientific facts for saved paths", () => {
    expect(sanitizePathConceptIds(["R001", "nope", "R001", "P001", "M001"])).toEqual([
      "R001",
      "P001",
      "M001",
    ]);
    expect(sanitizePathConceptIds(Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? "R001" : "P001"))).length).toBeLessThanOrEqual(
      MAX_PATH_CONCEPTS,
    );
    expect(pathTitleFromIds(["R001", "P001"])).toContain("→");
    const paths = source("src/lib/research/savedPaths.ts");
    expect(paths).toMatch(/does not duplicate scientific facts/i);
    const workspace = source("src/routes/workspace.tsx");
    expect(workspace).toContain("Saved research paths");
    expect(workspace).toContain("loadSavedPaths");
    expect(workspace).toContain('to="/atlas/$id"');
  });
});

describe("Phase 3 evidence exploration UX", () => {
  it("keeps concept+edge panel continuity and honest empty filters", () => {
    const graph = source("src/components/immune/GraphView.tsx");
    expect(graph).toContain("relatedConceptId");
    expect(graph).toContain("panel continuity");
    const table = source("src/components/immune/GraphTable.tsx");
    expect(table).toMatch(/Empty filter — not a scientific finding/i);
    expect(table).toContain("onInspectEdge");
    const edge = source("src/components/immune/GraphEdgeDetail.tsx");
    expect(edge).toContain("relatedConceptId");
  });
});

describe("Phase 3 Ask retrieval eval (light)", () => {
  it("extends gold-set with Academy neighbourhood cases and stays fail-closed", () => {
    const academy = SCIENTIFIC_EVAL_SET.filter((c) => c.id.startsWith("academy-"));
    expect(academy.length).toBeGreaterThanOrEqual(3);
    for (const c of academy) {
      if ("mustRetrieveNodeIds" in c && c.mustRetrieveNodeIds) {
        for (const id of c.mustRetrieveNodeIds) expect(byId[id]).toBeTruthy();
      }
    }
    expect(SCIENTIFIC_EVAL_SET.some((c) => c.kind === "clinical-refusal")).toBe(true);
    expect(PROMPT_VERSION).toMatch(/^ask-grounding-v\d+$/);
    const summary = summariseAskEvaluations([
      { outcome: "abstained", reasonCode: "clinical_personal", questionRedacted: true, promptVersion: PROMPT_VERSION },
      { outcome: "citation_rejected", reasonCode: "citation_rejected", questionRedacted: false, promptVersion: PROMPT_VERSION },
    ]);
    expect(summary.note).toMatch(/not fully evidence-grounded/i);
    expect(summary.note).toMatch(/Fail closed/i);
    expect(summary.note).not.toMatch(/fully evidence-grounded AI ready/i);
    const docs = source("docs/ASK_IMMUNE_EVALS.md");
    expect(docs).toMatch(/Academy neighbourhoods \(Phase 3\)/);
    const baseline = source("docs/ISI_AUDIT_BASELINE_2026-10-30.md");
    expect(baseline).toContain("Phase 3 — Integrated education and research");
    expect(baseline).toContain("P3-1");
  });
});

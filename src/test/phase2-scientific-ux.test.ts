import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "bun:test";
import { CONTENT } from "@/data/content";
import { courseMap, discussionStartSearch, reviewDueLessons, statedMisconceptions } from "@/lib/academy/progress";
import { KG, byId } from "@/lib/immune/engine";
import { edgeDirectionLegend, edgePanelFields, graphHasDiseaseField, graphHasSpeciesField } from "@/lib/immune/graphPhase2";
import { NOT_A_PATIENT_PREDICTION, TEACHING_MODELS, runTeachingModel } from "@/lib/immune/teachingModels";
import { implementedModels, STATUS_LABEL } from "@/lib/ai/modelRegistry";
import {
  addEvidenceNote,
  addWorkbenchClaim,
  buildWorkbenchExport,
  canAdvance,
  createWorkbenchSession,
  recordSourceLookup,
  sourceVerificationFromLookup,
  updateWorkbenchClaimLifecycle,
} from "@/lib/research/workbench";

describe("phase 2 graph legend and filters", () => {
  it("does not invent a disease or species filter", () => {
    expect(graphHasDiseaseField(KG.nodes, KG.relationships)).toBe(false);
    expect(graphHasSpeciesField(KG.nodes, KG.relationships)).toBe(false);
  });

  it("shows link direction and hides confidence and weight on the edge panel", () => {
    expect(edgeDirectionLegend({ source: "TNF", target: "TNFR1" })).toEqual({
      key: "source → target",
      example: "TNF → TNFR1",
    });
    const edge = KG.relationships[0]!;
    const source = byId[edge.subject_id]!.name;
    const target = byId[edge.object_id]!.name;
    const fields = edgePanelFields(edge, source, target);
    expect(fields.direction).toBe(`${source} → ${target}`);
    expect(fields.predicate).toBe(edge.relation);
    expect(fields.evidenceStatus).toBe(edge.evidence_status);
    expect(fields.reviewer).toBe("Not recorded");
    expect(fields.reviewDecision).toBe("Not recorded");
    expect(fields.timestamp).toBe("Not recorded");
    expect(fields).not.toHaveProperty("confidence");
    expect(fields).not.toHaveProperty("weight");
    const version = (edge as { version?: string }).version;
    expect(fields.version).toBe(version?.trim() ? version : "Not recorded");
  });
});

describe("phase 2 academy progress", () => {
  it("maps real prerequisites and marks unfinished tracks", () => {
    const map = courseMap();
    expect(map.find((track) => track.level === "foundation")?.unfinished).toBe(false);
    expect(map.find((track) => track.level === "intermediate")?.unfinished).toBe(true);
    expect(map.find((track) => track.level === "advanced")?.unfinished).toBe(true);
    expect(map.find((track) => track.level === "advanced")?.modules).toEqual([]);
    const il6 = map.flatMap((track) => track.modules).find((module) => module.lessonId === "il6");
    expect(il6?.prerequisites.map((item) => item.lessonId)).toContain("tlr4");
    expect(il6?.prerequisites.find((item) => item.lessonId === "tlr4")?.title).toMatch(/Innate sensing/);
  });

  it("marks review due only for completed existing lessons", () => {
    expect(reviewDueLessons({ visitedLessonIds: [], quizCorrect: [] })).toEqual([]);
    const due = reviewDueLessons({
      visitedLessonIds: ["tlr4"],
      quizCorrect: ["q-tlr4-myd88", "q-tlr4-output"],
    });
    expect(due.map((item) => item.lessonId)).toEqual(["tlr4"]);
    expect(reviewDueLessons({ visitedLessonIds: ["tlr4"], quizCorrect: ["q-tlr4-myd88"] })).toEqual([]);
  });

  it("quotes a misconception only when the lesson already states one", () => {
    for (const id of ["tlr4", "il6", "nlrp3", "checkpoint", "sting", "type2"]) {
      const lesson = (CONTENT.lessons as { id?: string; steps?: Array<Record<string, unknown>> }[]).find((item) => item.id === id);
      expect(statedMisconceptions(lesson)).toEqual([]);
    }
    expect(statedMisconceptions({ steps: [{ desc: "Misconception: already written in the lesson." }] })).toEqual([
      "Misconception: already written in the lesson.",
    ]);
  });

  it("links a discussion only for a graph id that exists", () => {
    expect(discussionStartSearch("NOT_A_REAL_CONCEPT")).toBeNull();
    const id = KG.nodes[0]!.id;
    expect(discussionStartSearch(id)).toEqual({ topic: "", concept: id });
  });
});

describe("phase 2 research guards", () => {
  it("cannot mark a claim approved and stays unreviewed", () => {
    let session = createWorkbenchSession("0.3", "draft-ext");
    expect(session.licence).toBe("unknown");
    session = addWorkbenchClaim(session, { assertion: "Candidate note only" });
    const id = session.claims[0]!.claim_id;
    session = updateWorkbenchClaimLifecycle(session, id, "approved", "should be refused");
    expect(session.claims[0]!.lifecycle).not.toBe("approved");
    expect(buildWorkbenchExport(session).curation).toBe("unreviewed");
    expect(buildWorkbenchExport(session).kgWrite).toBe(false);
  });

  it("keeps a failed lookup unverified and does not store an identifier", () => {
    const failed = sourceVerificationFromLookup({ ok: false, pmid: "12345678", doi: "10.1000/example" });
    expect(failed).toEqual({ verification: "unverified", verifiedPmid: null, verifiedDoi: null });
    let session = createWorkbenchSession("0.3", "draft-ext");
    session = addEvidenceNote(session, "A note", "user label");
    const noteId = session.evidence[0]!.note_id;
    session = recordSourceLookup(session, noteId, { ok: false, pmid: "12345678" });
    expect(session.evidence[0]!.verification).toBe("unverified");
    expect(session.evidence[0]!.verifiedPmid).toBeNull();
    session = recordSourceLookup(session, noteId, { ok: true, pmid: "12345678" });
    expect(session.evidence[0]!.verification).toBe("verified");
    expect(session.evidence[0]!.verifiedPmid).toBe("12345678");
  });

  it("requires an explicit contradiction choice before human review", () => {
    const session = createWorkbenchSession("0.3", "draft-ext");
    const blocked = canAdvance({ ...session, step: "contradiction" });
    expect(blocked.ok).toBe(false);
    const ready = canAdvance({
      ...session,
      step: "contradiction",
      contradiction: { choice: "none_recorded", statement: "", kind: "candidate" },
    });
    expect(ready.ok).toBe(true);
    expect(canAdvance({ ...session, step: "review" }).ok).toBe(false);
  });
});

describe("phase 2 teaching models", () => {
  it("keeps every sketch labelled not a patient prediction", () => {
    const page = readFileSync(resolve(process.cwd(), "src/routes/simulator.tsx"), "utf8");
    expect(page).toMatch(/not a patient prediction/i);
    expect(TEACHING_MODELS.map((model) => model.id)).toEqual([
      "antigen-presentation",
      "t-cell-activation",
      "cytokine-signalling",
      "vaccination",
      "tumour-immunity",
    ]);
    for (const model of TEACHING_MODELS) {
      expect(model.disclaimer).toBe(NOT_A_PATIENT_PREDICTION);
      expect(model.parameters.every((item) => item.origin === "Teaching assumption" && item.unit.length > 0)).toBe(true);
      expect(model.assumptions.length).toBeGreaterThan(0);
      expect(model.limits.length).toBeGreaterThan(0);
      const trace = runTeachingModel(model, {}, 1.5);
      expect(trace.disclaimer).toBe(NOT_A_PATIENT_PREDICTION);
      expect(trace.unit).toBe("normalised teaching units");
      expect(trace.readout).not.toMatch(/survival|prognosis|dose|patient/i);
      expect(Object.keys(trace).sort()).toEqual(["disclaimer", "modelId", "points", "readout", "unit"]);
    }
    expect(implementedModels()).toEqual([]);
    expect(STATUS_LABEL.planned).toMatch(/not live/);
    expect(STATUS_LABEL["interface-only"]).toMatch(/not live/);
  });
});

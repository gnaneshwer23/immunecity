import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  acceptPracticeLabelSubmission,
  buildPracticeAdjudicationQueue,
  finalizeAdjudicationRecord,
  type IndependentLabelPacket,
} from "@/lib/hsi/contextAnnotationClient";

const root = process.cwd();
const source = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("RA scenario workspace", () => {
  it("wires guided investigate → label → adjudicate path on internal research", () => {
    const route = source("src/routes/internal-research.tsx");
    expect(route).toContain("RaScenarioWorkspace");
    expect(route).not.toContain("ContextAnnotationPractice");
    expect(source("src/components/immune/RaScenarioWorkspace.tsx")).toContain("label_a");
    expect(source("src/components/immune/RaScenarioWorkspace.tsx")).toContain("adjudicate");
    expect(source("src/components/immune/ContextAnnotationPractice.tsx")).toContain("Use selection as grounding");
    expect(source("src/components/immune/ContextAnnotationAdjudication.tsx")).toContain("Prefer A");
  });

  it("accepts dual practice packets and finalizes adjudication without evaluation promotion", () => {
    const packetA = JSON.parse(
      source("src/data/hsi/ra-anti-tnf/annotation-kit/practice-packet-annotator-a.json"),
    ) as IndependentLabelPacket;
    const packetB = JSON.parse(
      source("src/data/hsi/ra-anti-tnf/annotation-kit/practice-packet-annotator-b.json"),
    ) as IndependentLabelPacket;
    const tagsA = {
      species: "human" as const,
      tissue_or_sample: "serum",
      setting_or_model: "clinical_observational" as const,
      intervention: "anti-TNF",
      outcome: "response",
      timepoint: "baseline",
    };
    const tagsB = { ...tagsA, tissue_or_sample: "plasma" };
    const acceptedA = acceptPracticeLabelSubmission(packetA, {
      packetId: packetA.packetId,
      annotatorSlot: "annotator_a",
      annotatorId: "sme-a",
      labelledAt: "2026-11-03T17:00:00Z",
      rows: packetA.rows.map((row) => ({
        rowId: row.rowId,
        groundingSpan: row.passageText.slice(0, 32),
        tags: tagsA,
      })),
    });
    const acceptedB = acceptPracticeLabelSubmission(packetB, {
      packetId: packetB.packetId,
      annotatorSlot: "annotator_b",
      annotatorId: "sme-b",
      labelledAt: "2026-11-03T17:05:00Z",
      rows: packetB.rows.map((row) => ({
        rowId: row.rowId,
        groundingSpan: row.passageText.slice(0, 32),
        tags: tagsB,
      })),
    });
    expect(acceptedA.notForEvaluation).toBe(true);
    const queue = buildPracticeAdjudicationQueue(acceptedA, acceptedB);
    const closed = finalizeAdjudicationRecord(queue[0]!, {
      finalTags: tagsA,
      adjudicatorId: "sme-lead",
      rationale: "Practice adjudication prefers Annotator A tissue wording.",
      adjudicatedAt: "2026-11-03T17:10:00Z",
    });
    expect(closed.finalTags?.tissue_or_sample).toBe("serum");
    expect(closed.fabricatedLabelsPermitted).toBe(false);
  });
});

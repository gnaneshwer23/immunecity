import { describe, expect, test } from "bun:test";
import { buildMelanomaExplorerBrief, type MelanomaHypothesisInput } from "@/lib/research/melanomaExplorer";

const input: MelanomaHypothesisInput = {
  question: "What explains nonresponse?", hypothesis: "Researcher proposal requiring review",
  prediction: "A measurable difference between prespecified groups",
  experiment: "Compare matched research samples with a prespecified assay",
  falsification: "No difference under the prespecified comparison",
  contextTrialIds: ["TR003", "TR020"],
};
describe("melanoma research hypothesis export", () => {
  test("retains source traceability without converting trial context into support", () => {
    const brief = buildMelanomaExplorerBrief(input, "2026-11-03T10:00:00Z");
    expect(brief.contextSources.map((s) => s.pmid)).toEqual(["25891173", "26027431"]);
    expect(brief.contextSources.every((s) => s.role === "trial_context_only")).toBe(true);
    expect(brief.claimSupport).toBe("not_assessed");
    expect(brief.reviewStatus).toBe("unreviewed");
    expect(brief.kgWrite).toBe(false);
    expect(brief.clinicalAdvice).toBe(false);
    expect(brief.path.seeds).toContain("D012");
    expect(brief.graphVersion.core).toBeTruthy();
    expect(brief.limitations.join(" ")).toContain("No live literature search");
  });
  test("fails closed on fabricated or absent source selections", () => {
    for (const contextTrialIds of [[], ["TR999"], ["TR003", "TR999"]]) {
      expect(() => buildMelanomaExplorerBrief({ ...input, contextTrialIds }, "2026-11-03")).toThrow();
    }
  });
  test("requires a falsifiable complete bounded draft", () => {
    for (const key of ["question", "hypothesis", "prediction", "experiment", "falsification"] as const) {
      expect(() => buildMelanomaExplorerBrief({ ...input, [key]: " " }, "2026-11-03")).toThrow();
      expect(() => buildMelanomaExplorerBrief({ ...input, [key]: "x".repeat(4001) }, "2026-11-03")).toThrow();
    }
  });
  test("is reproducible for identical input and timestamp", () => {
    const timestamp = "2026-11-03T10:00:00Z";
    expect(buildMelanomaExplorerBrief(input, timestamp)).toEqual(buildMelanomaExplorerBrief(input, timestamp));
    expect(() => buildMelanomaExplorerBrief(input, "invalid")).toThrow();
  });
});

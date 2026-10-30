/**
 * Phase D (partial) — Ask Immune GraphRAG hooks on one Ask path.
 * Run: bun test src/test/phase-d-ask-graphrag.test.ts
 */
import { describe, expect, it } from "bun:test";
import { PROMPT_VERSION, graphContext, prepareAsk, validateAnswerCitations } from "@/lib/askGrounding";

describe("Phase D — Ask neighbourhood + abstention honesty", () => {
  it("positive: melanoma question retrieves graph + GRAPH_NEIGHBOURHOOD paths", () => {
    const g = graphContext("How does PD-1 blockade relate to melanoma?");
    expect(g.coverage.matched).toBe(true);
    expect(g.nodeIds.length).toBeGreaterThan(0);
    expect(g.text).toMatch(/GRAPH_NEIGHBOURHOOD/);
    expect(g.text).toMatch(/NPATH/);
    expect(PROMPT_VERSION).toBe("ask-grounding-v11");
  });

  it("negative: clinical-personal questions abstain (no CDS)", () => {
    const prep = prepareAsk("What dose of pembrolizumab should I take for my melanoma?");
    expect(prep.callModel).toBe(false);
    expect(prep.grounding.trace.abstained).toBe(true);
    expect(prep.grounding.queryClass).toBe("clinical_personal");
  });

  it("boundary: citation validation rejects invented concept ids", () => {
    const g = graphContext("PD-1 and melanoma");
    const v = validateAnswerCitations(
      "See [FakeNode](concept:ZZZ999) which is not in the graph.",
      g,
    );
    expect(v.ok).toBe(false);
    expect(v.inventedConceptIds.length + v.unretrievedConceptIds.length).toBeGreaterThan(0);
  });
});

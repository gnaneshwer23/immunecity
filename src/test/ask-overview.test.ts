import { describe, expect, it } from "vitest";
import { OVERVIEW_NODE_IDS, classifyAskQuery, graphContext, isOverviewQuestion, relevantNodes } from "@/lib/askGrounding";
import { byId } from "@/lib/immune/engine";

describe("Ask overview questions", () => {
  it("recognises broad introductory questions in common phrasings", () => {
    for (const q of [
      "whats immune system",
      "What is the immune system?",
      "what is immunity",
      "How does the immune system work?",
      "Explain the immune system in simple terms",
      "immune system basics",
      "innate vs adaptive immunity",
    ]) expect(isOverviewQuestion(q), q).toBe(true);
  });

  it("leaves specific questions to normal retrieval", () => {
    for (const q of ["What is trained immunity?", "How does TNF drive rheumatoid arthritis?", "What is the immune system's role in lupus?"]) {
      expect(isOverviewQuestion(q), q).toBe(false);
    }
  });

  it("retrieves the foundational layer instead of word-matched noise", () => {
    const names = relevantNodes("What is the immune system?").map((n) => n.id);
    expect(names).toEqual([...OVERVIEW_NODE_IDS]);
    expect(names).not.toContain("T012"); // Central nervous system
    expect(names).not.toContain("D017"); // Cancer immune escape
  });

  it("uses only real core concepts and flags the request for the model", () => {
    for (const id of OVERVIEW_NODE_IDS) expect(byId[id], id).toBeDefined();
    const ctx = graphContext("whats immune system");
    expect(classifyAskQuery("whats immune system")).toBe("graph_explanation");
    expect(ctx.text).toContain("OVERVIEW_REQUEST");
    expect(ctx.text).not.toContain("NO_MATCH");
    expect(ctx.links.length).toBeGreaterThan(10);
  });
});

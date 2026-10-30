import { describe, expect, it } from "bun:test";
import {
  askProgressLabel,
  classifyAskGatewayIntent,
  classifyAskQuery,
  graphContext,
  suggestGatewayActions,
} from "@/lib/askGrounding";

describe("Ask gateway intents", () => {
  it("routes evidence and discovery questions without inventing science", () => {
    expect(classifyAskGatewayIntent("What evidence supports TNF in RA?")).toBe("evidence");
    expect(classifyAskGatewayIntent("What research gaps remain for checkpoint resistance?")).toBe("discovery");
    expect(classifyAskGatewayIntent("How does IL-6 signalling work?")).toBe("mechanism");
    expect(classifyAskGatewayIntent("Where is the Academy foundation lesson?")).toBe("academy");
    expect(classifyAskGatewayIntent("What are the methodology limitations?")).toBe("methodology");
  });

  it("suggests bounded follow-up actions from grounding", () => {
    const q = "How does TNF drive rheumatoid arthritis?";
    const grounding = graphContext(q, classifyAskQuery(q));
    const actions = suggestGatewayActions(grounding, q);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.length).toBeLessThanOrEqual(6);
    expect(actions.every((a) => a.href.startsWith("/"))).toBe(true);
    expect(actions.some((a) => a.id === "atlas" || a.id === "explore" || a.id === "graph")).toBe(true);
  });

  it("uses scientific progress copy, not pipeline logs", () => {
    expect(askProgressLabel("retrieving", "evidence")).toMatch(/evidence/i);
    expect(askProgressLabel("retrieving", "discovery")).toMatch(/coverage/i);
    expect(askProgressLabel("writing")).toMatch(/Writing from retrieved/);
    expect(askProgressLabel("idle")).toBeNull();
    expect(askProgressLabel("retrieving", "evidence")).not.toMatch(/pipeline|agent|Neon/i);
  });
});

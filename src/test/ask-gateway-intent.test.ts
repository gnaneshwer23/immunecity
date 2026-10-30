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
    expect(classifyAskGatewayIntent("Show my research profile and followed alerts")).toBe("research_profile");
    expect(classifyAskGatewayIntent("How does Ask work — skeptic provenance limits?")).toBe("methodology");
  });

  it("keeps clinical questions at general gateway intent", () => {
    const q = "I have RA — what dose of infliximab should I take?";
    expect(classifyAskQuery(q)).toBe("clinical_personal");
    expect(classifyAskGatewayIntent(q)).toBe("general");
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

  it("wires Academy lesson and Radar deep-links when concepts match", () => {
    const q = "What research gaps remain around TNF and rheumatoid arthritis?";
    const grounding = graphContext(q, classifyAskQuery(q));
    const actions = suggestGatewayActions(grounding, q, "discovery");
    expect(actions.some((a) => a.id === "radar" && a.href === "/discovery")).toBe(true);
    expect(actions.some((a) => a.id === "gaps" && a.href === "/discovery/gaps")).toBe(true);
    expect(actions.every((a) => !/agent|autonomous|scout|verifier/i.test(a.label))).toBe(true);
  });

  it("suggests Methods for methodology and evidence intents", () => {
    const q = "What are the methodology limitations of Ask Immune?";
    const grounding = graphContext("TNF rheumatoid arthritis", classifyAskQuery("TNF rheumatoid arthritis"));
    const methodActions = suggestGatewayActions(grounding, q, "methodology");
    expect(methodActions.some((a) => a.href.includes("/methods"))).toBe(true);
    const evidenceActions = suggestGatewayActions(grounding, "What evidence supports TNF?", "evidence");
    expect(evidenceActions.some((a) => a.id === "evidence")).toBe(true);
  });

  it("uses scientific progress copy, not pipeline logs", () => {
    expect(askProgressLabel("retrieving", "evidence")).toMatch(/evidence/i);
    expect(askProgressLabel("retrieving", "discovery")).toMatch(/coverage/i);
    expect(askProgressLabel("retrieving", "knowledge_graph")).toMatch(/concepts/i);
    expect(askProgressLabel("reviewing", "evidence")).toMatch(/evidence/i);
    expect(askProgressLabel("writing", "mechanism")).toMatch(/mechanism/i);
    expect(askProgressLabel("writing")).toMatch(/Writing from retrieved/);
    expect(askProgressLabel("idle")).toBeNull();
    expect(askProgressLabel("retrieving", "evidence")).not.toMatch(/pipeline|agent|Neon|graph context/i);
  });
});

import { describe, expect, it } from "vitest";
import { JOURNEY_NAV, JOURNEY_PRIMARY, JOURNEY_SECONDARY, journeyKey } from "@/data/marketingNav";

describe("journey navigation", () => {
  it("groups the header into five primaries", () => {
    expect(JOURNEY_NAV.map((g) => g.label)).toEqual([
      "Explore",
      "Research",
      "Academy",
      "Community",
      "Ask Immune",
    ]);
  });
  it("lists each destination once within a pillar (mechanism may appear in Explore and Academy)", () => {
    for (const g of JOURNEY_NAV) {
      const keys = g.items.map(journeyKey);
      const withoutDupPath = keys.filter((k) => k !== "/mechanism");
      if (g.label === "Explore" || g.label === "Academy") {
        expect(new Set(withoutDupPath).size).toBe(withoutDupPath.length);
      } else {
        expect(new Set(keys).size).toBe(keys.length);
      }
    }
  });
});

describe("merged pages", () => {
  it("keeps internal reasoning and Scientific AI out of public navigation", () => {
    const paths = JOURNEY_NAV.flatMap((g) => g.items.map((i) => i.path as string));
    expect(paths).not.toContain("/scientific-ai");
    expect(paths).not.toContain("/reasoning");
  });
});

describe("primary entries", () => {
  it("keeps five pillars as JOURNEY_NAV; JOURNEY_PRIMARY empty; SME not a science peer", () => {
    expect(JOURNEY_PRIMARY).toEqual([]);
    expect(JOURNEY_NAV.some((g) => g.label === "Ask Immune")).toBe(true);
    expect(JOURNEY_NAV.some((g) => g.label === "Community")).toBe(true);
    const paths = JOURNEY_NAV.flatMap((g) => g.items.map((i) => i.path as string));
    expect(paths).toContain("/ask");
    expect(paths).toContain("/community");
    expect(paths).toContain("/explore");
    expect(paths).not.toContain("/sme");
    expect(JOURNEY_SECONDARY.map((i) => i.path)).toEqual(["/methods", "/vision", "/about"]);
  });
  it("puts atlas/graph under Explore and Radar under Research", () => {
    const explore = JOURNEY_NAV.find((g) => g.label === "Explore")!.items.map((i) => i.path);
    const research = JOURNEY_NAV.find((g) => g.label === "Research")!.items.map((i) => i.path);
    expect(explore).toEqual(expect.arrayContaining(["/explore", "/atlas", "/graph", "/mechanism"]));
    expect(research).toEqual(
      expect.arrayContaining(["/research", "/discovery", "/evidence"]),
    );
    expect(research).not.toContain("/hsi/discovery");
    expect(research).not.toContain("/simulator");
  });
  it("Ask Immune pillar is the chatbot; Reasoning is tools, not a second chat", () => {
    const ask = JOURNEY_NAV.find((g) => g.label === "Ask Immune")!.items;
    expect(ask).toHaveLength(1);
    expect(ask[0]!.path).toBe("/ask");
    const reasoning = JOURNEY_NAV.find((g) => g.label === "Research")!.items.find((i) => i.path === "/reasoning");
    expect(reasoning).toBeUndefined();
  });
});

describe("brief simplification mapping", () => {
  const find = (label: string) => JOURNEY_NAV.find((g) => g.label === label)!.items.map((i) => i.title);
  it("keeps public research destinations and excludes testing tools", () => {
    expect(find("Research")).toEqual(
      expect.arrayContaining([
        "Research library",
        "Evidence explorer",
        "Research Radar",
      ]),
    );
    expect(find("Research")).not.toContain("System simulator");
    expect(find("Research")).not.toContain("HSI Discovery");
  });
  it("keeps Methods in secondary chrome, not a sixth science pillar", () => {
    expect(JOURNEY_NAV.map((g) => g.label)).not.toContain("Trust");
    expect(JOURNEY_SECONDARY.some((i) => i.path === "/methods")).toBe(true);
  });
});

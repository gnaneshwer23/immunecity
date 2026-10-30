import { describe, expect, it } from "vitest";
import { JOURNEY_NAV, JOURNEY_PRIMARY, journeyKey } from "@/data/marketingNav";

describe("journey navigation", () => {
  it("groups the header into Learn, Explore, Investigate, Trust", () => {
    expect(JOURNEY_NAV.map((g) => g.label)).toEqual(["Learn", "Explore", "Investigate", "Trust"]);
  });
  it("lists each destination once", () => {
    const paths = JOURNEY_NAV.flatMap((g) => g.items.map(journeyKey));
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe("merged pages", () => {
  it("has no separate Scientific AI entry; Reasoning covers it", () => {
    const paths = JOURNEY_NAV.flatMap((g) => g.items.map((i) => i.path as string));
    expect(paths).not.toContain("/scientific-ai");
    expect(paths).toContain("/reasoning");
  });
});

describe("primary entries", () => {
  it("shows Research and Simulate beside the journeys; Community stays footer-only", () => {
    expect(JOURNEY_PRIMARY.map((i) => [i.label, i.path])).toEqual([
      ["Research", "/research"],
      ["Simulate", "/simulator"],
    ]);
    expect(JOURNEY_PRIMARY.some((i) => i.label === "Community")).toBe(false);
    expect(JOURNEY_PRIMARY.some((i) => i.label === "Ask Immune")).toBe(false);
    expect(JOURNEY_PRIMARY.some((i) => i.label === "My Workspace")).toBe(false);
  });
  it("keeps those tools inside Learn, Explore and Investigate", () => {
    expect(JOURNEY_NAV.map((g) => g.label)).toEqual(["Learn", "Explore", "Investigate", "Trust"]);
    const paths = JOURNEY_NAV.flatMap((g) => g.items.map((i) => i.path as string));
    expect(paths).toEqual(expect.arrayContaining(["/ask", "/research", "/simulator"]));
    const learn = JOURNEY_NAV.find((g) => g.label === "Learn")!.items.map((i) => i.path);
    const investigate = JOURNEY_NAV.find((g) => g.label === "Investigate")!.items.map((i) => i.path);
    expect(learn).toContain("/ask");
    expect(investigate).toEqual(expect.arrayContaining(["/simulator", "/research"]));
  });
});

describe("brief v2 menu mapping", () => {
  const find = (label: string) => JOURNEY_NAV.find((g) => g.label === label)!.items.map((i) => i.title);
  it("puts the Research library, Simulator and Research Radar under Investigate", () => {
    expect(find("Investigate")).toEqual(
      expect.arrayContaining(["System simulator", "Research library", "Evidence explorer", "Research Radar"]),
    );
  });
  it("Trust sections all live on Methods", () => {
    const trust = JOURNEY_NAV.find((g) => g.label === "Trust")!.items;
    expect(trust).toHaveLength(4);
    expect(trust.every((i) => i.path === "/methods")).toBe(true);
  });
});

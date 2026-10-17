import { describe, expect, it } from "vitest";
import { JOURNEY_NAV, journeyKey } from "@/data/marketingNav";

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

describe("brief v2 menu mapping", () => {
  const find = (label: string) => JOURNEY_NAV.find((g) => g.label === label)!.items.map((i) => i.title);
  it("puts the Research library and Simulator under Investigate", () => {
    expect(find("Investigate")).toEqual(expect.arrayContaining(["System simulator", "Research library", "Evidence explorer"]));
  });
  it("Trust sections all live on Methods", () => {
    const trust = JOURNEY_NAV.find((g) => g.label === "Trust")!.items;
    expect(trust).toHaveLength(4);
    expect(trust.every((i) => i.path === "/methods")).toBe(true);
  });
});

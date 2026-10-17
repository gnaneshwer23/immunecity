import { describe, expect, it } from "vitest";
import { JOURNEY_NAV } from "@/data/marketingNav";

describe("journey navigation", () => {
  it("groups the header into Learn, Explore, Investigate", () => {
    expect(JOURNEY_NAV.map((g) => g.label)).toEqual(["Learn", "Explore", "Investigate"]);
  });
  it("lists each page once", () => {
    const paths = JOURNEY_NAV.flatMap((g) => g.items.map((i) => i.path));
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

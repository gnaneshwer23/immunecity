import { describe, expect, it } from "vitest";

import { FOOTER_GROUPS, isMarketingPath, MARKETING_NAV, MARKETING_PATHS } from "@/data/marketingNav";
import { ALL_NAV } from "@/components/immune/nav";
import { ATLAS_CTA, ATLAS_PATH, EXPLORE_CTA, EXPLORE_PATH } from "@/lib/brand";

describe("marketing IA wiring", () => {
  it("keeps every header item on marketing chrome", () => {
    for (const item of MARKETING_NAV) {
      expect(isMarketingPath(item.path), item.path).toBe(true);
    }
  });

  it("aligns header Academy with footer Academy and includes Collaborate", () => {
    expect(MARKETING_NAV.find((i) => i.path === "/mechanism")?.label).toBe("Academy");
    expect(FOOTER_GROUPS[0].items.find((i) => i.path === "/mechanism")?.label).toBe("Academy");
    expect(MARKETING_NAV.some((i) => i.path === "/collaborate")).toBe(true);
    expect(isMarketingPath("/collaborate")).toBe(true);
  });

  it("keeps Platform and Methods on marketing chrome (not atlas pillars)", () => {
    expect(MARKETING_PATHS.has("/overview")).toBe(true);
    expect(MARKETING_PATHS.has("/methods")).toBe(true);
    expect(isMarketingPath("/overview")).toBe(true);
    expect(isMarketingPath("/methods")).toBe(true);
  });

  it("keeps Academy nested mechanism routes on marketing chrome", () => {
    expect(isMarketingPath("/mechanism")).toBe(true);
    expect(isMarketingPath("/mechanism/tcr")).toBe(true);
  });

  it("leaves deep atlas layers on atlas chrome", () => {
    expect(isMarketingPath("/graph")).toBe(false);
    expect(isMarketingPath("/learn")).toBe(false);
    expect(isMarketingPath("/evidence")).toBe(false);
    expect(isMarketingPath("/research")).toBe(false);
  });

  it("wires Explore CTA and footer destinations to known nav or marketing paths", () => {
    expect(EXPLORE_PATH).toBe("/overview");
    expect(EXPLORE_CTA).toBe("Explore the platform");
    expect(ATLAS_PATH).toBe("/graph");
    expect(ATLAS_CTA).toBe("Enter atlas");
    const atlasPaths = new Set(ALL_NAV.map((l) => l.path));
    for (const group of FOOTER_GROUPS) {
      for (const item of group.items) {
        const known =
          MARKETING_PATHS.has(item.path) ||
          atlasPaths.has(item.path) ||
          item.path === "/mechanism" ||
          item.path.startsWith("/mechanism/");
        expect(known, item.path).toBe(true);
      }
    }
  });
});

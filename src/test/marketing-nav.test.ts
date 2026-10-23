import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  FOOTER_GROUPS,
  isMarketingPath,
  JOURNEY_PRIMARY,
  MARKETING_NAV,
  MARKETING_NAV_ACTION,
  MARKETING_NAV_MORE,
  MARKETING_NAV_PRIMARY,
  MARKETING_PATHS,
} from "@/data/marketingNav";
import { ALL_NAV } from "@/components/immune/nav";
import {
  ATLAS_CTA,
  ATLAS_PATH,
  EXPLORE_CTA,
  EXPLORE_PATH,
  LEARN_CTA,
  LEARN_PATH,
} from "@/lib/brand";

describe("marketing IA wiring", () => {
  it("keeps every header item on marketing chrome", () => {
    for (const item of MARKETING_NAV) {
      expect(isMarketingPath(item.path), item.path).toBe(true);
    }
  });

  it("puts Academy on /academy; Insights footer-only (no More menu); Collaborate distinct", () => {
    expect(MARKETING_NAV_PRIMARY.find((i) => i.label === "Academy")?.path).toBe("/academy");
    expect(FOOTER_GROUPS[0]?.items.find((i) => "path" in i && i.path === "/academy")?.label).toBe("Academy");
    expect(MARKETING_NAV_MORE).toHaveLength(0);
    expect(MARKETING_NAV_PRIMARY.some((i) => (i.path as string) === "/insights")).toBe(false);
    expect(MARKETING_NAV.some((i) => (i.path as string) === "/insights")).toBe(false);
    expect(FOOTER_GROUPS.some((g) => g.items.some((i) => "path" in i && i.path === "/insights"))).toBe(true);
    expect(MARKETING_NAV_ACTION.path).toBe("/collaborate");
    expect(isMarketingPath("/collaborate")).toBe(true);
    expect(isMarketingPath("/academy")).toBe(true);
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

  it("keeps Ask in the header and leaves search and the explore pill off the chrome", () => {
    const shell = readFileSync(resolve(process.cwd(), "src/components/immune/Shell.tsx"), "utf8");
    expect(shell).not.toContain("SiteSearch");
    expect(shell).not.toContain("topbar-cta");
    expect(shell).not.toContain("marketing-compact-cta");
    expect(shell).not.toContain("EXPLORE_CTA");
    expect(shell).toContain("journey-main");
    expect(shell).toContain("journey-org");
    expect(shell).toContain("AskAtlas");
    const home = readFileSync(resolve(process.cwd(), "src/routes/index.tsx"), "utf8");
    expect(home).toContain("CITY_CTA");
    expect(home).toContain("CITY_PATH");
  });

  it("wires Explore / Learn CTAs and footer destinations to known nav or marketing paths", () => {
    expect(EXPLORE_PATH).toBe("/overview");
    expect(EXPLORE_CTA).toBe("Explore the Immune System");
    expect(LEARN_PATH).toBe("/academy");
    expect(LEARN_CTA).toBe("Explore the Academy");
    expect(ATLAS_PATH).toBe("/graph");
    expect(ATLAS_CTA).toBe("Enter Atlas");
    const atlasPaths = new Set(ALL_NAV.map((l) => l.path));
    for (const group of FOOTER_GROUPS) {
      for (const item of group.items) {
        expect("path" in item, "footer outbound links belong in the header").toBe(true);
        if (!("path" in item)) continue;
        const known =
          MARKETING_PATHS.has(item.path as never) ||
          atlasPaths.has(item.path as never) ||
          JOURNEY_PRIMARY.some((p) => p.path === item.path) ||
          item.path === "/mechanism" ||
          item.path === "/academy" ||
          item.path.startsWith("/mechanism/");
        expect(known, item.path).toBe(true);
      }
    }
  });
});

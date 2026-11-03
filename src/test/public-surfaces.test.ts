import { test, expect } from "bun:test";
import { JOURNEY_NAV, FOOTER_GROUPS } from "@/data/marketingNav";
import { ALL_NAV } from "@/components/immune/nav";
import { sitemapEntries } from "@/lib/sitemap";
import { isInternalToolPath, INTERNAL_TOOL_PATHS } from "@/lib/publicSurfaces";

test("public navigation and sitemap exclude internal tools", () => {
  expect(JOURNEY_NAV.flatMap((g) => g.items).every((i) => !isInternalToolPath(i.path))).toBe(true);
  expect(FOOTER_GROUPS.flatMap((g) => g.items).every((i) => !("path" in i) || !isInternalToolPath(i.path))).toBe(true);
  expect(ALL_NAV.every((i) => !isInternalToolPath(i.path))).toBe(true);
  expect(sitemapEntries().every((i) => !isInternalToolPath(i.path))).toBe(true);
  for (const path of INTERNAL_TOOL_PATHS) expect(isInternalToolPath(`${path}?admin=true#section`)).toBe(true);
  expect(isInternalToolPath("/graph")).toBe(false);
  expect(isInternalToolPath("/evidence")).toBe(false);
});

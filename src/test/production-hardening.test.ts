import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { clientIp } from "@/lib/clientIp";
import { STATIC_SITEMAP, sitemapEntries, sitemapXml } from "@/lib/sitemap";
import { KG } from "@/lib/immune/engine";
import { isSparse } from "@/lib/immune/concepts";
import { pipelineDiseases } from "@/lib/immune/pipeline";

describe("rate-limit client identity", () => {
  it("ignores a spoofable cf-connecting-ip header", () => {
    const h = new Headers({ "cf-connecting-ip": "1.2.3.4", "x-real-ip": "203.0.113.9" });
    expect(clientIp(h)).toBe("203.0.113.9");
  });
  it("falls back to the first x-forwarded-for hop, then anon", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "198.51.100.7, 10.0.0.1" }))).toBe("198.51.100.7");
    expect(clientIp(new Headers({ "cf-connecting-ip": "1.2.3.4" }))).toBe("anon");
  });
});

describe("sitemap", () => {
  const entries = sitemapEntries();
  const paths = entries.map((e) => e.path);

  it("keeps every hub page and adds pipelines", () => {
    for (const s of STATIC_SITEMAP) expect(paths).toContain(s.path);
    for (const d of pipelineDiseases()) expect(paths).toContain(`/pipeline/${d.node.id}`);
  });

  it("lists indexable concept pages only (no drafts, no sparse pages)", () => {
    const indexable = KG.nodes.filter((n) => !n.draft && !isSparse(n.id));
    expect(indexable.length).toBeGreaterThan(100);
    for (const n of indexable) expect(paths).toContain(`/atlas/${encodeURIComponent(n.id)}`);
    for (const n of KG.nodes.filter((x) => x.draft)) expect(paths).not.toContain(`/atlas/${encodeURIComponent(n.id)}`);
  });

  it("has unique paths and stays under the 50,000-URL protocol limit", () => {
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.length).toBeLessThan(50_000);
  });

  it("emits well-formed absolute URLs", () => {
    const xml = sitemapXml();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain("<loc>https://www.immune-super-intelligence.co.uk/atlas/");
    expect(xml).not.toMatch(/<loc>[^<]*[<>"][^<]*<\/loc>/);
  });
});

describe("robots.txt", () => {
  it("uses a single wildcard group so disallow rules apply to every crawler", () => {
    const robots = readFileSync(resolve(__dirname, "../../public/robots.txt"), "utf8");
    expect(robots.match(/^User-agent:/gim)).toHaveLength(1);
    expect(robots).toMatch(/User-agent: \*/);
    for (const p of ["/auth", "/curation", "/api/"]) expect(robots).toContain(`Disallow: ${p}`);
  });
});

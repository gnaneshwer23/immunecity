/* sitemap.xml built from the graph at request time, so every indexable concept, pipeline
   and mechanism page is listed and the file can never drift from the routes. Pure and
   browser-safe for unit tests; served by src/routes/sitemap[.]xml.ts. */
import { KG } from "@/lib/immune/engine";
import { isSparse } from "@/lib/immune/concepts";
import { pipelineDiseases } from "@/lib/immune/pipeline";
import { CONTENT } from "@/data/content";
import { absoluteUrl } from "@/lib/seo";

type Entry = { path: string; changefreq: "daily" | "weekly" | "monthly" | "yearly"; priority: number };

/** Hub and trust pages (formerly the static public/sitemap.xml). */
export const STATIC_SITEMAP: Entry[] = [
  { path: "/", changefreq: "weekly", priority: 1.0 },
  { path: "/overview", changefreq: "weekly", priority: 0.9 },
  { path: "/ask", changefreq: "weekly", priority: 0.9 },
  { path: "/atlas", changefreq: "weekly", priority: 0.9 },
  { path: "/about", changefreq: "monthly", priority: 0.8 },
  { path: "/academy", changefreq: "monthly", priority: 0.8 },
  { path: "/methods", changefreq: "monthly", priority: 0.8 },
  { path: "/insights", changefreq: "weekly", priority: 0.7 },
  { path: "/collaborate", changefreq: "monthly", priority: 0.7 },
  { path: "/research", changefreq: "monthly", priority: 0.7 },
  { path: "/graph", changefreq: "weekly", priority: 0.8 },
  { path: "/learn", changefreq: "weekly", priority: 0.7 },
  { path: "/mechanism", changefreq: "weekly", priority: 0.7 },
  { path: "/reasoning", changefreq: "weekly", priority: 0.7 },
  { path: "/evidence", changefreq: "weekly", priority: 0.7 },
  { path: "/disease", changefreq: "monthly", priority: 0.6 },
  { path: "/therapy", changefreq: "monthly", priority: 0.6 },
  { path: "/pipeline", changefreq: "monthly", priority: 0.6 },
  { path: "/dynamics", changefreq: "monthly", priority: 0.6 },
  { path: "/simulator", changefreq: "monthly", priority: 0.5 },
  { path: "/privacy", changefreq: "yearly", priority: 0.3 },
  { path: "/terms", changefreq: "yearly", priority: 0.3 },
  { path: "/disclaimer", changefreq: "yearly", priority: 0.3 },
  { path: "/accessibility", changefreq: "yearly", priority: 0.3 },
];

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Every indexable URL. Concept pages follow the same rule as their robots meta (no drafts, no sparse). */
export function sitemapEntries(): Entry[] {
  const concepts: Entry[] = KG.nodes
    .filter((n) => !n.draft && !isSparse(n.id))
    .map((n) => ({ path: `/atlas/${encodeURIComponent(n.id)}`, changefreq: "monthly", priority: 0.6 }));
  const pipelines: Entry[] = pipelineDiseases().map((d) => ({
    path: `/pipeline/${encodeURIComponent(d.node.id)}`,
    changefreq: "weekly",
    priority: 0.7,
  }));
  const mechanisms: Entry[] = CONTENT.lessons.map((l) => ({
    path: `/mechanism/${encodeURIComponent(l.id)}`,
    changefreq: "monthly",
    priority: 0.6,
  }));
  const seen = new Set<string>();
  return [...STATIC_SITEMAP, ...pipelines, ...mechanisms, ...concepts].filter((e) => !seen.has(e.path) && seen.add(e.path));
}

export function sitemapXml(entries = sitemapEntries()): string {
  const urls = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${escapeXml(absoluteUrl(e.path))}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority.toFixed(1)}</priority>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

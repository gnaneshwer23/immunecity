/**
 * Notify IndexNow (Bing + partners) of public indexable URLs.
 * Requires public/{key}.txt and INDEXNOW_KEY env (or public/indexnow-key.txt).
 * Never submit INTERNAL_TOOL_PATHS / noindex routes.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { STATIC_SITEMAP } from "../src/lib/sitemap";
import { isInternalToolPath } from "../src/lib/publicSurfaces";

const HOST = "www.immune-super-intelligence.co.uk";
const ORIGIN = `https://${HOST}`;

/** Hub pages only — keep the payload small; full sitemap is for Search Console. */
const URLS = STATIC_SITEMAP
  .filter((e) => !isInternalToolPath(e.path))
  .map((e) => (e.path === "/" ? `${ORIGIN}/` : `${ORIGIN}${e.path}`));

function loadKey(): string {
  if (process.env.INDEXNOW_KEY?.trim()) return process.env.INDEXNOW_KEY.trim();
  const path = join(process.cwd(), "public", "indexnow-key.txt");
  if (!existsSync(path)) throw new Error("Missing public/indexnow-key.txt");
  return readFileSync(path, "utf8").trim();
}

const key = loadKey();
const keyLocation = `${ORIGIN}/${key}.txt`;

const body = {
  host: HOST,
  key,
  keyLocation,
  urlList: URLS,
};

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

console.log("IndexNow status:", res.status, res.statusText);
const text = await res.text();
if (text) console.log(text.slice(0, 500));
if (!res.ok && res.status !== 202) process.exit(1);
console.log(`Submitted ${URLS.length} indexable hub URLs for ${HOST}`);

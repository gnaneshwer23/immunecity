/* Server-side Nature Immunology metadata connector (Crossref, no credentials).
   Validates input, retries once with backoff, times out at 5s and caches 6h. */
import { createServerFn } from "@tanstack/react-start";
import {
  DOI_RE,
  buildDoiUrl,
  parseDoiRecord,
  buildCrossrefUrl,
  librarySearchSchema,
  parseCrossrefPage,
  type LibraryPage,
} from "@/lib/research/crossref";

export type LibraryResult = { ok: true; page: LibraryPage } | { ok: false; error: string };

const cache = new Map<string, { at: number; value: LibraryPage }>();
const TTL = 6 * 60 * 60 * 1000;
const MAILTO = "collaborate@immune-super-intelligence.co.uk";

async function fetchWithRetry(url: string): Promise<Response> {
  let last: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": `ImmuneSuperIntelligence/1.0 (mailto:${MAILTO})` },
        signal: AbortSignal.timeout(5000),
      });
      if (res.status === 429 || res.status >= 500) {
        last = new Error(`Crossref responded ${res.status}`);
      } else {
        return res;
      }
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  throw last instanceof Error ? last : new Error("Crossref unavailable");
}

export const searchNatureImmunology = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => librarySearchSchema.parse(input ?? {}))
  .handler(async ({ data }): Promise<LibraryResult> => {
    const doiMatch = data.q.match(DOI_RE);
    const url = doiMatch ? buildDoiUrl(doiMatch[1]!, MAILTO) : buildCrossrefUrl(data, MAILTO);
    const key = `${url}|oa:${data.openAccessOnly}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL) return { ok: true, page: hit.value };
    try {
      const res = await fetchWithRetry(url);
      if (doiMatch && res.status === 404) return { ok: true, page: parseDoiRecord(null, new Date().toISOString()) };
      if (!res.ok) return { ok: false, error: `The metadata service rejected the search (${res.status}).` };
      const json = await res.json();
      const page = doiMatch ? parseDoiRecord(json, new Date().toISOString()) : parseCrossrefPage(json, data, new Date().toISOString());
      cache.set(key, { at: Date.now(), value: page });
      return { ok: true, page };
    } catch (e) {
      console.error("Nature Immunology lookup failed", e);
      return { ok: false, error: "The article metadata service is unreachable right now. Try again shortly." };
    }
  });

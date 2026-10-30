/**
 * External literature / trial registry adapters — interfaces + rate-limit + retries.
 * Live calls require env keys and fail closed. No fabricated PMIDs or hit counts.
 */

export type AdapterSearchResult = {
  attempted: true;
  /** null = unknown / incomplete — never coerce to zero. */
  hitCount: number | null;
  scopeNote: string;
  rateLimited?: boolean;
  /** Present only when the adapter returns real identifiers from a live API — never invented. */
  pmids?: string[];
  source: "stub" | "fixture" | "pubmed_live" | "europe_pmc_live" | "ctgov_live" | "fail_closed";
};

export interface LiteratureSearchAdapter {
  search(query: string, opts?: { since?: string; limit?: number }): Promise<AdapterSearchResult>;
}

export interface TrialRegistryAdapter {
  lookup(nctOrQuery: string): Promise<AdapterSearchResult>;
}

const DEFAULT_MIN_INTERVAL_MS = 1200;
const DEFAULT_RETRIES = 2;

/** Simple in-memory rate-limit hook for future live adapters. */
export function createRateLimitGate(minIntervalMs = DEFAULT_MIN_INTERVAL_MS) {
  let last = 0;
  return {
    async waitTurn(): Promise<{ waitedMs: number; rateLimited: boolean }> {
      const now = Date.now();
      const delta = now - last;
      if (delta < minIntervalMs) {
        const waitedMs = minIntervalMs - delta;
        await new Promise((r) => setTimeout(r, waitedMs));
        last = Date.now();
        return { waitedMs, rateLimited: true };
      }
      last = now;
      return { waitedMs: 0, rateLimited: false };
    },
  };
}

export async function withRetries<T>(
  fn: () => Promise<T>,
  opts?: { retries?: number; baseDelayMs?: number },
): Promise<T> {
  const retries = opts?.retries ?? DEFAULT_RETRIES;
  const base = opts?.baseDelayMs ?? 400;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      await new Promise((r) => setTimeout(r, base * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Adapter retry exhausted.");
}

/** Stub: records that a live search was not run. hitCount stays null (unknown). */
export const stubLiteratureSearchAdapter: LiteratureSearchAdapter = {
  async search(query: string) {
    return {
      attempted: true,
      hitCount: null,
      scopeNote: `Literature adapter stub — live PubMed ingest deferred. Query recorded (${query.slice(0, 80)}). Hit count unknown; not coerced to zero.`,
      rateLimited: false,
      source: "stub",
    };
  },
};

export const stubTrialRegistryAdapter: TrialRegistryAdapter = {
  async lookup(nctOrQuery: string) {
    return {
      attempted: true,
      hitCount: null,
      scopeNote: `Trial registry adapter stub — continuous CT.gov ingest deferred. Query recorded (${nctOrQuery.slice(0, 80)}). Hit count unknown.`,
      rateLimited: false,
      source: "stub",
    };
  },
};

/**
 * Fixture adapter for tests / offline monitor MVP.
 * Returns null hitCount (unknown) — never invents PMIDs.
 * Optional knownQueries may supply real counts only when explicitly provided by the caller.
 */
export function createFixtureLiteratureAdapter(opts?: {
  knownQueries?: Record<string, { hitCount: number | null; pmids?: string[] }>;
}): LiteratureSearchAdapter {
  const known = opts?.knownQueries ?? {};
  return {
    async search(query: string) {
      const hit = known[query];
      if (hit) {
        return {
          attempted: true,
          hitCount: hit.hitCount,
          pmids: hit.pmids,
          scopeNote: `Fixture adapter — explicit fixture for query (${query.slice(0, 80)}). Not a live PubMed result.`,
          rateLimited: false,
          source: "fixture",
        };
      }
      return {
        attempted: true,
        hitCount: null,
        scopeNote: `Fixture adapter — no fixture for query (${query.slice(0, 80)}). Hit count unknown; not coerced to zero. No PMIDs fabricated.`,
        rateLimited: false,
        source: "fixture",
      };
    },
  };
}

export type LiveAdapterEnv = {
  /** NCBI API key optional but recommended; absence still allows public E-utilities with stricter rate limits. */
  ncbiApiKey?: string | null;
  /** When false / unset, live PubMed path fails closed without calling the network. */
  enableLivePubmed?: boolean;
  enableLiveCtgov?: boolean;
};

/**
 * Live PubMed adapter — fail closed unless explicitly enabled.
 * Never invents PMIDs; only returns identifiers from the API response.
 */
export function createLivePubmedAdapter(env: LiveAdapterEnv = {}): LiteratureSearchAdapter {
  const gate = createRateLimitGate(env.ncbiApiKey ? 350 : 1200);
  return {
    async search(query: string, opts?: { since?: string; limit?: number }) {
      if (!env.enableLivePubmed) {
        return {
          attempted: true,
          hitCount: null,
          scopeNote:
            "Live PubMed adapter fail-closed — set DISCOVERY_LIVE_PUBMED=1 (and optional NCBI_API_KEY) to enable. Hit count unknown.",
          rateLimited: false,
          source: "fail_closed",
        };
      }
      const limit = Math.min(opts?.limit ?? 5, 20);
      const { rateLimited } = await gate.waitTurn();
      try {
        return await withRetries(async () => {
          const key = env.ncbiApiKey ? `&api_key=${encodeURIComponent(env.ncbiApiKey)}` : "";
          const term = opts?.since ? `(${query}) AND ("${opts.since}"[Date - Publication] : "3000"[Date - Publication])` : query;
          const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=${limit}&term=${encodeURIComponent(term)}${key}`;
          const res = await fetch(url, {
            headers: {
              "User-Agent": "ImmuneSuperIntelligence-DiscoveryMonitor/1.0 (mailto:curation@immune-city.app)",
            },
          });
          if (!res.ok) {
            throw new Error(`PubMed HTTP ${res.status}`);
          }
          const json = (await res.json()) as {
            esearchresult?: { count?: string; idlist?: string[] };
          };
          const countRaw = json.esearchresult?.count;
          const ids = json.esearchresult?.idlist ?? [];
          const hitCount =
            countRaw !== undefined && countRaw !== "" && Number.isFinite(Number(countRaw))
              ? Number(countRaw)
              : null;
          return {
            attempted: true as const,
            hitCount,
            pmids: ids.filter((id) => /^\d+$/.test(id)),
            scopeNote: `Live PubMed E-utilities search (${query.slice(0, 80)}). Count from API; not a scientific review.`,
            rateLimited,
            source: "pubmed_live" as const,
          };
        });
      } catch (err) {
        return {
          attempted: true,
          hitCount: null,
          scopeNote: `Live PubMed failed closed after retries: ${err instanceof Error ? err.message : "error"}. Hit count unknown.`,
          rateLimited,
          source: "fail_closed",
        };
      }
    },
  };
}

export function createLiveCtgovAdapter(env: LiveAdapterEnv = {}): TrialRegistryAdapter {
  const gate = createRateLimitGate(800);
  return {
    async lookup(nctOrQuery: string) {
      if (!env.enableLiveCtgov) {
        return {
          attempted: true,
          hitCount: null,
          scopeNote:
            "Live CT.gov adapter fail-closed — set DISCOVERY_LIVE_CTGOV=1 to enable. Hit count unknown.",
          rateLimited: false,
          source: "fail_closed",
        };
      }
      const { rateLimited } = await gate.waitTurn();
      try {
        return await withRetries(async () => {
          const q = encodeURIComponent(nctOrQuery);
          const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${q}&pageSize=5&countTotal=true`;
          const res = await fetch(url, {
            headers: {
              "User-Agent": "ImmuneSuperIntelligence-DiscoveryMonitor/1.0 (mailto:curation@immune-city.app)",
            },
          });
          if (!res.ok) throw new Error(`CT.gov HTTP ${res.status}`);
          const json = (await res.json()) as { totalCount?: number };
          const hitCount =
            typeof json.totalCount === "number" && Number.isFinite(json.totalCount)
              ? json.totalCount
              : null;
          return {
            attempted: true as const,
            hitCount,
            scopeNote: `Live CT.gov API v2 lookup (${nctOrQuery.slice(0, 80)}). Not a scientific review.`,
            rateLimited,
            source: "ctgov_live" as const,
          };
        });
      } catch (err) {
        return {
          attempted: true,
          hitCount: null,
          scopeNote: `Live CT.gov failed closed: ${err instanceof Error ? err.message : "error"}. Hit count unknown.`,
          rateLimited,
          source: "fail_closed",
        };
      }
    },
  };
}

/** Resolve adapters for a monitor run from process env (cron / server). */
export function resolveMonitorAdapters(env: NodeJS.ProcessEnv = process.env): {
  literature: LiteratureSearchAdapter;
  trials: TrialRegistryAdapter;
  mode: "stub" | "live_partial" | "live";
} {
  const livePubmed = env.DISCOVERY_LIVE_PUBMED === "1" || env.DISCOVERY_LIVE_PUBMED === "true";
  const liveCtgov = env.DISCOVERY_LIVE_CTGOV === "1" || env.DISCOVERY_LIVE_CTGOV === "true";
  const literature = livePubmed
    ? createLivePubmedAdapter({
        enableLivePubmed: true,
        ncbiApiKey: env.NCBI_API_KEY ?? env.PUBMED_API_KEY ?? null,
      })
    : stubLiteratureSearchAdapter;
  const trials = liveCtgov
    ? createLiveCtgovAdapter({ enableLiveCtgov: true })
    : stubTrialRegistryAdapter;
  const mode = livePubmed && liveCtgov ? "live" : livePubmed || liveCtgov ? "live_partial" : "stub";
  return { literature, trials, mode };
}

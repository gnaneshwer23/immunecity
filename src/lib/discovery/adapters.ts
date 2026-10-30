/**
 * External literature / trial registry adapters — interfaces + rate-limit stubs.
 * Continuous PubMed / CT.gov ingestion is deferred. No fabricated hit counts.
 */

export type AdapterSearchResult = {
  attempted: true;
  /** null = unknown / incomplete — never coerce to zero. */
  hitCount: number | null;
  scopeNote: string;
  rateLimited?: boolean;
};

export interface LiteratureSearchAdapter {
  search(query: string, opts?: { since?: string; limit?: number }): Promise<AdapterSearchResult>;
}

export interface TrialRegistryAdapter {
  lookup(nctOrQuery: string): Promise<AdapterSearchResult>;
}

const DEFAULT_MIN_INTERVAL_MS = 1200;

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

/** Stub: records that a live search was not run. hitCount stays null (unknown). */
export const stubLiteratureSearchAdapter: LiteratureSearchAdapter = {
  async search(query: string) {
    return {
      attempted: true,
      hitCount: null,
      scopeNote: `Literature adapter stub — live PubMed ingest deferred. Query recorded (${query.slice(0, 80)}). Hit count unknown; not coerced to zero.`,
      rateLimited: false,
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
    };
  },
};

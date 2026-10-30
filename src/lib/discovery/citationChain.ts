/**
 * Bounded citation-chaining + new-evidence monitor hook activation.
 * Safe, idempotent, no unbounded scrape; never invents PMIDs; no prod cron schedule.
 */
import type { LiteratureSearchAdapter } from "@/lib/discovery/adapters";
import { stubLiteratureSearchAdapter, createFixtureLiteratureAdapter } from "@/lib/discovery/adapters";
import { validatePmid } from "@/lib/discovery/retrieve";

export const CITATION_CHAIN_POLICY = {
  version: "1.0.0" as const,
  maxSeedPmids: 8,
  maxRelatedPerSeed: 3,
  maxTotalRelated: 12,
  autoScheduleCron: false as const,
  inventsPmids: false as const,
  unboundedScraping: false as const,
  liveRequiresEnv: "DISCOVERY_LIVE_CITATION_CHAIN" as const,
  note: "Citation chaining is opt-in per run. Prod schedule stays off.",
} as const;

export const MONITOR_HOOK_POLICY = {
  autoScheduleCron: false as const,
  autoScientificReview: false as const,
  note: "Monitor hooks may activate for a scout run fingerprint; cron is never auto-enabled here.",
} as const;

export type CitationChainHop = {
  seedPmid: string;
  relatedPmids: string[];
  hitCount: number | null;
  scopeNote: string;
};

export type CitationChainReport = {
  enabled: true;
  gapKey: string;
  idempotencyKey: string;
  seedPmids: string[];
  hops: CitationChainHop[];
  relatedPmids: string[];
  inventedStudies: false;
  unbounded: false;
  scheduledCron: false;
  replay: boolean;
  scopeNote: string;
};

export type MonitorHookActivation = {
  enabled: true;
  gapKey: string;
  fingerprint: string;
  scheduledCron: false;
  scientificReviewImplied: false;
  reason: string;
};

function hashLite(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

/** Stable idempotency for seed set + budgets. */
export function citationChainIdempotencyKey(gapKey: string, seedPmids: string[]): string {
  const seeds = normalizeSeeds(seedPmids).join(",");
  return `citechain:v1:${gapKey}:${CITATION_CHAIN_POLICY.maxSeedPmids}:${CITATION_CHAIN_POLICY.maxTotalRelated}:${hashLite(seeds)}`;
}

export function normalizeSeeds(seedPmids: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of seedPmids) {
    const pmid = validatePmid(raw);
    if (!pmid || seen.has(pmid)) continue;
    seen.add(pmid);
    out.push(pmid);
    if (out.length >= CITATION_CHAIN_POLICY.maxSeedPmids) break;
  }
  return out;
}

function liveCitationChainEnabled(): boolean {
  return process.env.DISCOVERY_LIVE_CITATION_CHAIN === "1";
}

/**
 * Run bounded citation chaining from seed PMIDs.
 * Default: stub/fixture only (no network). Live adapter only when DISCOVERY_LIVE_CITATION_CHAIN=1
 * and a live adapter is supplied by the caller — still capped.
 */
export async function runBoundedCitationChain(input: {
  gapKey: string;
  seedPmids: readonly string[];
  priorIdempotencyKey?: string | null;
  adapter?: LiteratureSearchAdapter;
  /** Explicit related fixtures keyed by `related-to:<pmid>` query — never invented. */
  relatedFixtures?: Record<string, { hitCount: number | null; pmids?: string[] }>;
}): Promise<CitationChainReport> {
  const seedPmids = normalizeSeeds(input.seedPmids);
  const idempotencyKey = citationChainIdempotencyKey(input.gapKey, seedPmids);

  if (input.priorIdempotencyKey && input.priorIdempotencyKey === idempotencyKey) {
    return {
      enabled: true,
      gapKey: input.gapKey,
      idempotencyKey,
      seedPmids,
      hops: [],
      relatedPmids: [],
      inventedStudies: false,
      unbounded: false,
      scheduledCron: false,
      replay: true,
      scopeNote: "Idempotent citation-chain replay — identical seeds/budget; network skipped.",
    };
  }

  const adapter =
    input.adapter ??
    (input.relatedFixtures
      ? createFixtureLiteratureAdapter({ knownQueries: input.relatedFixtures })
      : stubLiteratureSearchAdapter);

  // Live flag alone does not invent an adapter — stay fail-closed without caller adapter.
  void liveCitationChainEnabled();

  const hops: CitationChainHop[] = [];
  const related: string[] = [];
  const seenRelated = new Set<string>(seedPmids);

  for (const seed of seedPmids) {
    if (related.length >= CITATION_CHAIN_POLICY.maxTotalRelated) break;
    const query = `related-to:${seed}`;
    const result = await adapter.search(query, {
      limit: CITATION_CHAIN_POLICY.maxRelatedPerSeed,
    });
    const pmids = (result.pmids ?? [])
      .map((p) => validatePmid(p))
      .filter((p): p is string => Boolean(p) && !seenRelated.has(p))
      .slice(0, CITATION_CHAIN_POLICY.maxRelatedPerSeed);

    for (const p of pmids) {
      if (related.length >= CITATION_CHAIN_POLICY.maxTotalRelated) break;
      seenRelated.add(p);
      related.push(p);
    }

    hops.push({
      seedPmid: seed,
      relatedPmids: pmids,
      hitCount: result.hitCount,
      scopeNote: result.scopeNote,
    });
  }

  return {
    enabled: true,
    gapKey: input.gapKey,
    idempotencyKey,
    seedPmids,
    hops,
    relatedPmids: related,
    inventedStudies: false,
    unbounded: false,
    scheduledCron: false,
    replay: false,
    scopeNote: [
      `Bounded citation chain for ${input.gapKey}: seeds=${seedPmids.length}, related=${related.length}.`,
      CITATION_CHAIN_POLICY.note,
      liveCitationChainEnabled()
        ? "DISCOVERY_LIVE_CITATION_CHAIN=1 noted — still uses caller/stub adapters only."
        : "Live citation chain flag off — stub/fixture path.",
    ].join(" "),
  };
}

/** Activate a new-evidence monitor hook fingerprint without scheduling cron. */
export function activateNewEvidenceMonitorHook(input: {
  gapKey: string;
  seedPmids?: readonly string[];
  scoutIdempotencyKey?: string;
}): MonitorHookActivation {
  const seeds = normalizeSeeds(input.seedPmids ?? []);
  const fingerprint = `monitor-hook:v1:${input.gapKey}:${input.scoutIdempotencyKey ?? "none"}:${hashLite(seeds.join(","))}`;
  return {
    enabled: true,
    gapKey: input.gapKey,
    fingerprint,
    scheduledCron: false,
    scientificReviewImplied: false,
    reason: MONITOR_HOOK_POLICY.note,
  };
}

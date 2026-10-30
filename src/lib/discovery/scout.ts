/**
 * Evidence Intel 4.0 — Literature Scout.
 * Orchestrates existing adapters/retrieve into reproducible strategies.
 * Never invents PMIDs; fail-closed without live flags; budgets + idempotency.
 */
import {
  createRateLimitGate,
  withRetries,
  type AdapterSearchResult,
  type LiteratureSearchAdapter,
  type TrialRegistryAdapter,
} from "@/lib/discovery/adapters";
import {
  planRetrievalQueries,
  resolveRetrievalAdapters,
  runBoundedRetrieval,
  validateDoi,
  validateNct,
  validatePmid,
  type RetrievedWork,
  type RetrievalQueryPlan,
  type RetrievalRunReport,
} from "@/lib/discovery/retrieve";
import {
  activateNewEvidenceMonitorHook,
  runBoundedCitationChain,
  type CitationChainReport,
  type MonitorHookActivation,
} from "@/lib/discovery/citationChain";
import type { ResearchGapCandidate } from "@/lib/discovery/types";

export const SCOUT_POLICY = {
  fabricatesIdentifiers: false as const,
  unboundedScraping: false as const,
  autoGateC: false as const,
  requiresLiveFlags: true as const,
  /** Hooks may activate per-run; prod cron stays off. */
  autoScheduleHooks: false as const,
  defaultBudget: {
    maxQueries: 9,
    maxWorksPerCorpus: 20,
    maxTotalWorks: 40,
    maxWallMs: 120_000,
  },
} as const;

export type ScoutCorpus = "pubmed" | "europe_pmc" | "ctgov";

export type ScoutStrategy = {
  strategyId: string;
  gapKey: string;
  /** Reproducible query strings — same inputs → same strategies. */
  queries: Array<{ corpus: ScoutCorpus; query: string; rationale: string }>;
  synonymsExpanded: string[];
  entityIds: string[];
  /** Licensing / reuse note for downstream consumers. */
  licensingNote: string;
  provenance: {
    planner: "planRetrievalQueries" | "custom";
    seedTerms: string[];
    createdAt: string;
  };
};

export type ScoutWork = RetrievedWork & {
  strategyId: string;
  corpus: ScoutCorpus | "unknown";
  dedupeKey: string;
};

export type ScoutCoverage = {
  corporaAttempted: ScoutCorpus[];
  corporaSucceeded: ScoutCorpus[];
  corporaFailed: ScoutCorpus[];
  hitCountKnown: boolean;
  /** null when any failure or stub — never coerced to 0 as "no evidence". */
  totalHits: number | null;
  scopeNote: string;
};

export type ScoutRunReport = {
  strategyId: string;
  gapKey: string;
  idempotencyKey: string;
  works: ScoutWork[];
  coverage: ScoutCoverage;
  retrieval: RetrievalRunReport | null;
  adapterResults: Array<{ corpus: ScoutCorpus; result: AdapterSearchResult }>;
  budget: typeof SCOUT_POLICY.defaultBudget & { queriesRun: number; wallMs: number };
  /**
   * Monitor / citation-chaining hooks.
   * When activateHooks=true on a run, hooks enable for that run only — never schedules prod cron.
   */
  hooks: {
    newEvidenceMonitor:
      | { enabled: false; reason: string }
      | (MonitorHookActivation & { reason: string });
    citationChaining:
      | { enabled: false; reason: string; seedPmids: string[] }
      | {
          enabled: true;
          reason: string;
          seedPmids: string[];
          chain: CitationChainReport;
          scheduledCron: false;
        };
  };
  inventedStudies: false;
  provenance: Record<string, unknown>;
};

export type ScoutBudget = {
  maxQueries?: number;
  maxWorksPerCorpus?: number;
  maxTotalWorks?: number;
  maxWallMs?: number;
};

function stripInjection(raw: string): string {
  // Prompt-injection hygiene for query strings that may later feed LLMs.
  return raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\b(ignore|disregard)\s+(all|previous|above)\s+instructions?\b/gi, " ")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

/** Expand synonyms deterministically — graph/pilot aliases only, capped. */
export function expandSynonyms(
  seed: readonly string[],
  extras?: readonly string[],
  cap = 16,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of [...seed, ...(extras ?? [])]) {
    const n = stripInjection(s).toLowerCase();
    if (n.length < 2 || seen.has(n)) continue;
    seen.add(n);
    out.push(stripInjection(s));
    // Lightweight morphological variants — not invented scientific terms.
    if (/\bnull\b/i.test(s) && !seen.has(n.replace(/\s*null\s*/i, "-null"))) {
      const v = s.replace(/\s*null\b/i, "-null");
      const vn = v.toLowerCase();
      if (!seen.has(vn)) {
        seen.add(vn);
        out.push(v);
      }
    }
    if (out.length >= cap) break;
  }
  return out.slice(0, cap);
}

export function scoutDedupeKey(w: Pick<RetrievedWork, "pmid" | "doi" | "nctId" | "title">): string {
  const pmid = validatePmid(w.pmid);
  if (pmid) return `pmid:${pmid}`;
  const doi = validateDoi(w.doi);
  if (doi) return `doi:${doi.toLowerCase()}`;
  const nct = validateNct(w.nctId);
  if (nct) return `nct:${nct}`;
  if (w.title?.trim()) return `title:${w.title.trim().slice(0, 80).toLowerCase()}`;
  return "unknown:missing-identifier";
}

/** Stable idempotency key for a strategy + budget snapshot. */
export function scoutIdempotencyKey(strategy: ScoutStrategy, budget: Required<ScoutBudget>): string {
  const q = strategy.queries.map((x) => `${x.corpus}:${x.query}`).join("|");
  return `scout:v1:${strategy.gapKey}:${strategy.strategyId}:${budget.maxQueries}:${budget.maxTotalWorks}:${hashLite(q)}`;
}

function hashLite(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

/**
 * Build a reproducible scout strategy from a gap (+ optional focused queries).
 * Reuses `planRetrievalQueries` when custom queries are not supplied.
 */
export function buildScoutStrategy(input: {
  gap: Pick<ResearchGapCandidate, "gapKey" | "pilot" | "subjectId" | "objectId" | "title">;
  strategyId?: string;
  interests?: string[];
  profileDiseases?: string[];
  /** Focused corpus queries (appraisal sprint style) — preferred when present. */
  focusedQueries?: Array<{ corpus: ScoutCorpus; query: string; rationale?: string }>;
  extraSynonyms?: string[];
  nowIso?: string;
}): ScoutStrategy {
  const plan: RetrievalQueryPlan = planRetrievalQueries(input.gap, {
    interests: input.interests,
    profileDiseases: input.profileDiseases,
  });
  const synonymsExpanded = expandSynonyms(plan.synonyms, input.extraSynonyms);
  const strategyId = input.strategyId ?? `scout-${input.gap.gapKey}`;
  const queries =
    input.focusedQueries?.map((q) => ({
      corpus: q.corpus,
      query: stripInjection(q.query),
      rationale: q.rationale ?? "Focused question query (documented scope).",
    })) ??
    plan.queries.map((q) => ({
      corpus: q.corpus,
      query: stripInjection(q.query),
      rationale: "Deterministic pilot plan from planRetrievalQueries.",
    }));

  return {
    strategyId,
    gapKey: input.gap.gapKey,
    queries,
    synonymsExpanded,
    entityIds: plan.entityIds,
    licensingNote:
      "PubMed/NCBI E-utilities and Europe PMC: follow provider ToS; store identifiers + abstracts for internal curation only. ClinicalTrials.gov: public registry data. Do not redistribute bulk scrapes. Full-text OA only when license permits.",
    provenance: {
      planner: input.focusedQueries ? "custom" : "planRetrievalQueries",
      seedTerms: synonymsExpanded.slice(0, 8),
      createdAt: input.nowIso ?? new Date().toISOString(),
    },
  };
}

function resolveBudget(b?: ScoutBudget): Required<ScoutBudget> {
  return {
    maxQueries: b?.maxQueries ?? SCOUT_POLICY.defaultBudget.maxQueries,
    maxWorksPerCorpus: b?.maxWorksPerCorpus ?? SCOUT_POLICY.defaultBudget.maxWorksPerCorpus,
    maxTotalWorks: b?.maxTotalWorks ?? SCOUT_POLICY.defaultBudget.maxTotalWorks,
    maxWallMs: b?.maxWallMs ?? SCOUT_POLICY.defaultBudget.maxWallMs,
  };
}

/**
 * Run scout for one strategy. Reuses runBoundedRetrieval when using default adapters.
 * Idempotent: same strategy + budget → same idempotencyKey (caller may short-circuit).
 */
export async function runLiteratureScout(input: {
  strategy: ScoutStrategy;
  budget?: ScoutBudget;
  /** When provided, skip resolveRetrievalAdapters (tests). */
  adapters?: {
    pubmed: LiteratureSearchAdapter;
    europePmc: LiteratureSearchAdapter;
    ctgov: TrialRegistryAdapter;
  };
  /** Prior run key — if matches, return empty replay marker without network. */
  priorIdempotencyKey?: string | null;
  dryRun?: boolean;
  /**
   * When true, activate bounded citation-chain + monitor fingerprint for this run.
   * Idempotent; never schedules prod cron; never invents PMIDs.
   */
  activateHooks?: boolean;
  /** Optional fixture map for citation-chain related-to queries (tests / offline). */
  citationRelatedFixtures?: Record<string, { hitCount: number | null; pmids?: string[] }>;
  priorCitationIdempotencyKey?: string | null;
}): Promise<ScoutRunReport> {
  const budget = resolveBudget(input.budget);
  const idempotencyKey = scoutIdempotencyKey(input.strategy, budget);
  const started = Date.now();

  if (input.priorIdempotencyKey && input.priorIdempotencyKey === idempotencyKey) {
    return {
      strategyId: input.strategy.strategyId,
      gapKey: input.strategy.gapKey,
      idempotencyKey,
      works: [],
      coverage: {
        corporaAttempted: [],
        corporaSucceeded: [],
        corporaFailed: [],
        hitCountKnown: false,
        totalHits: null,
        scopeNote: "Idempotent replay — identical strategy/budget already run; network skipped.",
      },
      retrieval: null,
      adapterResults: [],
      budget: { ...budget, queriesRun: 0, wallMs: Date.now() - started },
      hooks: {
        newEvidenceMonitor: {
          enabled: false,
          reason: "Monitor hook recorded only — cron not auto-enabled.",
        },
        citationChaining: {
          enabled: false,
          reason: "Citation chaining hook only — not executed in this run.",
          seedPmids: [],
        },
      },
      inventedStudies: false,
      provenance: { replay: true, strategy: input.strategy.provenance },
    };
  }

  if (input.dryRun) {
    let dryHooks: ScoutRunReport["hooks"] = {
      newEvidenceMonitor: {
        enabled: false,
        reason: "Monitor hook recorded only — cron not auto-enabled.",
      },
      citationChaining: {
        enabled: false,
        reason: "Citation chaining hook only — not executed in this run.",
        seedPmids: [],
      },
    };
    if (input.activateHooks) {
      const monitor = activateNewEvidenceMonitorHook({
        gapKey: input.strategy.gapKey,
        seedPmids: [],
        scoutIdempotencyKey: idempotencyKey,
      });
      const chain = await runBoundedCitationChain({
        gapKey: input.strategy.gapKey,
        seedPmids: [],
        priorIdempotencyKey: input.priorCitationIdempotencyKey,
        relatedFixtures: input.citationRelatedFixtures,
      });
      dryHooks = {
        newEvidenceMonitor: { ...monitor, reason: monitor.reason },
        citationChaining: {
          enabled: true,
          reason: "Dry-run bounded citation chain activated — no seeds; prod cron not scheduled.",
          seedPmids: chain.seedPmids,
          chain,
          scheduledCron: false,
        },
      };
    }
    return {
      strategyId: input.strategy.strategyId,
      gapKey: input.strategy.gapKey,
      idempotencyKey,
      works: [],
      coverage: {
        corporaAttempted: input.strategy.queries.map((q) => q.corpus),
        corporaSucceeded: [],
        corporaFailed: [],
        hitCountKnown: false,
        totalHits: null,
        scopeNote: "Dry-run scout — no network. Hit counts unknown (not zero).",
      },
      retrieval: null,
      adapterResults: [],
      budget: { ...budget, queriesRun: 0, wallMs: Date.now() - started },
      hooks: dryHooks,
      inventedStudies: false,
      provenance: {
        dryRun: true,
        strategy: input.strategy.provenance,
        licensing: input.strategy.licensingNote,
        hooksActivated: Boolean(input.activateHooks),
      },
    };
  }

  const resolved = input.adapters
    ? {
        pubmed: input.adapters.pubmed,
        europePmc: input.adapters.europePmc,
        trials: input.adapters.ctgov,
        mode: "stub" as const,
      }
    : resolveRetrievalAdapters();

  const plan: RetrievalQueryPlan = {
    gapKey: input.strategy.gapKey,
    pilot: "custom",
    entityIds: input.strategy.entityIds,
    synonyms: input.strategy.synonymsExpanded,
    queries: input.strategy.queries
      .slice(0, budget.maxQueries)
      .map((q) => ({ corpus: q.corpus, query: q.query })),
  };

  // Prefer shared bounded retrieval for consistent validation/dedupe.
  const retrieval = await runBoundedRetrieval(plan, resolved, {
    limitPerQuery: budget.maxWorksPerCorpus,
  });

  const byKey = new Map<string, ScoutWork>();
  for (const w of retrieval.works) {
    const key = scoutDedupeKey(w);
    if (byKey.has(key)) continue;
    if (byKey.size >= budget.maxTotalWorks) break;
    const corpus: ScoutCorpus | "unknown" =
      w.source === "pubmed" || w.source === "europe_pmc" || w.source === "ctgov"
        ? w.source
        : "unknown";
    byKey.set(key, {
      ...w,
      strategyId: input.strategy.strategyId,
      corpus,
      dedupeKey: key,
    });
  }

  const corporaAttempted = [...new Set(input.strategy.queries.map((q) => q.corpus))];
  const corporaFailed: ScoutCorpus[] = retrieval.failedQueries > 0 ? [...corporaAttempted] : [];
  const corporaSucceeded: ScoutCorpus[] =
    retrieval.failedQueries === 0 && retrieval.found > 0 ? [...corporaAttempted] : [];

  const seedPmids = [...byKey.values()].map((w) => w.pmid).filter(Boolean) as string[];

  let hooks: ScoutRunReport["hooks"] = {
    newEvidenceMonitor: {
      enabled: false,
      reason: "New-evidence monitor hook available for Phase 6 monitor — not auto-scheduled.",
    },
    citationChaining: {
      enabled: false,
      reason: "Citation chaining deferred — seed PMIDs recorded for future bounded runs only.",
      seedPmids: seedPmids.slice(0, 12),
    },
  };

  if (input.activateHooks) {
    const monitor = activateNewEvidenceMonitorHook({
      gapKey: input.strategy.gapKey,
      seedPmids,
      scoutIdempotencyKey: idempotencyKey,
    });
    const chain = await runBoundedCitationChain({
      gapKey: input.strategy.gapKey,
      seedPmids,
      priorIdempotencyKey: input.priorCitationIdempotencyKey,
      relatedFixtures: input.citationRelatedFixtures,
    });
    hooks = {
      newEvidenceMonitor: {
        ...monitor,
        reason: monitor.reason,
      },
      citationChaining: {
        enabled: true,
        reason:
          "Bounded citation chaining activated for this scout run — capped seeds/related; prod cron not scheduled.",
        seedPmids: chain.seedPmids,
        chain,
        scheduledCron: false,
      },
    };
  }

  return {
    strategyId: input.strategy.strategyId,
    gapKey: input.strategy.gapKey,
    idempotencyKey,
    works: [...byKey.values()],
    coverage: {
      corporaAttempted,
      corporaSucceeded,
      corporaFailed,
      hitCountKnown: retrieval.hitCountKnown,
      totalHits: retrieval.hitCountKnown ? retrieval.found : null,
      scopeNote: [
        retrieval.scopeNote,
        input.strategy.licensingNote,
        `Synonyms expanded (${input.strategy.synonymsExpanded.length}): ${input.strategy.synonymsExpanded.slice(0, 6).join(", ")}`,
      ].join(" "),
    },
    retrieval,
    adapterResults: [],
    budget: {
      ...budget,
      queriesRun: Math.min(input.strategy.queries.length, budget.maxQueries),
      wallMs: Date.now() - started,
    },
    hooks,
    inventedStudies: false,
    provenance: {
      strategy: input.strategy.provenance,
      licensing: input.strategy.licensingNote,
      rateLimit: "createRateLimitGate / withRetries via adapters",
      idempotencyKey,
      hooksActivated: Boolean(input.activateHooks),
    },
  };
}

/** Test helper — fixture scout without network. */
export async function runFixtureScout(input: {
  strategy: ScoutStrategy;
  works: RetrievedWork[];
}): Promise<ScoutRunReport> {
  const budget = resolveBudget();
  const idempotencyKey = scoutIdempotencyKey(input.strategy, budget);
  const works: ScoutWork[] = [];
  const seen = new Set<string>();
  for (const w of input.works) {
    const key = scoutDedupeKey(w);
    if (seen.has(key)) continue;
    seen.add(key);
    works.push({
      ...w,
      strategyId: input.strategy.strategyId,
      corpus: w.source === "pubmed" || w.source === "europe_pmc" || w.source === "ctgov" ? w.source : "unknown",
      dedupeKey: key,
    });
  }
  return {
    strategyId: input.strategy.strategyId,
    gapKey: input.strategy.gapKey,
    idempotencyKey,
    works,
    coverage: {
      corporaAttempted: ["pubmed", "europe_pmc"],
      corporaSucceeded: ["pubmed"],
      corporaFailed: [],
      hitCountKnown: true,
      totalHits: works.length,
      scopeNote: "Fixture scout — explicit caller-supplied works only. No invented identifiers.",
    },
    retrieval: null,
    adapterResults: [],
    budget: { ...budget, queriesRun: 0, wallMs: 0 },
    hooks: {
      newEvidenceMonitor: { enabled: false, reason: "Fixture — monitor not enabled." },
      citationChaining: { enabled: false, reason: "Fixture — chaining not enabled.", seedPmids: [] },
    },
    inventedStudies: false,
    provenance: { fixture: true },
  };
}

export { createRateLimitGate, withRetries };

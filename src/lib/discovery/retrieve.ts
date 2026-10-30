/**
 * Discovery 3.0 — bounded scientific retrieval (PubMed, Europe PMC, CT.gov).
 * Real requests only when live flags set. Never invent PMIDs/DOIs/NCT IDs.
 * Failed queries → null / fail_closed — never zero evidence.
 */
import { byId } from "@/lib/immune/engine";
import {
  createLiveCtgovAdapter,
  createLivePubmedAdapter,
  createRateLimitGate,
  stubLiteratureSearchAdapter,
  stubTrialRegistryAdapter,
  withRetries,
  type AdapterSearchResult,
  type LiteratureSearchAdapter,
  type TrialRegistryAdapter,
} from "@/lib/discovery/adapters";
import type { ResearchGapCandidate } from "@/lib/discovery/types";

export const RETRIEVAL_POLICY = {
  fabricatesIdentifiers: false as const,
  failedQueryMeansZeroEvidence: false as const,
  boundedPilotsOnly: true as const,
  autoGateC: false as const,
} as const;

const PMID_RE = /^\d{1,8}$/;
const DOI_RE = /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i;
const NCT_RE = /^NCT\d{8}$/i;

export function validatePmid(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = String(raw).trim();
  return PMID_RE.test(v) ? v : null;
}

export function validateDoi(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = String(raw).trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  return DOI_RE.test(v) ? v : null;
}

export function validateNct(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = String(raw).trim().toUpperCase();
  return NCT_RE.test(v) ? v : null;
}

export type RetrievedWork = {
  pmid: string | null;
  doi: string | null;
  nctId: string | null;
  title: string | null;
  source: "pubmed" | "europe_pmc" | "ctgov" | "unknown";
  abstractAvailable: boolean | null;
  fullTextAvailable: boolean | null;
  year: string | null;
  excluded: boolean;
  exclusionReason: string | null;
  provenance: Record<string, unknown>;
};

export type RetrievalQueryPlan = {
  gapKey: string;
  pilot: "melanoma_a" | "coverage_b" | "custom";
  queries: Array<{ corpus: "pubmed" | "europe_pmc" | "ctgov"; query: string }>;
  entityIds: string[];
  synonyms: string[];
};

export type RetrievalRunReport = {
  gapKey: string;
  pilot: string;
  found: number;
  /**
   * @deprecated Prefer identifierValidated — historically counted structural ID checks only,
   * not scientific appraisal (see appraise.ts).
   */
  assessed: number;
  /** Structural PMID/DOI/NCT validation count — ≠ scientific appraisal. */
  identifierValidated: number;
  /** Filled only when a per-question scientific appraisal pass ran. */
  scientificallyAppraised: number;
  linked: number;
  excluded: number;
  failedQueries: number;
  /** null hit totals when queries failed — never coerced to 0 as "no evidence". */
  hitCountKnown: boolean;
  works: RetrievedWork[];
  scopeNote: string;
  inventedStudies: false;
};

/** Controlled synonyms for bounded pilots — graph names + documented aliases only. */
export const PILOT_A_TERMS = {
  id: "melanoma_a" as const,
  themes: [
    "melanoma",
    "checkpoint resistance",
    "antigen presentation",
    "T-cell exhaustion",
  ],
  entityIds: ["D012", "R011", "I008", "I009", "I025", "TR003", "TR020"] as const,
  synonyms: [
    "metastatic melanoma",
    "PD-1 resistance",
    "PD-L1",
    "MHC class I",
    "antigen processing",
    "exhausted T cells",
    "TIM-3",
    "LAG-3",
  ],
};

export const PILOT_B_TERMS = {
  id: "coverage_b" as const,
  themes: ["CD28-null", "rheumatoid arthritis", "systemic sclerosis", "immune ageing"],
  entityIds: ["D012", "R011", "R012", "I008", "B011"] as const,
  synonyms: [
    "CD28null",
    "CD28 null T cells",
    "rheumatoid arthritis",
    "systemic sclerosis",
    "scleroderma",
    "immunosenescence",
    "immune aging",
  ],
};

function entityNames(ids: readonly string[]): string[] {
  return ids.map((id) => byId[id]?.name ?? id).filter(Boolean);
}

/** Build deterministic query plans from gap + pilot profile interests. */
export function planRetrievalQueries(
  gap: Pick<ResearchGapCandidate, "gapKey" | "pilot" | "subjectId" | "objectId" | "title">,
  opts?: { interests?: string[]; profileDiseases?: string[] },
): RetrievalQueryPlan {
  const pilot =
    gap.pilot === "melanoma_a" ? "melanoma_a" : gap.pilot === "coverage_b" ? "coverage_b" : "custom";
  const terms = pilot === "melanoma_a" ? PILOT_A_TERMS : pilot === "coverage_b" ? PILOT_B_TERMS : null;
  const entityIds = [
    ...(gap.subjectId ? [gap.subjectId] : []),
    ...(gap.objectId ? [gap.objectId] : []),
    ...(terms?.entityIds ?? []),
  ];
  const uniqIds = [...new Set(entityIds)];
  const names = entityNames(uniqIds);
  const synonyms = [
    ...(terms?.synonyms ?? []),
    ...(opts?.interests ?? []),
    ...(opts?.profileDiseases ?? []),
  ].slice(0, 12);
  const core = [
    ...names.slice(0, 3),
    ...(terms?.themes.slice(0, 2) ?? []),
    gap.title.slice(0, 60),
  ]
    .filter(Boolean)
    .join(" OR ");
  const pubmedQ = `(${core}) AND (immunology OR immune OR checkpoint OR exhaustion)`;
  const epmcQ = `${names[0] ?? "immune"} AND (${(terms?.themes ?? ["immunology"]).join(" OR ")})`;
  const ctgovQ = names[0] ?? terms?.themes[0] ?? "melanoma";
  return {
    gapKey: gap.gapKey,
    pilot,
    entityIds: uniqIds,
    synonyms,
    queries: [
      { corpus: "pubmed", query: pubmedQ },
      { corpus: "europe_pmc", query: epmcQ },
      { corpus: "ctgov", query: ctgovQ },
    ],
  };
}

export type EuropePmcHit = {
  pmid: string | null;
  doi: string | null;
  title: string | null;
  hasAbstract: boolean | null;
  isOpenAccess: boolean | null;
};

/**
 * Europe PMC adapter — fail closed unless enabled.
 * Returns real identifiers from API only.
 */
export function createLiveEuropePmcAdapter(env: {
  enableLiveEuropePmc?: boolean;
}): LiteratureSearchAdapter & {
  searchDetailed?: (query: string, opts?: { limit?: number }) => Promise<{
    result: AdapterSearchResult;
    hits: EuropePmcHit[];
  }>;
} {
  const gate = createRateLimitGate(400);
  const searchDetailed = async (query: string, opts?: { limit?: number }) => {
    if (!env.enableLiveEuropePmc) {
      return {
        result: {
          attempted: true as const,
          hitCount: null,
          scopeNote:
            "Live Europe PMC fail-closed — set DISCOVERY_LIVE_EUROPE_PMC=1 to enable. Hit count unknown.",
          rateLimited: false,
          source: "fail_closed" as const,
        },
        hits: [] as EuropePmcHit[],
      };
    }
    const limit = Math.min(opts?.limit ?? 5, 20);
    const { rateLimited } = await gate.waitTurn();
    try {
      const payload = await withRetries(async () => {
        const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&format=json&pageSize=${limit}&resultType=core`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "ImmuneSuperIntelligence-DiscoveryRetrieve/1.0 (mailto:curation@immune-city.app)",
          },
        });
        if (!res.ok) throw new Error(`Europe PMC HTTP ${res.status}`);
        return (await res.json()) as {
          hitCount?: number;
          resultList?: {
            result?: Array<{
              pmid?: string;
              doi?: string;
              title?: string;
              abstractText?: string;
              isOpenAccess?: string;
            }>;
          };
        };
      });
      const rawHits = payload.resultList?.result ?? [];
      const hits: EuropePmcHit[] = rawHits.map((r) => ({
        pmid: validatePmid(r.pmid ?? null),
        doi: validateDoi(r.doi ?? null),
        title: r.title ?? null,
        hasAbstract: Boolean(r.abstractText),
        isOpenAccess: r.isOpenAccess === "Y" || r.isOpenAccess === "true",
      }));
      const pmids = hits.map((h) => h.pmid).filter(Boolean) as string[];
      const hitCount =
        typeof payload.hitCount === "number" && Number.isFinite(payload.hitCount)
          ? payload.hitCount
          : null;
      return {
        result: {
          attempted: true as const,
          hitCount,
          pmids,
          scopeNote: `Live Europe PMC search (${query.slice(0, 80)}). Not a scientific review.`,
          rateLimited,
          source: "europe_pmc_live" as const,
        },
        hits,
      };
    } catch (err) {
      return {
        result: {
          attempted: true as const,
          hitCount: null,
          scopeNote: `Live Europe PMC failed closed: ${err instanceof Error ? err.message : "error"}. Hit count unknown.`,
          rateLimited,
          source: "fail_closed" as const,
        },
        hits: [] as EuropePmcHit[],
      };
    }
  };
  return {
    async search(query: string, opts?: { limit?: number }) {
      const { result } = await searchDetailed(query, opts);
      return result;
    },
    searchDetailed,
  };
}

export function resolveRetrievalAdapters(env: NodeJS.ProcessEnv = process.env): {
  pubmed: LiteratureSearchAdapter;
  europePmc: ReturnType<typeof createLiveEuropePmcAdapter>;
  trials: TrialRegistryAdapter;
  mode: "stub" | "live_partial" | "live";
} {
  const livePubmed = env.DISCOVERY_LIVE_PUBMED === "1" || env.DISCOVERY_LIVE_PUBMED === "true";
  const liveEpmc =
    env.DISCOVERY_LIVE_EUROPE_PMC === "1" || env.DISCOVERY_LIVE_EUROPE_PMC === "true";
  const liveCtgov = env.DISCOVERY_LIVE_CTGOV === "1" || env.DISCOVERY_LIVE_CTGOV === "true";
  const pubmed = livePubmed
    ? createLivePubmedAdapter({
        enableLivePubmed: true,
        ncbiApiKey: env.NCBI_API_KEY ?? env.PUBMED_API_KEY ?? null,
      })
    : stubLiteratureSearchAdapter;
  const europePmc = createLiveEuropePmcAdapter({ enableLiveEuropePmc: liveEpmc });
  const trials = liveCtgov
    ? createLiveCtgovAdapter({ enableLiveCtgov: true })
    : stubTrialRegistryAdapter;
  const mode =
    livePubmed && liveEpmc && liveCtgov ? "live" : livePubmed || liveEpmc || liveCtgov ? "live_partial" : "stub";
  return { pubmed, europePmc, trials, mode };
}

function dedupeWorks(works: RetrievedWork[]): RetrievedWork[] {
  const seen = new Set<string>();
  const out: RetrievedWork[] = [];
  for (const w of works) {
    const key = w.pmid
      ? `pmid:${w.pmid}`
      : w.doi
        ? `doi:${w.doi.toLowerCase()}`
        : w.nctId
          ? `nct:${w.nctId}`
          : w.title
            ? `title:${w.title.slice(0, 80).toLowerCase()}`
            : null;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

/**
 * Execute a bounded retrieval plan. Does not invent studies.
 * Stub/fail_closed results increment failedQueries and leave hitCountKnown false when unknown.
 */
export async function runBoundedRetrieval(
  plan: RetrievalQueryPlan,
  adapters = resolveRetrievalAdapters(),
  opts?: { limitPerQuery?: number },
): Promise<RetrievalRunReport> {
  const limit = opts?.limitPerQuery ?? 5;
  const works: RetrievedWork[] = [];
  let failedQueries = 0;
  let anyKnownCount = false;

  for (const q of plan.queries) {
    if (q.corpus === "pubmed") {
      const res = await adapters.pubmed.search(q.query, { limit });
      if (res.source === "fail_closed" || res.source === "stub" || res.hitCount === null) {
        if (res.source === "fail_closed" || res.source === "stub") failedQueries += 1;
      }
      if (typeof res.hitCount === "number") anyKnownCount = true;
      for (const pmid of res.pmids ?? []) {
        const v = validatePmid(pmid);
        if (!v) continue;
        works.push({
          pmid: v,
          doi: null,
          nctId: null,
          title: null,
          source: "pubmed",
          abstractAvailable: null,
          fullTextAvailable: null,
          year: null,
          excluded: false,
          exclusionReason: null,
          provenance: { query: q.query, adapter: res.source, hitCount: res.hitCount },
        });
      }
    } else if (q.corpus === "europe_pmc") {
      const detailed = adapters.europePmc.searchDetailed
        ? await adapters.europePmc.searchDetailed(q.query, { limit })
        : { result: await adapters.europePmc.search(q.query, { limit }), hits: [] as EuropePmcHit[] };
      const res = detailed.result;
      if (res.source === "fail_closed" || res.source === "stub") failedQueries += 1;
      if (typeof res.hitCount === "number") anyKnownCount = true;
      for (const h of detailed.hits) {
        if (!h.pmid && !h.doi) continue;
        works.push({
          pmid: h.pmid,
          doi: h.doi,
          nctId: null,
          title: h.title,
          source: "europe_pmc",
          abstractAvailable: h.hasAbstract,
          fullTextAvailable: h.isOpenAccess,
          year: null,
          excluded: false,
          exclusionReason: null,
          provenance: { query: q.query, adapter: res.source, hitCount: res.hitCount },
        });
      }
    } else if (q.corpus === "ctgov") {
      const res = await adapters.trials.lookup(q.query);
      if (res.source === "fail_closed" || res.source === "stub") failedQueries += 1;
      if (typeof res.hitCount === "number") anyKnownCount = true;
      // CT.gov adapter returns counts; NCT IDs only when future detailed fetch adds them —
      // never invent NCTs from the query string unless it validates as NCT.
      const maybeNct = validateNct(q.query);
      if (maybeNct && typeof res.hitCount === "number" && res.hitCount > 0) {
        works.push({
          pmid: null,
          doi: null,
          nctId: maybeNct,
          title: null,
          source: "ctgov",
          abstractAvailable: null,
          fullTextAvailable: null,
          year: null,
          excluded: false,
          exclusionReason: null,
          provenance: { query: q.query, adapter: res.source, hitCount: res.hitCount },
        });
      }
    }
  }

  const deduped = dedupeWorks(works);
  const excluded = deduped.filter((w) => w.excluded);
  const linked = deduped.filter((w) => !w.excluded && (w.pmid || w.doi || w.nctId));
  const identifierValidated = linked.filter(
    (w) => validatePmid(w.pmid) || validateDoi(w.doi) || validateNct(w.nctId),
  ).length;

  return {
    gapKey: plan.gapKey,
    pilot: plan.pilot,
    found: deduped.length,
    // Legacy alias: structural IDs only — not scientific appraisal.
    assessed: identifierValidated,
    identifierValidated,
    scientificallyAppraised: 0,
    linked: linked.length,
    excluded: excluded.length,
    failedQueries,
    hitCountKnown: anyKnownCount,
    works: deduped,
    scopeNote:
      "Bounded Discovery 3.0 pilot retrieval within documented PubMed / Europe PMC / CT.gov queries. Failed or stubbed queries do not mean zero evidence worldwide. No invented studies.",
    inventedStudies: false,
  };
}

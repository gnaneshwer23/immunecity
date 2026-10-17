/* Server-only provisional literature search (PubMed E-utilities + Europe PMC).
   Results are unreviewed — never auto-upgrade to approved / claim_support=supports. */
import {
  rateLimited,
  shouldFetchProvisionalLit,
  type AskGrounding,
  type AskQueryClass,
  type ProvisionalLitItem,
} from "@/lib/askGrounding";
import { byId } from "@/lib/immune/engine";

export { shouldFetchProvisionalLit, provisionalLitLabel } from "@/lib/askGrounding";

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const EUROPE_PMC = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";
const UA = {
  "User-Agent": "ImmuneSuperIntelligence-AskImmune/1.0 (mailto:curation@immune-city.app; educational)",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildSearchTerm(grounding: AskGrounding, question: string): string {
  const names = grounding.nodes
    .slice(0, 3)
    .map((n) => byId[n.id]?.name ?? n.name)
    .filter(Boolean);
  const core = names.length ? names.map((n) => `"${n}"`).join(" AND ") : question.slice(0, 80);
  return `${core} AND (immunology OR immune OR inflammation)`;
}

async function pubmedSearch(term: string, retmax = 4): Promise<string[]> {
  const res = await fetch(
    `${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&retmax=${retmax}&term=${encodeURIComponent(term)}`,
    { headers: UA },
  );
  if (!res.ok) throw new Error(`PubMed esearch ${res.status}`);
  const j = (await res.json()) as { esearchresult?: { idlist?: string[] } };
  return j.esearchresult?.idlist ?? [];
}

async function pubmedSummary(ids: string[]): Promise<ProvisionalLitItem[]> {
  if (!ids.length) return [];
  const res = await fetch(`${EUTILS}/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`, {
    headers: UA,
  });
  if (!res.ok) throw new Error(`PubMed esummary ${res.status}`);
  const j = (await res.json()) as { result?: Record<string, Record<string, unknown>> };
  return ids
    .map((id) => j.result?.[id])
    .filter((x): x is Record<string, unknown> => !!x && !("error" in x && x.error))
    .map((x) => {
      const pmid = String(x.uid ?? "");
      const articleids = (x.articleids as Array<{ idtype?: string; value?: string }> | undefined) || [];
      const doi = articleids.find((a) => a.idtype === "doi")?.value ?? null;
      return {
        pmid,
        doi,
        title: String(x.title ?? "").slice(0, 300),
        journal: String(x.source ?? ""),
        year: String(x.pubdate ?? "").slice(0, 4),
        source: "PubMed" as const,
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      };
    });
}

async function europePmcSearch(term: string, pageSize = 3): Promise<ProvisionalLitItem[]> {
  const url =
    `${EUROPE_PMC}?query=${encodeURIComponent(term)}` +
    `&format=json&pageSize=${pageSize}&resultType=lite`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`Europe PMC ${res.status}`);
  const j = (await res.json()) as {
    resultList?: {
      result?: Array<{
        pmid?: string;
        doi?: string;
        title?: string;
        journalTitle?: string;
        pubYear?: string;
        id?: string;
      }>;
    };
  };
  const rows = j.resultList?.result ?? [];
  return rows
    .map((r): ProvisionalLitItem | null => {
      const pmid = r.pmid ? String(r.pmid) : null;
      const doi = r.doi ? String(r.doi) : null;
      if (!pmid && !doi) return null;
      return {
        pmid,
        doi,
        title: String(r.title ?? "").slice(0, 300),
        journal: String(r.journalTitle ?? ""),
        year: String(r.pubYear ?? ""),
        source: "EuropePMC",
        url: pmid
          ? `https://europepmc.org/article/MED/${pmid}`
          : `https://doi.org/${encodeURIComponent(doi!)}`,
      };
    })
    .filter((x): x is ProvisionalLitItem => !!x);
}

function dedupe(items: ProvisionalLitItem[]): ProvisionalLitItem[] {
  const seen = new Set<string>();
  const out: ProvisionalLitItem[] = [];
  for (const it of items) {
    const key = it.pmid ? `pmid:${it.pmid}` : it.doi ? `doi:${it.doi.toLowerCase()}` : `t:${it.title.slice(0, 40)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

/**
 * Soft-fail provisional literature for Ask Immune.
 * Rate-limited per IP key; empty array on any API / network error.
 */
export async function fetchProvisionalLiterature(opts: {
  grounding: AskGrounding;
  question: string;
  queryClass: AskQueryClass;
  rateKey?: string;
}): Promise<{ items: ProvisionalLitItem[]; skipped?: string; error?: string }> {
  const { grounding, question, queryClass, rateKey = "anon" } = opts;
  if (!shouldFetchProvisionalLit(grounding, queryClass)) {
    return { items: [], skipped: "not_needed" };
  }
  // Soft rate limit (~6 lit searches / minute / key) so Ask itself is not blocked.
  if (rateLimited(`provisional-lit:${rateKey}`, 6, 60_000)) {
    return { items: [], skipped: "rate_limited" };
  }

  const term = buildSearchTerm(grounding, question);
  try {
    const ids = await pubmedSearch(term, 4);
    await sleep(300);
    const pubmed = await pubmedSummary(ids.slice(0, 4));
    await sleep(300);
    let europe: ProvisionalLitItem[] = [];
    try {
      europe = await europePmcSearch(term, 3);
    } catch {
      // Europe PMC is best-effort fallback; PubMed alone is enough.
      europe = [];
    }
    return { items: dedupe([...pubmed, ...europe]).slice(0, 6) };
  } catch (e) {
    return {
      items: [],
      error: e instanceof Error ? e.message : "Literature APIs unreachable",
    };
  }
}

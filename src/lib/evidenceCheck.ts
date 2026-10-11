/* Server-side metadata checks against PubMed (NCBI E-utilities) and Crossref.
   A match confirms an identifier points at a real work; it is not a scientific judgement. */

export interface CheckInput { id: string; node_name: string; source_ref: string | null; pmid: string | null; doi: string | null }
export type CheckStatus = "verified" | "matched" | "ambiguous" | "not_found" | "research_required" | "unavailable";
export interface Candidate { pmid: string; title: string; journal: string; year: string; first_author: string; doi?: string }

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const UA = { "User-Agent": "ImmuneCity-Curation/1.0 (mailto:curation@immune-city.app)" };
const STOPS = new Set(["that","this","with","from","into","than","then","their","they","which","were","have","been","also","more","most","other","such","some","these","those","when","study","trial"]);
const norm = (v: unknown) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/* Does the resolved metadata agree with the citation text? Title overlap, or both
   leading author and year, must line up. A metadata check, never a scientific one. */
export function agreement(ref: string | null, c: Candidate) {
  if (!ref) return { agrees: true, differences: [] as string[] };
  const text = ref.trim();
  const first = (text.split(/[.;(]/)[0] ?? "").trim().split(",")[0]?.trim() ?? "";
  const display = first.replace(/\s+[A-Z]{1,4}$/, "").trim() || first;
  const surname = norm(display);
  const y = text.match(/\b(1[89]\d{2}|20\d{2});/) || text.match(/\b(1[89]\d{2}|20\d{2})\b/);
  const year = y ? Number(y[1]) : null;
  const family = norm(String(c.first_author || "").replace(/\s+\S+$/, ""));
  const authorOk = !!(family && surname && (surname === family || family.startsWith(surname) || surname.startsWith(family)));
  const yearOk = !!(year && c.year && year === Number(c.year));
  const words = norm(c.title).split(" ").filter((w) => w.length >= 4 && !STOPS.has(w));
  const hay = norm(ref);
  const overlap = words.length ? words.filter((w) => hay.includes(w)).length / words.length : 0;
  const differences: string[] = [];
  if (overlap < 0.6 && !(authorOk && yearOk)) differences.push(`Title: this identifier resolves to "${String(c.title || "").slice(0, 170)}".`);
  if (!authorOk && display && c.first_author) differences.push(`First author: the citation reads "${display}", the source reads "${c.first_author}".`);
  if (!yearOk && year && c.year) differences.push(`Year: the citation reads ${year}, the source reads ${c.year}.`);
  return { agrees: overlap >= 0.6 || (authorOk && yearOk), differences };
}
const verdict = (ref: string | null, c: Candidate, source: string) => {
  const a = agreement(ref, c);
  return a.agrees
    ? { status: "verified" as CheckStatus, detail: { source, candidate: c } }
    : { status: "ambiguous" as CheckStatus, detail: { source, candidate: c, candidates: [c], differences: a.differences, reason: "Identifier resolves, but its metadata disagrees with the citation text" } };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pubmedSummary(ids: string[]): Promise<Candidate[]> {
  if (!ids.length) return [];
  const res = await fetch(`${EUTILS}/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`, { headers: UA });
  if (!res.ok) throw new Error(`PubMed ${res.status}`);
  const j: any = await res.json();
  return ids
    .map((id) => j.result?.[id])
    .filter((x: any) => x && !x.error)
    .map((x: any) => ({
      pmid: String(x.uid),
      title: x.title,
      journal: x.source,
      year: String(x.pubdate || "").slice(0, 4),
      first_author: x.authors?.[0]?.name ?? "",
      doi: (x.articleids || []).find((a: any) => a.idtype === "doi")?.value,
    }));
}

async function pubmedSearch(term: string): Promise<string[]> {
  const res = await fetch(`${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&retmax=5&term=${encodeURIComponent(term)}`, { headers: UA });
  if (!res.ok) throw new Error(`PubMed ${res.status}`);
  const j: any = await res.json();
  return j.esearchresult?.idlist ?? [];
}

function parseRef(ref: string) {
  const year = ref.match(/\b(19|20)\d{2}\b/)?.[0];
  const journal = /NEJM|N Engl J Med/i.test(ref) ? "N Engl J Med" : /Lancet Oncol/i.test(ref) ? "Lancet Oncol" : /Lancet/i.test(ref) ? "Lancet" : null;
  const group = /collaborative group|consortium|investigators/i.test(ref);
  const author = group ? null : ref.trim().split(/[\s,.;]+/)[0];
  return { year, journal, author };
}

export async function checkRecord(r: CheckInput): Promise<{ status: CheckStatus; detail: Record<string, unknown> }> {
  try {
    if (r.pmid) {
      const [c] = await pubmedSummary([r.pmid]);
      return c ? verdict(r.source_ref, c, "PubMed") : { status: "not_found", detail: { source: "PubMed", reason: `PMID ${r.pmid} not found` } };
    }
    if (r.doi) {
      const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(r.doi)}`, { headers: UA });
      if (res.status === 404) return { status: "not_found", detail: { source: "Crossref", reason: `DOI ${r.doi} not found` } };
      if (!res.ok) throw new Error(`Crossref ${res.status}`);
      const m: any = (await res.json()).message;
      const c: Candidate = { pmid: "", title: m.title?.[0] ?? "", journal: m["container-title"]?.[0] ?? "", year: String(m.issued?.["date-parts"]?.[0]?.[0] ?? ""), first_author: m.author?.[0]?.family ?? m.author?.[0]?.name ?? "", doi: r.doi };
      return verdict(r.source_ref, c, "Crossref");
    }
    if (!r.source_ref) return { status: "research_required", detail: { reason: "No source named in the manifest" } };

    const { year, journal, author } = parseRef(r.source_ref);
    if (!year) return { status: "not_found", detail: { reason: "Could not read a year from the reference" } };
    const base = [author && `${author}[1au]`, `${year}[dp]`, journal && `"${journal}"[ta]`].filter(Boolean).join(" AND ");
    let ids = await pubmedSearch(`${base} AND ${r.node_name}`);
    await sleep(350);
    let term = `${base} AND ${r.node_name}`;
    if (!ids.length) { term = base; ids = await pubmedSearch(base); await sleep(350); }
    const candidates = await pubmedSummary(ids.slice(0, 3));
    await sleep(350);
    if (!candidates.length) return { status: "not_found", detail: { source: "PubMed", term } };
    return { status: ids.length === 1 ? "matched" : "ambiguous", detail: { source: "PubMed", term, hits: ids.length, candidates } };
  } catch (e) {
    return { status: "unavailable", detail: { reason: e instanceof Error ? e.message : "Metadata source unreachable" } };
  }
}

/* Candidate sources for an empty slot: PubMed search built from the manifest hint
   or the concept name. Suggestions only — a curator must pick and approve one. */
export async function suggestFor(r: { node_name: string; search_query: string | null }) {
  const term = r.search_query?.trim() || `${r.node_name}[tiab] AND (immunology OR immune) AND review[pt]`;
  try {
    const ids = await pubmedSearch(term);
    await sleep(350);
    const candidates = await pubmedSummary(ids.slice(0, 3));
    await sleep(350);
    return { source: "PubMed", term, hits: ids.length, candidates, suggested: true, reason: candidates.length ? "Suggested candidates — pick one and approve" : "No PubMed results for the suggestion query" };
  } catch (e) {
    return { source: "PubMed", term, candidates: [], suggested: true, reason: e instanceof Error ? e.message : "PubMed unreachable" };
  }
}

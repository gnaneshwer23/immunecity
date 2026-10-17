/* Browser-safe Crossref helpers for the Nature Immunology Research Library.
   Metadata only — abstracts appear solely when the publisher deposited them with
   Crossref. Nothing here scrapes nature.com or invents identifiers. */
import { z } from "zod";

/** Nature Immunology print ISSN (Springer Nature). */
export const NATURE_IMMUNOLOGY_ISSN = "1529-2908";
export const NATURE_IMMUNOLOGY_NAME = "Nature Immunology";
export const NATURE_IMMUNOLOGY_HOME = "https://www.nature.com/ni/";
export const CROSSREF_SOURCE = "Crossref REST API";

/** Nature Portfolio journals searched by the Research Library (no affiliation implied). */
export const JOURNALS = [
  { issn: "1529-2908", name: "Nature Immunology", reviews: false },
  { issn: "1474-1733", name: "Nature Reviews Immunology", reviews: true },
  { issn: "0028-0836", name: "Nature", reviews: false },
  { issn: "1078-8956", name: "Nature Medicine", reviews: false },
  { issn: "2058-5276", name: "Nature Microbiology", reviews: false },
] as const;
export type JournalIssn = (typeof JOURNALS)[number]["issn"];
const ISSNS = JOURNALS.map((j) => j.issn) as [JournalIssn, ...JournalIssn[]];
export const DOI_RE = /^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:)?(10\.\d{4,9}\/\S+)$/i;

export const librarySearchSchema = z.object({
  q: z.string().trim().max(200).default(""),
  /** Empty = all five journals. */
  journal: z.enum(ISSNS).optional(),
  author: z.string().trim().max(120).default(""),
  fromYear: z.number().int().min(2000).max(2100).optional(),
  untilYear: z.number().int().min(2000).max(2100).optional(),
  openAccessOnly: z.boolean().default(false),
  /** Result offset as a string (Crossref forbids date sorting with deep cursors; offsets cap at 10,000). */
  cursor: z.string().regex(/^\d{1,5}$/).default("0"),
  rows: z.number().int().min(1).max(40).default(20),
});
export type LibrarySearch = z.infer<typeof librarySearchSchema>;

export interface LibraryArticle {
  doi: string;
  title: string;
  authors: string[];
  journal: string;
  published: string | null; // YYYY-MM-DD / YYYY-MM / YYYY
  year: number | null;
  publisherUrl: string;
  doiUrl: string;
  /** Plain-text abstract only when Crossref has one; otherwise null. */
  abstract: string | null;
  licenses: string[];
  openAccess: boolean;
  /** Crossref record type, e.g. journal-article (Nature article categories are not exposed). */
  crossrefType: string | null;
  /** "Review" only when the journal publishes reviews exclusively; otherwise null (unknown). */
  articleKind: "Review" | null;
  subjects: string[];
}

export interface LibraryPage {
  articles: LibraryArticle[];
  total: number | null;
  nextCursor: string | null;
  fetchedAt: string;
  source: typeof CROSSREF_SOURCE;
  /** True when the open-access filter was applied to the fetched page, not the whole index. */
  openAccessFilteredLocally: boolean;
}

export function normaliseDoi(raw: string): string {
  return raw.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:/i, "").toLowerCase();
}

/** Strip JATS / HTML markup from Crossref abstracts. */
export function stripJats(raw: string): string {
  return raw
    .replace(/<jats:title>[^<]*<\/jats:title>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Open access only when a Creative Commons licence is deposited (TDM licences don't count). */
export function isOpenAccess(licenses: string[]): boolean {
  return licenses.some((u) => /creativecommons\.org/i.test(u));
}

function dateParts(item: any): number[] | null {
  const src = item?.published ?? item?.["published-print"] ?? item?.["published-online"] ?? item?.issued;
  const parts = src?.["date-parts"]?.[0];
  return Array.isArray(parts) && typeof parts[0] === "number" ? parts : null;
}

export function journalOf(item: any) {
  const issns: string[] = Array.isArray(item?.ISSN) ? item.ISSN : [];
  const title = Array.isArray(item?.["container-title"]) ? String(item["container-title"][0] ?? "") : "";
  return JOURNALS.find((j) => issns.includes(j.issn)) ?? JOURNALS.find((j) => j.name.toLowerCase() === title.toLowerCase()) ?? null;
}

export function parseCrossrefItem(item: any): LibraryArticle | null {
  const doiRaw = typeof item?.DOI === "string" ? item.DOI : "";
  const title = Array.isArray(item?.title) ? String(item.title[0] ?? "").trim() : "";
  if (!doiRaw || !title) return null; // never fabricate missing identity fields
  const doi = normaliseDoi(doiRaw);
  const parts = dateParts(item);
  const published = parts ? parts.map((n, i) => (i === 0 ? String(n) : String(n).padStart(2, "0"))).join("-") : null;
  const licenses: string[] = Array.isArray(item?.license)
    ? Array.from(new Set(item.license.map((l: any) => String(l?.URL ?? "")).filter(Boolean)))
    : [];
  const authors: string[] = Array.isArray(item?.author)
    ? item.author
        .map((a: any) => [a?.given, a?.family].filter(Boolean).join(" ") || a?.name || "")
        .filter(Boolean)
    : [];
  return {
    doi,
    title: stripJats(title),
    authors,
    journal: (Array.isArray(item?.["container-title"]) && item["container-title"][0]) || journalOf(item)?.name || "Unknown journal",
    published,
    year: parts ? parts[0]! : null,
    doiUrl: `https://doi.org/${doi}`,
    publisherUrl: typeof item?.URL === "string" ? item.URL : `https://doi.org/${doi}`,
    abstract: typeof item?.abstract === "string" && item.abstract.trim() ? stripJats(item.abstract) : null,
    licenses,
    openAccess: isOpenAccess(licenses),
    crossrefType: typeof item?.type === "string" ? item.type : null,
    articleKind: journalOf(item)?.reviews ? "Review" : null,
    subjects: Array.isArray(item?.subject) ? item.subject.map(String) : [],
  };
}

/** Keep the first record per DOI (idempotent across pages and repeated imports). */
export function dedupeByDoi<T extends { doi: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const k = normaliseDoi(r.doi);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function buildCrossrefUrl(s: LibrarySearch, mailto?: string): string {
  const p = new URLSearchParams();
  if (s.q) p.set("query.bibliographic", s.q);
  if (s.author) p.set("query.author", s.author);
  const filters: string[] = [];
  if (s.fromYear) filters.push(`from-pub-date:${s.fromYear}`);
  if (s.untilYear) filters.push(`until-pub-date:${s.untilYear}`);
  if (!s.journal) filters.push(...ISSNS.map((i) => `issn:${i}`));
  if (filters.length) p.set("filter", filters.join(","));
  p.set("rows", String(s.rows));
  p.set("offset", s.cursor || "0");
  if (!s.q && !s.author) {
    p.set("sort", "published");
    p.set("order", "desc");
  }
  p.set("select", "DOI,ISSN,title,author,published,published-print,published-online,issued,type,license,abstract,URL,container-title,subject");
  if (mailto) p.set("mailto", mailto);
  const base = s.journal ? `https://api.crossref.org/journals/${s.journal}/works` : "https://api.crossref.org/works";
  return `${base}?${p.toString()}`;
}

/** Single-record lookup when the query is a DOI. */
export function buildDoiUrl(doi: string, mailto?: string): string {
  return `https://api.crossref.org/works/${encodeURIComponent(normaliseDoi(doi))}${mailto ? `?mailto=${encodeURIComponent(mailto)}` : ""}`;
}

/** A DOI result is shown only if it belongs to one of the library journals. */
export function parseDoiRecord(json: any, fetchedAt: string): LibraryPage {
  const item = json?.message;
  const a = item && journalOf(item) ? parseCrossrefItem(item) : null;
  return { articles: a ? [a] : [], total: a ? 1 : 0, nextCursor: null, fetchedAt, source: CROSSREF_SOURCE, openAccessFilteredLocally: false };
}

export function parseCrossrefPage(json: any, s: LibrarySearch, fetchedAt: string): LibraryPage {
  const msg = json?.message ?? {};
  const items: any[] = Array.isArray(msg.items) ? msg.items : [];
  let articles = dedupeByDoi(items.map(parseCrossrefItem).filter((a): a is LibraryArticle => a !== null));
  if (s.openAccessOnly) articles = articles.filter((a) => a.openAccess);
  const total = typeof msg["total-results"] === "number" ? msg["total-results"] : null;
  const nextOffset = Number(s.cursor || "0") + s.rows;
  const nextCursor = items.length >= s.rows && nextOffset < Math.min(total ?? 0, 10000) ? String(nextOffset) : null;
  return {
    articles,
    total,
    nextCursor,
    fetchedAt,
    source: CROSSREF_SOURCE,
    openAccessFilteredLocally: s.openAccessOnly,
  };
}

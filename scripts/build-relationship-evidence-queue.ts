#!/usr/bin/env bun
/**
 * Build src/data/relationship-evidence-queue.json from KG bibliographic source_refs.
 *
 * Optional --resolve-pmids looks up PubMed for each unique cite string and attaches
 * a PMID only when the search is unambiguous and agreement() accepts the match.
 * Never sets curation=approved or claim_support=supports.
 *
 * Usage:
 *   bun scripts/build-relationship-evidence-queue.ts
 *   bun scripts/build-relationship-evidence-queue.ts --resolve-pmids
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { agreement } from "../src/lib/evidenceCheck.ts";
import {
  buildRelationshipEvidenceQueue,
  relationshipQueueCoverageSummary,
} from "../src/lib/immune/relationshipEvidenceQueue.ts";

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const UA = { "User-Agent": "ImmuneSuperIntelligence-Curation/1.0 (mailto:curation@immune-city.app)" };
const OUT = resolve(import.meta.dir, "../src/data/relationship-evidence-queue.json");
const resolvePmids = process.argv.includes("--resolve-pmids");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pubmedSearch(term: string): Promise<string[]> {
  const res = await fetch(
    `${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&retmax=5&term=${encodeURIComponent(term)}`,
    { headers: UA },
  );
  if (!res.ok) throw new Error(`PubMed search ${res.status}`);
  const j = (await res.json()) as { esearchresult?: { idlist?: string[] } };
  return j.esearchresult?.idlist ?? [];
}

async function pubmedSummary(ids: string[]) {
  if (!ids.length) return [] as Array<{
    pmid: string;
    title: string;
    journal: string;
    year: string;
    first_author: string;
    doi?: string;
  }>;
  const res = await fetch(`${EUTILS}/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`, {
    headers: UA,
  });
  if (!res.ok) throw new Error(`PubMed summary ${res.status}`);
  const j = (await res.json()) as { result?: Record<string, any> };
  return ids
    .map((id) => j.result?.[id])
    .filter((x) => x && !x.error)
    .map((x) => ({
      pmid: String(x.uid),
      title: x.title as string,
      journal: x.source as string,
      year: String(x.pubdate || "").slice(0, 4),
      first_author: x.authors?.[0]?.name ?? "",
      doi: (x.articleids || []).find((a: { idtype: string; value: string }) => a.idtype === "doi")?.value,
    }));
}

function searchTerm(cite: string): string {
  const year = cite.match(/\b(19|20)\d{2}\b/)?.[0];
  const author = cite.trim().split(/[\s,.;]+/)[0];
  const journal = /NEJM|N Engl J Med/i.test(cite)
    ? '"N Engl J Med"[ta]'
    : /Nat Immunol/i.test(cite)
      ? '"Nat Immunol"[ta]'
      : /Nat Med/i.test(cite)
        ? '"Nat Med"[ta]'
        : /Science/i.test(cite)
          ? '"Science"[ta]'
          : /Nature/i.test(cite)
            ? '"Nature"[ta]'
            : /Immunity/i.test(cite)
              ? '"Immunity"[ta]'
              : /Ann Oncol/i.test(cite)
                ? '"Ann Oncol"[ta]'
                : /J Exp Med/i.test(cite)
                  ? '"J Exp Med"[ta]'
                  : /J Immunol/i.test(cite)
                    ? '"J Immunol"[ta]'
                    : /Nat Rev Immunol/i.test(cite)
                      ? '"Nat Rev Immunol"[ta]'
                      : /Ann Rheum Dis/i.test(cite)
                        ? '"Ann Rheum Dis"[ta]'
                        : /Lancet Diabetes/i.test(cite)
                          ? '"Lancet Diabetes Endocrinol"[ta]'
                          : /Brain/i.test(cite)
                            ? '"Brain"[ta]'
                            : /Annu Rev Pathol/i.test(cite)
                              ? '"Annu Rev Pathol"[ta]'
                              : "";
  return [author && `${author}[1au]`, year && `${year}[dp]`, journal].filter(Boolean).join(" AND ");
}

async function resolveCite(cite: string): Promise<{ pmid?: string; doi?: string; note: string }> {
  const term = searchTerm(cite);
  if (!term.includes("[dp]")) return { note: "skip: no year" };
  try {
    let ids = await pubmedSearch(term);
    await sleep(400);
    if (ids.length === 0) {
      // Trial nicknames often need the trial string rather than first-author parsing.
      ids = await pubmedSearch(cite);
      await sleep(400);
    }
    if (ids.length === 0) return { note: "not_found" };
    if (ids.length > 1) {
      // Prefer a single hit after adding title-ish tokens from the cite string.
      const tokens = cite
        .replace(/[^\w\s-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !/^\d{4}$/.test(w));
      const narrowed = await pubmedSearch(`${term} AND ${tokens.slice(0, 3).join(" ")}`);
      await sleep(400);
      if (narrowed.length === 1) ids = narrowed;
      else return { note: `ambiguous:${ids.length}` };
    }
    const [c] = await pubmedSummary(ids.slice(0, 1));
    await sleep(400);
    if (!c) return { note: "summary_miss" };
    const a = agreement(cite, c);
    if (!a.agrees) return { note: "disagree_metadata" };
    return { pmid: c.pmid, doi: c.doi, note: "resolved" };
  } catch (e) {
    return { note: e instanceof Error ? e.message : "unavailable" };
  }
}

const base = buildRelationshipEvidenceQueue({ generatedAt: new Date().toISOString() });
const cites = [
  ...new Set(base.evidence_records.flatMap((g) => g.evidence.map((e) => e.source_ref))),
];

const pmidByCite: Record<string, string> = {};
const doiByCite: Record<string, string> = {};
const resolveLog: Array<{ cite: string; note: string; pmid?: string }> = [];

if (resolvePmids) {
  console.log(`Resolving ${cites.length} unique bibliographic cites via PubMed…`);
  for (const cite of cites) {
    const r = await resolveCite(cite);
    resolveLog.push({ cite, note: r.note, pmid: r.pmid });
    if (r.pmid) pmidByCite[cite] = r.pmid;
    if (r.doi) doiByCite[cite] = r.doi;
    console.log(`  ${r.note.padEnd(18)} ${cite}${r.pmid ? ` → ${r.pmid}` : ""}`);
  }
}

const manifest = buildRelationshipEvidenceQueue({
  generatedAt: new Date().toISOString(),
  pmidByCite,
  doiByCite,
});
writeFileSync(OUT, `${JSON.stringify(manifest, null, 2)}\n`);
const cov = relationshipQueueCoverageSummary(manifest);
console.log("\nWrote", OUT);
console.log(JSON.stringify({ ...manifest.meta.stats, coverage: cov }, null, 2));
if (resolvePmids) {
  const resolved = resolveLog.filter((x) => x.pmid).length;
  console.log(`PMID resolution: ${resolved}/${cites.length} (remainder stay bibliographic; still unreviewed).`);
}

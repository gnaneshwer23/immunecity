/**
 * Server-only: PubMed E-utilities preview / optional unreviewed draft seed for P0 exemplars.
 * Never invents PMIDs; never sets curation=approved or claim_support=supports.
 */
import { inArray } from "drizzle-orm";
import { getDb } from "@/lib/db.server";
import { evidenceRecords } from "@/lib/db/schema.server";
import { byId, edgeByRel } from "@/lib/immune/engine";
import { EXEMPLAR_CURATOR_TARGETS } from "@/lib/immune/exemplarPathways";
import {
  evidenceIdForP0Draft,
  p0TargetsNeedingDrafts,
  titleMatchesP0Claim,
  type P0PubmedHit,
} from "@/lib/immune/p0ExemplarPubmed";

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const UA = {
  "User-Agent": "ImmuneSuperIntelligence-Curator/1.0 (mailto:curation@immune-city.app; educational; no auto-approve)",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pubmedSearch(term: string, retmax = 3): Promise<string[]> {
  const res = await fetch(
    `${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&retmax=${retmax}&term=${encodeURIComponent(term)}`,
    { headers: UA },
  );
  if (!res.ok) throw new Error(`PubMed esearch ${res.status}`);
  const j = (await res.json()) as { esearchresult?: { idlist?: string[] } };
  return j.esearchresult?.idlist ?? [];
}

async function pubmedSummary(ids: string[]): Promise<P0PubmedHit[]> {
  if (!ids.length) return [];
  const res = await fetch(`${EUTILS}/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`, {
    headers: UA,
  });
  if (!res.ok) throw new Error(`PubMed esummary ${res.status}`);
  const j = (await res.json()) as { result?: Record<string, Record<string, unknown>> };
  return ids
    .map((id) => j.result?.[id])
    .filter((x): x is Record<string, unknown> => !!x && !("error" in x && x.error))
    .map((x) => ({
      pmid: String(x.uid ?? ""),
      title: String(x.title ?? "").slice(0, 400),
      journal: String(x.source ?? ""),
      year: String(x.pubdate ?? "").slice(0, 4),
    }))
    .filter((h) => /^\d{5,}$/.test(h.pmid));
}

export type P0DraftPreviewRow = {
  relId: string;
  pathwayId: string;
  claimHint: string;
  pubmedQuery: string;
  alreadyMapped: boolean;
  hits: P0PubmedHit[];
  /** First hit whose title passes the conservative heuristic (candidate for insert). */
  seedCandidate: P0PubmedHit | null;
  skipReason: string | null;
};

export async function previewP0ExemplarPubmedDrafts(): Promise<{
  fetchedAt: string;
  rows: P0DraftPreviewRow[];
}> {
  const db = getDb();
  const relIds = EXEMPLAR_CURATOR_TARGETS.map((t) => t.relId);
  const existing = await db
    .select({ relationshipId: evidenceRecords.relationshipId })
    .from(evidenceRecords)
    .where(inArray(evidenceRecords.relationshipId, relIds));
  const have = new Set(existing.map((r) => r.relationshipId).filter(Boolean) as string[]);

  const rows: P0DraftPreviewRow[] = [];
  for (const target of EXEMPLAR_CURATOR_TARGETS) {
    if (!edgeByRel[target.relId]) {
      rows.push({
        relId: target.relId,
        pathwayId: target.pathwayId,
        claimHint: target.claimHint,
        pubmedQuery: target.pubmedQuery,
        alreadyMapped: have.has(target.relId),
        hits: [],
        seedCandidate: null,
        skipReason: "relationship missing from runtime graph",
      });
      continue;
    }
    await sleep(350);
    let hits: P0PubmedHit[] = [];
    try {
      const ids = await pubmedSearch(target.pubmedQuery, 3);
      await sleep(300);
      hits = await pubmedSummary(ids);
    } catch (err) {
      rows.push({
        relId: target.relId,
        pathwayId: target.pathwayId,
        claimHint: target.claimHint,
        pubmedQuery: target.pubmedQuery,
        alreadyMapped: have.has(target.relId),
        hits: [],
        seedCandidate: null,
        skipReason: err instanceof Error ? err.message : "PubMed unavailable",
      });
      continue;
    }
    const seedCandidate =
      have.has(target.relId) ? null : (hits.find((h) => titleMatchesP0Claim(target, h.title)) ?? null);
    let skipReason: string | null = null;
    if (have.has(target.relId)) skipReason = "evidence row already mapped to this relationship_id";
    else if (!hits.length) skipReason = "PubMed returned no PMIDs for this query";
    else if (!seedCandidate) skipReason = "hits returned but none passed title heuristic — curator must pick manually";

    rows.push({
      relId: target.relId,
      pathwayId: target.pathwayId,
      claimHint: target.claimHint,
      pubmedQuery: target.pubmedQuery,
      alreadyMapped: have.has(target.relId),
      hits,
      seedCandidate,
      skipReason,
    });
  }

  return { fetchedAt: new Date().toISOString(), rows };
}

/** Insert unreviewed drafts only for title-heuristic matches with real PubMed PMIDs. */
export async function seedP0ExemplarPubmedDrafts(): Promise<{
  fetchedAt: string;
  attempted: number;
  added: number;
  skipped: number;
  evidenceIds: string[];
  notes: string[];
}> {
  const preview = await previewP0ExemplarPubmedDrafts();
  const needing = p0TargetsNeedingDrafts(
    new Set(preview.rows.filter((r) => r.alreadyMapped).map((r) => r.relId)),
  );
  const notes: string[] = [];
  const toInsert: (typeof evidenceRecords.$inferInsert)[] = [];

  for (const target of needing) {
    const row = preview.rows.find((r) => r.relId === target.relId);
    const hit = row?.seedCandidate;
    if (!hit) {
      notes.push(`${target.relId}: skipped — ${row?.skipReason ?? "no seed candidate"}`);
      continue;
    }
    const edge = edgeByRel[target.relId];
    if (!edge) {
      notes.push(`${target.relId}: skipped — edge missing`);
      continue;
    }
    const subj = byId[edge.subject_id];
    if (!subj) {
      notes.push(`${target.relId}: skipped — subject missing`);
      continue;
    }
    const evidenceId = evidenceIdForP0Draft(target.relId, hit.pmid);
    toInsert.push({
      evidenceId,
      nodeId: subj.id,
      nodeName: subj.name,
      nodeType: subj.node_type,
      sourceType: "pubmed_p0_draft",
      sourceRef: `${hit.title.slice(0, 180)} (${hit.journal} ${hit.year})`,
      pmid: hit.pmid,
      doi: null,
      searchQuery: target.pubmedQuery,
      manifestStatus: "RESEARCH_REQUIRED",
      checkStatus: "pending",
      curation: "unreviewed",
      relationshipId: target.relId,
      claimSupport: "unassessed",
      notes: `[p0 pubmed draft] ${target.claimHint} — unreviewed; never auto-approved`,
    });
    notes.push(`${target.relId}: seed candidate PMID ${hit.pmid}`);
  }

  if (!toInsert.length) {
    return {
      fetchedAt: preview.fetchedAt,
      attempted: needing.length,
      added: 0,
      skipped: needing.length,
      evidenceIds: [],
      notes,
    };
  }

  const db = getDb();
  const inserted = await db
    .insert(evidenceRecords)
    .values(toInsert)
    .onConflictDoNothing({ target: evidenceRecords.evidenceId })
    .returning({ evidenceId: evidenceRecords.evidenceId });

  return {
    fetchedAt: preview.fetchedAt,
    attempted: needing.length,
    added: inserted.length,
    skipped: needing.length - inserted.length,
    evidenceIds: inserted.map((r) => r.evidenceId),
    notes,
  };
}

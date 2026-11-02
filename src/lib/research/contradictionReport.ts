/**
 * Cap 10 — Scientific contradictions (§6.15 / HSI_RESEARCH_DISCOVERY_WORKFLOW).
 * Surfaces first-class CONTRADICTS gold pairs, opposite-sign edges, Gate C
 * counterevidence, and discovery conflict candidates.
 * Never majority-votes science; never silently merges opposing edges.
 */
import { byId, edgeByRel, out, relId, SEM, type KGEdge } from "@/lib/immune/engine";
import type { AskGrounding, CitationLike } from "@/lib/askGrounding";
import type { ResearchGapCandidate } from "@/lib/discovery/types";
import {
  CONTRADICTION_GOLD_PAIRS,
  goldPairConceptIds,
  type ContradictionGoldPair,
  type ContradictionSide,
} from "@/data/contradictionGoldPairs";

export const CONTRADICTION_REPORT_SCHEMA_VERSION = "cap10-2";
export const CONTRADICTION_CAPABILITY = "cap10_scientific_contradictions" as const;

export const CONTRADICTION_KINDS = [
  "first_class_contradicts",
  "opposite_sign_edges",
  "counterevidence_cite",
  "discovery_conflict",
] as const;
export type ContradictionKind = (typeof CONTRADICTION_KINDS)[number];

/** Study context preserved from existing edge / gold-pair fields (never invented). */
export type ContradictionSideContext = {
  findingId?: string;
  statement: string;
  backingRelId?: string;
  tissue: string | null;
  method: string | null;
  population: string | null;
  sourceRefs: string[];
};

export type ContradictionItem = {
  id: string;
  kind: ContradictionKind;
  subjectId: string;
  objectId: string;
  subjectName: string;
  objectName: string;
  /** Supporting / positive-sign / supports-polarity / side-A ids (may be empty). */
  supportIds: string[];
  /** Opposing / negative-sign / contradicts-polarity / side-B ids (may be empty). */
  opposeIds: string[];
  supportPmids: string[];
  opposePmids: string[];
  relations: string[];
  summary: string;
  /** Both sides retained for Cap 10 depth (especially first_class_contradicts). */
  sideA?: ContradictionSideContext;
  sideB?: ContradictionSideContext;
  /** Always unresolved at Cap 10 — no vote. */
  resolution: "unresolved";
  majorityVote: false;
  silentMerge: false;
};

export type ContradictionReport = {
  kind: typeof CONTRADICTION_CAPABILITY;
  schemaVersion: typeof CONTRADICTION_REPORT_SCHEMA_VERSION;
  capabilityLabel: "Available research capability";
  product: "Cap 10 Scientific contradictions";
  question: string;
  items: ContradictionItem[];
  counts: Record<ContradictionKind, number>;
  /** Honest empty when nothing retrieved — not a claim that literature agrees. */
  honestEmpty: boolean;
  honesty: string[];
  kgWrite: false;
  clinicalAdvice: false;
  /** True once CONTRADICTS is in relation_semantics and gold pairs are indexed. */
  firstClassContradictsRelation: true;
};

function nodeName(id: string): string {
  return byId[id]?.name ?? id;
}

function uniq(xs: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of xs) {
    const t = (x ?? "").trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function pmidOf(c: CitationLike): string | null {
  const p = c.pmid?.trim();
  return p && /^\d{6,9}$/.test(p) ? p : null;
}

/** Enrich gold-pair side with live edge fields when the backing relationship exists. */
export function enrichSideFromBackingEdge(side: ContradictionSide): ContradictionSideContext {
  const edge = edgeByRel[side.backingRelId];
  const tissue =
    side.tissue?.trim() ||
    edge?.location?.trim() ||
    null;
  const method =
    side.method?.trim() ||
    null;
  const population = side.population?.trim() || null;
  const fromEdge = (edge?.source_refs ?? []).filter((r) => !!r?.trim());
  const sourceRefs = uniq([
    ...side.sourceRefs,
    ...fromEdge,
  ]);
  return {
    findingId: side.findingId,
    statement: side.statement,
    backingRelId: side.backingRelId,
    tissue,
    method,
    population,
    sourceRefs: sourceRefs.length ? sourceRefs : ["TO_BE_CURATED"],
  };
}

function formatSideContext(side: ContradictionSideContext): string {
  const bits: string[] = [];
  if (side.tissue) bits.push(`tissue=${side.tissue}`);
  if (side.method) bits.push(`method=${side.method}`);
  if (side.population) bits.push(`population=${side.population}`);
  if (side.sourceRefs.length) bits.push(`refs=${side.sourceRefs.join("; ")}`);
  return bits.length ? bits.join("; ") : "context not recorded on edge";
}

/**
 * Gold pairs whose concept neighbourhood intersects Ask retrieval.
 * Both sides always retained; majorityVote stays false.
 */
export function matchContradictionGoldPairs(
  conceptIds: readonly string[],
): ContradictionGoldPair[] {
  const scope = new Set(conceptIds);
  if (!scope.size) return [];
  return CONTRADICTION_GOLD_PAIRS.filter((p) =>
    goldPairConceptIds(p).some((id) => scope.has(id)),
  );
}

/**
 * Opposite-sign parallel edges between the same ordered subject→object pair
 * (and undirected pair for neighbourhood scope).
 */
export function findOppositeSignPairs(
  conceptIds: readonly string[],
): Array<{
  subjectId: string;
  objectId: string;
  plus: KGEdge[];
  minus: KGEdge[];
}> {
  const scope = new Set(conceptIds);
  const buckets = new Map<string, { subjectId: string; objectId: string; plus: KGEdge[]; minus: KGEdge[] }>();

  for (const id of conceptIds) {
    for (const e of out[id] ?? []) {
      if (scope.size && !scope.has(e.object_id) && !scope.has(e.subject_id)) {
        if (!scope.has(e.subject_id)) continue;
      }
      const sign = SEM[e.relation];
      if (sign !== "+" && sign !== "-") continue;
      const key = `${e.subject_id}->${e.object_id}`;
      let b = buckets.get(key);
      if (!b) {
        b = { subjectId: e.subject_id, objectId: e.object_id, plus: [], minus: [] };
        buckets.set(key, b);
      }
      if (sign === "+") b.plus.push(e);
      else b.minus.push(e);
    }
  }

  return [...buckets.values()].filter((b) => b.plus.length > 0 && b.minus.length > 0);
}

/** Live CONTRADICTS edges in the loaded graph (draft gold + any future curated). */
export function findFirstClassContradictsEdges(
  conceptIds: readonly string[],
): KGEdge[] {
  const scope = new Set(conceptIds);
  const hits: KGEdge[] = [];
  const seen = new Set<string>();
  for (const id of conceptIds) {
    for (const e of out[id] ?? []) {
      if (e.relation !== "CONTRADICTS") continue;
      const key = relId(e);
      if (seen.has(key)) continue;
      seen.add(key);
      // Include when either endpoint or incident neighbourhood is in scope
      if (scope.has(e.subject_id) || scope.has(e.object_id)) hits.push(e);
    }
  }
  // Also scan gold finding ids even if Ask did not retrieve them — gold index uses concept overlap separately
  return hits;
}

/**
 * Build Cap 10 report from Ask grounding (+ optional discovery conflict candidates).
 */
export function buildContradictionReport(input: {
  question: string;
  grounding: AskGrounding;
  /** Optional Radar/discovery conflict candidates — never invented. */
  discoveryConflicts?: readonly ResearchGapCandidate[];
}): ContradictionReport {
  const question = input.question.trim();
  const { grounding } = input;
  const items: ContradictionItem[] = [];

  // 0) First-class CONTRADICTS gold pairs (both sides retained)
  const goldHits = matchContradictionGoldPairs(grounding.nodeIds);
  for (const p of goldHits) {
    const sideA = enrichSideFromBackingEdge(p.sideA);
    const sideB = enrichSideFromBackingEdge(p.sideB);
    items.push({
      id: `cx:${p.id}`,
      kind: "first_class_contradicts",
      subjectId: p.sideA.findingId,
      objectId: p.sideB.findingId,
      subjectName: sideA.statement,
      objectName: sideB.statement,
      supportIds: [p.sideA.findingId, p.sideA.backingRelId],
      opposeIds: [p.sideB.findingId, p.sideB.backingRelId],
      supportPmids: [],
      opposePmids: [],
      relations: ["CONTRADICTS"],
      summary: `CONTRADICTS (unresolved): Side A — ${sideA.statement} [${formatSideContext(sideA)}]. Side B — ${sideB.statement} [${formatSideContext(sideB)}]. Both retained; majorityVote=false.`,
      sideA,
      sideB,
      resolution: "unresolved",
      majorityVote: false,
      silentMerge: false,
    });
  }

  // 1) Opposite-sign graph edges in retrieved neighbourhood
  const pairs = findOppositeSignPairs(grounding.nodeIds);
  for (const p of pairs) {
    const plusRels = p.plus.map((e) => e.relation);
    const minusRels = p.minus.map((e) => e.relation);
    const plusCtx = p.plus.map((e) => ({
      statement: `${nodeName(e.subject_id)} —${e.relation}→ ${nodeName(e.object_id)}`,
      backingRelId: relId(e),
      tissue: e.location?.trim() || null,
      method: null,
      population: null,
      sourceRefs: uniq(e.source_refs ?? []).length ? uniq(e.source_refs ?? []) : ["TO_BE_CURATED"],
    }));
    const minusCtx = p.minus.map((e) => ({
      statement: `${nodeName(e.subject_id)} —${e.relation}→ ${nodeName(e.object_id)}`,
      backingRelId: relId(e),
      tissue: e.location?.trim() || null,
      method: null,
      population: null,
      sourceRefs: uniq(e.source_refs ?? []).length ? uniq(e.source_refs ?? []) : ["TO_BE_CURATED"],
    }));
    items.push({
      id: `opp:${p.subjectId}->${p.objectId}`,
      kind: "opposite_sign_edges",
      subjectId: p.subjectId,
      objectId: p.objectId,
      subjectName: nodeName(p.subjectId),
      objectName: nodeName(p.objectId),
      supportIds: p.plus.map((e) => relId(e)),
      opposeIds: p.minus.map((e) => relId(e)),
      supportPmids: [],
      opposePmids: [],
      relations: uniq([...plusRels, ...minusRels]),
      summary: `${nodeName(p.subjectId)} → ${nodeName(p.objectId)} carries both activating (+) and inhibiting (−) typed relations (${uniq([...plusRels, ...minusRels]).join(", ")}). Both remain visible — unresolved.`,
      sideA: plusCtx[0],
      sideB: minusCtx[0],
      resolution: "unresolved",
      majorityVote: false,
      silentMerge: false,
    });
  }

  // 2) Counterevidence cites (contradicts / partial) vs reviewed supports on same edge
  const byRel = new Map<string, { support: CitationLike[]; oppose: CitationLike[] }>();
  for (const c of grounding.reviewedCites ?? []) {
    const rid = c.relationship_id;
    if (!rid) continue;
    const bucket = byRel.get(rid) ?? { support: [], oppose: [] };
    if (c.claim_support === "supports") bucket.support.push(c);
    byRel.set(rid, bucket);
  }
  for (const c of grounding.counterEvidence ?? []) {
    const rid = c.relationship_id;
    if (!rid) continue;
    const bucket = byRel.get(rid) ?? { support: [], oppose: [] };
    if (c.claim_support === "contradicts" || c.claim_support === "partial") {
      bucket.oppose.push(c);
    }
    byRel.set(rid, bucket);
  }
  for (const [relationshipId, bucket] of byRel) {
    if (!bucket.oppose.length) continue;
    const link = grounding.links.find((l) => l.relId === relationshipId);
    const subjectId = link?.subjectId ?? "";
    const objectId = link?.objectId ?? "";
    const edge = edgeByRel[relationshipId];
    items.push({
      id: `cite:${relationshipId}`,
      kind: "counterevidence_cite",
      subjectId,
      objectId,
      subjectName: subjectId ? nodeName(subjectId) : "(unknown subject)",
      objectName: objectId ? nodeName(objectId) : "(unknown object)",
      supportIds: bucket.support.map((c) => c.evidence_id).filter(Boolean),
      opposeIds: bucket.oppose.map((c) => c.evidence_id).filter(Boolean),
      supportPmids: uniq(bucket.support.map(pmidOf).filter(Boolean) as string[]),
      opposePmids: uniq(bucket.oppose.map(pmidOf).filter(Boolean) as string[]),
      relations: link ? [link.relation] : [],
      summary: `Relationship ${relationshipId}: ${bucket.support.length} Gate C / supports row(s) coexist with ${bucket.oppose.length} contradicts/partial assessment(s). Do not majority-vote; leave unresolved.`,
      sideA: {
        statement: `supports (${bucket.support.length})`,
        backingRelId: relationshipId,
        tissue: edge?.location?.trim() || null,
        method: null,
        population: null,
        sourceRefs: uniq(bucket.support.map(pmidOf).filter(Boolean) as string[]),
      },
      sideB: {
        statement: `contradicts/partial (${bucket.oppose.length})`,
        backingRelId: relationshipId,
        tissue: edge?.location?.trim() || null,
        method: null,
        population: null,
        sourceRefs: uniq(bucket.oppose.map(pmidOf).filter(Boolean) as string[]),
      },
      resolution: "unresolved",
      majorityVote: false,
      silentMerge: false,
    });
  }

  // Also surface counterevidence that has no matching support bucket yet
  for (const c of grounding.counterEvidence ?? []) {
    if (c.claim_support !== "contradicts" && c.claim_support !== "partial") continue;
    const rid = c.relationship_id;
    if (rid && byRel.get(rid)?.oppose.length) continue; // already added
    const link = rid ? grounding.links.find((l) => l.relId === rid) : undefined;
    items.push({
      id: `cite-orphan:${c.evidence_id || c.pmid || items.length}`,
      kind: "counterevidence_cite",
      subjectId: link?.subjectId ?? "",
      objectId: link?.objectId ?? "",
      subjectName: link ? nodeName(link.subjectId) : "(unscoped)",
      objectName: link ? nodeName(link.objectId) : "(unscoped)",
      supportIds: [],
      opposeIds: [c.evidence_id].filter(Boolean),
      supportPmids: [],
      opposePmids: uniq([pmidOf(c)].filter(Boolean) as string[]),
      relations: link ? [link.relation] : [],
      summary: `Counterevidence ${c.label || c.pmid || c.evidence_id}: ${c.claim_support} — surfaced without resolving against supports.`,
      resolution: "unresolved",
      majorityVote: false,
      silentMerge: false,
    });
  }

  // 3) Optional discovery conflict candidates (Radar) scoped to retrieved nodes when possible
  const conflicts = input.discoveryConflicts ?? [];
  const nodeSet = new Set(grounding.nodeIds);
  for (const g of conflicts) {
    if (g.detectionSource !== "conflict" && g.coverageLabel !== "conflicting") continue;
    const a = g.subjectId ?? g.diseaseId ?? "";
    const b = g.objectId ?? "";
    const scopedIds = [a, b, g.diseaseId].filter((id): id is string => !!id);
    if (scopedIds.length && !scopedIds.some((id) => nodeSet.has(id))) continue;
    items.push({
      id: `disc:${g.gapKey}`,
      kind: "discovery_conflict",
      subjectId: a,
      objectId: b,
      subjectName: a ? nodeName(a) : g.title,
      objectName: b ? nodeName(b) : "(see dossier)",
      supportIds: g.relationshipId ? [g.relationshipId] : [],
      opposeIds: [g.gapKey],
      supportPmids: [],
      opposePmids: [],
      relations: [],
      summary: `Discovery conflict candidate “${g.title}”: ${g.whyItMatters.slice(0, 220)}${g.whyItMatters.length > 220 ? "…" : ""} — candidate only; not voted truth.`,
      resolution: "unresolved",
      majorityVote: false,
      silentMerge: false,
    });
  }

  // De-dupe by id
  const seen = new Set<string>();
  const deduped = items.filter((it) => {
    if (seen.has(it.id)) return false;
    seen.add(it.id);
    return true;
  });

  const counts: Record<ContradictionKind, number> = {
    first_class_contradicts: 0,
    opposite_sign_edges: 0,
    counterevidence_cite: 0,
    discovery_conflict: 0,
  };
  for (const it of deduped) counts[it.kind] += 1;

  return {
    kind: CONTRADICTION_CAPABILITY,
    schemaVersion: CONTRADICTION_REPORT_SCHEMA_VERSION,
    capabilityLabel: "Available research capability",
    product: "Cap 10 Scientific contradictions",
    question,
    items: deduped,
    counts,
    honestEmpty: deduped.length === 0,
    honesty: [
      "Available research capability — Cap 10 contradiction report, not clinical advice.",
      "First-class CONTRADICTS relation is indexed (relation_semantics + draft gold pairs); opposing findings remain visible.",
      "Opposing findings remain visible — never silent-merge, never majority-vote “truth”.",
      "Honest empty means none retrieved in this neighbourhood / assessment set — not that literature agrees worldwide.",
      "kgWrite=false · clinicalAdvice=false · majorityVote=false · firstClassContradictsRelation=true.",
    ],
    kgWrite: false,
    clinicalAdvice: false,
    firstClassContradictsRelation: true,
  };
}

export function formatContradictionMarkdown(report: ContradictionReport): string {
  const lines: string[] = [
    `# ${report.product} (${report.schemaVersion})`,
    ``,
    `> ${report.honesty[0]}`,
    ``,
    `Question: ${report.question}`,
    ``,
  ];
  if (report.honestEmpty) {
    lines.push(
      `_Honest empty: no first-class CONTRADICTS gold pairs, opposite-sign edges, counterevidence cites, or scoped discovery conflicts retrieved for this neighbourhood. Not a claim that the literature agrees._`,
      ``,
    );
  } else {
    lines.push(`## Unresolved contradictions (${report.items.length})`, ``);
    for (const it of report.items) {
      lines.push(
        `- **[${it.kind}]** ${it.summary}`,
        `  - Pair: ${it.subjectName} ↔ ${it.objectName}`,
        `  - Support ids: ${it.supportIds.join(", ") || "—"}`,
        `  - Oppose ids: ${it.opposeIds.join(", ") || "—"}`,
        `  - PMIDs support/oppose: ${it.supportPmids.join(", ") || "—"} / ${it.opposePmids.join(", ") || "—"}`,
        `  - Resolution: unresolved (majorityVote=false)`,
      );
      if (it.sideA && it.sideB) {
        lines.push(
          `  - Side A: ${it.sideA.statement} (${formatSideContext(it.sideA)})`,
          `  - Side B: ${it.sideB.statement} (${formatSideContext(it.sideB)})`,
        );
      }
    }
    lines.push(``);
  }
  lines.push(`## Honesty`, ...report.honesty.map((h) => `- ${h}`), ``);
  return lines.join("\n");
}

/** Exported for tests — pair key helper. */
export function _pairKeyForTest(a: string, b: string): string {
  return pairKey(a, b);
}

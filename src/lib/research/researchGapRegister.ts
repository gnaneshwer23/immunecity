/**
 * Cap 11 — Underexplored mechanisms / research gaps (§6.16).
 * Prioritised gap register with mandatory search-scope honesty.
 * “Not in KG” must never read as “not in literature.”
 *
 * Schema cap11-2: entry kinds, suggested next steps, atlas paths,
 * Cap 10 cross-links, and priorityCounts for register UX depth.
 */
import { byId, TYPES } from "@/lib/immune/engine";
import type { AskGrounding } from "@/lib/askGrounding";
import {
  classifyEvidenceGap,
  EVIDENCE_GAP_PROVENANCE_NOTE,
  EVIDENCE_GAP_UI,
  evidenceGapLabelDescription,
  type EvidenceGapLabel,
  type EvidenceGapSignals,
} from "./evidenceGap";
import { DEFAULT_ISI_SEARCH_SCOPE, type SearchScope } from "@/lib/discovery/types";
import type { ContradictionItem } from "./contradictionReport";

export const RESEARCH_GAP_REGISTER_SCHEMA_VERSION = "cap11-2";
export const RESEARCH_GAP_CAPABILITY = "cap11_underexplored_mechanisms" as const;

export type GapRegisterPriority =
  | "conflicting"
  | "insufficient_coverage"
  | "no_mapped_evidence"
  | "awaiting_curation"
  | "context_gap"
  | "emerging"
  | "no_direct_evidence_after_search";

export type GapRegisterEntryKind =
  | "concept_coverage"
  | "context_gap"
  | "mechanism_edge"
  | "contradiction_crosslink";

export type ResearchGapRegisterEntry = {
  id: string;
  conceptId: string | null;
  conceptName: string | null;
  priority: GapRegisterPriority;
  gapLabel: EvidenceGapLabel | "context_gap" | null;
  entryKind: GapRegisterEntryKind;
  title: string;
  detail: string;
  /** Honest research next step — never clinical advice. */
  suggestedNextStep: string;
  /** Internal concept path when conceptId is a graph node; null for context-only rows. */
  atlasPath: string | null;
  /** Cap 10 item ids when this gap is driven by unresolved contradictions. */
  relatedContradictionIds: string[];
  /** Mandatory — Cap 11 acceptance. */
  searchScope: SearchScope;
  /** Explicit: gap ≠ worldwide literature absence. */
  notWorldwideAbsence: true;
  /** Explicit: gap ≠ Cat 2 established knowledge. */
  notCat2Absence: true;
};

export type ResearchGapRegister = {
  kind: typeof RESEARCH_GAP_CAPABILITY;
  schemaVersion: typeof RESEARCH_GAP_REGISTER_SCHEMA_VERSION;
  capabilityLabel: "Available research capability";
  product: "Cap 11 Underexplored mechanisms / research gaps";
  question: string;
  entries: ResearchGapRegisterEntry[];
  /** Counts per priority after sort (depth UX). */
  priorityCounts: Record<GapRegisterPriority, number>;
  searchScope: SearchScope;
  scopeHonestyNote: string;
  honestEmpty: boolean;
  honesty: string[];
  kgWrite: false;
  clinicalAdvice: false;
};

const PRIORITY_ORDER: GapRegisterPriority[] = [
  "conflicting",
  "insufficient_coverage",
  "no_mapped_evidence",
  "awaiting_curation",
  "no_direct_evidence_after_search",
  "context_gap",
  "emerging",
];

const EMPTY_COUNTS = (): Record<GapRegisterPriority, number> => ({
  conflicting: 0,
  insufficient_coverage: 0,
  no_mapped_evidence: 0,
  awaiting_curation: 0,
  context_gap: 0,
  emerging: 0,
  no_direct_evidence_after_search: 0,
});

function priorityOf(label: EvidenceGapLabel | "context_gap"): GapRegisterPriority {
  if (label === "context_gap") return "context_gap";
  return label;
}

function nodeName(id: string): string {
  return byId[id]?.name ?? id;
}

function atlasPathFor(conceptId: string | null): string | null {
  if (!conceptId) return null;
  if (!byId[conceptId]) return null;
  return `/atlas/${conceptId}`;
}

function suggestedNextStepFor(
  priority: GapRegisterPriority,
  entryKind: GapRegisterEntryKind,
): string {
  switch (priority) {
    case "conflicting":
      return entryKind === "contradiction_crosslink"
        ? "Open Cap 10 contradiction block — retain both sides; do not majority-vote. Curate study context (tissue/method/population) before any claim merge."
        : "Review ISI conflicting / counterevidence records; keep both sides visible until curator resolution.";
    case "insufficient_coverage":
      return "Load Gate C / mapped-evidence counts for this concept, or mark signals incomplete — do not invent zero worldwide.";
    case "no_mapped_evidence":
      return "Search within ISI date-scope and/or propose curation of existing literature locators — gap is ISI-mapped coverage only.";
    case "awaiting_curation":
      return "Route draft / unreviewed mapped material through Gate C claim review (kgWrite stays false from this register).";
    case "no_direct_evidence_after_search":
      return "Widen product search scope or accept scoped empty hits — still not worldwide literature absence.";
    case "context_gap":
      return "Do not transfer claims across missing biological settings; record the required context before synthesis.";
    case "emerging":
      return "Treat as teaching / hypothesis class — require Gate C before treating as established mechanism support.";
  }
}

function countPriorities(entries: ResearchGapRegisterEntry[]): Record<GapRegisterPriority, number> {
  const counts = EMPTY_COUNTS();
  for (const e of entries) counts[e.priority] += 1;
  return counts;
}

/** Group entries in PRIORITY_ORDER for Cap 11 register UX. */
export function groupResearchGapEntriesByPriority(
  entries: readonly ResearchGapRegisterEntry[],
): Array<{ priority: GapRegisterPriority; entries: ResearchGapRegisterEntry[] }> {
  const map = new Map<GapRegisterPriority, ResearchGapRegisterEntry[]>();
  for (const p of PRIORITY_ORDER) map.set(p, []);
  for (const e of entries) {
    map.get(e.priority)!.push(e);
  }
  return PRIORITY_ORDER.filter((p) => (map.get(p)?.length ?? 0) > 0).map((priority) => ({
    priority,
    entries: map.get(priority)!,
  }));
}

/**
 * Build Cap 11 register from Ask grounding + optional per-concept Gate C signals.
 * Missing signals → insufficient_coverage (unknown), never invented zero worldwide.
 * Optional Cap 10 contradiction items seed conflicting cross-link rows (both sides retained upstream).
 */
export function buildResearchGapRegister(input: {
  question: string;
  grounding: AskGrounding;
  /** Optional real Gate C / search signals keyed by concept id. */
  signalsByConcept?: Record<string, EvidenceGapSignals>;
  searchScope?: SearchScope;
  /** Cap 10 items — seed conflicting register rows without inventing science. */
  contradictionItems?: readonly ContradictionItem[];
}): ResearchGapRegister {
  const question = input.question.trim();
  const { grounding } = input;
  const scope = input.searchScope ?? DEFAULT_ISI_SEARCH_SCOPE;
  const signalsByConcept = input.signalsByConcept ?? {};
  const entries: ResearchGapRegisterEntry[] = [];
  const seen = new Set<string>();

  // Cap 10 cross-links first (highest priority band)
  for (const it of input.contradictionItems ?? []) {
    if (it.resolution !== "unresolved") continue;
    const key = `cxlink:${it.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const conceptId = it.subjectId && byId[it.subjectId] ? it.subjectId : null;
    entries.push({
      id: key,
      conceptId,
      conceptName: it.subjectName || conceptId,
      priority: "conflicting",
      gapLabel: "conflicting",
      entryKind: "contradiction_crosslink",
      title: "Unresolved contradiction (Cap 10 cross-link)",
      detail: `${it.summary} Cap 11 treats this as a research gap in coverage/consensus — not worldwide literature silence; majorityVote=${it.majorityVote}.`,
      suggestedNextStep: suggestedNextStepFor("conflicting", "contradiction_crosslink"),
      atlasPath: atlasPathFor(conceptId),
      relatedContradictionIds: [it.id],
      searchScope: scope,
      notWorldwideAbsence: true,
      notCat2Absence: true,
    });
  }

  for (const id of grounding.nodeIds.slice(0, 24)) {
    const gap = classifyEvidenceGap(id, signalsByConcept[id]);
    if (!gap) continue;
    const key = `gap:${id}:${gap}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const n = byId[id];
    const priority = priorityOf(gap);
    entries.push({
      id: key,
      conceptId: id,
      conceptName: n ? `${n.name} (${TYPES[n.node_type].label})` : id,
      priority,
      gapLabel: gap,
      entryKind: "concept_coverage",
      title: EVIDENCE_GAP_UI[gap].label,
      detail: evidenceGapLabelDescription(gap),
      suggestedNextStep: suggestedNextStepFor(priority, "concept_coverage"),
      atlasPath: atlasPathFor(id),
      relatedContradictionIds: [],
      searchScope: scope,
      notWorldwideAbsence: true,
      notCat2Absence: true,
    });
  }

  for (const ctx of grounding.contextGaps ?? []) {
    const key = `ctx:${ctx}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({
      id: key,
      conceptId: null,
      conceptName: null,
      priority: "context_gap",
      gapLabel: "context_gap",
      entryKind: "context_gap",
      title: "Biological context gap",
      detail: `Question requires setting “${ctx}” that retrieved graph evidence does not establish. Do not transfer claims across settings. The graph has no species field.`,
      suggestedNextStep: suggestedNextStepFor("context_gap", "context_gap"),
      atlasPath: null,
      relatedContradictionIds: [],
      searchScope: scope,
      notWorldwideAbsence: true,
      notCat2Absence: true,
    });
  }

  // Links with missing Gate C support are underexplored edges — scoped honesty only
  for (const link of grounding.links.slice(0, 16)) {
    if (link.hasClaimSupport && link.reviewedEvidenceCount > 0) continue;
    if (link.tier !== "missing-support" && link.tier !== "hypothesis" && link.tier !== "draft" && link.tier !== "emerging") {
      continue;
    }
    const key = `rel:${link.relId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const priority: GapRegisterPriority =
      link.tier === "emerging" ? "emerging" : "awaiting_curation";
    const gapLabel = priority;
    entries.push({
      id: key,
      conceptId: link.subjectId,
      conceptName: `${nodeName(link.subjectId)} → ${nodeName(link.objectId)}`,
      priority,
      gapLabel,
      entryKind: "mechanism_edge",
      title:
        link.tier === "emerging"
          ? "Emerging / lightly supported mechanism edge"
          : "Mechanism edge awaiting Gate C claim support",
      detail: `${nodeName(link.subjectId)} —${link.relation}→ ${nodeName(link.objectId)} [${link.relId}; tier=${link.tier}]. Underexplored within ISI curated coverage — not a claim that literature is empty.`,
      suggestedNextStep: suggestedNextStepFor(priority, "mechanism_edge"),
      atlasPath: atlasPathFor(link.subjectId),
      relatedContradictionIds: [],
      searchScope: scope,
      notWorldwideAbsence: true,
      notCat2Absence: true,
    });
  }

  const order = new Map(PRIORITY_ORDER.map((p, i) => [p, i]));
  entries.sort((a, b) => {
    const pa = order.get(a.priority) ?? 99;
    const pb = order.get(b.priority) ?? 99;
    if (pa !== pb) return pa - pb;
    return a.id.localeCompare(b.id);
  });

  const priorityCounts = countPriorities(entries);

  return {
    kind: RESEARCH_GAP_CAPABILITY,
    schemaVersion: RESEARCH_GAP_REGISTER_SCHEMA_VERSION,
    capabilityLabel: "Available research capability",
    product: "Cap 11 Underexplored mechanisms / research gaps",
    question,
    entries,
    priorityCounts,
    searchScope: scope,
    scopeHonestyNote: EVIDENCE_GAP_PROVENANCE_NOTE,
    honestEmpty: entries.length === 0,
    honesty: [
      "Available research capability — Cap 11 research-gap register, not clinical advice.",
      EVIDENCE_GAP_PROVENANCE_NOTE,
      `Search scope: ${scope.corpus} · ${scope.method} · ${scope.dateScope}. ${scope.note}`,
      "Gaps are meta / coverage labels — not Category 2 established absence-of-world claims.",
      "“Not in the ISI graph” ≠ “not in the scientific literature.”",
      "Cap 10 cross-links retain unresolved contradictions (majorityVote=false); Cap 11 does not resolve them.",
      "kgWrite=false · clinicalAdvice=false.",
    ],
    kgWrite: false,
    clinicalAdvice: false,
  };
}

export function formatResearchGapRegisterMarkdown(reg: ResearchGapRegister): string {
  const lines: string[] = [
    `# ${reg.product} (${reg.schemaVersion})`,
    ``,
    `> ${reg.scopeHonestyNote}`,
    ``,
    `Question: ${reg.question}`,
    ``,
    `## Search scope (mandatory)`,
    `- Corpus: ${reg.searchScope.corpus}`,
    `- Method: ${reg.searchScope.method}`,
    `- Date scope: ${reg.searchScope.dateScope}`,
    `- Note: ${reg.searchScope.note}`,
    ``,
  ];

  const nonZero = PRIORITY_ORDER.filter((p) => reg.priorityCounts[p] > 0);
  if (nonZero.length) {
    lines.push(`## Priority counts`, ``);
    for (const p of nonZero) {
      lines.push(`- ${p}: ${reg.priorityCounts[p]}`);
    }
    lines.push(``);
  }

  if (reg.honestEmpty) {
    lines.push(
      `_Honest empty: no gap / context / underexplored-edge rows for this retrieval — not a claim that mechanisms are fully explored in literature._`,
      ``,
    );
  } else {
    lines.push(`## Prioritised register (${reg.entries.length})`, ``);
    for (const group of groupResearchGapEntriesByPriority(reg.entries)) {
      lines.push(`### ${group.priority} (${group.entries.length})`, ``);
      for (const e of group.entries) {
        lines.push(
          `- **[${e.entryKind}]** ${e.title}${e.conceptName ? ` — ${e.conceptName}` : ""}`,
          `  - ${e.detail}`,
          `  - Next: ${e.suggestedNextStep}`,
          e.atlasPath ? `  - Atlas: ${e.atlasPath}` : `  - Atlas: (none)`,
          e.relatedContradictionIds.length
            ? `  - Cap 10: ${e.relatedContradictionIds.join(", ")}`
            : `  - Cap 10: (none)`,
          `  - notWorldwideAbsence=true · notCat2Absence=true`,
        );
      }
      lines.push(``);
    }
  }
  lines.push(`## Honesty`, ...reg.honesty.map((h) => `- ${h}`), ``);
  return lines.join("\n");
}

/* Browser-safe retrieval and guardrails for Ask Immune (tested in src/test/ai-grounding.test.ts). */
import { KG, byId, human, out, inn, relId, edgeRef, edgeByRel, shortestPath, type KGNode, type KGEdge } from "@/lib/immune/engine";
import { conceptExtras } from "@/lib/immune/concepts";
import { partitionEvidencePolarity } from "@/lib/immune/evidenceInvariants";
import {
  counterCitationsFor,
  relationshipStatus,
  STATUS_INFO,
  supportingCitationsFor,
  type CitationLike,
  type ReviewStatus,
} from "@/lib/immune/evidenceStatus";
import { GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION, graphReleaseSnapshot } from "@/lib/immune/graphRelease";

export const MAX_QUESTION_CHARS = 500;
/** Bump when SYSTEM prompt or structured-answer rules change (FR-028). */
export const PROMPT_VERSION = "ask-grounding-v7";

/** Unreviewed literature hits (PubMed / Europe PMC). Never Gate C approved. */
export interface ProvisionalLitItem {
  pmid: string | null;
  doi: string | null;
  title: string;
  journal: string;
  year: string;
  source: "PubMed" | "EuropePMC";
  url: string;
}

/** Fold unicode (TNF-α → tnf a) and punctuation so aliases match typed questions. */
export function normaliseAskText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Whole-word / whole-phrase match on normalised text — never substring ("bari" ≠ "foobarium"). */
function hasWord(hay: string, needle: string): boolean {
  if (!needle || !hay) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`).test(hay);
}

export type EvidenceTier = "established" | "evidence-supported" | "emerging" | "hypothesis" | "draft" | "missing-support";

/** FR-022 query classes. */
export type AskQueryClass =
  | "graph_explanation"
  | "source_lookup"
  | "comparison"
  | "hypothesis_request"
  | "omics_request"
  | "mechanism_perturbation"
  | "unsupported"
  | "clinical_personal";

export type ExplanationAction =
  | "explain_mechanism"
  | "show_path"
  | "compare_explanations"
  | "what_evidence_missing"
  | "what_would_change"
  | "show_counterevidence";

export interface GroundedLink {
  relId: string;
  subjectId: string;
  objectId: string;
  relation: string;
  mechanism: string;
  confidence: KGEdge["confidence"];
  evidenceStatus: string;
  review: ReviewStatus;
  reviewLabel: string;
  tier: EvidenceTier;
  draft?: boolean;
  hasSourceLink: boolean;
  location?: string;
  /** Gate C approved+supports Neon rows mapped to this exact relationship. */
  reviewedEvidenceCount: number;
  reviewedPmids: string[];
  hasClaimSupport: boolean;
  /** Assessed contradicts/partial on this edge (separate from Gate C support). */
  counterEvidenceCount: number;
}

export interface CausalChainHop {
  fromId: string;
  toId: string;
  relId: string;
  relation: string;
  fwd: boolean;
  tier: EvidenceTier;
}

export interface AskTrace {
  promptVersion: string;
  graphVersion: string;
  extensionsVersion: string;
  graphSnapshot: string;
  queryClass: AskQueryClass;
  retrievedNodeIds: string[];
  retrievedRelIds: string[];
  abstained: boolean;
  abstentionReason: string | null;
}

export interface AskGrounding {
  text: string;
  nodeIds: string[];
  relIds: string[];
  nodes: KGNode[];
  links: GroundedLink[];
  chains: { fromId: string; toId: string; hops: CausalChainHop[] }[];
  queryClass: AskQueryClass;
  trace: AskTrace;
  coverage: {
    matched: boolean;
    draftCount: number;
    missingSupportCount: number;
    emergingCount: number;
    establishedCount: number;
    evidenceSupportedCount: number;
    /** Sum of Gate C approved+supports rows on retrieved links. */
    reviewedEvidenceCount: number;
    /** Assessed contradicts/partial rows (never counted as Gate C support). */
    counterEvidenceCount: number;
    /** Provisional (unreviewed) literature hits attached server-side. */
    provisionalLiteratureCount: number;
  };
  /** Server-attached counterevidence; empty when Neon has none (honest empty). */
  counterEvidence: CitationLike[];
  /** Server-attached unreviewed literature; empty on pure client prepareAsk. */
  provisionalLiterature: ProvisionalLitItem[];
}

const EMPTY_COVERAGE: AskGrounding["coverage"] = {
  matched: false,
  draftCount: 0,
  missingSupportCount: 0,
  emergingCount: 0,
  establishedCount: 0,
  evidenceSupportedCount: 0,
  reviewedEvidenceCount: 0,
  counterEvidenceCount: 0,
  provisionalLiteratureCount: 0,
};

export interface CitationValidation {
  ok: boolean;
  inventedConceptIds: string[];
  inventedRelIds: string[];
  unretrievedConceptIds: string[];
  unretrievedRelIds: string[];
  /** PMIDs treated as Gate C / verified support that are only provisional or absent. */
  unsupportedSupportClaims: string[];
  /** Provisional PMIDs mentioned without unreviewed/provisional labelling. */
  provisionalMislabels: string[];
  /** Edge IDs cited with strong support language but no Gate C supports row. */
  claimSupportGaps: string[];
  /** Human-readable fail reason for Ask fail-closed replies. */
  failReason: string | null;
}

export interface PrepareAskResult {
  grounding: AskGrounding;
  queryClass: AskQueryClass;
  callModel: boolean;
  replyText: string | null;
}

/**
 * Rank graph concepts for a question using name, aliases/synonyms, description and id.
 * Prefer phrase-level alias hits (e.g. "tumour necrosis factor", "RA") over weak desc tokens.
 */
export function relevantNodes(question: string, limit = 8): KGNode[] {
  const qNorm = normaliseAskText(question);
  if (!qNorm) return [];
  const tokens = qNorm.split(" ").filter((t) => t.length > 2);
  const scored = KG.nodes.map((n) => {
    const name = normaliseAskText(n.name);
    const desc = normaliseAskText(n.desc);
    const aliases = conceptExtras(n).aliases.map(normaliseAskText).filter(Boolean);
    let score = 0;

    if (name.length > 1 && hasWord(qNorm, name)) score += 8;
    // Multi-word alias / synonym phrase match (stronger than token scrape)
    for (const a of aliases) {
      if (!a) continue;
      if (hasWord(qNorm, a)) score += a.includes(" ") ? 8 : a.length <= 3 ? 6 : 7;
    }

    for (const t of tokens) {
      if (n.id.toLowerCase() === t) score += 5;
      else if (name === t || hasWord(name, t)) score += 5;
      else if (aliases.some((a) => a === t || hasWord(a, t))) score += 4;
      else if (t.length >= 4 && hasWord(desc, t)) score += 1;
    }

    if (!n.draft && score > 0) score += 0.5; // prefer reviewed core concepts
    return { n, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.n);
}

/** Prefer edges that connect two retrieved concepts; then degree-limited neighbours. */
function prioritisedEdges(nodes: KGNode[], perNode = 10): KGEdge[] {
  const idSet = new Set(nodes.map((n) => n.id));
  const between: KGEdge[] = [];
  const neighbourhood: KGEdge[] = [];
  const seen = new Set<string>();
  for (const n of nodes) {
    const edges = [...(out[n.id] || []), ...(inn[n.id] || [])];
    for (const e of edges) {
      const id = relId(e);
      if (seen.has(id)) continue;
      const other = e.subject_id === n.id ? e.object_id : e.subject_id;
      if (idSet.has(other) && other !== n.id) {
        seen.add(id);
        between.push(e);
      }
    }
  }
  for (const n of nodes) {
    const edges = [...(out[n.id] || []), ...(inn[n.id] || [])].slice(0, perNode);
    for (const e of edges) {
      const id = relId(e);
      if (seen.has(id)) continue;
      seen.add(id);
      neighbourhood.push(e);
    }
  }
  return [...between, ...neighbourhood];
}

/** Typeahead / instant lookup — same synonym field as retrieval, capped for UI. */
export function matchConceptSuggestions(query: string, limit = 5): KGNode[] {
  return relevantNodes(query, limit);
}

/* Personal clinical requests (dosing, "should I", my diagnosis) are refused without calling a model. */
const CLINICAL = /\b(should i|can i take|my (doctor|dose|medication|child|son|daughter|husband|wife|mother|father)|what dose|how much .* (take|give)|dosage for me|diagnose me|i have (been diagnosed|a rash|symptoms)|am i)\b/i;
export const isPersonalClinical = (q: string) => CLINICAL.test(q);

export const CLINICAL_REFUSAL =
  "I can't give personal medical advice, dosing or diagnosis. Ask Immune is an educational causal map — please talk to a clinician. I can explain how the immune mechanisms involved work in general if you rephrase the question.";

export const OMICS_ABSTENTION =
  "Omics and molecular-model analysis are not wired into Ask Immune yet — they remain planned adapters in the model registry. I can still map named genes or cells that already exist in the Immune Super Intelligence graph if you ask about those concepts specifically.";

export const UNSUPPORTED_ABSTENTION =
  "The Immune Super Intelligence graph does not cover this yet. I won't invent concepts, pathways or citations. Try a named cell, cytokine, receptor, disease or therapy from the atlas, or open Methods & trust for what is currently curated.";

const OMICS = /\b(scrna|scRNA|single[- ]cell|spatial omics|rna[- ]seq|bulk rna|differential expression|gene set enrichment|gsea|anndata|seurat|scanpy|vcf|variant call|alphafold|alphagenome|peptide[- ]?mhc|hla binding predict)\b/i;
const HYPOTHESIS = /\b(hypothes[ei]s|propose an experiment|falsif|what if we (block|inhibit|activate)|candidate mechanism|next experiment)\b/i;
const COMPARISON = /\b(compar(e|ison|ing)|versus|\bvs\.?\b|differ(ence|ent)? between|which is (more|better)|contrast)\b/i;
const SOURCE = /\b(pmid|doi|citation|source|paper|reference|pubmed|what (evidence|supports)|where is (this|that) (from|cited))\b/i;
const MECHANISM_PERTURB =
  /\b(what happens if|what happens downstream|if (we |i )?(block|inhibit|activate|knock|delete|neutrali[sz]e)|perturb|downstream (of|effect)|knockout|(is |are |was |were )?(blocked|inhibited|activated|neutrali[sz]ed))\b/i;

/** FR-022: classify before retrieval / model call. */
export function classifyAskQuery(question: string): AskQueryClass {
  const q = question.trim();
  if (!q) return "unsupported";
  if (isPersonalClinical(q)) return "clinical_personal";
  if (OMICS.test(q)) return "omics_request";
  if (HYPOTHESIS.test(q)) return "hypothesis_request";
  if (COMPARISON.test(q)) return "comparison";
  if (SOURCE.test(q)) return "source_lookup";
  if (MECHANISM_PERTURB.test(q)) return "mechanism_perturbation";
  if (relevantNodes(q, 1).length === 0) return "unsupported";
  return "graph_explanation";
}

function evidenceTier(edge: KGEdge, review: ReviewStatus): EvidenceTier {
  if (edge.draft || review === "draft") return "draft";
  if (review === "unreviewed" || review === "rejected") return "missing-support";
  const st = (edge.evidence_status || "").toUpperCase();
  if (st === "HYPOTHESIS") return "hypothesis";
  if (st === "EMERGING") return "emerging";
  if (st === "EVIDENCE-SUPPORTED" || review === "claim-assessed" || review === "source-verified") return "evidence-supported";
  if (st === "ESTABLISHED" || review === "approved") return "established";
  return "missing-support";
}

export function groundLink(edge: KGEdge, cites: CitationLike[] = []): GroundedLink {
  const review = relationshipStatus(edge, cites);
  const supporting = supportingCitationsFor(edge, cites);
  const counter = counterCitationsFor(edge, cites);
  const reviewedPmids = [
    ...new Set(supporting.map((c) => c.pmid).filter((p): p is string => !!p && /^\d+$/.test(p))),
  ];
  return {
    relId: relId(edge),
    subjectId: edge.subject_id,
    objectId: edge.object_id,
    relation: edge.relation,
    mechanism: edge.mechanism,
    confidence: edge.confidence,
    evidenceStatus: edge.evidence_status,
    review,
    reviewLabel: STATUS_INFO[review].label,
    tier: evidenceTier(edge, review),
    draft: edge.draft,
    hasSourceLink: !!edgeRef(edge),
    location: edge.location,
    reviewedEvidenceCount: supporting.length,
    reviewedPmids,
    hasClaimSupport: supporting.some((c) => c.claim_support === "supports"),
    counterEvidenceCount: counter.length,
  };
}

function buildChains(nodes: KGNode[], cites: CitationLike[], limit = 3): AskGrounding["chains"] {
  const chains: AskGrounding["chains"] = [];
  for (let i = 0; i < nodes.length && chains.length < limit; i++) {
    for (let j = i + 1; j < nodes.length && chains.length < limit; j++) {
      const a = nodes[i]!, b = nodes[j]!;
      const path = shortestPath(a.id, b.id, false);
      if (!path?.length) continue;
      const hops: CausalChainHop[] = [];
      let cur = a.id;
      for (const step of path) {
        const g = groundLink(step.r, cites);
        hops.push({
          fromId: cur,
          toId: step.to,
          relId: g.relId,
          relation: human(step.r.relation),
          fwd: step.fwd,
          tier: g.tier,
        });
        cur = step.to;
      }
      chains.push({ fromId: a.id, toId: b.id, hops });
    }
  }
  return chains;
}

function withClassAndTrace(
  base: Omit<AskGrounding, "queryClass" | "trace">,
  queryClass: AskQueryClass,
  abstained: boolean,
  reason: string | null,
): AskGrounding {
  return {
    ...base,
    queryClass,
    trace: {
      promptVersion: PROMPT_VERSION,
      graphVersion: GRAPH_CORE_VERSION,
      extensionsVersion: GRAPH_EXTENSIONS_VERSION,
      graphSnapshot: graphReleaseSnapshot().snapshotAt,
      queryClass,
      retrievedNodeIds: base.nodeIds,
      retrievedRelIds: base.relIds,
      abstained,
      abstentionReason: reason,
    },
  };
}

export function graphContext(question: string, queryClass?: AskQueryClass, cites: CitationLike[] = []): AskGrounding {
  const cls = queryClass ?? classifyAskQuery(question);
  const nodes = relevantNodes(question);
  if (!nodes.length) {
    return withClassAndTrace(
      {
        text: "NO_MATCH: no graph concepts matched the question.",
        nodeIds: [],
        relIds: [],
        nodes: [],
        links: [],
        chains: [],
        coverage: { ...EMPTY_COVERAGE },
        counterEvidence: [],
        provisionalLiterature: [],
      },
      cls,
      true,
      "no_graph_match",
    );
  }
  const lines: string[] = [];
  const seen = new Set<string>();
  const links: GroundedLink[] = [];
  lines.push(`QUERY_CLASS ${cls}`);
  for (const n of nodes) {
    const aliases = conceptExtras(n).aliases;
    const aliasNote = aliases.length ? ` aliases=[${aliases.slice(0, 6).join("; ")}]` : "";
    lines.push(`CONCEPT ${n.id} [${n.node_type}]${n.draft ? " [DRAFT]" : ""} ${n.name}: ${n.desc}${aliasNote}`);
  }

  const edges = prioritisedEdges(nodes, 10);
  for (const e of edges) {
    const id = relId(e);
    if (seen.has(id)) continue;
    seen.add(id);
    const s = byId[e.subject_id], o = byId[e.object_id];
    if (!s || !o) continue;
    const g = groundLink(e, cites);
    links.push(g);
    const support = g.hasSourceLink ? "source-linked" : "no-source-link";
    const reviewed =
      g.reviewedEvidenceCount > 0
        ? `reviewed-evidence=${g.reviewedEvidenceCount}${g.hasClaimSupport ? ", claim-supported" : ""}`
        : "reviewed-evidence=0";
    const tierNote = g.tier === "missing-support" ? ", MISSING-SUPPORT" : "";
    lines.push(
      `LINK ${id} ${s.name} --${human(e.relation)}--> ${o.name}: ${e.mechanism}` +
        ` (confidence: ${e.confidence}, evidence: ${e.evidence_status}, review: ${g.reviewLabel}, tier: ${g.tier}, support: ${support}, ${reviewed}` +
        `${e.draft ? ", DRAFT" : ""}${tierNote}${e.location ? `, tissue: ${e.location}` : ""})`,
    );
  }

  const chains = buildChains(nodes, cites);
  if (chains.length) {
    lines.push("CAUSAL_CHAINS (use these when explaining how concepts connect; cite each LINK id):");
    for (const c of chains) {
      const from = byId[c.fromId]?.name ?? c.fromId;
      const to = byId[c.toId]?.name ?? c.toId;
      const hopText = c.hops.map((h) => `${h.fwd ? "→" : "←"}[${h.relId}|${h.tier}]`).join(" ");
      lines.push(`CHAIN ${from} (${c.fromId}) ${hopText} ${to} (${c.toId})`);
    }
  } else if (nodes.length >= 2) {
    lines.push("CAUSAL_CHAINS none among top matched concepts — explain via individual LINKs; do not invent a path.");
  }

  const forLinks = cites.filter((c) => c.relationship_id && seen.has(c.relationship_id));
  const { supporting: reviewedForLinks, counter: counterForLinks } = partitionEvidencePolarity(forLinks);
  if (reviewedForLinks.length) {
    lines.push(
      "REVIEWED_EVIDENCE (Gate C: approved + supports + verified identifier — cite only these PMIDs/DOIs as reviewed support):",
    );
    for (const c of reviewedForLinks.slice(0, 40)) {
      lines.push(
        `EVIDENCE ${c.evidence_id} edge:${c.relationship_id} claim:${c.claim_support} ${c.label}` +
          `${c.reviewed_at ? ` reviewed:${c.reviewed_at}` : ""}`,
      );
    }
  } else {
    lines.push(
      "REVIEWED_EVIDENCE none for retrieved links — do not imply claim-level verification or invent PMIDs; state missing-support / unreviewed honestly.",
    );
  }
  if (counterForLinks.length) {
    lines.push(
      "COUNTER_EVIDENCE (assessed contradicts/partial — NOT Gate C support; surface as counterevidence / conflict, never as approved support):",
    );
    for (const c of counterForLinks.slice(0, 40)) {
      lines.push(
        `COUNTER ${c.evidence_id} edge:${c.relationship_id} claim:${c.claim_support} ${c.label}` +
          `${c.reviewed_at ? ` reviewed:${c.reviewed_at}` : ""}`,
      );
    }
  } else {
    lines.push(
      "COUNTER_EVIDENCE none for retrieved links — honest empty set (Neon may have zero contradicts/partial rows); do not invent counterevidence.",
    );
  }

  const reviewedEvidenceCount = links.reduce((n, l) => n + l.reviewedEvidenceCount, 0);
  const counterEvidenceCount = links.reduce((n, l) => n + l.counterEvidenceCount, 0);
  const coverage: AskGrounding["coverage"] = {
    matched: true,
    draftCount: links.filter((l) => l.tier === "draft").length + nodes.filter((n) => n.draft).length,
    missingSupportCount: links.filter((l) => l.tier === "missing-support").length,
    emergingCount: links.filter((l) => l.tier === "emerging" || l.tier === "hypothesis").length,
    establishedCount: links.filter((l) => l.tier === "established").length,
    evidenceSupportedCount: links.filter((l) => l.tier === "evidence-supported").length,
    reviewedEvidenceCount,
    counterEvidenceCount,
    provisionalLiteratureCount: 0,
  };

  lines.push(
    `COVERAGE_SUMMARY matched=${coverage.matched} established=${coverage.establishedCount}` +
      ` evidence-supported=${coverage.evidenceSupportedCount} emerging/hypothesis=${coverage.emergingCount}` +
      ` draft=${coverage.draftCount} missing-support=${coverage.missingSupportCount}` +
      ` reviewed-evidence-rows=${reviewedEvidenceCount} counter-evidence-rows=${counterEvidenceCount} provisional-lit=0`,
  );
  lines.push(`TRACE prompt=${PROMPT_VERSION} graph=${GRAPH_CORE_VERSION} extensions=${GRAPH_EXTENSIONS_VERSION}`);

  return withClassAndTrace(
    {
      text: lines.slice(0, 160).join("\n"),
      nodeIds: nodes.map((n) => n.id),
      relIds: [...seen],
      nodes,
      links,
      chains,
      coverage,
      counterEvidence: counterForLinks,
      provisionalLiterature: [],
    },
    cls,
    false,
    null,
  );
}

/** Whether Ask should request provisional PubMed/Europe PMC (server decides; UI mirrors). */
export function shouldFetchProvisionalLit(grounding: AskGrounding, queryClass: AskQueryClass): boolean {
  if (!grounding.coverage.matched || grounding.trace.abstained) return false;
  if (queryClass === "source_lookup") return true;
  return grounding.coverage.reviewedEvidenceCount === 0;
}

/** UI / SYSTEM copy for provisional hits — never Gate C. */
export function provisionalLitLabel(): string {
  return "Unreviewed literature (provisional)";
}

/** Attach counterevidence without mixing it into Gate C reviewed counts. */
export function attachCounterEvidence(grounding: AskGrounding, items: CitationLike[]): AskGrounding {
  const { counter } = partitionEvidencePolarity(items);
  if (!counter.length && grounding.counterEvidence.length === 0) {
    return {
      ...grounding,
      coverage: { ...grounding.coverage, counterEvidenceCount: grounding.coverage.counterEvidenceCount ?? 0 },
    };
  }
  const merged = [...grounding.counterEvidence];
  const seen = new Set(merged.map((c) => c.evidence_id));
  for (const c of counter) {
    if (seen.has(c.evidence_id)) continue;
    seen.add(c.evidence_id);
    merged.push(c);
  }
  // Ensure extract has COUNTER_EVIDENCE block reflecting attached rows.
  let text = grounding.text;
  if (!/COUNTER_EVIDENCE/.test(text) && merged.length) {
    const lines = [
      "COUNTER_EVIDENCE (assessed contradicts/partial — NOT Gate C support; surface as counterevidence / conflict, never as approved support):",
      ...merged.slice(0, 40).map(
        (c) =>
          `COUNTER ${c.evidence_id} edge:${c.relationship_id} claim:${c.claim_support} ${c.label}` +
          `${c.reviewed_at ? ` reviewed:${c.reviewed_at}` : ""}`,
      ),
    ];
    text = text.replace(
      /counter-evidence-rows=\d+/,
      `counter-evidence-rows=${merged.length}`,
    ).concat("\n", lines.join("\n"));
  } else {
    text = text.replace(/counter-evidence-rows=\d+/, `counter-evidence-rows=${merged.length}`);
  }
  return {
    ...grounding,
    text,
    counterEvidence: merged,
    coverage: { ...grounding.coverage, counterEvidenceCount: merged.length },
  };
}

/** Attach server-fetched provisional literature and rewrite extract lines (never upgrades Gate C). */
export function attachProvisionalLiterature(grounding: AskGrounding, items: ProvisionalLitItem[]): AskGrounding {
  if (!items.length) return grounding;
  const lines = [
    "PROVISIONAL_LITERATURE (unreviewed PubMed/Europe PMC hits — NOT Gate C approved; NEVER claim these support a relationship; label clearly as unreviewed literature):",
  ];
  for (const it of items.slice(0, 8)) {
    const id = it.pmid ? `PMID ${it.pmid}` : it.doi ? `DOI ${it.doi}` : "no-id";
    lines.push(
      `PROVISIONAL ${id} source=${it.source} year=${it.year || "?"} journal=${it.journal || "?"} title=${it.title.slice(0, 180)} url=${it.url}`,
    );
  }
  const text = grounding.text
    .replace(/provisional-lit=\d+/, `provisional-lit=${items.length}`)
    .concat("\n", lines.join("\n"));
  return {
    ...grounding,
    text,
    provisionalLiterature: items,
    coverage: {
      ...grounding.coverage,
      provisionalLiteratureCount: items.length,
    },
  };
}

/** Orchestrate classify → retrieve → abstain-or-call (FR-022/024/026/028). */
export function prepareAsk(question: string, cites: CitationLike[] = []): PrepareAskResult {
  const queryClass = classifyAskQuery(question);
  if (queryClass === "clinical_personal") {
    const grounding = withClassAndTrace(
      {
        text: "NO_MATCH: clinical personal request — model must not answer.",
        nodeIds: [],
        relIds: [],
        nodes: [],
        links: [],
        chains: [],
        coverage: { ...EMPTY_COVERAGE },
        counterEvidence: [],
        provisionalLiterature: [],
      },
      queryClass,
      true,
      "clinical_personal",
    );
    return { grounding, queryClass, callModel: false, replyText: CLINICAL_REFUSAL };
  }
  if (queryClass === "omics_request") {
    const grounding = graphContext(question, queryClass, cites);
    // Omics adapters are not live — abstain even if some gene names match.
    const reply = grounding.coverage.matched
      ? `${OMICS_ABSTENTION}\n\nRelated concepts already in the graph: ${grounding.nodes.slice(0, 4).map((n) => n.name).join(", ")}.`
      : OMICS_ABSTENTION;
    return {
      grounding: {
        ...grounding,
        trace: { ...grounding.trace, abstained: true, abstentionReason: "omics_not_implemented" },
      },
      queryClass,
      callModel: false,
      replyText: reply,
    };
  }

  const grounding = graphContext(question, queryClass, cites);
  if (!grounding.coverage.matched || queryClass === "unsupported") {
    return {
      grounding: {
        ...grounding,
        queryClass: "unsupported",
        trace: {
          ...grounding.trace,
          queryClass: "unsupported",
          abstained: true,
          abstentionReason: "no_graph_match",
        },
      },
      queryClass: "unsupported",
      callModel: false,
      replyText: UNSUPPORTED_ABSTENTION,
    };
  }

  return { grounding, queryClass, callModel: true, replyText: null };
}

/** Affirmative Gate C / verified-support claims — exclude “not Gate C …” negations. */
const STRONG_SUPPORT_LANG =
  /(?:(?<!\bnot\s)\bgate\s*c\s+(?:approved|reviewed|support)|(?:has|with)\s+gate\s*c|\bapproved\s+support|\bscientifically\s+verified|\bclaim[- ]supported|\breviewed\s+cite(?:s|d)?|\bproven\s+by|\bconfirmed\s+by\s+pmid|\bdefinitively\s+shows)\b/i;
const PROVISIONAL_LABEL =
  /\b(unreviewed|provisional|not\s+gate\s*c|not\s+approved|literature\s+hit)\b/i;

function nearbyWindow(text: string, index: number, radius = 120): string {
  return text.slice(Math.max(0, index - radius), Math.min(text.length, index + radius));
}

/**
 * FR-025 + ISI-005 MVP: reject invented/unretrieved IDs; fail closed on Gate C overclaims
 * and unlabelled provisional PMIDs. Full passage entailment remains planned (no span ledger yet).
 */
export function validateAnswerCitations(text: string, grounding: AskGrounding): CitationValidation {
  const allowedNodes = new Set(grounding.nodeIds);
  const allowedRels = new Set(grounding.relIds);
  const inventedConceptIds: string[] = [];
  const inventedRelIds: string[] = [];
  const unretrievedConceptIds: string[] = [];
  const unretrievedRelIds: string[] = [];
  const unsupportedSupportClaims: string[] = [];
  const provisionalMislabels: string[] = [];
  const claimSupportGaps: string[] = [];

  for (const m of text.matchAll(/\]\(concept:([^)]+)\)/g)) {
    const id = (m[1] ?? "").trim();
    if (!id) continue;
    if (!byId[id]) inventedConceptIds.push(id);
    else if (!allowedNodes.has(id)) unretrievedConceptIds.push(id);
  }
  for (const m of text.matchAll(/\]\(edge:([^)]+)\)/g)) {
    const id = (m[1] ?? "").trim();
    if (!id) continue;
    if (!edgeByRel[id]) inventedRelIds.push(id);
    else if (!allowedRels.has(id)) unretrievedRelIds.push(id);
  }

  const gateCPmids = new Set(
    grounding.links.flatMap((l) => l.reviewedPmids).filter((p) => /^\d+$/.test(p)),
  );
  for (const c of grounding.counterEvidence) {
    // Counter PMIDs are allowed as identifiers but must not be sold as Gate C support.
    if (c.pmid && /^\d+$/.test(c.pmid)) {
      /* tracked below */
    }
  }
  const provisionalPmids = new Set(
    grounding.provisionalLiterature.map((p) => p.pmid).filter((p): p is string => !!p),
  );
  const counterPmids = new Set(
    grounding.counterEvidence.map((c) => c.pmid).filter((p): p is string => !!p && /^\d+$/.test(p)),
  );
  const graphEdgePmids = new Set<string>();
  for (const l of grounding.links) {
    const e = edgeByRel[l.relId];
    if (!e) continue;
    if (e.pmid && /^\d+$/.test(e.pmid)) graphEdgePmids.add(e.pmid);
    if (e.reference && /^\d+$/.test(e.reference)) graphEdgePmids.add(e.reference);
    for (const r of e.source_refs || []) {
      if (/^\d+$/.test(r)) graphEdgePmids.add(r);
    }
  }

  for (const m of text.matchAll(/\bPMID[:\s]*(\d{6,9})\b/gi)) {
    const pmid = m[1]!;
    const idx = m.index ?? 0;
    const window = nearbyWindow(text, idx);
    const inGateC = gateCPmids.has(pmid);
    const inProvisional = provisionalPmids.has(pmid);
    const inCounter = counterPmids.has(pmid);
    const inGraphEdge = graphEdgePmids.has(pmid);

    if (!inGateC && !inProvisional && !inCounter && !inGraphEdge) {
      inventedRelIds.push(`PMID:${pmid}`);
      continue;
    }
    if (inProvisional && !inGateC) {
      if (!PROVISIONAL_LABEL.test(window)) provisionalMislabels.push(pmid);
      if (STRONG_SUPPORT_LANG.test(window)) unsupportedSupportClaims.push(`PMID:${pmid}`);
    }
    if (inCounter && !inGateC && STRONG_SUPPORT_LANG.test(window)) {
      unsupportedSupportClaims.push(`PMID:${pmid}:counter-as-support`);
    }
  }

  // Strong support language with zero Gate C rows on the retrieval → fail closed.
  if (STRONG_SUPPORT_LANG.test(text) && grounding.coverage.reviewedEvidenceCount === 0) {
    unsupportedSupportClaims.push("gate-c-language-without-reviewed-cites");
  }

  // Edges cited beside strong support language must have Gate C supports.
  for (const m of text.matchAll(/\]\(edge:(REL-[^)]+)\)/g)) {
    const id = (m[1] ?? "").trim();
    if (!id || !allowedRels.has(id)) continue;
    const window = nearbyWindow(text, m.index ?? 0);
    if (!STRONG_SUPPORT_LANG.test(window)) continue;
    const link = grounding.links.find((l) => l.relId === id);
    if (!link?.hasClaimSupport) claimSupportGaps.push(id);
  }

  const inventedConceptIdsU = [...new Set(inventedConceptIds)];
  const inventedRelIdsU = [...new Set(inventedRelIds)];
  const unretrievedConceptIdsU = [...new Set(unretrievedConceptIds)];
  const unretrievedRelIdsU = [...new Set(unretrievedRelIds)];
  const unsupportedSupportClaimsU = [...new Set(unsupportedSupportClaims)];
  const provisionalMislabelsU = [...new Set(provisionalMislabels)];
  const claimSupportGapsU = [...new Set(claimSupportGaps)];

  const ok =
    inventedConceptIdsU.length === 0 &&
    inventedRelIdsU.length === 0 &&
    unretrievedConceptIdsU.length === 0 &&
    unretrievedRelIdsU.length === 0 &&
    unsupportedSupportClaimsU.length === 0 &&
    provisionalMislabelsU.length === 0 &&
    claimSupportGapsU.length === 0;

  let failReason: string | null = null;
  if (!ok) {
    if (inventedConceptIdsU.length || inventedRelIdsU.length) {
      failReason = "Answer cited concepts, links or PMIDs outside the atlas / retrieval set.";
    } else if (unretrievedConceptIdsU.length || unretrievedRelIdsU.length) {
      failReason = "Answer cited atlas IDs that were not in the retrieved grounding set.";
    } else if (unsupportedSupportClaimsU.length || claimSupportGapsU.length) {
      failReason =
        "Answer implied reviewed/Gate C support that is not entailed by approved+supports evidence for the retrieved links.";
    } else if (provisionalMislabelsU.length) {
      failReason =
        "Answer cited provisional literature without labelling it as unreviewed / not Gate C.";
    } else {
      failReason = "Citation-to-claim validation failed.";
    }
  }

  return {
    ok,
    inventedConceptIds: inventedConceptIdsU,
    inventedRelIds: inventedRelIdsU,
    unretrievedConceptIds: unretrievedConceptIdsU,
    unretrievedRelIds: unretrievedRelIdsU,
    unsupportedSupportClaims: unsupportedSupportClaimsU,
    provisionalMislabels: provisionalMislabelsU,
    claimSupportGaps: claimSupportGapsU,
    failReason,
  };
}

/** FR-027: structured explanation intents over retrieved grounding (no model required). */
export function runExplanationAction(action: ExplanationAction, grounding: AskGrounding): string {
  if (!grounding.coverage.matched) {
    return UNSUPPORTED_ABSTENTION;
  }
  const names = (id: string) => byId[id]?.name ?? id;
  switch (action) {
    case "explain_mechanism": {
      const top = grounding.links.slice(0, 5);
      if (!top.length) return "No relationships were retrieved for this question.";
      return (
        "Mechanism (graph-derived):\n" +
        top.map((l) => `• ${names(l.subjectId)} ${human(l.relation)} ${names(l.objectId)} — ${l.mechanism} [${l.tier}]`).join("\n")
      );
    }
    case "show_path": {
      const chain = grounding.chains[0];
      if (!chain) return "No shortest causal chain among the top matched concepts.";
      const hops = chain.hops.map((h) => `${h.fwd ? "→" : "←"} ${h.relation} (${h.relId}, ${h.tier}) ${names(h.toId)}`).join("\n");
      return `Path ${names(chain.fromId)} → ${names(chain.toId)}:\n${names(chain.fromId)}\n${hops}`;
    }
    case "compare_explanations": {
      const chains = grounding.chains.slice(0, 2);
      if (chains.length < 2) {
        return "Only one (or zero) causal chains were retrieved — not enough to compare alternative paths.";
      }
      return chains
        .map((c, i) => `Path ${i + 1}: ${names(c.fromId)} → ${names(c.toId)} (${c.hops.length} hops; tiers: ${c.hops.map((h) => h.tier).join(", ")})`)
        .join("\n");
    }
    case "what_evidence_missing": {
      const weak = grounding.links.filter((l) => l.tier === "missing-support" || l.tier === "draft" || l.tier === "hypothesis" || !l.hasSourceLink);
      if (!weak.length) return "Retrieved links are labelled established or evidence-supported with source links — claim-level curator approval may still be incomplete.";
      return (
        "Evidence gaps on retrieved links:\n" +
        weak.slice(0, 8).map((l) => `• ${l.relId}: tier=${l.tier}, review=${l.reviewLabel}, source-link=${l.hasSourceLink ? "yes" : "no"}`).join("\n")
      );
    }
    case "what_would_change": {
      const chain = grounding.chains[0];
      const target = chain?.hops[0];
      if (!target) return "No path available to reason about a changed conclusion.";
      return (
        `If the polarity or evidence for ${target.relId} (${names(target.fromId)} ${target.relation} ${names(target.toId)}) were revised or contradicted, ` +
        `the chain from ${names(chain!.fromId)} to ${names(chain!.toId)} would need re-evaluation. This is a graph-structure caveat, not an experimental prediction.`
      );
    }
    case "show_counterevidence": {
      const rows = grounding.counterEvidence ?? [];
      const withCount = grounding.links.filter((l) => l.counterEvidenceCount > 0);
      if (!rows.length && !withCount.length) {
        return (
          "Counterevidence (skeptic path): none curated on retrieved links yet — honest empty set. " +
          "Neon may still have zero contradicts/partial rows. Do not invent opposing literature; ask a curator to assess claim_support when sources disagree."
        );
      }
      return (
        "Counterevidence (assessed contradicts/partial — not Gate C support):\n" +
        rows
          .slice(0, 12)
          .map((c) => `• ${c.label} · ${c.claim_support} · ${c.relationship_id ?? "unmapped"}`)
          .join("\n")
      );
    }
    default:
      return "Unknown explanation action.";
  }
}

export const SYSTEM = `You are Ask Immune — the conversational assistant for Immune Super Intelligence, an AI-native educational causal immunology knowledge graph.
Positioning: "Immune Super Intelligence — Where Immunology Meets Advanced AI." Answer using ONLY the graph extract below. Explain cells, molecules, pathways and causal connections clearly for a curious non-specialist.
Rules:
- Ground every claim in the CONCEPT/LINK lines. If the extract says NO_MATCH or does not cover the question, say plainly "The Immune Super Intelligence graph does not cover this yet" and suggest a related covered concept if any. Never fill gaps from general knowledge. Never invent citations, PMIDs, DOIs or LINK IDs.
- Prefer CAUSAL_CHAINS when explaining how two concepts connect. End with a short "Causal chain used:" section that lists the chain hops with [phrase](edge:REL_ID) links, or state that no chain was available.
- Distinguish evidence tiers explicitly: established, evidence-supported, emerging, hypothesis, draft, missing-support. Say when a link is DRAFT, MISSING-SUPPORT or has no-source-link.
- REVIEWED_EVIDENCE lists Gate C rows only (approved + supports + verified identifier). If it says none, do not imply the claim is scientifically verified — say the atlas lacks reviewed support for that link.
- COUNTER_EVIDENCE lists assessed contradicts/partial separately. Never present them as approved support. If it says none, that is an honest empty set — do not invent counterevidence.
- PROVISIONAL_LITERATURE (if present) is unreviewed PubMed/Europe PMC search — never treat it as approved evidence or "supports". If you mention those items, label them explicitly as "unreviewed literature" / provisional. Do not invent extra PMIDs.
- Only mention PMIDs/DOIs that appear in REVIEWED_EVIDENCE, COUNTER_EVIDENCE, PROVISIONAL_LITERATURE, or on the LINK line itself.
- Never claim Gate C / approved / scientifically verified support unless REVIEWED_EVIDENCE lists that PMID for the link. If you cite provisional PMIDs, keep the words "unreviewed" or "provisional" in the same sentence.
- For QUERY_CLASS hypothesis_request: label every suggestion as a candidate hypothesis and include at least one alternative or disconfirming consideration.
- Concise: a short explanation, then compact bullets of key connections, then the causal chain used.
- Educational only. Never give diagnosis, dosing or treatment recommendations for a real person. Not clinical decision support. Not fully evidence-grounded AI.
- LINKING (required): write concepts as [Name](concept:ID) and relationships as [phrase](edge:REL_ID) using the exact LINK IDs (they start with REL-). Never invent IDs.

GRAPH EXTRACT:
`;

/**
 * Ask soft rate limit (IC-15).
 * Backend is per-isolate in-memory only — no Vercel KV / Upstash / Redis env is
 * provisioned in this project, so limits reset on cold start and do not span
 * serverless instances. Residual documented in docs/RELEASE_AUDIT.md.
 */
export const ASK_RATE_LIMIT_BACKEND = "in-memory" as const;
export const ASK_RATE_LIMIT_DEFAULT = { limit: 8, windowMs: 60_000 } as const;

const hits = new Map<string, number[]>();

/** Drop expired timestamps; prune idle keys instead of wiping the whole map. */
function pruneRateLimitMap(now: number, windowMs: number) {
  for (const [k, times] of hits) {
    const kept = times.filter((t) => now - t < windowMs);
    if (kept.length === 0) hits.delete(k);
    else if (kept.length !== times.length) hits.set(k, kept);
  }
  if (hits.size > 5000) {
    const overflow = hits.size - 4000;
    let dropped = 0;
    for (const k of hits.keys()) {
      hits.delete(k);
      if (++dropped >= overflow) break;
    }
  }
}

export function rateLimited(
  key: string,
  limit = ASK_RATE_LIMIT_DEFAULT.limit,
  windowMs = ASK_RATE_LIMIT_DEFAULT.windowMs,
  now = Date.now(),
): boolean {
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    hits.set(key, arr);
    return true;
  }
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 1000) pruneRateLimitMap(now, windowMs);
  return false;
}

/** Server-side kill switch (FR-029 / PRD §14). Set IMMUNE_ASK_DISABLED=1 or ASK_EMERGENCY_DISABLE=1. */
export function isAskEmergencyDisabled(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? (process.env as Record<string, string | undefined>) : {},
): boolean {
  const v = (env["IMMUNE_ASK_DISABLED"] ?? env["ASK_EMERGENCY_DISABLE"] ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export const ASK_DISABLED_MESSAGE =
  "Ask Immune is temporarily disabled by the operator. Graph exploration and Methods & trust remain available.";

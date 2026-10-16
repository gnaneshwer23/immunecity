/* Browser-safe retrieval and guardrails for Ask Immune Super Intelligence (tested in src/test/ai-grounding.test.ts). */
import { KG, byId, human, out, inn, relId, edgeRef, edgeByRel, shortestPath, type KGNode, type KGEdge } from "@/lib/immune/engine";
import { citationsFor, relationshipStatus, STATUS_INFO, type CitationLike, type ReviewStatus } from "@/lib/immune/evidenceStatus";
import { GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION, graphReleaseSnapshot } from "@/lib/immune/graphRelease";

export const MAX_QUESTION_CHARS = 500;
/** Bump when SYSTEM prompt or structured-answer rules change (FR-028). */
export const PROMPT_VERSION = "ask-grounding-v3";

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
  | "what_would_change";

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
  /** Approved Neon evidence rows mapped to this exact relationship. */
  reviewedEvidenceCount: number;
  reviewedPmids: string[];
  hasClaimSupport: boolean;
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
  };
}

export interface CitationValidation {
  ok: boolean;
  inventedConceptIds: string[];
  inventedRelIds: string[];
  unretrievedConceptIds: string[];
  unretrievedRelIds: string[];
}

export interface PrepareAskResult {
  grounding: AskGrounding;
  queryClass: AskQueryClass;
  callModel: boolean;
  replyText: string | null;
}

export function relevantNodes(question: string, limit = 8): KGNode[] {
  const tokens = question.toLowerCase().split(/[^a-z0-9-]+/i).filter((t) => t.length > 2);
  if (!tokens.length) return [];
  const scored = KG.nodes.map((n) => {
    const name = n.name.toLowerCase();
    const desc = n.desc.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (name.includes(t)) score += 3;
      else if (desc.includes(t)) score += 1;
      if (n.id.toLowerCase() === t) score += 5;
    }
    if (!n.draft) score += score > 0 ? 0.5 : 0; // prefer reviewed core concepts
    return { n, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.n);
}

/* Personal clinical requests (dosing, "should I", my diagnosis) are refused without calling a model. */
const CLINICAL = /\b(should i|can i take|my (doctor|dose|medication|child|son|daughter|husband|wife|mother|father)|what dose|how much .* (take|give)|dosage for me|diagnose me|i have (been diagnosed|a rash|symptoms)|am i)\b/i;
export const isPersonalClinical = (q: string) => CLINICAL.test(q);

export const CLINICAL_REFUSAL =
  "I can't give personal medical advice, dosing or diagnosis. Immune Super Intelligence is an educational causal map — please talk to a clinician. I can explain how the immune mechanisms involved work in general if you rephrase the question.";

export const OMICS_ABSTENTION =
  "Omics and molecular-model analysis are not wired into Ask yet — they remain planned adapters in the model registry. I can still map named genes or cells that already exist in the Immune Super Intelligence graph if you ask about those concepts specifically.";

export const UNSUPPORTED_ABSTENTION =
  "The Immune Super Intelligence graph does not cover this yet. I won't invent concepts, pathways or citations. Try a named cell, cytokine, receptor, disease or therapy from the atlas, or open Methods & trust for what is currently curated.";

const OMICS = /\b(scrna|scRNA|single[- ]cell|spatial omics|rna[- ]seq|bulk rna|differential expression|gene set enrichment|gsea|anndata|seurat|scanpy|vcf|variant call|alphafold|alphagenome|peptide[- ]?mhc|hla binding predict)\b/i;
const HYPOTHESIS = /\b(hypothes[ei]s|propose an experiment|falsif|what if we (block|inhibit|activate)|candidate mechanism|next experiment)\b/i;
const COMPARISON = /\b(compar(e|ison|ing)|versus|\bvs\.?\b|differ(ence|ent)? between|which is (more|better)|contrast)\b/i;
const SOURCE = /\b(pmid|doi|citation|source|paper|reference|pubmed|what (evidence|supports)|where is (this|that) (from|cited))\b/i;
const MECHANISM_PERTURB = /\b(what happens if|if (we |i )?(block|inhibit|activate|knock|delete|neutrali[sz]e)|perturb|downstream (of|effect)|knockout)\b/i;

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
  return review === "approved" ? "established" : "missing-support";
}

export function groundLink(edge: KGEdge, cites: CitationLike[] = []): GroundedLink {
  const review = relationshipStatus(edge, cites);
  const mine = citationsFor(edge, cites);
  const reviewedPmids = [
    ...new Set(mine.map((c) => c.pmid).filter((p): p is string => !!p && /^\d+$/.test(p))),
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
    reviewedEvidenceCount: mine.length,
    reviewedPmids,
    hasClaimSupport: mine.some((c) => c.claim_support === "supports"),
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
        coverage: { matched: false, draftCount: 0, missingSupportCount: 0, emergingCount: 0, establishedCount: 0 },
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
    lines.push(`CONCEPT ${n.id} [${n.node_type}]${n.draft ? " [DRAFT]" : ""} ${n.name}: ${n.desc}`);
    const edges = [...(out[n.id] || []), ...(inn[n.id] || [])].slice(0, 10);
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
      lines.push(
        `LINK ${id} ${s.name} --${human(e.relation)}--> ${o.name}: ${e.mechanism}` +
          ` (confidence: ${e.confidence}, evidence: ${e.evidence_status}, review: ${g.reviewLabel}, tier: ${g.tier}, support: ${support}, ${reviewed}` +
          `${e.draft ? ", DRAFT" : ""}${e.location ? `, tissue: ${e.location}` : ""})`,
      );
    }
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
  }

  const reviewedForLinks = cites.filter((c) => c.relationship_id && seen.has(c.relationship_id));
  if (reviewedForLinks.length) {
    lines.push("REVIEWED_EVIDENCE (approved Neon records for retrieved links — cite only these PMIDs/DOIs):");
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

  const coverage = {
    matched: true,
    draftCount: links.filter((l) => l.tier === "draft").length + nodes.filter((n) => n.draft).length,
    missingSupportCount: links.filter((l) => l.tier === "missing-support").length,
    emergingCount: links.filter((l) => l.tier === "emerging" || l.tier === "hypothesis").length,
    establishedCount: links.filter((l) => l.tier === "established").length,
  };

  lines.push(
    `COVERAGE_SUMMARY matched=${coverage.matched} established=${coverage.establishedCount}` +
      ` evidence-supported/emerging=${coverage.emergingCount} draft=${coverage.draftCount} missing-support=${coverage.missingSupportCount}` +
      ` reviewed-evidence-rows=${reviewedForLinks.length}`,
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
    },
    cls,
    false,
    null,
  );
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
        coverage: { matched: false, draftCount: 0, missingSupportCount: 0, emergingCount: 0, establishedCount: 0 },
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

/** FR-025: reject invented concept/edge IDs; flag citations outside the retrieval set. */
export function validateAnswerCitations(text: string, grounding: AskGrounding): CitationValidation {
  const allowedNodes = new Set(grounding.nodeIds);
  const allowedRels = new Set(grounding.relIds);
  const inventedConceptIds: string[] = [];
  const inventedRelIds: string[] = [];
  const unretrievedConceptIds: string[] = [];
  const unretrievedRelIds: string[] = [];

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

  // Also catch fabricated PMID/DOI strings that look like citations
  for (const m of text.matchAll(/\bPMID[:\s]*(\d{6,9})\b/gi)) {
    const pmid = m[1]!;
    const linked = grounding.links.some((l) => {
      if (l.reviewedPmids.includes(pmid)) return true;
      const e = edgeByRel[l.relId];
      return !!e && (e.pmid === pmid || e.reference === pmid || (e.source_refs || []).includes(pmid));
    });
    if (!linked) inventedRelIds.push(`PMID:${pmid}`);
  }

  return {
    ok: inventedConceptIds.length === 0 && inventedRelIds.length === 0,
    inventedConceptIds: [...new Set(inventedConceptIds)],
    inventedRelIds: [...new Set(inventedRelIds)],
    unretrievedConceptIds: [...new Set(unretrievedConceptIds)],
    unretrievedRelIds: [...new Set(unretrievedRelIds)],
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
    default:
      return "Unknown explanation action.";
  }
}

export const SYSTEM = `You are the Immune Super Intelligence assistant — an AI-native educational causal immunology knowledge graph.
Positioning: "Immune Super Intelligence — Where Immunology Meets Advanced AI." Answer using ONLY the graph extract below. Explain cells, molecules, pathways and causal connections clearly for a curious non-specialist.
Rules:
- Ground every claim in the CONCEPT/LINK lines. If the extract says NO_MATCH or does not cover the question, say plainly "The Immune Super Intelligence graph does not cover this yet" and suggest a related covered concept if any. Never fill gaps from general knowledge. Never invent citations, PMIDs, DOIs or LINK IDs.
- Prefer CAUSAL_CHAINS when explaining how two concepts connect. End with a short "Causal chain used:" section that lists the chain hops with [phrase](edge:REL_ID) links, or state that no chain was available.
- Distinguish evidence tiers explicitly: established, evidence-supported, emerging, hypothesis, draft, missing-support. Say when a link is DRAFT or has no-source-link.
- REVIEWED_EVIDENCE lists approved Neon claim assessments. If it says none, do not imply the claim is scientifically verified — say the atlas lacks reviewed support for that link.
- Only mention PMIDs/DOIs that appear in REVIEWED_EVIDENCE or on the LINK line itself.
- For QUERY_CLASS hypothesis_request: label every suggestion as a candidate hypothesis and include at least one alternative or disconfirming consideration.
- Concise: a short explanation, then compact bullets of key connections, then the causal chain used.
- Educational only. Never give diagnosis, dosing or treatment recommendations for a real person.
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
  "Ask Immune Super Intelligence is temporarily disabled by the operator. Graph exploration and Methods & trust remain available.";

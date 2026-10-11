/* Browser-safe retrieval and guardrails for Ask Immune City (tested in src/test/ai-grounding.test.ts). */
import { KG, byId, human, out, inn, relId, type KGNode } from "@/lib/immune/engine";

export const MAX_QUESTION_CHARS = 500;

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
  "I can't give personal medical advice, dosing or diagnosis. Immune City is an educational causal map — please talk to a clinician. I can explain how the immune mechanisms involved work in general if you rephrase the question.";

export function graphContext(question: string): { text: string; nodeIds: string[]; relIds: string[] } {
  const nodes = relevantNodes(question);
  if (!nodes.length) return { text: "NO_MATCH: no graph concepts matched the question.", nodeIds: [], relIds: [] };
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const n of nodes) {
    lines.push(`CONCEPT ${n.id} [${n.node_type}]${n.draft ? " [DRAFT]" : ""} ${n.name}: ${n.desc}`);
    const edges = [...(out[n.id] || []), ...(inn[n.id] || [])].slice(0, 10);
    for (const e of edges) {
      const id = relId(e);
      if (seen.has(id)) continue;
      seen.add(id);
      const s = byId[e.subject_id], o = byId[e.object_id];
      if (!s || !o) continue;
      lines.push(`LINK ${id} ${s.name} --${human(e.relation)}--> ${o.name}: ${e.mechanism} (confidence: ${e.confidence}, evidence: ${e.evidence_status}${e.draft ? ", review: DRAFT" : ", review: unreviewed"}${e.location ? `, tissue: ${e.location}` : ""})`);
    }
  }
  return { text: lines.slice(0, 120).join("\n"), nodeIds: nodes.map((n) => n.id), relIds: [...seen] };
}

export const SYSTEM = `You are the Immune City assistant — an educational causal immunology knowledge graph.
Answer using ONLY the graph extract below. Explain the cells, molecules, pathways and causal connections clearly for a curious non-specialist.
Rules:
- Ground every claim in the CONCEPT/LINK lines. If the extract says NO_MATCH or does not cover the question, say plainly "The Immune City graph does not cover this yet" and suggest a related covered concept if any. Never fill gaps from general knowledge.
- Links marked DRAFT or unreviewed have not been checked against sources by an expert; say so when you rely on them.
- Mention the evidence level (established / evidence-supported / emerging / hypothesis) when it matters.
- Concise: a short explanation then a compact bullet list of key connections.
- Educational only. Never give diagnosis, dosing or treatment recommendations for a real person.
- LINKING (required): write concepts as [Name](concept:ID) and relationships as [phrase](edge:REL_ID) using the exact LINK IDs (they start with REL-). Never invent IDs.

GRAPH EXTRACT:
`;

/* Simple per-isolate sliding-window limiter keyed by client IP. */
const hits = new Map<string, number[]>();
export function rateLimited(key: string, limit = 8, windowMs = 60_000, now = Date.now()): boolean {
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) { hits.set(key, arr); return true; }
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) hits.clear();
  return false;
}

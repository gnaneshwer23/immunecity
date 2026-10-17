/* Knowledge graph (Immunology OS KG v0.3) + reasoning engine. */
import kgJson from "@/data/kg.json";
import { LEGACY } from "@/data/legacy";
import { CONTENT } from "@/data/content";
import { EXT_NODES, EXT_EDGES } from "@/data/extensions";

export type NodeType =
  | "CELL" | "MOLECULE" | "RECEPTOR" | "PATHWAY" | "COMPARTMENT"
  | "PATHOGEN" | "DISEASE" | "INTERVENTION" | "BIOMARKER" | "TRIAL" | "DATA" | "AI_METHOD" | "DISCOVERY";

export interface KGNode { id: string; name: string; node_type: NodeType; desc: string; draft?: boolean }
export interface KGEdge {
  subject_id: string; relation: string; object_id: string; mechanism: string;
  confidence: "high" | "medium" | "low"; evidence_status: string;
  pmid?: string; doi?: string; reference?: string; source_refs?: string[];
  location?: string; weight?: number; draft?: boolean;
}

export const TYPES: Record<NodeType, { label: string; c: string }> = {
  CELL: { label: "Cell", c: "--t-cell" },
  MOLECULE: { label: "Molecule", c: "--t-molecule" },
  RECEPTOR: { label: "Receptor", c: "--t-receptor" },
  PATHWAY: { label: "Pathway", c: "--t-pathway" },
  COMPARTMENT: { label: "Tissue", c: "--t-compartment" },
  PATHOGEN: { label: "Pathogen", c: "--t-pathogen" },
  DISEASE: { label: "Disease", c: "--t-disease" },
  INTERVENTION: { label: "Therapy", c: "--t-intervention" },
  BIOMARKER: { label: "Biomarker", c: "--t-biomarker" },
  TRIAL: { label: "Trial", c: "--t-trial" },
  DATA: { label: "Data", c: "--t-data" },
  AI_METHOD: { label: "AI method", c: "--t-ai" },
  DISCOVERY: { label: "Discovery", c: "--t-discovery" },
};

/* '+' carries sign forward, '-' flips it, 'r+' is descriptive (not propagated). */
export const SEM: Record<string, string> = (kgJson as any).relation_semantics;

/* relations whose raw form reads awkwardly between two node names */
const REL_LABEL: Record<string, string> = {
  has_target_axis: "acts through",
  is_target_of: "is a target in",
  has_high: "shows high",
  associates_with: "is associated with",
  demonstrates_in: "demonstrates efficacy in",
  evaluates_in: "is evaluated in",
  depletes_producers_of: "depletes the producers of",
  supports_axis_of: "supports the axis of",
};
export const human = (rel: string) => REL_LABEL[rel] || rel.replace(/_/g, " ");
/* citations may carry several references separated by | or ; — search on the first */
export const pubmed = (ref: string) => "https://pubmed.ncbi.nlm.nih.gov/?term=" + encodeURIComponent(ref.replace(/[|;].*$/, "").trim());

export const REF_PLACEHOLDER = "TO_BE_CURATED";
export interface EdgeRef { kind: "pmid" | "doi" | "citation"; label: string; url: string }
/* The verifiable reference behind one causal link: a PMID/DOI permalink once curated,
   the recorded citation otherwise, or null when the link is still uncited. */
export function edgeRef(edge: Partial<KGEdge> | null | undefined): EdgeRef | null {
  const raw = (edge?.reference || "").trim();
  if (raw) {
    const pmid = raw.match(/^(?:PMID[:\s]*)?(\d{6,9})$/i);
    if (pmid) return { kind: "pmid", label: `PMID ${pmid[1]}`, url: `https://pubmed.ncbi.nlm.nih.gov/${pmid[1]}/` };
    const doi = raw.replace(/^doi[:\s]*/i, "");
    if (/^10\.\d{4,9}\//.test(doi)) return { kind: "doi", label: `DOI ${doi}`, url: `https://doi.org/${doi}` };
    return { kind: "citation", label: raw, url: pubmed(raw) };
  }
  const cite = (edge?.source_refs || []).find((x) => x && x !== REF_PLACEHOLDER);
  return cite ? { kind: "citation", label: cite, url: pubmed(cite) } : null;
}

const raw = kgJson as any;
const nodes: KGNode[] = [...raw.nodes, ...EXT_NODES.map((n) => ({ ...n, draft: true }))].map((n: any) => ({ ...n, desc: n.description ?? "" }));
const relationships: KGEdge[] = [...raw.relationships, ...EXT_EDGES.map((r) => ({ ...r, draft: true }))].map((r: any) => ({
  ...r,
  confidence: r.confidence ?? "medium",
  pmid: /^\d+$/.test(r.reference ?? "") ? r.reference : undefined,
}));

export const KG = {
  nodes,
  relationships,
  node_types: raw.node_types as NodeType[],
  core_spine: raw.core_spine as string[],
  stats: raw.stats as { total_nodes: number; total_relationships: number },
};

export const SPINE_DESC: Record<string, string> = {
  TRIGGER: "What starts it", RECOGNITION: "How it is detected", SIGNALLING: "Signal processing",
  RESPONSE: "Cellular action", CONSEQUENCE: "What it causes", FAILURE: "Where it breaks",
  DISEASE: "Clinical disease", BIOMARKER: "What we measure", TARGET: "Where to intervene",
  THERAPY: "What treats it", TRIAL: "What tested it", PATIENT: "Tissue & context",
  DATA: "Real-world data", MODEL: "Inference & modelling", DISCOVERY: "New knowledge",
};

/**
 * Display labels for the 15-step spine. Data key remains MODEL (KG `core_spine`);
 * public copy uses AI to match the product brief without inventing a 16th step.
 */
export const SPINE_LABEL: Record<string, string> = {
  TRIGGER: "TRIGGER",
  RECOGNITION: "RECOGNITION",
  SIGNALLING: "SIGNALLING",
  RESPONSE: "RESPONSE",
  CONSEQUENCE: "CONSEQUENCE",
  FAILURE: "FAILURE",
  DISEASE: "DISEASE",
  BIOMARKER: "BIOMARKER",
  TARGET: "TARGET",
  THERAPY: "THERAPY",
  TRIAL: "TRIAL",
  PATIENT: "PATIENT",
  DATA: "DATA",
  MODEL: "AI",
  DISCOVERY: "DISCOVERY",
};

export function spineLabel(step: string): string {
  return SPINE_LABEL[step] ?? step;
}

/** Guiding question per spine step (ISI vision document). */
export const SPINE_QUESTION: Record<string, string> = {
  TRIGGER: "What initiates the process?",
  RECOGNITION: "How is it detected?",
  SIGNALLING: "Which molecular pathways activate?",
  RESPONSE: "Which cells and mediators act?",
  CONSEQUENCE: "What changes biologically?",
  FAILURE: "How does regulation or protection break down?",
  DISEASE: "What pathology may result?",
  BIOMARKER: "What can be measured?",
  TARGET: "Which mechanism might be modulated?",
  THERAPY: "What intervention addresses it?",
  TRIAL: "What has been tested, and how?",
  PATIENT: "What clinical context is relevant?",
  DATA: "What observations or datasets exist?",
  MODEL: "What analytical methods can help?",
  DISCOVERY: "What new question or hypothesis emerges?",
};

export const byId: Record<string, KGNode> = Object.fromEntries(nodes.map((n) => [n.id, n]));
export const out: Record<string, KGEdge[]> = {};
export const inn: Record<string, KGEdge[]> = {};
relationships.forEach((r) => {
  (out[r.subject_id] ||= []).push(r);
  (inn[r.object_id] ||= []).push(r);
});
export const deg = (id: string) => (out[id]?.length || 0) + (inn[id]?.length || 0);

/* Signed spread along causal edges ('+' keeps sign, '-' flips it, 'r+' carries a
   positive effect from object back to subject). Each hop decays and is weighted by
   confidence; the path that produced each effect is kept. */
/* Tissue buckets from each link's free-text location; links without one apply everywhere. */
export const TISSUES = ["blood", "gut", "skin", "lung", "lymphoid", "tumour", "joint", "CNS", "vessel"] as const;
export type Tissue = (typeof TISSUES)[number];
const TISSUE_RE: Record<Tissue, RegExp> = {
  blood: /blood/i, gut: /gut|colon|GALT/i, skin: /skin|keratinocyte/i, lung: /lung|airway|alveol/i,
  lymphoid: /lymph|germinal|spleen|thymus|bone marrow/i, tumour: /tumou?r|TME/i, joint: /synovi/i, CNS: /CNS|brain/i, vessel: /vessel|plaque|arter/i,
};
export const edgeTissues = (r: KGEdge): Tissue[] => TISSUES.filter((t) => TISSUE_RE[t].test(r.location || ""));
export const edgeInTissue = (r: KGEdge, t?: Tissue | null) => !t || !r.location || edgeTissues(r).includes(t) || !edgeTissues(r).length;

export function propagate(startId: string, mode: "activate" | "inhibit" = "inhibit", maxDepth = 4, decay = 0.72, tissue?: Tissue | null) {
  const eff: Record<string, { v: number; path: KGEdge[]; depth: number }> = { [startId]: { v: mode === "inhibit" ? -1 : 1, path: [], depth: 0 } };
  let frontier = [startId];
  for (let d = 1; d <= maxDepth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      const cur = eff[id]!;
      const edges: { r: KGEdge; to: string; sign: number }[] = [];
      (out[id] || []).forEach((r) => { const s = SEM[r.relation]; if (s === "+" || s === "-") edges.push({ r, to: r.object_id, sign: s === "+" ? 1 : -1 }); });
      (inn[id] || []).forEach((r) => { if (SEM[r.relation] === "r+") edges.push({ r, to: r.subject_id, sign: 1 }); });
      for (const { r, to, sign } of edges) {
        if (to === startId || !edgeInTissue(r, tissue)) continue;
        /* a measured weight (0–1) overrides the confidence-based default */
        const conf = typeof r.weight === "number" ? r.weight : r.confidence === "low" ? 0.6 : r.confidence === "medium" ? 0.8 : 1;
        const v = cur.v * sign * decay * conf;
        if (!eff[to] || Math.abs(v) > Math.abs(eff[to].v) + 1e-9) {
          eff[to] = { v, path: cur.path.concat([r]), depth: d };
          next.push(to);
        }
      }
    }
    frontier = next;
  }
  delete eff[startId];
  return Object.entries(eff).map(([id, e]) => ({ id, ...e })).filter((e) => Math.abs(e.v) > 0.08).sort((x, y) => Math.abs(y.v) - Math.abs(x.v));
}

export interface PathStep { r: KGEdge; fwd: boolean; to: string }

/* BFS shortest path; with directed=false edges may be walked backwards. */
export function shortestPath(from: string, to: string, directed = true): PathStep[] | null {
  const prev: Record<string, PathStep & { from: string }> = {};
  const seen = new Set([from]);
  const q = [from];
  while (q.length) {
    const cur = q.shift()!;
    if (cur === to) break;
    const steps: PathStep[] = (out[cur] || []).map((r) => ({ r, fwd: true, to: r.object_id }));
    if (!directed) (inn[cur] || []).forEach((r) => steps.push({ r, fwd: false, to: r.subject_id }));
    for (const s of steps) {
      if (seen.has(s.to)) continue;
      seen.add(s.to);
      prev[s.to] = { ...s, from: cur };
      q.push(s.to);
    }
  }
  if (!prev[to]) return null;
  const path: PathStep[] = [];
  let c = to;
  while (c !== from) { const p = prev[c]!; path.unshift({ r: p.r, fwd: p.fwd, to: p.to }); c = p.from; }
  return path;
}


/* Chain shortest paths through a list of concepts. */
export function stitch(ids: string[]): PathStep[] {
  const steps: PathStep[] = [];
  for (let i = 0; i < ids.length - 1; i++) {
    const p = shortestPath(ids[i]!, ids[i + 1]!, false);
    if (p) steps.push(...p);
  }
  return steps;
}

/* ---------- cross-references ---------- */
export const cellById: Record<string, (typeof LEGACY.cells)[number]> = {};
LEGACY.cells.forEach((c) => { cellById[c.id] = c; });

export const cellForNode: Record<string, string[]> = {};
Object.entries(LEGACY.cellKG).forEach(([cid, ids]) => ids.forEach((id) => { (cellForNode[id] ||= []).push(cid); }));

export const lessonsForNode: Record<string, string[]> = {};
(CONTENT.lessons as any[]).forEach((l) => (l.nodes || []).forEach((id: string) => { (lessonsForNode[id] ||= []).push(l.id); }));

export const nodesOf = (t: NodeType) => KG.nodes.filter((n) => n.node_type === t);

/* ---------- stable relationship identifiers ---------- */
/* Canonical ID for one directional claim: subject, predicate and object. */
export const relId = (r: Pick<KGEdge, "subject_id" | "relation" | "object_id">) => `REL-${r.subject_id}-${r.relation}-${r.object_id}`;
export const edgeByRel: Record<string, KGEdge> = Object.fromEntries(relationships.map((r) => [relId(r), r]));

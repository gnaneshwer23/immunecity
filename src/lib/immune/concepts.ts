/* Shared concept layer: stable IDs → page paths, neighbours grouped by type,
   and the eight Knowledge Atlas domains. Browser-safe; reads only the graph. */
import { KG, byId, inn, out, deg, type KGEdge, type KGNode, type NodeType } from "@/lib/immune/engine";

export const conceptPath = (id: string) => `/atlas/${encodeURIComponent(id)}`;

/** Raw graph fields beyond the engine's typed subset (present on core nodes only). */
export interface ConceptExtras {
  aliases: string[];
  spineSteps: string[];
  clinical: string | null;
  domainTag: string | null;
  evidenceStatus: string | null;
}
export function conceptExtras(n: KGNode): ConceptExtras {
  const r = n as KGNode & Record<string, unknown>;
  return {
    aliases: Array.isArray(r.aliases) ? (r.aliases as string[]) : [],
    spineSteps: Array.isArray(r.spine_steps) ? (r.spine_steps as string[]) : [],
    clinical: typeof r.clinical_relevance === "string" && r.clinical_relevance ? r.clinical_relevance : null,
    domainTag: typeof r.domain === "string" && r.domain ? r.domain : null,
    evidenceStatus: typeof r.evidence_status === "string" ? r.evidence_status : null,
  };
}

export interface Neighbour { node: KGNode; edge: KGEdge; dir: "in" | "out" }

export function conceptNeighbours(id: string): Neighbour[] {
  const rows: Neighbour[] = [
    ...(inn[id] ?? []).map((edge) => ({ node: byId[edge.subject_id]!, edge, dir: "in" as const })),
    ...(out[id] ?? []).map((edge) => ({ node: byId[edge.object_id]!, edge, dir: "out" as const })),
  ];
  return rows.filter((r) => r.node);
}

export function neighboursByType(id: string): Partial<Record<NodeType, Neighbour[]>> {
  const g: Partial<Record<NodeType, Neighbour[]>> = {};
  for (const n of conceptNeighbours(id)) (g[n.node.node_type] ??= []).push(n);
  return g;
}

/** Sparse = fewer than two links; such pages are kept out of search indexes. */
export const isSparse = (id: string) => deg(id) < 2;

/** Prerequisites = upstream concepts; next steps = downstream pathways/diseases. */
export function learningSteps(id: string) {
  const prereq = (inn[id] ?? []).map((e) => byId[e.subject_id]).filter(Boolean) as KGNode[];
  const next = (out[id] ?? [])
    .map((e) => byId[e.object_id])
    .filter((n): n is KGNode => !!n && ["PATHWAY", "DISEASE", "INTERVENTION", "CELL"].includes(n.node_type));
  const uniq = (a: KGNode[]) => Array.from(new Map(a.map((n) => [n.id, n])).values()).slice(0, 6);
  return { prereq: uniq(prereq), next: uniq(next) };
}

export type DomainId =
  | "foundations" | "cells" | "molecules" | "signalling"
  | "disease" | "therapies" | "methods" | "research";

interface DomainDef {
  id: DomainId;
  title: string;
  blurb: string;
  match: (n: KGNode) => boolean;
  /** Brief topics; covered when any concept name/alias contains one of the keywords. */
  topics: { label: string; keys: string[] }[];
}

const tagHas = (n: KGNode, re: RegExp) => re.test(conceptExtras(n).domainTag ?? "");

const DOMAIN_DEFS: DomainDef[] = [
  {
    id: "foundations", title: "Foundations", blurb: "Innate vs adaptive immunity, recognition, tolerance and memory.",
    match: (n) => tagHas(n, /innate sensing|innate immune sensor|antigen presentation|adaptive activation|adaptive memory|innate memory|tolerance|co-stimulation/i),
    topics: [
      { label: "Innate and adaptive immunity", keys: ["innate", "adaptive"] },
      { label: "Antigens and epitopes", keys: ["antigen", "epitope", "mhc"] },
      { label: "Immune tolerance", keys: ["regulatory", "treg", "tolerance"] },
      { label: "Immune memory", keys: ["memory"] },
    ],
  },
  {
    id: "cells", title: "Cells and organs", blurb: "T and B cells, NK cells, myeloid cells and lymphoid tissues.",
    match: (n) => n.node_type === "CELL" || n.node_type === "COMPARTMENT",
    topics: [
      { label: "T cells and subsets", keys: ["t cell", "th1", "th17", "treg"] },
      { label: "B cells and plasma cells", keys: ["b cell", "plasma"] },
      { label: "NK cells", keys: ["nk cell", "natural killer"] },
      { label: "Macrophages and neutrophils", keys: ["macrophage", "neutrophil"] },
      { label: "Dendritic cells", keys: ["dendritic"] },
      { label: "Mast cells, eosinophils, basophils", keys: ["mast", "eosinophil", "basophil"] },
      { label: "Thymus", keys: ["thymus"] },
      { label: "Bone marrow", keys: ["bone marrow"] },
      { label: "Spleen", keys: ["spleen"] },
      { label: "Lymph nodes", keys: ["lymph node"] },
    ],
  },
  {
    id: "molecules", title: "Molecules and receptors", blurb: "Cytokines, antibodies, MHC, antigen receptors, PRRs, complement, checkpoints.",
    match: (n) => n.node_type === "MOLECULE" || n.node_type === "RECEPTOR",
    topics: [
      { label: "Antibodies and immunoglobulins", keys: ["ige", "igg", "antibod", "immunoglobulin"] },
      { label: "Cytokines and chemokines", keys: ["il-", "tnf", "interferon", "cxcl", "ccl"] },
      { label: "MHC molecules", keys: ["mhc", "hla"] },
      { label: "T- and B-cell receptors", keys: ["tcr", "bcr"] },
      { label: "Pattern-recognition receptors", keys: ["tlr", "nod", "sting", "cgas"] },
      { label: "Complement proteins", keys: ["c3", "c5", "complement"] },
      { label: "Checkpoints and costimulation", keys: ["pd-1", "pd-l1", "ctla-4", "cd28"] },
    ],
  },
  {
    id: "signalling", title: "Signalling and mechanisms", blurb: "Receptor signalling, inflammasomes, complement activation and migration.",
    match: (n) => n.node_type === "PATHWAY",
    topics: [
      { label: "TCR signalling", keys: ["tcr signal", "t-cell activation"] },
      { label: "BCR signalling", keys: ["bcr signal"] },
      { label: "Toll-like receptor signalling", keys: ["tlr", "toll"] },
      { label: "JAK–STAT", keys: ["jak", "stat"] },
      { label: "NF-κB", keys: ["nf-κb", "nf-kb", "nfkb"] },
      { label: "Inflammasomes", keys: ["inflammasome", "nlrp3"] },
      { label: "Complement activation", keys: ["complement"] },
      { label: "Antigen processing", keys: ["antigen process", "antigen present", "cross-present"] },
      { label: "Leukocyte migration", keys: ["chemotaxis", "migration", "homing"] },
      { label: "Affinity maturation", keys: ["germinal", "affinity", "class switch"] },
    ],
  },
  {
    id: "disease", title: "Diseases and immunopathology", blurb: "Autoimmunity, allergy, immunodeficiency, infection, cancer and transplant.",
    match: (n) => n.node_type === "DISEASE" || n.node_type === "PATHOGEN",
    topics: [
      { label: "Autoimmune disease", keys: ["arthritis", "lupus", "diabetes", "sclerosis"] },
      { label: "Allergy and hypersensitivity", keys: ["asthma", "allerg", "atopic", "anaphyla"] },
      { label: "Immunodeficiency", keys: ["immunodeficien", "scid", "cgd"] },
      { label: "Infection and host defence", keys: ["sepsis", "infection", "virus", "bacter"] },
      { label: "Cancer immunology", keys: ["cancer", "tumour", "melanoma", "lymphoma"] },
      { label: "Transplant rejection", keys: ["transplant", "rejection", "graft"] },
    ],
  },
  {
    id: "therapies", title: "Therapies and applications", blurb: "Biologics, small molecules, checkpoint inhibitors, cell therapies, vaccines.",
    match: (n) => n.node_type === "INTERVENTION" || n.node_type === "TRIAL",
    topics: [
      { label: "Vaccines and adjuvants", keys: ["vaccin", "adjuvant"] },
      { label: "Monoclonal antibodies", keys: ["mab", "umab", "ximab", "zumab"] },
      { label: "Immunosuppressants", keys: ["tacrolimus", "cyclosporin", "methotrexate", "steroid", "glucocorticoid"] },
      { label: "Checkpoint inhibitors", keys: ["pembrolizumab", "nivolumab", "ipilimumab"] },
      { label: "CAR-T and cell therapies", keys: ["car-t", "car t"] },
      { label: "Cytokine-targeted therapies", keys: ["tocilizumab", "anakinra", "infliximab", "adalimumab"] },
    ],
  },
  {
    id: "methods", title: "Research methods", blurb: "Assays, sequencing, models and translational research.",
    match: (n) => n.node_type === "DATA" || n.node_type === "AI_METHOD" || n.node_type === "BIOMARKER",
    topics: [
      { label: "Flow cytometry", keys: ["flow cytometry"] },
      { label: "ELISA and immunoassays", keys: ["elisa", "immunoassay"] },
      { label: "Immunohistochemistry", keys: ["immunohistochem"] },
      { label: "Single-cell sequencing", keys: ["single-cell", "scrna"] },
      { label: "Immune repertoire sequencing", keys: ["repertoire"] },
      { label: "Experimental models", keys: ["mouse model", "organoid"] },
    ],
  },
  {
    id: "research", title: "Research intelligence", blurb: "Discoveries, emerging mechanisms and open questions.",
    match: (n) => n.node_type === "DISCOVERY",
    topics: [
      { label: "Emerging mechanisms", keys: ["discover", "paradigm"] },
      { label: "Recent publications", keys: [] },
      { label: "Conflicting evidence", keys: [] },
    ],
  },
];

function covered(keys: string[]): boolean {
  if (!keys.length) return false;
  return KG.nodes.some((n) => {
    const hay = [n.name, ...conceptExtras(n).aliases].join(" ").toLowerCase();
    return keys.some((k) => hay.includes(k));
  });
}

export interface Domain {
  id: DomainId;
  title: string;
  blurb: string;
  conceptIds: string[];
  topics: { label: string; covered: boolean }[];
}

export const DOMAINS: Domain[] = DOMAIN_DEFS.map((d) => ({
  id: d.id,
  title: d.title,
  blurb: d.blurb,
  conceptIds: KG.nodes.filter(d.match).sort((a, b) => deg(b.id) - deg(a.id)).map((n) => n.id),
  topics: d.topics.map((t) => ({ label: t.label, covered: covered(t.keys) })),
}));

export const domainsFor = (id: string) => DOMAINS.filter((d) => d.conceptIds.includes(id));

/** Ask shortcuts for a concept page (Journey B). */
export function askShortcuts(n: KGNode): string[] {
  const base = [`What does ${n.name} do?`, `How is ${n.name} connected to disease?`];
  if (n.node_type === "INTERVENTION") base.push(`How does ${n.name} work and what are its limits?`);
  else base.push(`What evidence supports the role of ${n.name}?`);
  return base;
}

/** Journey B: prefilled Ask question for a concept context (explicit question wins). */
export function askPrefill(about: string, q: string): string {
  if (q) return q.slice(0, 500);
  const n = about ? byId[about] : undefined;
  return n ? `Tell me about ${n.name}: what does it do and how is it connected?` : "";
}

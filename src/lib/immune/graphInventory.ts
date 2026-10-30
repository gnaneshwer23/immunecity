/**
 * Phase B — Canonical graph inventory (one KG).
 * Source of truth: `src/data/kg.json` + draft merge from `extensions.ts` via engine.
 * Neon holds evidence / trials / collections — not a second competing graph.
 */
import kgJson from "@/data/kg.json";
import { EXT_EDGES, EXT_NODES } from "@/data/extensions";
import { KG, SEM, byId, edgeByRel, relId, type NodeType } from "@/lib/immune/engine";
import { GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION, graphReleaseSnapshot } from "@/lib/immune/graphRelease";

export type GraphPersistenceLayer =
  | "kg_json_core"
  | "extensions_draft"
  | "neon_evidence"
  | "neon_trials"
  | "neon_collections";

export interface GraphInventory {
  product: string;
  coreVersion: string;
  extensionsVersion: string;
  release: ReturnType<typeof graphReleaseSnapshot>;
  nodeTypes: NodeType[];
  spineSteps: string[];
  evidenceStatuses: string[];
  relationCountInSemantics: number;
  relationPolarities: Record<string, number>;
  runtimeNodeCount: number;
  runtimeEdgeCount: number;
  draftNodeCount: number;
  draftEdgeCount: number;
  isolatedCoreNodeIds: string[];
  persistence: Record<GraphPersistenceLayer, string>;
  /** True — browser modules own the curated graph; Neon does not store nodes/edges. */
  singleKnowledgeGraph: true;
}

const raw = kgJson as {
  product?: string;
  evidence_statuses?: string[];
  stats?: { isolated?: string[] };
};

function polarityHistogram(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const sign of Object.values(SEM)) {
    out[sign] = (out[sign] ?? 0) + 1;
  }
  return out;
}

/** Deterministic inventory for docs, Methods honesty, and Phase B tests. */
export function inventoryCanonicalGraph(): GraphInventory {
  const release = graphReleaseSnapshot();
  const isolated = Array.isArray(raw.stats?.isolated) ? raw.stats!.isolated! : [];
  return {
    product: String(raw.product ?? "IMMUNOLOGY OS"),
    coreVersion: GRAPH_CORE_VERSION,
    extensionsVersion: GRAPH_EXTENSIONS_VERSION,
    release,
    nodeTypes: KG.node_types,
    spineSteps: KG.core_spine,
    evidenceStatuses: KG.evidence_statuses.length
      ? KG.evidence_statuses
      : Array.isArray(raw.evidence_statuses)
        ? raw.evidence_statuses
        : [],
    relationCountInSemantics: Object.keys(SEM).length,
    relationPolarities: polarityHistogram(),
    runtimeNodeCount: KG.nodes.length,
    runtimeEdgeCount: KG.relationships.length,
    draftNodeCount: EXT_NODES.length,
    draftEdgeCount: EXT_EDGES.length,
    isolatedCoreNodeIds: isolated.filter((id) => Boolean(byId[id])),
    persistence: {
      kg_json_core: "src/data/kg.json — curated nodes/relationships/relation_semantics",
      extensions_draft: "src/data/extensions.ts — draft merge flagged draft; never silent Gate C",
      neon_evidence: "evidence_records + audit + claim_candidates — claim curation only",
      neon_trials: "clinical_trials / trial_arms / endpoint_results (0015) — pilot Trial Intelligence",
      neon_collections: "evidence_collections (0016) — member organisation; kgWrite=false",
    },
    singleKnowledgeGraph: true,
  };
}

/** Resolve an existing ISI graph id or return null — never invent nodes. */
export function resolveGraphEntityId(id: string): string | null {
  const trimmed = id.trim();
  if (!trimmed || !byId[trimmed]) return null;
  return trimmed;
}

/** Resolve a relationship by stable REL- id. */
export function resolveGraphRelationshipId(relationshipId: string): string | null {
  const trimmed = relationshipId.trim();
  if (!trimmed || !edgeByRel[trimmed]) return null;
  return trimmed;
}

/** Build REL- id from directional triple when both endpoints exist. */
export function tryRelId(subjectId: string, relation: string, objectId: string): string | null {
  if (!byId[subjectId] || !byId[objectId]) return null;
  const id = relId({ subject_id: subjectId, relation, object_id: objectId });
  return edgeByRel[id] ? id : null;
}

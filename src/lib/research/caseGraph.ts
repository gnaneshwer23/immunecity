import { KG, byId, edgeByRel, type NodeType } from "@/lib/immune/engine";
import { typedIncidentRelations } from "@/lib/immune/typedRelations";
import { GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION } from "@/lib/immune/graphRelease";

/** Explicit navigation mappings, not new disease associations or synthetic graph edges. */
const mappings: Record<string, { id: string; scope: "exact_condition" | "broader_disease_family" }> = {
  RA: { id: "D001", scope: "exact_condition" }, SLE: { id: "D007", scope: "exact_condition" },
  PSO: { id: "D003", scope: "exact_condition" }, MS: { id: "D002", scope: "exact_condition" },
  T1D: { id: "D013", scope: "exact_condition" }, ASTHMA: { id: "D005", scope: "exact_condition" },
  AD: { id: "D006", scope: "exact_condition" }, CELIAC: { id: "EG11", scope: "exact_condition" },
  CROHN: { id: "D004", scope: "broader_disease_family" }, UC: { id: "D004", scope: "broader_disease_family" },
};
export function conditionGraphMapping(conditionId: string) {
  const mapping = mappings[conditionId.replace(/^SYN-COND-/, "")];
  return mapping && byId[mapping.id] ? mapping : null;
}

/** Bounded navigation over the sole KG. Traversal is undirected discovery, not a causal path. */
export function caseGraphContext(conditionId: string, requestedAnchor?: string | null) {
  const mapping = conditionGraphMapping(conditionId);
  const anchorId = requestedAnchor ?? mapping?.id ?? null;
  if (anchorId && !byId[anchorId]) throw new Error("Unknown graph anchor");
  const seen = new Set<string>(anchorId ? [anchorId] : []);
  const relationIds = new Set<string>();
  let frontier = anchorId ? [anchorId] : [];
  for (let depth = 0; depth < 2; depth++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const relation of typedIncidentRelations(id)) {
        if (relationIds.size >= 100) break;
        const neighbour = relation.subjectId === id ? relation.objectId : relation.subjectId;
        if (!seen.has(neighbour) && seen.size >= 60) continue;
        relationIds.add(relation.relId);
        if (!seen.has(neighbour)) { seen.add(neighbour); next.push(neighbour); }
      }
    }
    frontier = next;
  }
  const nodes = [...seen].map((id) => byId[id]!);
  return { schemaVersion: "case-graph-context-1", graphVersion: { core: GRAPH_CORE_VERSION, extensions: GRAPH_EXTENSIONS_VERSION },
    conditionId, mapping, anchorId, userSelectedExploration: Boolean(requestedAnchor && requestedAnchor !== mapping?.id),
    nodes, relations: [...relationIds].map((id) => ({ id, edge: edgeByRel[id]! })),
    coverage: Object.fromEntries((["CELL", "MOLECULE", "RECEPTOR", "PATHWAY", "BIOMARKER", "INTERVENTION", "TRIAL"] as NodeType[]).map((type) => [type, nodes.filter((n) => n.node_type === type).length])),
    clinicalInference: false, kgWrite: false, approvedReviewIncluded: false,
    scope: "Two-hop undirected navigation; maximum 60 concepts/100 relationships. Not a causal explanation, patient finding, or exhaustive literature search.",
  };
}
export function searchCaseGraph(query: string) {
  const q = query.trim().toLowerCase();
  return q ? KG.nodes.filter((n) => `${n.id} ${n.name}`.toLowerCase().includes(q)).slice(0, 12) : [];
}

import { retrieveSharedNeighbourhood } from "@/lib/hsi/vendor/sharedTechnology";
/**
 * Phase B — Bounded graph-neighbourhood retrieval (one KG).
 * Browser-safe BFS over existing out/inn indexes. Depth and edge caps are hard
 * limits so Ask / Research never pull the full graph in one call.
 */
import { byId, human, inn, out, relId, type KGEdge, type KGNode } from "@/lib/immune/engine";
import { relationPolarity, type RelationPolarity, type TypedRelation, typeRelationship } from "@/lib/immune/typedRelations";

export const NEIGHBOURHOOD_DEFAULT_DEPTH = 1;
export const NEIGHBOURHOOD_MAX_DEPTH = 3;
export const NEIGHBOURHOOD_DEFAULT_MAX_EDGES = 48;
export const NEIGHBOURHOOD_HARD_MAX_EDGES = 120;

export interface NeighbourhoodOptions {
  /** Hop depth from the seed (clamped 0…NEIGHBOURHOOD_MAX_DEPTH). */
  depth?: number;
  /** Max edges returned (clamped 1…NEIGHBOURHOOD_HARD_MAX_EDGES). */
  maxEdges?: number;
  /** When true, include draft extension edges (default true for teaching; Ask may set false). */
  includeDraft?: boolean;
  /** Direction filter relative to the expanding frontier. */
  direction?: "both" | "out" | "in";
}

export interface NeighbourhoodEdge {
  relId: string;
  subjectId: string;
  objectId: string;
  predicate: string;
  predicateLabel: string;
  polarity: RelationPolarity;
  depth: number;
  draft: boolean;
  evidenceStatus: string;
  context: string | null;
  typed: TypedRelation;
}

export interface GraphNeighbourhood {
  seedId: string;
  seed: KGNode;
  depth: number;
  maxEdges: number;
  truncated: boolean;
  nodeIds: string[];
  nodes: KGNode[];
  edges: NeighbourhoodEdge[];
}

/** Product adapter: traversal executes in the shared HSI engine; this sole KG supplies data and scientific presentation. */
export function getGraphNeighbourhood(seedId: string, options: NeighbourhoodOptions = {}): GraphNeighbourhood | null {
  const result = retrieveSharedNeighbourhood<KGNode, KGEdge>({
    getNode: (id) => byId[id], nodeId: (node) => node.id,
    outgoing: (id) => out[id] ?? [], incoming: (id) => inn[id] ?? [],
    edgeId: relId, subjectId: (edge) => edge.subject_id, objectId: (edge) => edge.object_id,
    isDraft: (edge) => Boolean(edge.draft),
  }, seedId, options);
  if (!result) return null;
  return {
    seedId: result.seedId, seed: result.seed, depth: result.depth, maxEdges: result.maxEdges,
    truncated: result.truncated, nodeIds: result.nodeIds, nodes: result.nodes,
    edges: result.edges.map(({ edge, depth }) => {
      const typed = typeRelationship(edge);
      return { relId: relId(edge), subjectId: edge.subject_id, objectId: edge.object_id,
        predicate: edge.relation, predicateLabel: human(edge.relation), polarity: relationPolarity(edge.relation),
        depth, draft: Boolean(edge.draft), evidenceStatus: typed.evidenceStatus,
        context: edge.location?.trim() || null, typed };
    }),
  };
}

/** Compact path string for Ask / UI: A —predicate→ B. */
export function formatNeighbourhoodEdge(e: NeighbourhoodEdge): string {
  const s = byId[e.subjectId]?.name ?? e.subjectId;
  const o = byId[e.objectId]?.name ?? e.objectId;
  return `${s} —${e.predicateLabel}→ ${o}`;
}

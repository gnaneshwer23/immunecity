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

function clampDepth(d: number | undefined): number {
  const n = typeof d === "number" && Number.isFinite(d) ? Math.floor(d) : NEIGHBOURHOOD_DEFAULT_DEPTH;
  return Math.max(0, Math.min(NEIGHBOURHOOD_MAX_DEPTH, n));
}

function clampMaxEdges(m: number | undefined): number {
  const n = typeof m === "number" && Number.isFinite(m) ? Math.floor(m) : NEIGHBOURHOOD_DEFAULT_MAX_EDGES;
  return Math.max(1, Math.min(NEIGHBOURHOOD_HARD_MAX_EDGES, n));
}

function incident(id: string, direction: "both" | "out" | "in"): KGEdge[] {
  if (direction === "out") return out[id] ?? [];
  if (direction === "in") return inn[id] ?? [];
  return [...(out[id] ?? []), ...(inn[id] ?? [])];
}

/**
 * Bounded neighbourhood around an existing ISI concept id.
 * Returns null when the seed id is unknown (never invents a node).
 */
export function getGraphNeighbourhood(
  seedId: string,
  options: NeighbourhoodOptions = {},
): GraphNeighbourhood | null {
  const seed = byId[seedId.trim()];
  if (!seed) return null;

  const depthLimit = clampDepth(options.depth);
  const maxEdges = clampMaxEdges(options.maxEdges);
  const includeDraft = options.includeDraft !== false;
  const direction = options.direction ?? "both";

  const nodeIds = new Set<string>([seed.id]);
  const edgeMap = new Map<string, NeighbourhoodEdge>();
  let truncated = false;

  type Frontier = { id: string; depth: number };
  let frontier: Frontier[] = [{ id: seed.id, depth: 0 }];

  while (frontier.length && edgeMap.size < maxEdges) {
    const next: Frontier[] = [];
    for (const { id, depth } of frontier) {
      if (depth >= depthLimit) continue;
      for (const edge of incident(id, direction)) {
        if (!includeDraft && edge.draft) continue;
        if (!byId[edge.subject_id] || !byId[edge.object_id]) continue;
        const idKey = relId(edge);
        if (edgeMap.has(idKey)) continue;
        if (edgeMap.size >= maxEdges) {
          truncated = true;
          break;
        }
        const typed = typeRelationship(edge);
        edgeMap.set(idKey, {
          relId: idKey,
          subjectId: edge.subject_id,
          objectId: edge.object_id,
          predicate: edge.relation,
          predicateLabel: human(edge.relation),
          polarity: relationPolarity(edge.relation),
          depth: depth + 1,
          draft: Boolean(edge.draft),
          evidenceStatus: edge.evidence_status,
          context: edge.location?.trim() || null,
          typed,
        });
        const other = edge.subject_id === id ? edge.object_id : edge.subject_id;
        if (!nodeIds.has(other)) {
          nodeIds.add(other);
          next.push({ id: other, depth: depth + 1 });
        }
      }
      if (truncated) break;
    }
    if (truncated) break;
    frontier = next;
  }

  // If we stopped mid-frontier solely due to maxEdges, mark truncated.
  if (!truncated && frontier.length && depthLimit > 0) {
    // Remaining frontier at depth < limit with unused capacity is fine;
    // truncated only when maxEdges blocked further expansion.
  }

  const nodes = [...nodeIds].map((id) => byId[id]!).filter(Boolean);
  return {
    seedId: seed.id,
    seed,
    depth: depthLimit,
    maxEdges,
    truncated,
    nodeIds: [...nodeIds],
    nodes,
    edges: [...edgeMap.values()],
  };
}

/** Compact path string for Ask / UI: A —predicate→ B. */
export function formatNeighbourhoodEdge(e: NeighbourhoodEdge): string {
  const s = byId[e.subjectId]?.name ?? e.subjectId;
  const o = byId[e.objectId]?.name ?? e.objectId;
  return `${s} —${e.predicateLabel}→ ${o}`;
}

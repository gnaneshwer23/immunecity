/**
 * Executable shared technology, not an integration catalogue.
 * Graph traversal generalised from ISI neighbourhood.ts; review ordering from
 * Aksh platform-uk/lib/dashboard/sort-review-queue.ts. Product-owned adapters
 * supply data in-process; this module has no persistence, network or PHI transport.
 */
export const SHARED_TECHNOLOGY_VERSION = "hsi-shared-technology-1" as const;
export interface SharedGraphAdapter<Node, Edge> {
  getNode(id: string): Node | undefined;
  nodeId(node: Node): string;
  outgoing(id: string): readonly Edge[];
  incoming(id: string): readonly Edge[];
  edgeId(edge: Edge): string;
  subjectId(edge: Edge): string;
  objectId(edge: Edge): string;
  isDraft(edge: Edge): boolean;
}
export interface SharedNeighbourhoodOptions {
  depth?: number;
  maxEdges?: number;
  includeDraft?: boolean;
  direction?: "both" | "out" | "in";
}
function bounded(value: number | undefined, fallback: number, min: number, max: number) {
  return Math.max(min, Math.min(max, typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : fallback));
}

/** Cycle-safe deterministic BFS over the caller's sole graph; never creates nodes or evidence. */
export function retrieveSharedNeighbourhood<Node, Edge>(graph: SharedGraphAdapter<Node, Edge>, seedId: string, options: SharedNeighbourhoodOptions = {}) {
  const seed = graph.getNode(seedId.trim());
  if (!seed) return null;
  const depth = bounded(options.depth, 1, 0, 3);
  const maxEdges = bounded(options.maxEdges, 48, 1, 120);
  const direction = options.direction ?? "both";
  const nodeIds = new Set([graph.nodeId(seed)]);
  const edges = new Map<string, { edge: Edge; depth: number }>();
  let frontier = [{ id: graph.nodeId(seed), depth: 0 }];
  let truncated = false;
  while (frontier.length) {
    const next: typeof frontier = [];
    for (const step of frontier) {
      if (step.depth >= depth) continue;
      const incident = direction === "out" ? graph.outgoing(step.id) : direction === "in" ? graph.incoming(step.id) : [...graph.outgoing(step.id), ...graph.incoming(step.id)];
      for (const edge of incident) {
        if (options.includeDraft === false && graph.isDraft(edge)) continue;
        const subject = graph.subjectId(edge), object = graph.objectId(edge), id = graph.edgeId(edge);
        if (!graph.getNode(subject) || !graph.getNode(object) || edges.has(id)) continue;
        if (edges.size >= maxEdges) { truncated = true; break; }
        edges.set(id, { edge, depth: step.depth + 1 });
        const other = subject === step.id ? object : subject;
        if (!nodeIds.has(other)) { nodeIds.add(other); next.push({ id: other, depth: step.depth + 1 }); }
      }
      if (truncated) break;
    }
    if (truncated) break;
    frontier = next;
  }
  return { seed, seedId: graph.nodeId(seed), depth, maxEdges, truncated, nodeIds: [...nodeIds], nodes: [...nodeIds].map((id) => graph.getNode(id)!), edges: [...edges.values()] };
}

export interface SharedReviewQueueItem {
  priority: "Urgent" | "High" | "Normal";
  agentType: string;
  createdAt: string;
}
const priorityRank = { Urgent: 0, High: 1, Normal: 2 } as const;
/** Aksh's existing ordering: urgent GUARDIAN first, then priority and newest. No review/clinical decision. */
export function prioritiseHumanReviewQueue<Item extends SharedReviewQueueItem>(items: readonly Item[]): Item[] {
  return [...items].sort((a, b) => {
    const guardian = (a.agentType === "GUARDIAN" && a.priority === "Urgent" ? 0 : 1) - (b.agentType === "GUARDIAN" && b.priority === "Urgent" ? 0 : 1);
    if (guardian !== 0) return guardian;
    const priority = priorityRank[a.priority] - priorityRank[b.priority];
    if (priority !== 0) return priority;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

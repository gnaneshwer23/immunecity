/** Evidence-status slice for the existing graph. Status values come from the KG file. */

export function filterGraphSlice<N extends { id: string }, E extends { subject_id: string; object_id: string; evidence_status: string }>(
  nodes: N[],
  edges: E[],
  evidenceStatus: string,
  keepNodeIds: ReadonlySet<string> = new Set(),
): { nodes: N[]; edges: E[] } {
  if (!evidenceStatus) return { nodes, edges };
  const filtered = edges.filter((e) => e.evidence_status === evidenceStatus);
  const ids = new Set<string>();
  for (const e of filtered) {
    ids.add(e.subject_id);
    ids.add(e.object_id);
  }
  for (const id of keepNodeIds) ids.add(id);
  return { edges: filtered, nodes: nodes.filter((n) => ids.has(n.id)) };
}

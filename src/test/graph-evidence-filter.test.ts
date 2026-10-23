import { describe, expect, it } from "vitest";
import { KG } from "@/lib/immune/engine";
import { filterGraphSlice } from "@/lib/immune/graphFilters";

describe("graph evidence-status filter", () => {
  it("uses statuses that already exist on the graph", () => {
    expect(KG.evidence_statuses.length).toBeGreaterThan(0);
    const status = KG.evidence_statuses[0]!;
    const edges = KG.relationships.filter((r) => r.evidence_status === status).slice(0, 3);
    expect(edges.length).toBeGreaterThan(0);
    const nodes = KG.nodes.filter((n) => edges.some((e) => e.subject_id === n.id || e.object_id === n.id));
    const sliced = filterGraphSlice(nodes, edges, status);
    expect(sliced.edges.every((e) => e.evidence_status === status)).toBe(true);
    const none = filterGraphSlice(nodes, edges, "NOT_A_STATUS");
    expect(none.edges).toHaveLength(0);
    expect(none.nodes).toHaveLength(0);
  });
});

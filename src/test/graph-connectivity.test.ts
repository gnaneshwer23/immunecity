import { describe, expect, it } from "vitest";
import { KG, byId, inn, out } from "@/lib/immune/engine";
import { buildPipeline, pipelineDiseases } from "@/lib/immune/pipeline";

const neighbours = (id: string) => [
  ...(out[id] ?? []).map((e) => e.object_id),
  ...(inn[id] ?? []).map((e) => e.subject_id),
];

describe("knowledge-graph connectivity", () => {
  it("links every curated therapy to at least one disease", () => {
    const orphans = KG.nodes
      .filter((n) => n.node_type === "INTERVENTION" && !n.draft)
      .filter((n) => !neighbours(n.id).some((id) => byId[id]?.node_type === "DISEASE"))
      .map((n) => n.name);
    expect(orphans).toEqual([]);
  });

  it("gives every curated trial a disease context or target", () => {
    const orphans = KG.nodes
      .filter((n) => n.node_type === "TRIAL" && !n.draft)
      .filter(
        (n) =>
          !(out[n.id] ?? []).some((e) =>
            ["has_clinical_context", "has_target_axis"].includes(e.relation),
          ),
      )
      .map((n) => n.name);
    expect(orphans).toEqual([]);
  });

  it("keeps almost the whole graph in one connected component", () => {
    const seen = new Set<string>([KG.nodes[0]!.id]);
    const stack = [KG.nodes[0]!.id];
    while (stack.length)
      for (const m of neighbours(stack.pop()!)) if (!seen.has(m)) (seen.add(m), stack.push(m));
    expect(seen.size / KG.nodes.length).toBeGreaterThanOrEqual(0.99);
  });

  it("publishes pipelines for melanoma, ANCA vasculitis and gout", () => {
    const names = pipelineDiseases().map((d) => d.node.name);
    for (const n of ["Melanoma", "ANCA vasculitis", "Gout"]) expect(names).toContain(n);
  });

  it("groups checkpoint inhibitors under their molecular target", () => {
    const pd1 = buildPipeline("D012").find((g) => g.target?.name === "PD-1");
    expect(pd1?.curated.map((r) => r.therapy.name).sort()).toEqual(["Nivolumab", "Pembrolizumab"]);
  });
});

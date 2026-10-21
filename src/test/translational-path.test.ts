import { describe, expect, it } from "vitest";
import { byId, nodesOf } from "@/lib/immune/engine";
import { registryQueryFor, registryTerm, translationalPath } from "@/lib/immune/translational";
import { NCT_PATTERN, TRIAL_REGISTRY } from "@/data/trialRegistry";

describe("trial registry", () => {
  it("covers every curated TRIAL concept with verified IDs or an explicit reason", () => {
    for (const t of nodesOf("TRIAL").filter((n) => !n.draft)) {
      const reg = TRIAL_REGISTRY[t.id];
      expect(reg, t.id).toBeDefined();
      expect(reg!.studies.length > 0 || Boolean(reg!.unregisteredReason), t.id).toBe(true);
    }
  });

  it("only holds well-formed, unique NCT IDs for existing trials", () => {
    const seen = new Set<string>();
    for (const [id, reg] of Object.entries(TRIAL_REGISTRY)) {
      expect(byId[id]?.node_type, id).toBe("TRIAL");
      for (const s of reg.studies) {
        expect(s.nctId).toMatch(NCT_PATTERN);
        expect(seen.has(s.nctId), s.nctId).toBe(false);
        seen.add(s.nctId);
      }
    }
  });

  it("pins landmark trials that free-text search used to mismatch", () => {
    expect(TRIAL_REGISTRY.TR002?.studies[0]?.nctId).toBe("NCT01327846"); // CANTOS
    expect(TRIAL_REGISTRY.TR009?.studies[0]?.nctId).toBe("NCT04381936"); // RECOVERY
    expect(TRIAL_REGISTRY.TR001?.studies).toHaveLength(0); // ATTRACT predates registries
  });
});

describe("translational path", () => {
  it("connects a disease to therapies, their targets and landmark trials", () => {
    const rows = translationalPath("D001"); // rheumatoid arthritis
    const infliximab = rows.find((r) => r.therapy.id === "I001");
    expect(infliximab).toBeDefined();
    expect(infliximab!.viaClass?.id).toBe("I032"); // reached through TNF blockade (class)
    expect(infliximab!.outcome).toBe("benefit");
    expect(infliximab!.targets.map((t) => t.node.id)).toContain("M001");
    expect(infliximab!.trials.map((t) => t.id)).toContain("TR001");
  });

  it("ranks failed or harmful therapies after beneficial ones", () => {
    for (const d of nodesOf("DISEASE")) {
      const outcomes = translationalPath(d.id).map((r) => r.outcome);
      const firstFailed = outcomes.indexOf("failed");
      if (firstFailed >= 0) expect(outcomes.slice(firstFailed).every((o) => o === "failed")).toBe(true);
    }
  });

  it("surfaces biomarker-based patient selection where the graph records it", () => {
    const withSelection = nodesOf("INTERVENTION").filter((n) => translationalPath(n.id)[0]?.selection.length);
    expect(withSelection.length).toBeGreaterThan(0);
  });

  it("only queries the live registry for diseases and named therapies", () => {
    expect(registryQueryFor(byId.D001!)).toEqual({ condition: byId.D001!.name, intervention: null });
    expect(registryQueryFor(byId.I001!)).toEqual({ condition: null, intervention: "Infliximab" });
    expect(registryQueryFor(byId.I032!)).toBeNull(); // drug class, not a registry intervention
    expect(registryQueryFor(byId.M001!)).toBeNull();
    expect(registryTerm("Severe COVID-19 / ARDS")).toBe("Severe COVID-19");
    expect(registryTerm("PNH eculizumab (TRIUMPH)")).toBe("PNH eculizumab");
  });
});

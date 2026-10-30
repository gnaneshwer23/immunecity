/**
 * Phase B — Scientific graph model (one KG).
 * Run: bun test src/test/phase-b-scientific-graph.test.ts
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ONTOLOGY_MAPPINGS_SEED, mappingsForIsiId } from "@/data/ontologyMappings";
import { byId } from "@/lib/immune/engine";
import { inventoryCanonicalGraph, resolveGraphEntityId, tryRelId } from "@/lib/immune/graphInventory";
import { conceptProvenance, relationshipProvenance } from "@/lib/immune/graphProvenance";
import {
  NEIGHBOURHOOD_HARD_MAX_EDGES,
  NEIGHBOURHOOD_MAX_DEPTH,
  getGraphNeighbourhood,
} from "@/lib/immune/neighbourhood";
import { resolveGraphNeighbourhood } from "@/lib/immune/neighbourhood.functions";
import { listRelationPredicates, relationPolarity, typeRelationshipById, typedIncidentRelations } from "@/lib/immune/typedRelations";

const root = (...p: string[]) => resolve(process.cwd(), ...p);
const source = (rel: string) => readFileSync(root(rel), "utf8");

describe("Phase B1 — canonical inventory (one KG)", () => {
  it("positive: inventory matches runtime graph and declares single KG", () => {
    const inv = inventoryCanonicalGraph();
    expect(inv.singleKnowledgeGraph).toBe(true);
    expect(inv.runtimeNodeCount).toBeGreaterThan(200);
    expect(inv.runtimeEdgeCount).toBeGreaterThan(300);
    expect(inv.relationCountInSemantics).toBeGreaterThan(50);
    expect(inv.spineSteps.length).toBe(15);
    expect(inv.persistence.kg_json_core).toMatch(/kg\.json/);
    expect(inv.persistence.neon_evidence).toMatch(/claim curation/i);
  });

  it("negative: unknown ids do not resolve; no fabricated entities", () => {
    expect(resolveGraphEntityId("NOT_A_NODE")).toBeNull();
    expect(resolveGraphEntityId("")).toBeNull();
    expect(tryRelId("D012", "invented_predicate", "I008")).toBeNull();
  });

  it("boundary: known melanoma pilot ids resolve", () => {
    expect(resolveGraphEntityId("D012")).toBe("D012");
    expect(resolveGraphEntityId("TR003")).toBe("TR003");
    expect(byId["D012"]?.name.toLowerCase()).toMatch(/melanoma/);
  });
});

describe("Phase B2 — typed relations (direction + polarity + context)", () => {
  it("positive: predicates carry curated polarity from relation_semantics", () => {
    expect(relationPolarity("activates")).toBe("+");
    expect(relationPolarity("inhibits")).toBe("-");
    const preds = listRelationPredicates();
    expect(preds.length).toBeGreaterThan(50);
    expect(preds.every((p) => ["+", "-", "0", "r+", "unknown"].includes(p.polarity))).toBe(true);
    expect(preds.filter((p) => p.polarity === "unknown").length).toBe(0);
  });

  it("negative: unknown predicate polarity is unknown (not invented +/-)", () => {
    expect(relationPolarity("definitely_not_a_real_predicate_xyz")).toBe("unknown");
  });

  it("boundary: incident typed edges for PD-1 stay directional subject→object", () => {
    const rows = typedIncidentRelations("R011");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.direction === "subject→object")).toBe(true);
    expect(rows.every((r) => r.relId.startsWith("REL-"))).toBe(true);
    const one = typeRelationshipById(rows[0]!.relId);
    expect(one?.relId).toBe(rows[0]!.relId);
  });
});

describe("Phase B3 — ontology mappings retain ISI ids", () => {
  it("positive: seed is empty (no fabricated crosswalks)", () => {
    expect(ONTOLOGY_MAPPINGS_SEED).toEqual([]);
    expect(mappingsForIsiId("D012")).toEqual([]);
  });

  it("negative: migration/backfill refuse invented science (source contract)", () => {
    const mig = source("drizzle/migrations/0017_graph_ontology_and_provenance.sql");
    expect(mig).toContain("ontology_mappings");
    expect(mig).toContain("graph_provenance_events");
    expect(mig).toMatch(/isi_id/);
    const backfill = source("scripts/backfill-ontology-mappings.ts");
    expect(backfill).toMatch(/unknown_isi_id/);
    expect(backfill).toMatch(/No invented crosswalks/i);
    expect(backfill).toContain("--apply");
  });

  it("boundary: schema + apply script are additive and evidence-count fail-closed", () => {
    const schema = source("src/lib/db/schema.server.ts");
    expect(schema).toContain("ontologyMappings");
    expect(schema).toContain("graphProvenanceEvents");
    const apply = source("scripts/apply-graph-ontology-migration.ts");
    expect(apply).toContain("evidence_records_count_changed");
    expect(apply).toContain("no_fabricated_ontology_seed");
  });
});

describe("Phase B4 — versioned provenance", () => {
  it("positive: concept provenance carries graph release versions", () => {
    const p = conceptProvenance("D012");
    expect(p).not.toBeNull();
    expect(p!.graphCoreVersion.length).toBeGreaterThan(0);
    expect(p!.releaseSnapshotAt).toMatch(/^graph-/);
  });

  it("negative: unknown concept / relationship → null (no invented provenance)", () => {
    expect(conceptProvenance("ZZZ999")).toBeNull();
    expect(relationshipProvenance("REL-nope-x-nope")).toBeNull();
  });

  it("boundary: without cites, review fields stay honest (Not recorded / unreviewed path)", () => {
    const rows = typedIncidentRelations("D012");
    expect(rows.length).toBeGreaterThan(0);
    const prov = relationshipProvenance(rows[0]!.relId, []);
    expect(prov).not.toBeNull();
    expect(prov!.reviewer).toMatch(/Not recorded|unreviewed|draft/i);
  });
});

describe("Phase B5 — bounded neighbourhood API", () => {
  it("positive: depth-1 neighbourhood around melanoma returns capped edges", () => {
    const n = getGraphNeighbourhood("D012", { depth: 1, maxEdges: 24 });
    expect(n).not.toBeNull();
    expect(n!.seedId).toBe("D012");
    expect(n!.edges.length).toBeGreaterThan(0);
    expect(n!.edges.length).toBeLessThanOrEqual(24);
    expect(n!.nodeIds).toContain("D012");
  });

  it("negative: unknown seed → null / unknownSeed", () => {
    expect(getGraphNeighbourhood("NOT_REAL")).toBeNull();
    const read = resolveGraphNeighbourhood({ seedId: "NOT_REAL" });
    expect(read.unknownSeed).toBe(true);
    expect(read.neighbourhood).toBeNull();
  });

  it("boundary: depth and edge caps clamp; truncation when maxEdges tight", () => {
    const deep = getGraphNeighbourhood("D012", { depth: 99, maxEdges: 9999 });
    expect(deep!.depth).toBe(NEIGHBOURHOOD_MAX_DEPTH);
    expect(deep!.maxEdges).toBe(NEIGHBOURHOOD_HARD_MAX_EDGES);
    const tiny = getGraphNeighbourhood("D012", { depth: 2, maxEdges: 1 });
    expect(tiny!.edges.length).toBeLessThanOrEqual(1);
    expect(tiny!.truncated).toBe(true);
  });
});

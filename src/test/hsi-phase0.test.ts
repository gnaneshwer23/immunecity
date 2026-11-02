/**
 * HSI Phase 0 — immunecity consumes hsi-core (package), not a vendored fork.
 * Run: bun test src/test/hsi-phase0.test.ts
 */
import { describe, expect, it } from "bun:test";
import {
  HSI_AXES_NOTE,
  HSI_CURATION_REVIEWS,
  HSI_EXAMPLE_TRANSLATION_CARDS,
  HSI_GRADES,
  HSI_MARKERS,
  HSI_SAFETY_RELEASE_CRITERIA_V0,
  HSI_T2D_IMMUNO_SEED_EDGES,
  HSI_TEACHING_STATUSES,
  NEON_GATE_C_CURATOR_WARNINGS,
  buildHsiBridgeCurationQueue,
  claimsWithIsiMappings,
  discoverySeedSummary,
  hsiAxesForEdge,
  hsiGradeFromCuration,
  isCdsSurfacable,
  isCiteReadyAfterGateCItem,
  isNeonGateCReadyItem,
  listBridgeCandidates,
  listCiteReadyAfterGateCItems,
  listIsiRelSuggestions,
  listNeonGateCReadyItems,
  loadIsiHsiExportSnapshot,
  parseGateCDecisionStatusByEdge,
  summarizeGradeCounts,
  summarizeIsiRelMappings,
  validateHsiEdge,
  validateTranslationCard,
} from "@/lib/hsi";
import { resolveGraphRelationshipId } from "@/lib/immune/graphInventory";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("HSI package import", () => {
  it("maps ISI curation reviews onto coarse HSI grades without silent promotion", () => {
    expect(hsiGradeFromCuration("approved")).toBe("established");
    expect(hsiGradeFromCuration("claim-assessed")).toBe("uncertain");
    expect(hsiGradeFromCuration("source-verified")).toBe("uncertain");
    expect(hsiGradeFromCuration("draft")).toBe("unexplored");
    expect(hsiGradeFromCuration("unreviewed")).toBe("unexplored");
    expect(HSI_CURATION_REVIEWS).toHaveLength(8);
    expect(HSI_GRADES).toEqual(["established", "uncertain", "unexplored"]);
    expect(HSI_TEACHING_STATUSES).toContain("associative");
  });
});

describe("HSI seed edges via hsi-core", () => {
  it("ships curated placeholder edges with provenance; CDS stays closed", () => {
    expect(HSI_T2D_IMMUNO_SEED_EDGES.length).toBeGreaterThanOrEqual(20);
    for (const edge of HSI_T2D_IMMUNO_SEED_EDGES) {
      const result = validateHsiEdge(edge);
      expect(result.ok, `${edge.id}: ${result.issues.map((i) => i.message).join("; ")}`).toBe(true);
      expect(edge.provenance.recordedAt).toBeTruthy();
      expect(edge.seedKind).toBe("placeholder");
      expect(edge.hsiGrade).toBe(hsiGradeFromCuration(edge.curationReview));
      expect(isCdsSurfacable(edge)).toBe(false);
      // teachingStatus may say "established" while hsiGrade stays uncertain/unexplored
      if (edge.teachingStatus === "established" && edge.curationReview !== "approved") {
        expect(edge.hsiGrade).not.toBe("established");
      }
    }
  });

  it("includes immuno-metabolic bridge candidates for P1 shortlist", () => {
    const bridges = listBridgeCandidates();
    expect(bridges.length).toBeGreaterThanOrEqual(8);
    expect(bridges.every((e) => e.bridgeCandidate)).toBe(true);
  });

  it("summarizes grade density for the seed set", () => {
    const counts = summarizeGradeCounts(HSI_T2D_IMMUNO_SEED_EDGES);
    expect(counts.established).toBe(0);
    expect(counts.uncertain + counts.unexplored).toBe(HSI_T2D_IMMUNO_SEED_EDGES.length);
  });
});

describe("ISI bridge axes", () => {
  it("keeps curation, hsiGrade, and teachingStatus as separate panel fields", () => {
    const edge = HSI_T2D_IMMUNO_SEED_EDGES[0]!;
    const axes = hsiAxesForEdge(edge);
    expect(axes.curation.value).toBeTruthy();
    expect(HSI_GRADES).toContain(axes.hsiGrade.value);
    expect(axes.teachingStatus.value).toBeTruthy();
    expect(HSI_AXES_NOTE.toLowerCase()).toContain("teachingstatus");
    const summary = discoverySeedSummary();
    expect(summary.notCds).toBe(true);
    expect(summary.cdsSurfacableCount).toBe(0);
    expect(summary.edgeCount).toBe(HSI_T2D_IMMUNO_SEED_EDGES.length);
  });

  it("loads the frozen export:isi snapshot without inventing PMIDs", () => {
    const snap = loadIsiHsiExportSnapshot();
    expect(snap.schemaVersion).toBe("hsi-isi-export-1");
    expect(snap.notCds).toBe(true);
    expect(snap.edges.length).toBeGreaterThanOrEqual(20);
    for (const edge of snap.edges) {
      // Placeholders may use citationLabel only — null PMID is fine; never fabricate.
      if (edge.provenance.pmid != null) {
        expect(String(edge.provenance.pmid).length).toBeGreaterThan(0);
      }
    }
  });
});

describe("HSI translation cards", () => {
  it("provides T2D and immuno-metabolic claim→marker cards with HITL actions", () => {
    expect(HSI_EXAMPLE_TRANSLATION_CARDS).toHaveLength(2);
    for (const card of HSI_EXAMPLE_TRANSLATION_CARDS) {
      const result = validateTranslationCard(card);
      expect(result.ok, result.issues.map((i) => i.message).join("; ")).toBe(true);
      expect(card.action.requiresHitl).toBe(true);
      expect(card.observation.dataClass).toBe("fixture");
    }
    expect(HSI_MARKERS.some((m) => m.loinc === "4548-4")).toBe(true);
  });
});

describe("HSI safety release criteria v0", () => {
  it("covers HITL, no PHI→LLM, and not-CDS labelling", () => {
    const text = HSI_SAFETY_RELEASE_CRITERIA_V0.map((c) => c.rule).join(" ");
    expect(text.toLowerCase()).toContain("hitl");
    expect(text.toLowerCase()).toMatch(/llm|phi/);
    expect(text.toLowerCase()).toContain("cds");
    expect(HSI_SAFETY_RELEASE_CRITERIA_V0.length).toBeGreaterThanOrEqual(5);
  });
});

describe("HSI bridge → REL curation queue", () => {
  it("maps suggestions onto live REL-* ids without auto-approve or CDS", () => {
    const suggestions = listIsiRelSuggestions();
    expect(suggestions.length).toBeGreaterThanOrEqual(12);
    expect(suggestions.every((s) => s.autoApprove === false)).toBe(true);

    const mapped = claimsWithIsiMappings();
    expect(mapped.filter((c) => c.isiRelationshipId?.startsWith("REL-")).length).toBeGreaterThanOrEqual(8);

    const map = summarizeIsiRelMappings();
    expect(map.autoApproveIntoKg).toBe(false);
    expect(map.withRelId).toBeGreaterThanOrEqual(8);

    const queue = buildHsiBridgeCurationQueue();
    expect(queue.notCds).toBe(true);
    expect(queue.autoApproveIntoKg).toBe(false);
    expect(queue.summary.relValidatedInGraph).toBeGreaterThanOrEqual(8);
    expect(queue.summary.exactConceptPair).toBeGreaterThanOrEqual(1);
    expect(queue.items.every((i) => i.autoApprove === false && i.cdsSurfacable === false)).toBe(true);

    const pd1 = queue.items.find((i) => i.edgeId === "HSI-E-IO-001");
    expect(pd1?.suggestedIsiRelationshipId).toBe("REL-R011-drives-P015");
    expect(pd1?.relExistsInGraph).toBe(true);
    expect(pd1?.suggestionStatus).toBe("curated");
    expect(pd1?.pmid).toBe("16382236");
    expect(pd1?.evidenceLink).toBe("evidence_linked");
    expect(pd1?.gateCHandoff).toBe("pending");
    expect(pd1?.evidenceHandoffLabel).toContain("Gate C pending");
    expect(pd1?.neonGateCReady).toBe(true);
    expect(pd1?.curationReview).toBe("source-verified");
    expect(pd1?.hsiGrade).toBe("uncertain");
    expect(pd1?.teachingStatus).toBe("associative");
    expect(resolveGraphRelationshipId("REL-R011-drives-P015")).toBe("REL-R011-drives-P015");

    // Evidence sprint: related-axis maps show real PMIDs + curated (HSI) + Gate C pending (not Neon-approved).
    const cantos = queue.items.find((i) => i.edgeId === "HSI-E-IM-010");
    expect(cantos?.suggestedIsiRelationshipId).toBe("REL-I023-targets-M002");
    expect(cantos?.suggestionStatus).toBe("curated");
    expect(cantos?.pmid).toBe("28845751");
    expect(cantos?.gateCHandoff).toBe("pending");
    expect(cantos?.evidenceHandoffLabel).toContain("Gate C pending");
    expect(cantos?.neonGateCReady).toBe(true);

    expect(queue.summary.curated).toBeGreaterThanOrEqual(9);
    expect(queue.summary.neonGateCReady).toBeGreaterThanOrEqual(9);
    expect(queue.summary.citeReadyAfterGateC).toBe(0);
    expect(queue.neonGateCPath.length).toBe(5);

    const withPmid = queue.items.filter((i) => i.pmid);
    expect(withPmid.length).toBeGreaterThanOrEqual(9);
    expect(withPmid.every((i) => i.gateCHandoff === "pending" || i.gateCHandoff === "hsi_passed")).toBe(true);
    expect(withPmid.every((i) => i.curationReview !== "approved")).toBe(true);
    expect(withPmid.every((i) => i.autoApprove === false)).toBe(true);

    // Mapping must not collapse axes or open CDS.
    for (const edge of HSI_T2D_IMMUNO_SEED_EDGES) {
      expect(isCdsSurfacable(edge)).toBe(false);
      expect(edge.hsiGrade).not.toBe("established");
      expect(edge.curationReview).not.toBe("approved");
    }
  });

  it("filters Gate C–ready rows (evidence-linked + pending + PMID + REL) without auto-approve", () => {
    const queue = buildHsiBridgeCurationQueue();
    const ready = listNeonGateCReadyItems(queue);

    expect(queue.autoApproveIntoKg).toBe(false);
    expect(ready.length).toBe(queue.summary.neonGateCReady);
    expect(ready.length).toBeGreaterThanOrEqual(9);
    expect(ready.every((i) => isNeonGateCReadyItem(i))).toBe(true);
    expect(ready.every((i) => i.autoApprove === false)).toBe(true);
    expect(ready.every((i) => i.cdsSurfacable === false)).toBe(true);
    expect(ready.every((i) => i.evidenceLink === "evidence_linked")).toBe(true);
    expect(ready.every((i) => i.gateCHandoff === "pending")).toBe(true);
    expect(ready.every((i) => Boolean(i.pmid))).toBe(true);
    expect(ready.every((i) => i.suggestedIsiRelationshipId?.startsWith("REL-"))).toBe(true);
    expect(ready.every((i) => i.relExistsInGraph && i.spo != null)).toBe(true);
    expect(ready.every((i) => i.neonGateCHref?.includes("hsi=ready"))).toBe(true);

    // Non-ready rows must fail at least one Gate C–ready predicate.
    const notReady = queue.items.filter((i) => !i.neonGateCReady);
    expect(notReady.every((i) => !isNeonGateCReadyItem(i))).toBe(true);

    const pd1 = ready.find((i) => i.edgeId === "HSI-E-IO-001");
    expect(pd1?.suggestedIsiRelationshipId).toBe("REL-R011-drives-P015");
    expect(pd1?.spo?.predicate).toBe("drives");
    expect(pd1?.pmid).toBe("16382236");

    expect(NEON_GATE_C_CURATOR_WARNINGS.some((w) => w.includes("source-verified"))).toBe(true);
    expect(NEON_GATE_C_CURATOR_WARNINGS.some((w) => w.toLowerCase().includes("cds"))).toBe(true);
    expect(NEON_GATE_C_CURATOR_WARNINGS.some((w) => w.includes("autoApprove"))).toBe(true);
  });

  it("P2.2 cite-ready after Gate C overlays human_approved without auto-approve", () => {
    const pin = JSON.parse(
      readFileSync(resolve(process.cwd(), "public/hsi-discovery/gate-c-decisions.json"), "utf8"),
    );
    expect(pin.autoApprove).toBe(false);
    expect(pin.productionApproved).toBe(false);
    expect(pin.mayFlipHsiGrade).toBe(false);

    const byEdge = parseGateCDecisionStatusByEdge(pin);
    expect(byEdge.get("HSI-E-IO-001")).toBe("human_approved");

    const queue = buildHsiBridgeCurationQueue(byEdge);
    const citeReady = listCiteReadyAfterGateCItems(queue);

    expect(queue.summary.citeReadyAfterGateC).toBe(citeReady.length);
    expect(citeReady.length).toBeGreaterThanOrEqual(9);
    expect(citeReady.every((i) => isCiteReadyAfterGateCItem(i))).toBe(true);
    expect(citeReady.every((i) => i.autoApprove === false)).toBe(true);
    expect(citeReady.every((i) => i.cdsSurfacable === false)).toBe(true);
    expect(citeReady.every((i) => i.isiGateCDecisionStatus === "human_approved")).toBe(true);
    expect(citeReady.every((i) => i.neonGateCReady === false)).toBe(true);
    expect(citeReady.every((i) => i.neonGateCHref?.includes("hsi=cite"))).toBe(true);

    const pd1 = citeReady.find((i) => i.edgeId === "HSI-E-IO-001");
    expect(pd1?.suggestedIsiRelationshipId).toBe("REL-R011-drives-P015");
    expect(pd1?.pmid).toBe("16382236");
  });
});

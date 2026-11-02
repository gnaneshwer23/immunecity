/**
 * Cap 10 — Scientific contradictions (first-class CONTRADICTS).
 * Run: bun test src/test/cap10-contradictions.test.ts
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prepareAsk } from "@/lib/askGrounding";
import { SEM, edgeByRel, byId } from "@/lib/immune/engine";
import {
  CONTRADICTION_GOLD_PAIRS,
  EXT_CONTRADICTION_EDGES,
} from "@/data/contradictionGoldPairs";
import {
  buildContradictionReport,
  enrichSideFromBackingEdge,
  findOppositeSignPairs,
  formatContradictionMarkdown,
  matchContradictionGoldPairs,
  CONTRADICTION_REPORT_SCHEMA_VERSION,
} from "@/lib/research/contradictionReport";
import { buildInvestigationBrief } from "@/lib/research/investigationBrief";
import type { ResearchGapCandidate } from "@/lib/discovery/types";
import { DEFAULT_ISI_SEARCH_SCOPE } from "@/lib/discovery/types";

const root = (...p: string[]) => resolve(process.cwd(), ...p);

describe("Cap 10 Scientific contradictions", () => {
  it("registers first-class CONTRADICTS in relation_semantics (non-propagating)", () => {
    expect(SEM.CONTRADICTS).toBe("0");
    expect(EXT_CONTRADICTION_EDGES.every((e) => e.relation === "CONTRADICTS")).toBe(true);
    expect(CONTRADICTION_GOLD_PAIRS.length).toBeGreaterThanOrEqual(2);
    for (const p of CONTRADICTION_GOLD_PAIRS) {
      expect(p.majorityVote).toBe(false);
      expect(p.silentMerge).toBe(false);
      expect(p.unresolved).toBe(true);
      expect(p.relation).toBe("CONTRADICTS");
      expect(byId[p.sideA.findingId]).toBeTruthy();
      expect(byId[p.sideB.findingId]).toBeTruthy();
      expect(edgeByRel[p.sideA.backingRelId]).toBeTruthy();
      expect(edgeByRel[p.sideB.backingRelId]).toBeTruthy();
      // Never invent numeric PMIDs in gold fixtures — TO_BE_CURATED only until curated
      for (const ref of [...p.sideA.sourceRefs, ...p.sideB.sourceRefs]) {
        expect(ref).toBe("TO_BE_CURATED");
      }
    }
  });

  it("retains both sides on gold pairs and never majority-votes", () => {
    const q = "How does IL-17A relate to inflammatory bowel disease and Crohn disease?";
    const prepared = prepareAsk(q);
    const report = buildContradictionReport({ question: q, grounding: prepared.grounding });
    expect(report.schemaVersion).toBe(CONTRADICTION_REPORT_SCHEMA_VERSION);
    expect(report.schemaVersion).toBe("cap10-2");
    expect(report.firstClassContradictsRelation).toBe(true);
    expect(report.kgWrite).toBe(false);

    const gold = report.items.filter((i) => i.kind === "first_class_contradicts");
    expect(gold.length).toBeGreaterThanOrEqual(1);

    for (const it of gold) {
      expect(it.majorityVote).toBe(false);
      expect(it.silentMerge).toBe(false);
      expect(it.resolution).toBe("unresolved");
      expect(it.sideA).toBeTruthy();
      expect(it.sideB).toBeTruthy();
      expect(it.sideA!.statement.length).toBeGreaterThan(10);
      expect(it.sideB!.statement.length).toBeGreaterThan(10);
      expect(it.supportIds.length).toBeGreaterThan(0);
      expect(it.opposeIds.length).toBeGreaterThan(0);
      // Both finding ids retained
      expect(it.supportIds.some((id) => id.startsWith("CXF"))).toBe(true);
      expect(it.opposeIds.some((id) => id.startsWith("CXF"))).toBe(true);
    }

    for (const it of report.items) {
      expect(it.majorityVote).toBe(false);
      expect(it.silentMerge).toBe(false);
    }
    expect(report.honesty.some((h) => /majority-vote|majority vote|majorityVote/i.test(h))).toBe(true);
  });

  it("surfaces Cap 10 contradiction block inside M1 investigation brief", () => {
    const q = "IL-17A secukinumab Crohn disease inflammatory bowel disease";
    const prepared = prepareAsk(q);
    const result = buildInvestigationBrief({
      question: q,
      grounding: prepared.grounding,
      now: new Date("2026-11-02T12:00:00.000Z"),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.brief.contradictions.firstClassContradictsRelation).toBe(true);
    const cx = result.brief.contradictions.items.filter((i) => i.kind === "first_class_contradicts");
    expect(cx.length).toBeGreaterThanOrEqual(1);
    expect(cx.every((i) => i.majorityVote === false)).toBe(true);
    expect(cx.every((i) => i.sideA && i.sideB)).toBe(true);
    const section = result.brief.sections.find((s) => s.id === "contradictions_gaps");
    expect(section).toBeTruthy();
    expect(section!.body).toMatch(/Cap 10/);
  });

  it("preserves study context from backing edges without inventing PMIDs", () => {
    const pair = CONTRADICTION_GOLD_PAIRS[0]!;
    const sideA = enrichSideFromBackingEdge(pair.sideA);
    expect(sideA.backingRelId).toBe(pair.sideA.backingRelId);
    expect(sideA.tissue).toBe("gut mucosa");
    expect(sideA.sourceRefs.includes("TO_BE_CURATED")).toBe(true);
    expect(sideA.sourceRefs.every((r) => r === "TO_BE_CURATED" || !/^\d{6,9}$/.test(r))).toBe(true);
  });

  it("matchContradictionGoldPairs is neighbourhood-scoped", () => {
    expect(matchContradictionGoldPairs(["ZZZ_NONE"]).length).toBe(0);
    expect(matchContradictionGoldPairs(["D004", "M010"]).length).toBeGreaterThanOrEqual(1);
    expect(matchContradictionGoldPairs(["I001", "I007", "D004"]).length).toBeGreaterThanOrEqual(1);
  });

  it("supports honest empty when neighbourhood has no contradictions", () => {
    // Tiny neighbourhood unlikely to hit gold concepts — still must not invent
    const q = "What is HLA-B57:01 pharmacogenetics for abacavir?";
    const prepared = prepareAsk(q);
    const report = buildContradictionReport({ question: q, grounding: prepared.grounding });
    for (const it of report.items) {
      expect(it.majorityVote).toBe(false);
    }
    if (report.items.length === 0) {
      expect(report.honestEmpty).toBe(true);
      expect(formatContradictionMarkdown(report)).toMatch(/honest empty/i);
    }
    expect(report.firstClassContradictsRelation).toBe(true);
  });

  it("surfaces discovery conflict candidates without inventing rows", () => {
    const q = "How does TNF relate to rheumatoid arthritis?";
    const prepared = prepareAsk(q);
    const subjectId = prepared.grounding.nodeIds[0] ?? null;
    const fake: ResearchGapCandidate = {
      gapKey: "test-conflict-key",
      title: "Fixture conflict candidate",
      summary: "Test only",
      status: "candidate",
      pilot: null,
      subjectId,
      objectId: prepared.grounding.nodeIds[1] ?? null,
      relationshipId: prepared.grounding.relIds[0] ?? null,
      diseaseId: subjectId,
      whyItMatters: "Synthetic conflict candidate for Cap 10 unit test — not literature truth.",
      searchScope: DEFAULT_ISI_SEARCH_SCOPE,
      detectionSource: "conflict",
      detectionDetail: {},
      coverageLabel: "conflicting",
      autoReviewed: false,
    };
    const report = buildContradictionReport({
      question: q,
      grounding: prepared.grounding,
      discoveryConflicts: [fake],
    });
    expect(report.items.some((i) => i.kind === "discovery_conflict" && i.id === "disc:test-conflict-key")).toBe(
      true,
    );
    const outside: ResearchGapCandidate = {
      ...fake,
      gapKey: "outside-conflict",
      subjectId: "ZZZ_NOT_A_NODE",
      objectId: "YYY_NOT_A_NODE",
      diseaseId: "ZZZ_NOT_A_NODE",
    };
    const filtered = buildContradictionReport({
      question: q,
      grounding: prepared.grounding,
      discoveryConflicts: [outside],
    });
    expect(filtered.items.some((i) => i.id === "disc:outside-conflict")).toBe(false);
  });

  it("findOppositeSignPairs is deterministic on graph neighbourhood", () => {
    const q = "How does the immune system work?";
    const prepared = prepareAsk(q);
    const a = findOppositeSignPairs(prepared.grounding.nodeIds);
    const b = findOppositeSignPairs(prepared.grounding.nodeIds);
    expect(a).toEqual(b);
  });

  it("is wired into M1 brief + Ask UI", () => {
    expect(readFileSync(root("src/lib/research/investigationBrief.ts"), "utf8")).toContain(
      "buildContradictionReport",
    );
    expect(readFileSync(root("src/components/immune/InvestigationBriefView.tsx"), "utf8")).toContain("Cap 10");
    expect(readFileSync(root("src/components/immune/InvestigationBriefView.tsx"), "utf8")).toContain("Side A");
    expect(readFileSync(root("src/data/capabilityStatus.ts"), "utf8")).toContain("cap10-contradictions");
    expect(readFileSync(root("src/data/contradictionGoldPairs.ts"), "utf8")).toContain("CONTRADICTS");
  });
});

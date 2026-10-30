/**
 * Phase F — End-to-end QA journey (automated, focused bun tests).
 * Journey: Immunology OS → Immune City → evidence → Trial Intelligence → Ask → Research → export.
 * Run: bun test src/test/phase-f-e2e-journey.test.ts src/test/phase-a-evidence-governed.test.ts \
 *   src/test/phase-b-scientific-graph.test.ts src/test/phase-c-evidence-intelligence.test.ts \
 *   src/test/phase-d-ask-graphrag.test.ts src/test/phase-e-clinical-research.test.ts --timeout 30000
 *
 * Gaps (documented): live Playwright auth flows, real Neon two-account isolation, full Vite build / a11y
 * suite when OOM — prefer this focused suite.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JOURNEY_NAV } from "@/data/marketingNav";
import { byId } from "@/lib/immune/engine";
import { prepareAsk, validateAnswerCitations, PROMPT_VERSION } from "@/lib/askGrounding";
import { getGraphNeighbourhood } from "@/lib/immune/neighbourhood";
import { classifyEvidenceGap } from "@/lib/research/evidenceGap";
import { isTrialIntelligenceEnabled } from "@/lib/trialIntelligenceFlag";
import { trialIntelligenceNavFromConcept } from "@/lib/immune/trialGraphNav";
import { buildMelanomaInvestigationPath } from "@/lib/immune/melanomaInvestigationPath";
import { buildScientificBriefPackage } from "@/lib/research/scientificBrief";
import { planMelanomaInvestigationCollection, COLLECTION_ACCESS } from "@/lib/research/collections";
import { melanomaInvestigationResearchPath } from "@/lib/research/savedPaths";
import { compareTrials } from "@/lib/immune/trialComparability";
import { MELANOMA_PILOT_TRIALS } from "@/data/trialIntelligence";
import { detectConflictingEvidence, assertNoSilentApproval } from "@/lib/immune/claimRecords";
import { typedIncidentRelations } from "@/lib/immune/typedRelations";

function source(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("Phase F1 — Journey IA (Learn / Explore / Investigate)", () => {
  it("positive: journey nav covers Ask, Atlas, Evidence, Research, Methods", () => {
    expect(JOURNEY_NAV.map((g) => g.label)).toEqual(["Learn", "Explore", "Investigate", "Trust"]);
    const paths = JOURNEY_NAV.flatMap((g) => g.items.map((i) => i.path as string));
    for (const p of ["/ask", "/atlas", "/evidence", "/research", "/methods", "/graph"]) {
      expect(paths.some((x) => x === p || x.startsWith(`${p}/`))).toBe(true);
    }
  });
});

describe("Phase F2 — Melanoma investigation spine (scientific consistency)", () => {
  it("positive: OS concepts → City trials → Ask neighbourhood → brief export", () => {
    expect(byId["D012"]?.name.toLowerCase()).toMatch(/melanoma/);
    expect(byId["R011"]).toBeTruthy();
    expect(byId["TR003"]).toBeTruthy();
    expect(byId["TR020"]).toBeTruthy();

    const nav = trialIntelligenceNavFromConcept("D012");
    expect(nav.map((n) => n.graphNodeId).sort()).toEqual(["TR003", "TR020"]);

    const path = buildMelanomaInvestigationPath();
    expect("ok" in path && (path as { ok: false }).ok === false).toBe(false);
    if ("ok" in path) return;
    expect(path.clinicalConclusion).toBe(false);

    const nb = getGraphNeighbourhood("D012", { depth: 2, maxEdges: 40 });
    expect(nb).not.toBeNull();
    expect(nb!.nodes.length).toBeGreaterThan(1);

    const ask = prepareAsk("How does PD-1 relate to melanoma immunotherapy?");
    expect(ask.queryClass).not.toBe("clinical_personal");
    expect(PROMPT_VERSION).toMatch(/ask-grounding/);
    // Clinical personal questions abstain (no model call).
    const clinical = prepareAsk("What dose of pembrolizumab should I take for my melanoma?");
    expect(clinical.queryClass).toBe("clinical_personal");
    expect(clinical.callModel).toBe(false);
    // Fabricated PMID must fail closed against mechanism grounding.
    expect(validateAnswerCitations("See PMID 99999999.", ask.grounding).ok).toBe(false);

    const brief = buildScientificBriefPackage({
      sources: {
        conceptIds: ["D012", "R011", "I008", "TR003", "B011"],
        trialIds: ["TR003"],
      },
      now: new Date("2026-10-30T16:00:00.000Z"),
    });
    expect(brief.ok).toBe(true);
    if (!brief.ok) return;
    expect(brief.package.kgWrite).toBe(false);
    expect(brief.package.handoff.autoPromote).toBe(false);
  });

  it("negative: Trial Intelligence stays flag-off; collections owner-scoped", () => {
    expect(isTrialIntelligenceEnabled()).toBe(false);
    const panel = source("src/components/immune/TrialIntelligence.tsx");
    expect(panel).toMatch(/if\s*\(\s*!isTrialIntelligenceEnabled\(\)\s*\)\s*return\s+null/);
    expect(COLLECTION_ACCESS.ownerScopedOnly).toBe(true);
    expect(COLLECTION_ACCESS.allowAdminBypass).toBe(false);
    expect(planMelanomaInvestigationCollection({ userId: "" }).ok).toBe(false);
  });
});

describe("Phase F3 — Broken / missing / conflicting evidence honesty", () => {
  it("positive: gap unknown ≠ verified zero; conflict detection works", () => {
    expect(classifyEvidenceGap("C002")).toBe("insufficient_coverage");
    const rels = typedIncidentRelations("D012");
    expect(rels.length).toBeGreaterThan(0);
    const rid = rels[0]!.relId;
    const conflict = detectConflictingEvidence(rid, [
      {
        evidence_id: "EV-s",
        relationship_id: rid,
        claim_support: "supports",
        curation: "approved",
        label: "s",
        url: "",
        reviewed_at: null,
        pmid: "11111111",
      },
      {
        evidence_id: "EV-c",
        relationship_id: rid,
        claim_support: "contradicts",
        curation: "unreviewed",
        label: "c",
        url: "",
        reviewed_at: null,
        pmid: "22222222",
      },
    ]);
    expect(conflict.conflicting).toBe(true);
    expect(
      assertNoSilentApproval({
        evidence_id: "EV-bad",
        relationship_id: rid,
        claim_support: "partial",
        curation: "approved",
        label: "b",
        url: "",
        reviewed_at: null,
      }).ok,
    ).toBe(false);
  });

  it("boundary: cross-trial compare is non-causal; melanoma path syncs without KG write", () => {
    const report = compareTrials(MELANOMA_PILOT_TRIALS[0]!, MELANOMA_PILOT_TRIALS[1]!);
    expect(report.forbidsSuperiorityClaim).toBe(true);
    expect(report.warning.length).toBeGreaterThan(0);
    expect(report.mismatches.some((m) => m.dimension === "treatment_line")).toBe(true);
    expect(melanomaInvestigationResearchPath()).not.toBeNull();
  });
});

describe("Phase F4 — Loading / error / empty + a11y smoke contracts", () => {
  it("positive: Trial Intelligence empty biomarker + unavailable states exist", () => {
    const panel = source("src/components/immune/TrialIntelligence.tsx");
    expect(panel).toMatch(/ti-biomarker-empty|biomarker/i);
    expect(panel).toMatch(/ti-unavailable|unavailable/i);
  });

  it("a11y smoke: suite script exists (full run may OOM — document gap)", () => {
    const a11y = source("scripts/a11y-suite.ts");
    expect(a11y.length).toBeGreaterThan(100);
    expect(source("package.json")).toMatch(/"a11y":/);
  });
});

describe("Phase F5 — Regression anchors for A–E suites", () => {
  it("phase test files exist for A–F", () => {
    for (const f of [
      "src/test/phase-a-evidence-governed.test.ts",
      "src/test/phase-b-scientific-graph.test.ts",
      "src/test/phase-c-evidence-intelligence.test.ts",
      "src/test/phase-d-ask-graphrag.test.ts",
      "src/test/phase-e-clinical-research.test.ts",
      "src/test/phase-f-e2e-journey.test.ts",
    ]) {
      expect(source(f).length).toBeGreaterThan(200);
    }
  });
});

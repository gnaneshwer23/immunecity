/**
 * Phase 2 — Trial Intelligence experience (ISI audit v1.0).
 * Run: bun test src/test/phase2-trial-intelligence.test.ts
 */
import { afterEach, describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  MELANOMA_PILOT_TRIALS,
  NON_CAUSAL_TRIAL_WARNING,
  trialIntelligenceByGraphNode,
} from "@/data/trialIntelligence";
import {
  compareTrials,
  melanomaPilotComparability,
  trialComparabilityFacet,
} from "@/lib/immune/trialComparability";
import {
  graphBiomarkersForTrial,
  trialBiomarkerStubs,
  trialIntelligenceNavFromConcept,
} from "@/lib/immune/trialGraphNav";
import { isTrialIntelligenceEnabled } from "@/lib/trialIntelligenceFlag";
import { byId } from "@/lib/immune/engine";

const root = (...p: string[]) => resolve(process.cwd(), ...p);
const source = (rel: string) => readFileSync(root(rel), "utf8");

const ENV_KEYS = ["VITE_TRIAL_INTELLIGENCE", "TRIAL_INTELLIGENCE"] as const;
const saved: Record<string, string | undefined> = {};

function setFlagEnv(vite: string | undefined, plain?: string | undefined) {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  if (vite === undefined) delete process.env.VITE_TRIAL_INTELLIGENCE;
  else process.env.VITE_TRIAL_INTELLIGENCE = vite;
  if (plain === undefined) delete process.env.TRIAL_INTELLIGENCE;
  else process.env.TRIAL_INTELLIGENCE = plain;
}

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("Phase 2 exit gate — melanoma mechanism → trial navigation", () => {
  it("surfaces TR003 / TR020 deep links from melanoma and PD-1 neighbourhood concepts", () => {
    const fromMelanoma = trialIntelligenceNavFromConcept("D012");
    expect(fromMelanoma.map((l) => l.graphNodeId).sort()).toEqual(["TR003", "TR020"]);
    expect(fromMelanoma.every((l) => l.hash === "trial-intelligence")).toBe(true);

    const fromPd1 = trialIntelligenceNavFromConcept("R011");
    expect(fromPd1.some((l) => l.graphNodeId === "TR003")).toBe(true);
    expect(fromPd1.some((l) => l.graphNodeId === "TR020")).toBe(true);

    const fromPembro = trialIntelligenceNavFromConcept("I008");
    expect(fromPembro.map((l) => l.graphNodeId)).toEqual(["TR003"]);

    expect(byId.TR003?.node_type).toBe("TRIAL");
    expect(byId.TR020?.node_type).toBe("TRIAL");
  });

  it("wires concept nav + trial panel into the Atlas route", () => {
    const atlas = source("src/routes/atlas.$id.tsx");
    expect(atlas).toContain("TrialIntelligencePanel");
    expect(atlas).toContain("TrialIntelligenceConceptNav");
    const panel = source("src/components/immune/TrialIntelligence.tsx");
    expect(panel).toContain("hash={l.hash}");
    expect(panel).toContain('hash="trial-intelligence"');
    expect(panel).toContain("ti-concept-nav");
  });
});

describe("Phase 2 ISI-A08 light comparability", () => {
  it("flags treatment-line, endpoint, follow-up and analysis mismatches across pilots", () => {
    const kn = trialIntelligenceByGraphNode("TR003")!;
    const cm = trialIntelligenceByGraphNode("TR020")!;
    const report = compareTrials(kn, cm);
    expect(report.forbidsSuperiorityClaim).toBe(true);
    expect(report.warning).toMatch(/Association is not causation/i);
    expect(report.warning).toMatch(/never rank treatments|not clinical decision support/i);

    const dims = new Set(report.mismatches.map((m) => m.dimension));
    expect(dims.has("treatment_line")).toBe(true);
    expect(dims.has("endpoint_definition")).toBe(true);
    expect(dims.has("follow_up")).toBe(true);
    expect(dims.has("analysis_population")).toBe(true);

    const peer = melanomaPilotComparability(kn, cm);
    expect(peer.mismatches.length).toBeGreaterThan(0);
    expect(JSON.stringify(peer)).not.toMatch(/superior to|better than|preferred regimen/i);
  });

  it("derives facets from curated fields without inventing numerics or free-text lines", () => {
    const facet = trialComparabilityFacet(MELANOMA_PILOT_TRIALS[0]!);
    expect(facet.diseaseStage).toMatch(/melanoma/i);
    expect(facet.endpointTypes.length).toBeGreaterThan(0);
    expect(facet.analysisPopulation.length).toBeGreaterThan(0);
    expect(facet.treatmentLine).toBe(MELANOMA_PILOT_TRIALS[0]!.treatmentLine);
    expect(facet.treatmentLine).not.toMatch(/as stated in curated summary/i);
  });

  it("UI never declares superiority and strengthens non-causal copy", () => {
    expect(NON_CAUSAL_TRIAL_WARNING).toMatch(/never declare treatment superiority|never rank treatments/i);
    expect(NON_CAUSAL_TRIAL_WARNING).toMatch(/endpoint definitions/i);
    const panel = source("src/components/immune/TrialIntelligence.tsx");
    expect(panel).toContain("ti-comparability");
    expect(panel).toContain("ti-no-superiority");
    expect(panel).toContain("melanomaPilotComparability");
  });
});

describe("Phase 2 biomarker context (light)", () => {
  it("keeps fixture assay stubs empty — no invented assays", () => {
    for (const t of MELANOMA_PILOT_TRIALS) {
      expect(t.biomarkerContext ?? []).toEqual([]);
      expect(trialBiomarkerStubs(t)).toEqual([]);
    }
  });

  it("may surface graph biomarker nodes without assay cut-offs", () => {
    const graph = graphBiomarkersForTrial("TR003");
    // Pembrolizumab has B011 predicts_response_to in the graph.
    expect(graph.some((b) => b.graphNodeId === "B011")).toBe(true);
    expect(graph.every((b) => b.assayLabel == null)).toBe(true);
  });
});

describe("Phase 2 accessibility and honesty contracts", () => {
  it("keeps flag off by default and panels gated", () => {
    setFlagEnv("", "");
    expect(isTrialIntelligenceEnabled()).toBe(false);
    const panel = source("src/components/immune/TrialIntelligence.tsx");
    expect(panel).toMatch(/if\s*\(\s*!isTrialIntelligenceEnabled\(\)\s*\)\s*return\s+null/);
    expect(panel).toContain("ti-unavailable");
    expect(panel).toContain("sr-only");
    expect(panel).toContain('tabIndex={0}');
    expect(panel).toContain("ti-methods-fold");
  });

  it("docs include a Phase 2 exit checklist", () => {
    const docs = source("docs/ISI_AUDIT_BASELINE_2026-10-30.md");
    expect(docs).toMatch(/Phase 2 — Trial Intelligence experience/i);
    expect(docs).toMatch(/P2-1|P2-2/);
    expect(docs).toMatch(/ISI-A08/);
  });
});

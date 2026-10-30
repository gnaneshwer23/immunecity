/**
 * Phase 1 — Scientific evidence foundation (ISI audit v1.0).
 * Run: bun test src/test/phase1-evidence-foundation.test.ts
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MELANOMA_PILOT_TRIALS } from "@/data/trialIntelligence";
import {
  dimensionsAreOrthogonal,
  edgeEvidenceDimensions,
  trialEndpointDimensions,
} from "@/lib/immune/evidenceDimensions";
import {
  endpointMeetsExitGate,
  endpointPassesHonesty,
  endpointProvenanceView,
  melanomaPilotExitGateReport,
} from "@/lib/immune/trialProvenance";
import { isReadyForSupportsApproval } from "@/lib/immune/evidenceInvariants";
import { SYSTEM } from "@/lib/askGrounding";
import { byId, type KGEdge } from "@/lib/immune/engine";

const root = (...p: string[]) => resolve(process.cwd(), ...p);
const source = (rel: string) => readFileSync(root(rel), "utf8");

describe("Phase 1 exit gate — pilot endpoint provenance", () => {
  it("every melanoma pilot endpoint meets the exit gate", () => {
    const report = melanomaPilotExitGateReport();
    expect(report.total).toBeGreaterThan(0);
    expect(report.failing).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("published numerics always cite PMID + DOI + analysis set", () => {
    for (const trial of MELANOMA_PILOT_TRIALS) {
      for (const arm of trial.arms) {
        for (const ep of arm.endpoints) {
          expect(endpointPassesHonesty(ep)).toBe(true);
          expect(endpointMeetsExitGate(ep)).toBe(true);
          const view = endpointProvenanceView(ep);
          if (ep.valueNum != null) {
            expect(view.numericTraceable).toBe(true);
            expect(ep.sourcePmid).toMatch(/^\d+$/);
            expect(ep.sourceDoi).toBeTruthy();
            expect(ep.analysisSet.length).toBeGreaterThan(0);
            expect(view.verificationLabel).toMatch(/Verified/i);
          } else {
            expect(ep.verificationState).toBe("unverified");
            expect(view.verificationLabel).toMatch(/Unverified/i);
          }
        }
      }
    }
  });

  it("pilot trials remain linked to TR003 / TR020 graph nodes", () => {
    expect(byId.TR003?.node_type).toBe("TRIAL");
    expect(byId.TR020?.node_type).toBe("TRIAL");
    expect(MELANOMA_PILOT_TRIALS.map((t) => t.graphNodeId).sort()).toEqual(["TR003", "TR020"]);
  });
});

describe("Phase 1 — three evidence dimensions (not one score)", () => {
  it("edge dimensions stay orthogonal", () => {
    const edge = {
      subject_id: "M001",
      relation: "contributes_to",
      object_id: "D001",
      mechanism: "test",
      confidence: "high",
      evidence_status: "ESTABLISHED",
    } as KGEdge;
    const dims = edgeEvidenceDimensions(edge, "approved");
    expect(dimensionsAreOrthogonal(dims)).toBe(true);
    expect(dims.find((d) => d.kind === "curation")?.value).toBe("Supported");
    expect(dims.find((d) => d.kind === "evidence_status")?.value).toMatch(/established/i);
    expect(dims.find((d) => d.kind === "quality")?.value).toBe("high");
  });

  it("trial endpoint dimensions expose verification, identifiers, analysis context", () => {
    const ep = MELANOMA_PILOT_TRIALS[0]!.arms[0]!.endpoints[0]!;
    const dims = trialEndpointDimensions(ep, endpointProvenanceView(ep));
    expect(dimensionsAreOrthogonal(dims)).toBe(true);
    expect(dims[0]!.value).toMatch(/Verified/i);
    expect(dims[1]!.value).toMatch(/PMID/);
    expect(dims[2]!.value.length).toBeGreaterThan(0);
  });

  it("UI surfaces dimensions without collapsing confidence into review", () => {
    const inspector = source("src/components/immune/ScientificInspector.tsx");
    expect(inspector).toContain("EvidenceDimensionsStrip");
    expect(inspector).toContain("edgeEvidenceDimensions");
    const edgeRef = source("src/components/immune/EdgeReference.tsx");
    expect(edgeRef).toContain("EvidenceDimensionsStrip");
    expect(edgeRef).toContain("edge.confidence");
    const panel = source("src/components/immune/TrialIntelligence.tsx");
    expect(panel).toContain("endpointProvenanceView");
    expect(panel).toContain("sourceDoi");
    expect(panel).toContain("Verification");
    expect(panel).toContain("Provenance");
  });
});

describe("Phase 1 — ISI-A04 curation hardening", () => {
  it("page approve requires supports only (never partial/contradicts)", () => {
    expect(
      isReadyForSupportsApproval({
        check_status: "verified",
        curation: "unreviewed",
        relationship_id: "REL-M001-contributes_to-D001",
        claim_support: "supports",
      }),
    ).toBe(true);
    expect(
      isReadyForSupportsApproval({
        check_status: "verified",
        curation: "unreviewed",
        relationship_id: "REL-M001-contributes_to-D001",
        claim_support: "partial",
      }),
    ).toBe(false);
    expect(
      isReadyForSupportsApproval({
        check_status: "verified",
        curation: "unreviewed",
        relationship_id: "REL-M001-contributes_to-D001",
        claim_support: "contradicts",
      }),
    ).toBe(false);
    expect(
      isReadyForSupportsApproval({
        check_status: "pending",
        curation: "unreviewed",
        relationship_id: "REL-M001-contributes_to-D001",
        claim_support: "supports",
      }),
    ).toBe(false);
  });

  it("curation route wires supports-only filter and honesty callouts", () => {
    const src = source("src/routes/_authenticated/curation.tsx");
    expect(src).toContain("isReadyForSupportsApproval");
    expect(src).toContain("supports-assessed");
    expect(src).toMatch(/AI never auto-approves/i);
    expect(src).toMatch(/Do not mass-approve/i);
    expect(src).toContain("Three dimensions stay separate");
  });
});

describe("Phase 1 — ISI-A10 light (Ask fails closed; no full-grounding claim)", () => {
  it("SYSTEM still refuses full evidence-grounding marketing and CDS", () => {
    expect(SYSTEM).toMatch(/Not fully evidence-grounded/i);
    expect(SYSTEM).toMatch(/Not clinical decision support/i);
    expect(SYSTEM).toMatch(/never auto-approves|Never invent citations|never treat it as approved/i);
  });

  it("Postgres remains authoritative read path when seeded", () => {
    const fn = source("src/lib/trialIntelligence.functions.ts");
    expect(fn).toContain("endpointPassesHonesty");
    expect(fn).toContain('source: "postgres"');
    expect(fn).toContain("resolveTrialIntelligence");
  });
});

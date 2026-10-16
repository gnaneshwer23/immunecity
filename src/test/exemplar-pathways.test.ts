import { describe, expect, it } from "vitest";
import {
  EXEMPLAR_CURATOR_TARGETS,
  EXEMPLAR_MATURITY_LABEL,
  EXEMPLAR_PATHWAYS,
  exemplarAllowsEvidenceGroundedClaim,
  exemplarQueueFocus,
  pendingExemplarTargets,
  reportExemplar,
} from "@/lib/immune/exemplarPathways";
import type { CitationLike } from "@/lib/immune/evidenceStatus";

const cite = (relationship_id: string, claim_support = "supports"): CitationLike => ({
  relationship_id,
  claim_support,
  label: "test",
  url: "https://example.test",
  evidence_id: `E-${relationship_id}`,
  reviewed_at: "2026-10-16",
  curation: "approved",
});

describe("exemplar pathways honesty", () => {
  it("keeps three PRD exemplars graph-connected", () => {
    for (const p of EXEMPLAR_PATHWAYS) {
      const report = reportExemplar(p);
      expect(report.connected, p.id).toBe(true);
      expect(report.uniqueRelIds.length, p.id).toBeGreaterThan(0);
    }
  });

  it("does not demote documented maturity to scaffold when cites are absent", () => {
    const tnf = EXEMPLAR_PATHWAYS.find((p) => p.id === "ex-tnf-ra")!;
    expect(tnf.maturity).toBe("reviewed");
    expect(reportExemplar(tnf).maturity).toBe("reviewed");
    const ifn = EXEMPLAR_PATHWAYS.find((p) => p.id === "ex-ifn-sle")!;
    expect(reportExemplar(ifn).maturity).toBe("scaffold");
  });

  it("recomputes maturity only from live approved+supports cites", () => {
    const pd1 = EXEMPLAR_PATHWAYS.find((p) => p.id === "ex-pd1-io")!;
    const focus = exemplarQueueFocus().pathways.find((p) => p.pathwayId === "ex-pd1-io")!;
    const oneApproved = cite(focus.relIds[0]!);
    const partial = reportExemplar(pd1, [oneApproved]);
    expect(partial.maturity).toBe("partially-reviewed");
    expect(exemplarAllowsEvidenceGroundedClaim(partial.maturity)).toBe(false);

    const allApproved = focus.relIds.map((id) => cite(id));
    const full = reportExemplar(pd1, allApproved);
    expect(full.maturity).toBe("reviewed");
    expect(full.approvedEdgeCount).toBe(full.uniqueRelIds.length);
    expect(exemplarAllowsEvidenceGroundedClaim(full.maturity)).toBe(true);
  });

  it("stays scaffold when cites exist but none support the edges", () => {
    const ifn = EXEMPLAR_PATHWAYS.find((p) => p.id === "ex-ifn-sle")!;
    const unrelated: CitationLike = {
      ...cite("REL-OTHER"),
      claim_support: "unrelated",
    };
    expect(reportExemplar(ifn, [unrelated]).maturity).toBe("scaffold");
  });

  it("blocks evidence-grounded marketing for incomplete exemplars", () => {
    expect(exemplarAllowsEvidenceGroundedClaim("scaffold")).toBe(false);
    expect(exemplarAllowsEvidenceGroundedClaim("partially-reviewed")).toBe(false);
    expect(exemplarAllowsEvidenceGroundedClaim("reviewed")).toBe(true);
    for (const m of Object.keys(EXEMPLAR_MATURITY_LABEL) as Array<keyof typeof EXEMPLAR_MATURITY_LABEL>) {
      expect(EXEMPLAR_MATURITY_LABEL[m].length).toBeGreaterThan(10);
    }
  });

  it("lists P0 curator targets that are on exemplar paths and have PubMed queries (not PMIDs)", () => {
    const focus = exemplarQueueFocus();
    expect(focus.pendingTargets.length).toBe(EXEMPLAR_CURATOR_TARGETS.length);
    expect(focus.pendingTargets.every((t) => focus.relIds.includes(t.relId))).toBe(true);
    expect(focus.pendingTargets.every((t) => t.pubmedQuery.length > 8)).toBe(true);
    expect(focus.pendingTargets.every((t) => !/\bPMID\s*\d{5,}\b/i.test(t.pubmedQuery))).toBe(true);
    // TNF has no open P0 targets; PD-1 and IFN do
    expect(EXEMPLAR_CURATOR_TARGETS.every((t) => t.pathwayId !== "ex-tnf-ra")).toBe(true);
    expect(pendingExemplarTargets("ex-pd1-io", []).length).toBeGreaterThan(0);
  });

  it("clears pending targets once all unique edges have approved supports", () => {
    const pd1 = EXEMPLAR_PATHWAYS.find((p) => p.id === "ex-pd1-io")!;
    const report = reportExemplar(pd1);
    const cites = report.uniqueRelIds.map((id) => cite(id));
    expect(pendingExemplarTargets("ex-pd1-io", cites)).toEqual([]);
  });
});

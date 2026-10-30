/**
 * Post A–F audit — scientific brief source-backed claims + curation handoff.
 * Run: bun test src/test/post-af-scientific-brief-audit.test.ts
 */
import { describe, expect, it } from "bun:test";
import {
  buildScientificBriefPackage,
  isSourceBackedCandidate,
  melanomaPilotSourceBackedCandidates,
} from "@/lib/research/scientificBrief";
import { validateManifestForImport } from "@/lib/research/literatureWorkflow";

describe("Post-AF scientific brief — source-backed candidates", () => {
  it("melanoma pilot candidates carry real PMID/DOI and stay unreviewed", () => {
    const rows = melanomaPilotSourceBackedCandidates();
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const row of rows) {
      expect(row.curation).toBe("unreviewed");
      expect(Boolean(row.pmid || row.doi)).toBe(true);
      expect(row.claim_text).toBeTruthy();
      expect(row.claim_text).not.toMatch(/Candidate claim linked to brief export/);
    }
  });

  it("default melanoma brief wires curation handoff without auto-approve", () => {
    const result = buildScientificBriefPackage({
      now: new Date("2026-10-30T15:00:00.000Z"),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pkg = result.package;
    expect(pkg.claimCandidates.length).toBeGreaterThan(0);
    expect(pkg.claimCandidates.every((c) => c.curation === "unreviewed")).toBe(true);
    expect(pkg.claimCandidates.every((c) => c.locator.hasDurableId)).toBe(true);
    expect(pkg.handoff.autoPromote).toBe(false);
    expect(pkg.handoff.kgWrite).toBe(false);
    expect(pkg.handoff.wired).toBe(true);
    expect(pkg.handoff.openRoute).toBe("/curation");
    expect(pkg.handoff.candidateManifest).not.toBeNull();
    const check = validateManifestForImport(pkg.handoff.candidateManifest!);
    expect(check.ok).toBe(true);
    expect(pkg.handoff.candidateManifest!.meta.curation).toBe("unreviewed");
  });

  it("bare evidence ids without locators do not mint placeholder claims", () => {
    const result = buildScientificBriefPackage({
      now: new Date("2026-10-30T15:00:00.000Z"),
      sources: {
        conceptIds: ["D012", "R011", "I008", "TR003"],
        trialIds: ["TR003"],
        evidenceIds: ["EV-bare-no-locator"],
      },
      reviewRows: [
        {
          evidence_id: "EV-bare-no-locator",
          claim_support: "unassessed",
          curation: "unreviewed",
          // no pmid/doi/claim_text
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.package.claimCandidates).toEqual([]);
    expect(result.package.handoff.wired).toBe(false);
    expect(result.package.handoff.candidateManifest).toBeNull();
  });

  it("rejects approved rows inside draft package", () => {
    const result = buildScientificBriefPackage({
      sources: {
        conceptIds: ["D012", "I008", "TR003"],
        trialIds: ["TR003"],
        evidenceIds: ["EV-ok"],
      },
      reviewRows: [
        {
          evidence_id: "EV-ok",
          node_id: "I008",
          relationship_id: "REL-I008-blocks-R011",
          pmid: "25891173",
          doi: "10.1056/NEJMoa1503093",
          claim_text: "Pembrolizumab blocks PD-1 (educational candidate).",
          claim_support: "supports",
          curation: "approved",
        },
      ],
    });
    expect(result.ok).toBe(false);
  });

  it("isSourceBackedCandidate rejects legacy placeholder text", () => {
    expect(
      isSourceBackedCandidate({
        evidence_id: "x",
        relationship_id: null,
        claim_support: "unassessed",
        curation: "unreviewed",
        label: "x",
        url: "",
        claim_text: "Candidate claim linked to brief export (x)",
        reviewed_at: null,
      }),
    ).toBe(false);
  });
});

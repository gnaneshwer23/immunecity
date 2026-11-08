/**
 * Gate C cite path UX: claim_support must be assessable on the row
 * (not only behind Details), and Approve stays disabled until eligible.
 * Never invents supports / never auto-approves.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isReadyForSupportsApproval } from "@/lib/immune/evidenceInvariants";

const root = join(import.meta.dirname, "../..");
function source(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Curation claim-support UX (Gate C cite path)", () => {
  const curation = source("src/routes/_authenticated/curation.tsx");
  const bridge = source("src/components/immune/HsiBridgeCurationPanel.tsx");
  const curatorPath = source("docs/GATE_C_CURATOR_PATH.md");

  it("shows Claim support inline on mapped rows and blocks Approve until ready", () => {
    expect(curation).toContain("isi-curation-claim-inline");
    expect(curation).toContain("data-testid={`claim-support-${r.evidence_id}`}");
    expect(curation).toContain("data-testid={`assess-before-approve-${r.evidence_id}`}");
    expect(curation).toContain("Set supports first");
    expect(curation).toContain("Needs ID verify first");
    expect(curation).toContain("Map claim first");
    expect(curation).toContain("isReadyForSupportsApproval");
    expect(curation).toContain("hsi-cite-approve-path");
    expect(curation).toMatch(/Claim support → Supports/);
    expect(curation).toMatch(/No auto-approve/);
    // Inline patch path (row) + detail path both present
    expect(curation).toContain("claim_support: e.target.value");
    expect(curation).toContain("claim-support-detail-");
  });

  it("surfaces mapped S-P-O in Details and keeps counterevidence honesty", () => {
    expect(curation).toContain("Claim mapping (required before Approve)");
    expect(curation).toContain("edgeByRel");
    expect(curation).toMatch(/Mapped claim:/);
    expect(curation).toMatch(/does not count as reviewed support/i);
  });

  it("bridge panel points curators at inline Claim support on /curation?hsi=cite", () => {
    expect(bridge).toContain("/curation?hsi=cite");
    expect(bridge).toMatch(/Claim support/i);
    expect(bridge).toMatch(/autoApprove stays false|Never bulk-invent supports|Never\s+auto-approve/i);
  });

  it("curator path doc matches Neon remeasure honesty (0 supports)", () => {
    expect(curatorPath).toMatch(/0.*supports/i);
    expect(curatorPath).toMatch(/0.*publicCiteApproved/i);
    expect(curatorPath).toMatch(/Set supports first|Claim support/);
    expect(curatorPath).not.toMatch(/\b13 supports\b/);
    expect(curatorPath).toMatch(/never invent|Do \*\*not\*\* invent|no bulk invent/i);
    expect(curatorPath).toMatch(/AUDIT_3_ISI_CITE_HITL_2026-11-08/);
  });

  it("Audit #3 receipt keeps eng CLEARED / HITL BLOCKED honesty", () => {
    const receipt = source("docs/engineering/AUDIT_3_ISI_CITE_HITL_2026-11-08.md");
    expect(receipt).toMatch(/ENG CLEARED/i);
    expect(receipt).toMatch(/HITL BLOCKED/i);
    expect(receipt).toMatch(/publicCiteApproved/);
    expect(receipt).toMatch(/`autoApprove=false`/);
    expect(receipt).not.toMatch(/autoApprove\s*=\s*true/);
    expect(receipt).toMatch(/never invent `claim_support=supports`/i);
    expect(receipt).toMatch(/Forbidden/i);
  });

  it("eligibility helper still requires verified + mapped + supports", () => {
    expect(
      isReadyForSupportsApproval({
        check_status: "verified",
        curation: "unreviewed",
        relationship_id: "REL-demo",
        claim_support: "unassessed",
      }),
    ).toBe(false);
    expect(
      isReadyForSupportsApproval({
        check_status: "verified",
        curation: "unreviewed",
        relationship_id: "REL-demo",
        claim_support: "supports",
      }),
    ).toBe(true);
    expect(
      isReadyForSupportsApproval({
        check_status: "verified",
        curation: "unreviewed",
        relationship_id: "REL-demo",
        claim_support: "partial",
      }),
    ).toBe(false);
  });
});

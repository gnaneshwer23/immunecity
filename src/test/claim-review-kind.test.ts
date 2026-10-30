/**
 * Claim review kind typing — literature_candidate | extracted_claim | reviewed_claim.
 */
import { describe, expect, it } from "bun:test";
import {
  asReviewedClaimKind,
  claimReviewKindLabel,
  inferClaimReviewKind,
  toSourceBackedClaim,
} from "@/lib/immune/claimRecords";
import type { CitationLike } from "@/lib/immune/evidenceStatus";

function cite(partial: Partial<CitationLike> & Pick<CitationLike, "evidence_id">): CitationLike {
  return {
    relationship_id: null,
    claim_support: "unassessed",
    curation: "unreviewed",
    label: partial.evidence_id,
    url: "",
    reviewed_at: null,
    ...partial,
  };
}

describe("ClaimReviewKind", () => {
  it("defaults source-backed unreviewed rows to literature_candidate", () => {
    const c = cite({ evidence_id: "EV1", pmid: "25891173", claim_text: "pilot" });
    expect(inferClaimReviewKind(c)).toBe("literature_candidate");
    expect(toSourceBackedClaim(c).reviewKind).toBe("literature_candidate");
    expect(claimReviewKindLabel("literature_candidate")).toMatch(/not claim-verified/i);
  });

  it("types passage+assertion as extracted_claim until human review", () => {
    const c = cite({
      evidence_id: "EV2",
      pmid: "1",
      claim_text: "Assertion",
      passage_span: "exact span",
    });
    expect(inferClaimReviewKind(c)).toBe("extracted_claim");
  });

  it("never auto-promotes locators to reviewed_claim", () => {
    const c = cite({ evidence_id: "EV3", pmid: "25891173", doi: "10.x/y", claim_text: "x" });
    expect(asReviewedClaimKind(c)).toBeNull();
    expect(inferClaimReviewKind(c, "literature_candidate")).toBe("literature_candidate");
  });

  it("reviewed_claim only after approved or rejected curation", () => {
    expect(
      inferClaimReviewKind(cite({ evidence_id: "EV4", curation: "approved", claim_support: "supports" })),
    ).toBe("reviewed_claim");
    expect(inferClaimReviewKind(cite({ evidence_id: "EV5", curation: "rejected" }))).toBe(
      "reviewed_claim",
    );
  });
});

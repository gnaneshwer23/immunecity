import { describe, expect, it } from "vitest";
import {
  canApproveClaim,
  canApproveIdentifier,
  computeEvidenceUpdate,
  isCounterEvidenceAssessment,
  isGateCSupportingEvidence,
  isReadyForSupportsApproval,
  partitionEvidencePolarity,
} from "@/lib/immune/evidenceInvariants";

const base = {
  curation: "approved" as const,
  claimSupport: "supports",
  relationshipId: "REL-M001-contributes_to-D001",
  pmid: "12345678",
  doi: null as string | null,
  sourceRef: "PMID:12345678",
  checkStatus: "verified",
};

describe("evidence approval invariants", () => {
  it("rejects approve without relationship or claim_support=supports", () => {
    expect(canApproveClaim(null, "supports")).toBe(false);
    expect(canApproveClaim("REL-x", "unassessed")).toBe(false);
    expect(canApproveClaim("REL-x", "partial")).toBe(false);
    expect(canApproveClaim("REL-x", "contradicts")).toBe(false);
    expect(canApproveClaim("REL-x", "unrelated")).toBe(false);
    expect(canApproveClaim("REL-x", "supports")).toBe(true);
  });

  it("requires verified or matched identifier status", () => {
    expect(canApproveIdentifier("verified")).toBe(true);
    expect(canApproveIdentifier("matched")).toBe(true);
    expect(canApproveIdentifier("pending")).toBe(false);
    expect(canApproveIdentifier("ambiguous")).toBe(false);
  });

  it("ISI-A04 ready-for-approve requires supports only", () => {
    expect(
      isReadyForSupportsApproval({
        check_status: "verified",
        curation: "unreviewed",
        relationship_id: "REL-x",
        claim_support: "supports",
      }),
    ).toBe(true);
    expect(
      isReadyForSupportsApproval({
        check_status: "verified",
        curation: "unreviewed",
        relationship_id: "REL-x",
        claim_support: "partial",
      }),
    ).toBe(false);
  });

  it("invalidates approval when source identifiers change", () => {
    const r = computeEvidenceUpdate(base, { pmid: "99999999" }, "curator@example.com");
    expect(r.error).toBeUndefined();
    expect(r.set.curation).toBe("unreviewed");
    expect(r.set.claimSupport).toBe("unassessed");
    expect(r.set.checkStatus).toBe("pending");
    expect(r.set.reviewedBy).toBeNull();
    expect(r.set.reviewedAt).toBeNull();
  });

  it("blocks bulk-style approve of identifier-only records", () => {
    const r = computeEvidenceUpdate(
      { ...base, curation: "unreviewed", claimSupport: "unassessed", relationshipId: "REL-x" },
      { curation: "approved" },
      "curator@example.com",
    );
    expect(r.error).toMatch(/claim_support|Identifier verification/i);
  });

  it("blocks approve when identifier is not yet verified", () => {
    const r = computeEvidenceUpdate(
      { ...base, curation: "unreviewed", claimSupport: "supports", checkStatus: "pending" },
      { curation: "approved" },
      "curator@example.com",
    );
    expect(r.error).toMatch(/verified or matched/i);
  });

  it("allows approve when relationship mapped, claim_support=supports, and identifier verified", () => {
    const r = computeEvidenceUpdate(
      { ...base, curation: "unreviewed", claimSupport: "supports", checkStatus: "matched" },
      { curation: "approved" },
      "curator@example.com",
    );
    expect(r.error).toBeUndefined();
    expect(r.set.curation).toBe("approved");
    expect(r.set.reviewedBy).toBe("curator@example.com");
  });

  it("blocks approve when claim_support is partial or contradicts", () => {
    for (const claimSupport of ["partial", "contradicts", "unrelated"] as const) {
      const r = computeEvidenceUpdate(
        { ...base, curation: "unreviewed", claimSupport, checkStatus: "verified" },
        { curation: "approved" },
        "curator@example.com",
      );
      expect(r.error).toMatch(/claim_support=supports/i);
    }
  });

  it("resets claim assessment when relationship mapping is cleared", () => {
    const r = computeEvidenceUpdate(base, { relationship_id: null }, "curator@example.com");
    expect(r.set.claimSupport).toBe("unassessed");
    expect(r.set.curation).toBe("unreviewed");
  });
});

describe("ISI-001 fail-closed evidence read predicates", () => {
  it("Gate C support requires approved + supports + verified identifier", () => {
    expect(
      isGateCSupportingEvidence({
        curation: "approved",
        claimSupport: "supports",
        relationshipId: "REL-x",
        checkStatus: "verified",
      }),
    ).toBe(true);
    expect(
      isGateCSupportingEvidence({
        curation: "approved",
        claimSupport: "contradicts",
        relationshipId: "REL-x",
        checkStatus: "verified",
      }),
    ).toBe(false);
    expect(
      isGateCSupportingEvidence({
        curation: "approved",
        claimSupport: "supports",
        relationshipId: "REL-x",
        checkStatus: "pending",
      }),
    ).toBe(false);
    expect(
      isGateCSupportingEvidence({
        curation: "unreviewed",
        claimSupport: "supports",
        relationshipId: "REL-x",
        checkStatus: "verified",
      }),
    ).toBe(false);
  });

  it("counterevidence allows contradicts/partial without curation=approved", () => {
    expect(
      isCounterEvidenceAssessment({
        curation: "unreviewed",
        claimSupport: "contradicts",
        relationshipId: "REL-x",
        checkStatus: "matched",
      }),
    ).toBe(true);
    expect(
      isCounterEvidenceAssessment({
        curation: "unreviewed",
        claimSupport: "partial",
        relationshipId: "REL-x",
        checkStatus: "verified",
      }),
    ).toBe(true);
    expect(
      isCounterEvidenceAssessment({
        curation: "rejected",
        claimSupport: "contradicts",
        relationshipId: "REL-x",
        checkStatus: "verified",
      }),
    ).toBe(false);
    expect(
      isCounterEvidenceAssessment({
        curation: "unreviewed",
        claimSupport: "supports",
        relationshipId: "REL-x",
        checkStatus: "verified",
      }),
    ).toBe(false);
  });

  it("partitions support vs counter without conflating Gate C", () => {
    const { supporting, counter } = partitionEvidencePolarity([
      { claim_support: "supports", curation: "approved", evidence_id: "E1" },
      { claim_support: "contradicts", curation: "unreviewed", evidence_id: "E2" },
      { claim_support: "partial", curation: "unreviewed", evidence_id: "E3" },
      { claim_support: "supports", curation: "unreviewed", evidence_id: "E4" },
    ]);
    expect(supporting.map((c) => c.evidence_id)).toEqual(["E1"]);
    expect(counter.map((c) => c.evidence_id)).toEqual(["E2", "E3"]);
  });
});

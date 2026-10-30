/**
 * Phase C — Evidence intelligence (claims, conflict, review queue, three axes).
 * Run: bun test src/test/phase-c-evidence-intelligence.test.ts
 */
import { describe, expect, it } from "bun:test";
import {
  assertNoSilentApproval,
  classifyClaimEvidence,
  detectConflictingEvidence,
  isPublicApprovedClaim,
  publicationLocatorFromCite,
  toSourceBackedClaim,
} from "@/lib/immune/claimRecords";
import { computeEvidenceUpdate, isReadyForSupportsApproval } from "@/lib/immune/evidenceInvariants";
import { dimensionsAreOrthogonal, edgeEvidenceDimensions } from "@/lib/immune/evidenceDimensions";
import { edgeByRel, type KGEdge } from "@/lib/immune/engine";
import { relationshipStatus, type CitationLike } from "@/lib/immune/evidenceStatus";
import { buildScientificReviewQueue, summariseAuditHistory } from "@/lib/immune/scientificReviewQueue";
import { typedIncidentRelations } from "@/lib/immune/typedRelations";

function cite(partial: Partial<CitationLike> & Pick<CitationLike, "evidence_id">): CitationLike {
  return {
    relationship_id: null,
    claim_support: "unassessed",
    label: "x",
    url: "",
    reviewed_at: null,
    curation: "unreviewed",
    ...partial,
  };
}

describe("Phase C1 — source-backed claims + locators", () => {
  it("positive: durable locator from PMID/DOI + optional passage span", () => {
    const loc = publicationLocatorFromCite(
      cite({
        evidence_id: "EV1",
        pmid: "25891173",
        doi: "10.1056/NEJMoa1503093",
        passage_span: "ORR was 33.7%",
      }),
    );
    expect(loc.hasDurableId).toBe(true);
    expect(loc.pmid).toBe("25891173");
    expect(loc.passageSpan).toMatch(/33\.7/);
  });

  it("negative: unreviewed supports is not a public approved claim", () => {
    const c = cite({
      evidence_id: "EV2",
      relationship_id: "REL-x",
      claim_support: "supports",
      curation: "unreviewed",
      pmid: "12345678",
    });
    expect(classifyClaimEvidence(c)).toBe("unreviewed_mapped");
    expect(isPublicApprovedClaim(c)).toBe(false);
  });

  it("boundary: Gate C requires approved + supports + relationship", () => {
    const c = cite({
      evidence_id: "EV3",
      relationship_id: "REL-x",
      claim_support: "supports",
      curation: "approved",
      pmid: "12345678",
    });
    expect(classifyClaimEvidence(c)).toBe("gate_c_support");
    expect(isPublicApprovedClaim(c)).toBe(true);
  });
});

describe("Phase C2 — conflict + three dimensions", () => {
  it("positive: supports + contradicts on same rel → conflicting", () => {
    const rows = typedIncidentRelations("D012");
    expect(rows.length).toBeGreaterThan(0);
    const rid = rows[0]!.relId;
    const cites = [
      cite({
        evidence_id: "EV-s",
        relationship_id: rid,
        claim_support: "supports",
        curation: "approved",
        pmid: "11111111",
      }),
      cite({
        evidence_id: "EV-c",
        relationship_id: rid,
        claim_support: "contradicts",
        curation: "unreviewed",
        pmid: "22222222",
      }),
    ];
    const d = detectConflictingEvidence(rid, cites);
    expect(d.conflicting).toBe(true);
    expect(d.supportingIds).toEqual(["EV-s"]);
    expect(d.counterIds).toEqual(["EV-c"]);
    expect(d.reviewStatus).toBe("conflicting");
  });

  it("negative: silent approve of non-supports is blocked", () => {
    const bad = assertNoSilentApproval(
      cite({ evidence_id: "EV-bad", claim_support: "partial", curation: "approved", relationship_id: "REL-x" }),
    );
    expect(bad.ok).toBe(false);
    const patch = computeEvidenceUpdate(
      {
        curation: "unreviewed",
        claimSupport: "partial",
        relationshipId: "REL-x",
        pmid: "1",
        doi: null,
        sourceRef: null,
        checkStatus: "verified",
      },
      { curation: "approved" },
      "tester",
    );
    expect(patch.error).toMatch(/Cannot approve/);
  });

  it("boundary: edge dimensions stay orthogonal (curation ≠ status ≠ quality)", () => {
    const edge = Object.values(edgeByRel)[0] as KGEdge;
    const dims = edgeEvidenceDimensions(edge, relationshipStatus(edge, []));
    expect(dimensionsAreOrthogonal(dims)).toBe(true);
    const claim = toSourceBackedClaim(
      cite({ evidence_id: "EV-d", relationship_id: edge ? undefined : null }),
      edge,
    );
    expect(claim.dimensionsOk).toBe(true);
  });
});

describe("Phase C3 — scientific review queue + audit", () => {
  it("positive: ready_for_supports surfaces when identifier+supports+unreviewed", () => {
    const rid = typedIncidentRelations("D012")[0]?.relId ?? "REL-D012-x-y";
    const q = buildScientificReviewQueue([
      {
        evidence_id: "EV-ready",
        node_id: "D012",
        relationship_id: rid,
        claim_support: "supports",
        curation: "unreviewed",
        check_status: "verified",
        pmid: "25891173",
      },
    ]);
    expect(q.counts.ready_for_supports).toBe(1);
    expect(q.items[0]!.requiresHumanReview).toBe(true);
    expect(q.items[0]!.priority).toBe("ready_for_supports");
    expect(isReadyForSupportsApproval({
      check_status: "verified",
      curation: "unreviewed",
      relationship_id: rid,
      claim_support: "supports",
    })).toBe(true);
  });

  it("negative: approved Gate C supports leave the queue; inconsistent approve counted", () => {
    const q = buildScientificReviewQueue([
      {
        evidence_id: "EV-done",
        relationship_id: "REL-x",
        claim_support: "supports",
        curation: "approved",
        check_status: "verified",
      },
      {
        evidence_id: "EV-bad",
        relationship_id: "REL-x",
        claim_support: "contradicts",
        curation: "approved",
        check_status: "verified",
      },
    ]);
    expect(q.items.every((i) => i.evidenceId !== "EV-done")).toBe(true);
    expect(q.blockedSilentApprovals).toBeGreaterThanOrEqual(1);
  });

  it("boundary: audit history summarises last actor without inventing decisions", () => {
    const s = summariseAuditHistory([
      {
        evidenceId: "EV1",
        actor: "reviewer-a",
        reason: "assessed",
        previousCuration: "unreviewed",
        newCuration: "unreviewed",
        createdAt: "2026-10-29T00:00:00.000Z",
      },
      {
        evidenceId: "EV1",
        actor: "reviewer-b",
        reason: "approved supports",
        previousCuration: "unreviewed",
        newCuration: "approved",
        createdAt: "2026-10-30T00:00:00.000Z",
      },
    ]);
    expect(s).toHaveLength(1);
    expect(s[0]!.decisions).toBe(2);
    expect(s[0]!.lastActor).toBe("reviewer-b");
  });
});

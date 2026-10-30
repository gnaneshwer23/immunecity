/**
 * Phase C — Source-backed claim records + publication locators.
 * Browser-safe helpers over CitationLike / claim_candidates shape.
 * Never invents PMIDs, passage spans, or approvals. Unreviewed ≠ Gate C.
 *
 * Claim review kinds (explicit — never collapse to “verified”):
 * - literature_candidate: durable locator and/or curated note; NOT claim-verified
 * - extracted_claim: assertion + passage extracted for human review; still unreviewed
 * - reviewed_claim: human decision recorded (approved or rejected) — never auto-promoted
 */
import { byId, edgeByRel, edgeRef, type KGEdge } from "@/lib/immune/engine";
import {
  COUNTER_EVIDENCE_CLAIMS,
  GATE_C_SUPPORT_CLAIMS,
  isGateCSupportingEvidence,
  type ClaimSupport,
  type CurationState,
} from "@/lib/immune/evidenceInvariants";
import {
  relationshipStatus,
  type CitationLike,
  type ReviewStatus,
} from "@/lib/immune/evidenceStatus";
import { dimensionsAreOrthogonal, edgeEvidenceDimensions } from "@/lib/immune/evidenceDimensions";

/**
 * Explicit claim typing for brief/export/review surfaces.
 * Source-backed ≠ reviewed. Pilot PMIDs are literature_candidate until a human decides.
 */
export type ClaimReviewKind = "literature_candidate" | "extracted_claim" | "reviewed_claim";

export const CLAIM_REVIEW_KINDS: readonly ClaimReviewKind[] = [
  "literature_candidate",
  "extracted_claim",
  "reviewed_claim",
] as const;

/** Exact publication locator when curator-recorded — never fabricated. */
export interface PublicationLocator {
  pmid: string | null;
  doi: string | null;
  /** Exact supporting span when recorded (Layer B). */
  passageSpan: string | null;
  /** Bibliographic label / URL when only a citation string exists. */
  citationLabel: string | null;
  citationUrl: string | null;
  /** True when at least one durable identifier (PMID or DOI) is present. */
  hasDurableId: boolean;
}

export type ClaimEvidenceClass =
  | "gate_c_support"
  | "counterevidence"
  | "unrelated"
  | "unassessed"
  | "rejected_curation"
  | "unreviewed_mapped";

export interface SourceBackedClaim {
  evidenceId: string;
  relationshipId: string | null;
  assertion: string | null;
  claimSupport: string;
  curation: string;
  classification: ClaimEvidenceClass;
  /**
   * Lifecycle kind. literature_candidate / extracted_claim are never Gate C.
   * reviewed_claim only after a human curation decision — never auto-promoted.
   */
  reviewKind: ClaimReviewKind;
  locator: PublicationLocator;
  reviewedAt: string | null;
  /** Orthogonal axes — must not collapse to one score. */
  dimensionsOk: boolean;
}

/**
 * Infer review kind from row state. Never invents reviewed_claim from locators alone.
 * Pass `explicit` when the producer already typed the candidate (e.g. melanoma pilot).
 */
export function inferClaimReviewKind(
  c: CitationLike,
  explicit?: ClaimReviewKind | null,
): ClaimReviewKind {
  if (explicit === "literature_candidate" || explicit === "extracted_claim" || explicit === "reviewed_claim") {
    // Refuse silent promotion: explicit literature/extracted stays until curation says otherwise.
    if (explicit === "reviewed_claim") return "reviewed_claim";
    if (c.curation === "approved" || c.curation === "rejected") return "reviewed_claim";
    return explicit;
  }
  if (c.curation === "approved" || c.curation === "rejected") return "reviewed_claim";
  const hasPassage = Boolean(c.passage_span?.trim());
  const hasAssertion = Boolean(c.claim_text?.trim());
  if (hasPassage && hasAssertion) return "extracted_claim";
  return "literature_candidate";
}

/**
 * Human-only promotion gate. Locators / source-backed status never promote.
 * Returns null when the row is not yet reviewed — callers must not invent reviewed_claim.
 */
export function asReviewedClaimKind(c: CitationLike): ClaimReviewKind | null {
  if (c.curation === "approved" || c.curation === "rejected") return "reviewed_claim";
  return null;
}

export function claimReviewKindLabel(kind: ClaimReviewKind): string {
  switch (kind) {
    case "literature_candidate":
      return "Literature candidate (not claim-verified)";
    case "extracted_claim":
      return "Extracted claim (awaiting human review)";
    case "reviewed_claim":
      return "Reviewed claim (human decision recorded)";
  }
}

export function publicationLocatorFromCite(c: CitationLike): PublicationLocator {
  const pmid = c.pmid?.trim() || null;
  const doi = c.doi?.trim() || null;
  const passageSpan = c.passage_span?.trim() || null;
  const citationLabel = c.label?.trim() || null;
  const citationUrl = c.url?.trim() || null;
  return {
    pmid,
    doi,
    passageSpan,
    citationLabel,
    citationUrl,
    hasDurableId: Boolean(pmid || doi),
  };
}

export function classifyClaimEvidence(c: CitationLike): ClaimEvidenceClass {
  if (c.curation === "rejected") return "rejected_curation";
  if (isGateCSupportingEvidence({
    curation: c.curation,
    claimSupport: c.claim_support,
    relationshipId: c.relationship_id,
  })) {
    return "gate_c_support";
  }
  if (COUNTER_EVIDENCE_CLAIMS.has(c.claim_support)) return "counterevidence";
  if (c.claim_support === "unrelated") return "unrelated";
  if (c.claim_support === "unassessed" || !c.claim_support) {
    return c.relationship_id ? "unreviewed_mapped" : "unassessed";
  }
  if (c.curation === "unreviewed" || c.curation === undefined) {
    return c.relationship_id ? "unreviewed_mapped" : "unassessed";
  }
  return "unassessed";
}

export function toSourceBackedClaim(
  c: CitationLike,
  edge?: KGEdge | null,
  opts?: { reviewKind?: ClaimReviewKind | null },
): SourceBackedClaim {
  const dims = edge
    ? edgeEvidenceDimensions(edge, relationshipStatus(edge, [c]))
    : [];
  return {
    evidenceId: c.evidence_id,
    relationshipId: c.relationship_id,
    assertion: c.claim_text?.trim() || null,
    claimSupport: c.claim_support,
    curation: c.curation ?? "unreviewed",
    classification: classifyClaimEvidence(c),
    reviewKind: inferClaimReviewKind(c, opts?.reviewKind),
    locator: publicationLocatorFromCite(c),
    reviewedAt: c.reviewed_at,
    dimensionsOk: edge ? dimensionsAreOrthogonal(dims) : true,
  };
}

/**
 * Conflicting evidence on one relationship: Gate C supports + counterevidence both present.
 * Does not invent conflict from missing data.
 */
export function detectConflictingEvidence(
  relationshipId: string,
  cites: CitationLike[],
): { conflicting: boolean; supportingIds: string[]; counterIds: string[]; reviewStatus: ReviewStatus | null } {
  const edge = edgeByRel[relationshipId];
  const mine = cites.filter((c) => c.relationship_id === relationshipId);
  const supportingIds = mine
    .filter((c) => classifyClaimEvidence(c) === "gate_c_support")
    .map((c) => c.evidence_id);
  const counterIds = mine
    .filter((c) => classifyClaimEvidence(c) === "counterevidence")
    .map((c) => c.evidence_id);
  const conflicting = supportingIds.length > 0 && counterIds.length > 0;
  return {
    conflicting,
    supportingIds,
    counterIds,
    reviewStatus: edge ? relationshipStatus(edge, cites) : null,
  };
}

/**
 * Guard: unreviewed / non-supports claims must never be treated as approved graph support.
 */
export function assertNoSilentApproval(c: CitationLike): { ok: true } | { ok: false; reason: string } {
  if (c.curation === "approved" && c.claim_support !== "supports") {
    return { ok: false, reason: "approved_without_supports" };
  }
  if (c.curation === "approved" && !c.relationship_id) {
    return { ok: false, reason: "approved_without_relationship" };
  }
  if (GATE_C_SUPPORT_CLAIMS.has(c.claim_support) && c.curation !== "approved" && c.curation !== undefined) {
    // supports but not approved — honest unreviewed mapped; not an error, just not Gate C.
    return { ok: true };
  }
  return { ok: true };
}

/** True when a claim may appear in public approved-citation surfaces. */
export function isPublicApprovedClaim(c: CitationLike): boolean {
  return classifyClaimEvidence(c) === "gate_c_support";
}

export function claimRequiresHumanReview(c: CitationLike): boolean {
  const cls = classifyClaimEvidence(c);
  return cls === "unreviewed_mapped" || cls === "unassessed" || cls === "counterevidence";
}

export type { ClaimSupport, CurationState };

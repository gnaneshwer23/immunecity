/**
 * Phase C — Source-backed claim records + publication locators.
 * Browser-safe helpers over CitationLike / claim_candidates shape.
 * Never invents PMIDs, passage spans, or approvals. Unreviewed ≠ Gate C.
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
  locator: PublicationLocator;
  reviewedAt: string | null;
  /** Orthogonal axes — must not collapse to one score. */
  dimensionsOk: boolean;
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

export function toSourceBackedClaim(c: CitationLike, edge?: KGEdge | null): SourceBackedClaim {
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

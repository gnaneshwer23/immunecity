/**
 * Pure rules for evidence curation mutations.
 * Identifier verification ≠ scientific claim approval.
 */

export type ClaimSupport = "unassessed" | "supports" | "partial" | "contradicts" | "unrelated";
export type CurationState = "unreviewed" | "approved" | "rejected";

/** Bibliographic check statuses that may proceed to claim approval. */
export const APPROVAL_ELIGIBLE_CHECK = new Set(["verified", "matched"]);

export interface EvidenceSnapshot {
  curation: string;
  claimSupport: string;
  relationshipId: string | null;
  pmid: string | null;
  doi: string | null;
  sourceRef: string | null;
  checkStatus: string;
}

export interface EvidencePatchInput {
  curation?: CurationState;
  pmid?: string | null;
  doi?: string | null;
  source_ref?: string | null;
  notes?: string | null;
  relationship_id?: string | null;
  claim_support?: ClaimSupport;
}

export interface EvidencePatchResult {
  error?: string;
  /** Fields to write (drizzle column names). */
  set: {
    curation?: string;
    pmid?: string | null;
    doi?: string | null;
    sourceRef?: string | null;
    notes?: string | null;
    relationshipId?: string | null;
    claimSupport?: string;
    checkStatus?: string;
    reviewedBy?: string | null;
    reviewedAt?: Date | null;
  };
}

/**
 * True when a record may be marked curation=approved.
 * Only claim_support=supports counts as scientific claim approval for a mapped edge;
 * partial / contradicts / unrelated must stay unapproved (they cannot inflate coverage).
 */
export function canApproveClaim(relationshipId: string | null | undefined, claimSupport: string | null | undefined): boolean {
  if (!relationshipId) return false;
  return claimSupport === "supports";
}

/** Identifier metadata must resolve before scientific approval can stick. */
export function canApproveIdentifier(checkStatus: string | null | undefined): boolean {
  return !!checkStatus && APPROVAL_ELIGIBLE_CHECK.has(checkStatus);
}

/** Claim polarities that may appear in the Ask support path (Gate C). */
export const GATE_C_SUPPORT_CLAIMS = new Set(["supports"]);

/** Claim polarities for the separate counterevidence / skeptic path — never inflate Gate C. */
export const COUNTER_EVIDENCE_CLAIMS = new Set(["contradicts", "partial"]);

export interface EvidenceReadPredicates {
  curation: string | null | undefined;
  claimSupport: string | null | undefined;
  relationshipId: string | null | undefined;
  checkStatus?: string | null | undefined;
}

/**
 * Fail-closed Gate C supporting cite for answer support / coverage inflation paths.
 * Requires approved + supports + mapped relationship + verified/matched identifier when checkStatus is known.
 * When checkStatus is omitted (legacy callers), identifier gate is skipped — prefer passing it.
 */
export function isGateCSupportingEvidence(row: EvidenceReadPredicates): boolean {
  if (row.curation !== "approved") return false;
  if (!row.relationshipId) return false;
  if (!GATE_C_SUPPORT_CLAIMS.has(row.claimSupport ?? "")) return false;
  if (row.checkStatus !== undefined && row.checkStatus !== null) {
    if (!canApproveIdentifier(row.checkStatus)) return false;
  }
  return true;
}

/**
 * Counterevidence / skeptic path: assessed contradicts or partial on a mapped edge.
 * Must not require curation=approved (write path forbids approving non-supports).
 * Rejects rejected rows; requires verified/matched identifier when checkStatus is present.
 */
export function isCounterEvidenceAssessment(row: EvidenceReadPredicates): boolean {
  if (row.curation === "rejected") return false;
  if (!row.relationshipId) return false;
  if (!COUNTER_EVIDENCE_CLAIMS.has(row.claimSupport ?? "")) return false;
  if (row.checkStatus !== undefined && row.checkStatus !== null) {
    if (!canApproveIdentifier(row.checkStatus)) return false;
  }
  return true;
}

/** Split cites for support vs counter display without conflating Gate C coverage. */
export function partitionEvidencePolarity<T extends { claim_support: string; curation?: string }>(
  cites: T[],
): { supporting: T[]; counter: T[] } {
  const supporting: T[] = [];
  const counter: T[] = [];
  for (const c of cites) {
    if (GATE_C_SUPPORT_CLAIMS.has(c.claim_support) && (c.curation === undefined || c.curation === "approved")) {
      supporting.push(c);
    } else if (COUNTER_EVIDENCE_CLAIMS.has(c.claim_support)) {
      counter.push(c);
    }
  }
  return { supporting, counter };
}

/**
 * Compute the DB patch for an evidence update.
 * Source edits invalidate prior approval and claim assessment.
 * Approval requires mapped relationship_id + assessed claim_support + verified/matched identifier.
 */
export function computeEvidenceUpdate(
  existing: EvidenceSnapshot,
  patch: EvidencePatchInput,
  reviewer: string,
): EvidencePatchResult {
  const touchesSource = "pmid" in patch || "doi" in patch || "source_ref" in patch;
  const set: EvidencePatchResult["set"] = {};

  if ("pmid" in patch) set.pmid = patch.pmid ?? null;
  if ("doi" in patch) set.doi = patch.doi ?? null;
  if ("source_ref" in patch) set.sourceRef = patch.source_ref ?? null;
  if ("notes" in patch) set.notes = patch.notes ?? null;
  if ("claim_support" in patch) set.claimSupport = patch.claim_support;
  if ("relationship_id" in patch) {
    set.relationshipId = patch.relationship_id ?? null;
    if (!patch.relationship_id) set.claimSupport = "unassessed";
    else if (patch.relationship_id !== existing.relationshipId && !("claim_support" in patch)) {
      set.claimSupport = "unassessed";
    }
  }
  if ("curation" in patch) set.curation = patch.curation;

  if (touchesSource) {
    set.checkStatus = "pending";
    // Editing the source invalidates prior scientific approval and claim assessment.
    set.curation = "unreviewed";
    set.claimSupport = "unassessed";
    set.reviewedBy = null;
    set.reviewedAt = null;
  } else if ("relationship_id" in patch && patch.relationship_id !== existing.relationshipId) {
    // Remapping the claim clears prior approval metadata (claim_support already reset above when needed).
    set.curation = "unreviewed";
    set.reviewedBy = null;
    set.reviewedAt = null;
  }

  const nextCuration = set.curation ?? existing.curation;
  const nextClaim = set.claimSupport ?? existing.claimSupport;
  const nextRel =
    "relationshipId" in set ? (set.relationshipId ?? null) : existing.relationshipId;
  const nextCheck = set.checkStatus ?? existing.checkStatus;

  if (nextCuration === "approved") {
    if (!canApproveClaim(nextRel, nextClaim)) {
      return {
        error:
          "Cannot approve without a mapped relationship_id and claim_support=supports. Identifier verification or partial/contradicting assessments are not scientific claim approval.",
        set: {},
      };
    }
    if (!canApproveIdentifier(nextCheck)) {
      return {
        error:
          "Cannot approve until the source identifier is verified or matched (PubMed/Crossref). Run identifier check first.",
        set: {},
      };
    }
  }

  if (!touchesSource && ("curation" in patch || "claim_support" in patch)) {
    set.reviewedBy = reviewer;
    set.reviewedAt = new Date();
  }

  return { set };
}

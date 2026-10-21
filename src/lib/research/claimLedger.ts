/**
 * Layer B claim ledger scaffolding (architecture §4.2).
 * Durable claim-shaped types for workbench / local draft lifecycle.
 * Human approve only for KG — nothing here auto-promotes to Gate C.
 */

export const CLAIM_LEDGER_SCHEMA_VERSION = "claim-ledger-1" as const;

/** Suggested lifecycle — KG publication requires authorised human curation elsewhere. */
export type ClaimLifecycle =
  | "candidate"
  | "source_verified"
  | "claim_assessed"
  | "approved"
  | "rejected"
  | "needs_context";

export type ClaimPolarity = "supports" | "contradicts" | "partial" | "uncertain" | "unassessed";

export type ClaimEvidenceType =
  | "in_vitro"
  | "in_vivo"
  | "human_observational"
  | "clinical_trial"
  | "systematic_review"
  | "guideline"
  | "computational"
  | "expert_hypothesis"
  | "unspecified";

export interface ClaimBiologicalContext {
  species?: string;
  cellType?: string;
  tissue?: string;
  disease?: string;
  stimulus?: string;
  doseTime?: string;
}

/**
 * Durable claim-shaped record (candidate until human curation).
 * Maps toward Neon `claim_candidates` when migration is applied — local drafts remain primary.
 */
export interface LedgerClaim {
  claim_id: string;
  schemaVersion: typeof CLAIM_LEDGER_SCHEMA_VERSION;
  assertion: string;
  subjectId: string | null;
  predicate: string | null;
  objectId: string | null;
  polarity: ClaimPolarity;
  evidenceType: ClaimEvidenceType;
  context: ClaimBiologicalContext;
  passageSpan: string | null;
  sourcePmid: string | null;
  sourceDoi: string | null;
  lifecycle: ClaimLifecycle;
  mappedRelationshipId: string | null;
  /** Extraction / import provenance — never treated as scientific truth. */
  extractionMeta: {
    source: "workbench" | "literature_import" | "manual";
    modelOrPrompt?: string;
    confidence?: number | null;
    importedAt: string;
  };
  reviewNotes: string;
  kind: "candidate";
  createdAt: string;
  updatedAt: string;
}

export function createLedgerClaim(
  partial: Partial<LedgerClaim> & Pick<LedgerClaim, "assertion">,
): LedgerClaim {
  const now = new Date().toISOString();
  return {
    claim_id: partial.claim_id ?? `CLM-DRAFT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    schemaVersion: CLAIM_LEDGER_SCHEMA_VERSION,
    assertion: partial.assertion.trim(),
    subjectId: partial.subjectId ?? null,
    predicate: partial.predicate ?? null,
    objectId: partial.objectId ?? null,
    polarity: partial.polarity ?? "unassessed",
    evidenceType: partial.evidenceType ?? "unspecified",
    context: partial.context ?? {},
    passageSpan: partial.passageSpan ?? null,
    sourcePmid: partial.sourcePmid ?? null,
    sourceDoi: partial.sourceDoi ?? null,
    lifecycle: partial.lifecycle ?? "candidate",
    mappedRelationshipId: partial.mappedRelationshipId ?? null,
    extractionMeta: partial.extractionMeta ?? {
      source: "workbench",
      confidence: null,
      importedAt: now,
    },
    reviewNotes: partial.reviewNotes ?? "",
    kind: "candidate",
    createdAt: partial.createdAt ?? now,
    updatedAt: now,
  };
}

/** Advance lifecycle within candidate workflow — never writes the KG. */
export function advanceClaimLifecycle(
  claim: LedgerClaim,
  next: ClaimLifecycle,
  reviewNotes?: string,
): LedgerClaim {
  // Approved here means "accepted for curation handoff", not Gate C graph approval.
  return {
    ...claim,
    lifecycle: next,
    reviewNotes: reviewNotes ?? claim.reviewNotes,
    kind: "candidate",
    updatedAt: new Date().toISOString(),
  };
}

export function claimLifecycleLabel(lifecycle: ClaimLifecycle): string {
  switch (lifecycle) {
    case "candidate":
      return "Candidate";
    case "source_verified":
      return "Source verified";
    case "claim_assessed":
      return "Claim assessed";
    case "approved":
      return "Ready for curator (not Gate C)";
    case "rejected":
      return "Rejected";
    case "needs_context":
      return "Needs context";
  }
}

/** Honest: workbench "approved" ≠ Neon Gate C approved+supports. */
export function isKgPromotable(_claim: LedgerClaim): false {
  return false;
}

export function summariseClaimTable(claims: LedgerClaim[]): {
  total: number;
  byLifecycle: Record<ClaimLifecycle, number>;
  mapped: number;
  withPassage: number;
} {
  const byLifecycle: Record<ClaimLifecycle, number> = {
    candidate: 0,
    source_verified: 0,
    claim_assessed: 0,
    approved: 0,
    rejected: 0,
    needs_context: 0,
  };
  let mapped = 0;
  let withPassage = 0;
  for (const c of claims) {
    byLifecycle[c.lifecycle]++;
    if (c.mappedRelationshipId) mapped++;
    if (c.passageSpan?.trim()) withPassage++;
  }
  return { total: claims.length, byLifecycle, mapped, withPassage };
}

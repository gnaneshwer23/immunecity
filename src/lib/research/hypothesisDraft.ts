/* Candidate hypothesis artefact (FR-039). Draft-only — never auto-promotes into the curated graph. */

export type HypothesisStatus = "candidate" | "under_review" | "rejected" | "archived";

export interface HypothesisDraft {
  hypothesis_id: string;
  question_id: string | null;
  claim: string;
  mechanism: string;
  supportingIds: string[];
  conflictingIds: string[];
  assumptions: string[];
  predictedObservation: string;
  falsificationTest: string;
  alternativePath: string;
  status: HypothesisStatus;
  graphVersion: string;
  createdAt: string;
  notes: string;
}

export function createHypothesisDraft(partial: Partial<HypothesisDraft> & Pick<HypothesisDraft, "claim">, graphVersion: string): HypothesisDraft {
  const id = partial.hypothesis_id ?? `HYP-DRAFT-${Date.now().toString(36)}`;
  return {
    hypothesis_id: id,
    question_id: partial.question_id ?? null,
    claim: partial.claim,
    mechanism: partial.mechanism ?? "",
    supportingIds: partial.supportingIds ?? [],
    conflictingIds: partial.conflictingIds ?? [],
    assumptions: partial.assumptions ?? ["Candidate interpretation only — not an established finding."],
    predictedObservation: partial.predictedObservation ?? "",
    falsificationTest: partial.falsificationTest ?? "",
    alternativePath: partial.alternativePath ?? "",
    status: "candidate",
    graphVersion,
    createdAt: new Date().toISOString(),
    notes: partial.notes ?? "",
  };
}

/** Structural completeness — does not imply scientific validity. */
export function hypothesisCompleteness(h: HypothesisDraft): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!h.claim.trim()) missing.push("claim");
  if (!h.mechanism.trim()) missing.push("mechanism");
  if (!h.predictedObservation.trim()) missing.push("predictedObservation");
  if (!h.falsificationTest.trim()) missing.push("falsificationTest");
  if (!h.alternativePath.trim()) missing.push("alternativePath");
  if (!h.supportingIds.length && !h.conflictingIds.length) missing.push("supportingIds|conflictingIds");
  return { ok: missing.length === 0, missing };
}

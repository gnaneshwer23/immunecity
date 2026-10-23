/** Ask gate outcome for the evaluation log. No question text and no confidence score. */

export const ASK_EVALUATION_OUTCOMES = [
  "allowed",
  "abstained",
  "citation_rejected",
  "conflict",
  "context_mismatch",
] as const;

export type AskEvaluationOutcome = (typeof ASK_EVALUATION_OUTCOMES)[number];

export type AskEvaluationRecord = {
  outcome: AskEvaluationOutcome;
  reasonCode: string;
  questionRedacted: boolean;
};

const REASON_CODE = /^[a-z0-9_]{1,64}$/;

export function askEvaluationFromGate(input: {
  callModel: boolean;
  abstentionReason: string | null;
  personalHealth: boolean;
  validation: {
    ok: boolean;
    contextMismatches: readonly string[];
    conflictCollapses: readonly string[];
  } | null;
}): AskEvaluationRecord {
  const questionRedacted = input.personalHealth;
  if (!input.callModel) {
    const reason = input.abstentionReason && REASON_CODE.test(input.abstentionReason)
      ? input.abstentionReason
      : "abstained";
    return { outcome: "abstained", reasonCode: reason, questionRedacted };
  }
  const validation = input.validation;
  if (!validation || validation.ok) {
    return { outcome: "allowed", reasonCode: "allowed", questionRedacted };
  }
  if (validation.contextMismatches.length > 0) {
    return { outcome: "context_mismatch", reasonCode: "context_mismatch", questionRedacted };
  }
  if (validation.conflictCollapses.length > 0) {
    return { outcome: "conflict", reasonCode: "conflict", questionRedacted };
  }
  return { outcome: "citation_rejected", reasonCode: "citation_rejected", questionRedacted };
}

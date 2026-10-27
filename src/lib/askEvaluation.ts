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
  /** Ask PROMPT_VERSION — for dashboard rates by prompt. Never question text. */
  promptVersion: string;
};

const REASON_CODE = /^[a-z0-9_]{1,64}$/;
const PROMPT_VERSION_SAFE = /^[a-z0-9._-]{1,64}$/i;

export function sanitisePromptVersion(version: string | null | undefined): string {
  const v = (version ?? "").trim();
  if (v && PROMPT_VERSION_SAFE.test(v)) return v;
  return "unknown";
}

export function askEvaluationFromGate(input: {
  callModel: boolean;
  abstentionReason: string | null;
  personalHealth: boolean;
  validation: {
    ok: boolean;
    contextMismatches: readonly string[];
    conflictCollapses: readonly string[];
  } | null;
  promptVersion?: string | null;
}): AskEvaluationRecord {
  const questionRedacted = input.personalHealth;
  const promptVersion = sanitisePromptVersion(input.promptVersion);
  if (!input.callModel) {
    const reason = input.abstentionReason && REASON_CODE.test(input.abstentionReason)
      ? input.abstentionReason
      : "abstained";
    return { outcome: "abstained", reasonCode: reason, questionRedacted, promptVersion };
  }
  const validation = input.validation;
  if (!validation || validation.ok) {
    return { outcome: "allowed", reasonCode: "allowed", questionRedacted, promptVersion };
  }
  if (validation.contextMismatches.length > 0) {
    return { outcome: "context_mismatch", reasonCode: "context_mismatch", questionRedacted, promptVersion };
  }
  if (validation.conflictCollapses.length > 0) {
    return { outcome: "conflict", reasonCode: "conflict", questionRedacted, promptVersion };
  }
  return { outcome: "citation_rejected", reasonCode: "citation_rejected", questionRedacted, promptVersion };
}

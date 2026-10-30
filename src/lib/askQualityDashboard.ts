/**
 * Browser-safe Ask quality aggregates over ai_evaluation_runs rows.
 * Never includes question text — only outcome / reason / redacted / prompt version.
 */
import {
  ASK_EVALUATION_OUTCOMES,
  type AskEvaluationOutcome,
} from "@/lib/askEvaluation";

export type AskEvalRow = {
  outcome: string;
  reasonCode: string;
  questionRedacted: boolean;
  promptVersion: string;
  createdAt?: string | null;
};

export type OutcomeRate = {
  outcome: AskEvaluationOutcome;
  count: number;
  rate: number;
};

export type PromptVersionSummary = {
  promptVersion: string;
  total: number;
  redactedCount: number;
  outcomes: OutcomeRate[];
};

export type AskQualitySummary = {
  total: number;
  redactedCount: number;
  byPromptVersion: PromptVersionSummary[];
  overall: OutcomeRate[];
  note: string;
};

function emptyOutcomes(): Record<AskEvaluationOutcome, number> {
  return {
    allowed: 0,
    abstained: 0,
    citation_rejected: 0,
    conflict: 0,
    context_mismatch: 0,
  };
}

function toRates(counts: Record<AskEvaluationOutcome, number>, total: number): OutcomeRate[] {
  return ASK_EVALUATION_OUTCOMES.map((outcome) => ({
    outcome,
    count: counts[outcome],
    rate: total === 0 ? 0 : Math.round((counts[outcome] / total) * 1000) / 1000,
  }));
}

function tally(rows: readonly AskEvalRow[]): Record<AskEvaluationOutcome, number> {
  const counts = emptyOutcomes();
  for (const row of rows) {
    if ((ASK_EVALUATION_OUTCOMES as readonly string[]).includes(row.outcome)) {
      counts[row.outcome as AskEvaluationOutcome] += 1;
    }
  }
  return counts;
}

/** Aggregate outcome rates by prompt version. Ignores unknown outcome labels. */
export function summariseAskEvaluations(rows: readonly AskEvalRow[]): AskQualitySummary {
  const byVersion = new Map<string, AskEvalRow[]>();
  let redactedCount = 0;
  for (const row of rows) {
    if (row.questionRedacted) redactedCount += 1;
    const key = row.promptVersion?.trim() || "unknown";
    const list = byVersion.get(key) ?? [];
    list.push(row);
    byVersion.set(key, list);
  }

  const byPromptVersion: PromptVersionSummary[] = [...byVersion.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([promptVersion, list]) => ({
      promptVersion,
      total: list.length,
      redactedCount: list.filter((r) => r.questionRedacted).length,
      outcomes: toRates(tally(list), list.length),
    }));

  return {
    total: rows.length,
    redactedCount,
    byPromptVersion,
    overall: toRates(tally(rows), rows.length),
    note:
      "Rates are gate outcomes only (allowed / abstained / citation_rejected / conflict / context_mismatch). Fail closed: abstained and citation_rejected are expected honesty, not product bugs. Personal-health questions are stored as redacted flags — never as full question text. Educational beta — not CDS; not fully evidence-grounded AI. Expand gold-set with graph-true ids only (`bun run ask:quality`); SME sign-off stays human.",
  };
}

/** Honest empty dashboard when the table is missing or empty. */
export function emptyAskQualitySummary(): AskQualitySummary {
  return summariseAskEvaluations([]);
}

import { getDb } from "@/lib/db.server";
import { aiEvaluationRuns } from "@/lib/db/schema.server";
import { askEvaluationFromGate, type AskEvaluationRecord } from "@/lib/askEvaluation";

/** Insert a gate outcome. The record has no question text and no secret. */
export async function recordAskEvaluation(record: AskEvaluationRecord): Promise<void> {
  const db = getDb();
  await db.insert(aiEvaluationRuns).values({
    outcome: record.outcome,
    reasonCode: record.reasonCode,
    questionRedacted: record.questionRedacted,
  });
}

/** Best-effort log. A failure must not change the Ask response. */
export async function logAskGate(input: Parameters<typeof askEvaluationFromGate>[0]): Promise<void> {
  try {
    await recordAskEvaluation(askEvaluationFromGate(input));
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "42P01" || code === "42703") return;
    console.error("ask_evaluation_log_failed", code ?? "error");
  }
}

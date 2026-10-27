import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db.server";
import { aiEvaluationRuns } from "@/lib/db/schema.server";
import { askEvaluationFromGate, type AskEvaluationRecord } from "@/lib/askEvaluation";
import {
  emptyAskQualitySummary,
  summariseAskEvaluations,
  type AskEvalRow,
  type AskQualitySummary,
} from "@/lib/askQualityDashboard";

/** Insert a gate outcome. The record has no question text and no secret. */
export async function recordAskEvaluation(record: AskEvaluationRecord): Promise<void> {
  const db = getDb();
  await db.insert(aiEvaluationRuns).values({
    outcome: record.outcome,
    reasonCode: record.reasonCode,
    questionRedacted: record.questionRedacted,
    promptVersion: record.promptVersion,
  });
}

/** Best-effort log. A failure must not change the Ask response. */
export async function logAskGate(input: Parameters<typeof askEvaluationFromGate>[0]): Promise<void> {
  try {
    await recordAskEvaluation(askEvaluationFromGate(input));
  } catch (err) {
    const code = (err as { code?: string })?.code;
    // Missing table/column (migration not applied) — soft-fail.
    if (code === "42P01" || code === "42703") return;
    console.error("ask_evaluation_log_failed", code ?? "error");
  }
}

const DASHBOARD_ROW_LIMIT = 2000;

/** Load redacted gate rows for the quality dashboard (no question text). */
export async function loadAskEvaluationRows(limit = DASHBOARD_ROW_LIMIT): Promise<AskEvalRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      outcome: aiEvaluationRuns.outcome,
      reasonCode: aiEvaluationRuns.reasonCode,
      questionRedacted: aiEvaluationRuns.questionRedacted,
      promptVersion: aiEvaluationRuns.promptVersion,
      createdAt: aiEvaluationRuns.createdAt,
    })
    .from(aiEvaluationRuns)
    .orderBy(desc(aiEvaluationRuns.createdAt))
    .limit(Math.min(Math.max(limit, 1), DASHBOARD_ROW_LIMIT));

  return rows.map((r) => ({
    outcome: r.outcome,
    reasonCode: r.reasonCode,
    questionRedacted: r.questionRedacted,
    promptVersion: r.promptVersion || "unknown",
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : null,
  }));
}

/** Aggregate for Methods / Trust dashboard. Soft-fails to empty summary. */
export async function loadAskQualitySummary(): Promise<AskQualitySummary & { available: boolean }> {
  try {
    const rows = await loadAskEvaluationRows();
    return { ...summariseAskEvaluations(rows), available: true };
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "42P01" || code === "42703") {
      return { ...emptyAskQualitySummary(), available: false };
    }
    console.error("ask_quality_summary_failed", code ?? "error");
    return { ...emptyAskQualitySummary(), available: false };
  }
}

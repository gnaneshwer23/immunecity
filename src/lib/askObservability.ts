/**
 * Structured Ask / prepare observability (architecture Layer E/F).
 * Only real timings and known fields — never invent cost or latency percentiles.
 */

export type AskObsStage =
  | "prepare"
  | "evidence_load"
  | "counter_load"
  | "provisional_lit"
  | "counter_harvest"
  | "model"
  | "citation_validation"
  | "total";

export interface AskStageTiming {
  stage: AskObsStage;
  /** Wall-clock ms for this stage when measured. */
  durationMs: number;
}

export interface AskObservability {
  /** Correlation id for this prepare/ask attempt (not a secret). */
  runId: string;
  startedAt: string;
  /** Sum of measured stages when total not set separately. */
  timings: AskStageTiming[];
  /** Total wall ms when the handler finished measuring. */
  totalMs: number | null;
  queryClass: string | null;
  reviewedEvidenceCount: number | null;
  counterEvidenceCount: number | null;
  provisionalLiteratureCount: number | null;
  counterHarvestCount: number | null;
  citationValidationOk: boolean | null;
  /**
   * Provider cost in USD when the gateway returns it; otherwise null.
   * Never fabricate a cost estimate.
   */
  costUsd: number | null;
  /** Model id when a model was invoked; null for abstentions. */
  modelId: string | null;
  /** Rate-limit backend used for this request when known. */
  rateLimitBackend: "neon" | "memory" | null;
  /** Redacted error code only (no PII / question text). */
  errorCode: string | null;
}

export function createAskObservability(partial?: Partial<AskObservability>): AskObservability {
  return {
    runId: partial?.runId ?? `ask-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: partial?.startedAt ?? new Date().toISOString(),
    timings: partial?.timings ?? [],
    totalMs: partial?.totalMs ?? null,
    queryClass: partial?.queryClass ?? null,
    reviewedEvidenceCount: partial?.reviewedEvidenceCount ?? null,
    counterEvidenceCount: partial?.counterEvidenceCount ?? null,
    provisionalLiteratureCount: partial?.provisionalLiteratureCount ?? null,
    counterHarvestCount: partial?.counterHarvestCount ?? null,
    citationValidationOk: partial?.citationValidationOk ?? null,
    costUsd: partial?.costUsd ?? null,
    modelId: partial?.modelId ?? null,
    rateLimitBackend: partial?.rateLimitBackend ?? null,
    errorCode: partial?.errorCode ?? null,
  };
}

export function withTiming(
  obs: AskObservability,
  stage: AskObsStage,
  durationMs: number,
): AskObservability {
  const ms = Math.max(0, Math.round(durationMs));
  return {
    ...obs,
    timings: [...obs.timings.filter((t) => t.stage !== stage), { stage, durationMs: ms }],
  };
}

/** JSON-safe summary for response headers / prepare payload (no question text). */
export function askObservabilityPublic(obs: AskObservability): Record<string, unknown> {
  return {
    runId: obs.runId,
    startedAt: obs.startedAt,
    timings: obs.timings,
    totalMs: obs.totalMs,
    queryClass: obs.queryClass,
    reviewedEvidenceCount: obs.reviewedEvidenceCount,
    counterEvidenceCount: obs.counterEvidenceCount,
    provisionalLiteratureCount: obs.provisionalLiteratureCount,
    counterHarvestCount: obs.counterHarvestCount,
    citationValidationOk: obs.citationValidationOk,
    costUsd: obs.costUsd,
    modelId: obs.modelId,
    rateLimitBackend: obs.rateLimitBackend,
    errorCode: obs.errorCode,
  };
}

export function elapsedMs(since: number): number {
  return Math.max(0, Date.now() - since);
}

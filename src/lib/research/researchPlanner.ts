/**
 * Bounded research planner scaffold (architecture Layer E).
 * Typed plan steps + observable run trace — NOT a multi-agent swarm.
 * Incomplete stages are marked planned; nothing auto-writes the KG.
 */

export const RESEARCH_PLANNER_STATUS = "partial" as const;

export type PlannerRole =
  | "planner"
  | "retriever"
  | "assessor"
  | "mechanism"
  | "skeptic"
  | "synthesiser"
  | "validator";

export type PlanStepStatus = "pending" | "running" | "done" | "skipped" | "planned" | "failed";

export interface ResearchPlanStep {
  id: string;
  role: PlannerRole;
  title: string;
  status: PlanStepStatus;
  /** Cap hints — enforced loosely in scaffold; tighten when wired to tools. */
  caps: { maxToolCalls: number; maxTokens?: number };
  note?: string;
  /** Observable outputs for the workbench / Ask investigate mode. */
  outputs?: Record<string, unknown>;
}

export interface ResearchRunTrace {
  runId: string;
  question: string;
  mode: "ask_investigate" | "workbench";
  startedAt: string;
  completedAt: string | null;
  steps: ResearchPlanStep[];
  /** Honest capability — full multi-role tool loop is planned. */
  capability: typeof RESEARCH_PLANNER_STATUS;
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Default bounded skeleton for an investigate-mode question. */
export function createInvestigatePlan(question: string): ResearchRunTrace {
  const steps: ResearchPlanStep[] = [
    {
      id: "s1",
      role: "planner",
      title: "Decompose question into bounded subquestions",
      status: "done",
      caps: { maxToolCalls: 0 },
      outputs: { subquestions: [question.trim()].filter(Boolean) },
    },
    {
      id: "s2",
      role: "retriever",
      title: "Retrieve graph paths + Gate C / counterevidence / provisional lit",
      status: "planned",
      caps: { maxToolCalls: 3 },
      note: "Uses existing prepareAsk / graphContext — not a separate agent.",
    },
    {
      id: "s3",
      role: "assessor",
      title: "Classify evidence polarity and gaps",
      status: "planned",
      caps: { maxToolCalls: 1 },
      note: "Assessor cannot approve claims.",
    },
    {
      id: "s4",
      role: "mechanism",
      title: "Propose mechanism paths from retrieved edges only",
      status: "planned",
      caps: { maxToolCalls: 2 },
    },
    {
      id: "s5",
      role: "skeptic",
      title: "Surface counterevidence / alternatives",
      status: "planned",
      caps: { maxToolCalls: 2 },
      note: "show_counterevidence explanation action + COUNTER_EVIDENCE extract.",
    },
    {
      id: "s6",
      role: "synthesiser",
      title: "Draft cited educational answer",
      status: "planned",
      caps: { maxToolCalls: 1, maxTokens: 1200 },
    },
    {
      id: "s7",
      role: "validator",
      title: "Citation-to-claim validation (fail closed)",
      status: "planned",
      caps: { maxToolCalls: 0 },
      note: "validateAnswerCitations — passage-window + unaanchored-claim checks; full span ledger still partial.",
    },
  ];
  return {
    runId: uid("run"),
    question: question.trim(),
    mode: "ask_investigate",
    startedAt: new Date().toISOString(),
    completedAt: null,
    steps,
    capability: RESEARCH_PLANNER_STATUS,
  };
}

/** Mark a step status (immutable update). */
export function withStepStatus(
  trace: ResearchRunTrace,
  stepId: string,
  status: PlanStepStatus,
  outputs?: Record<string, unknown>,
): ResearchRunTrace {
  return {
    ...trace,
    steps: trace.steps.map((s) =>
      s.id === stepId ? { ...s, status, outputs: outputs ?? s.outputs } : s,
    ),
  };
}

/** Attach graph retrieval facts into the retriever step (scaffold wiring). */
export function attachRetrievalToTrace(
  trace: ResearchRunTrace,
  retrieval: {
    nodeIds: string[];
    relIds: string[];
    reviewedEvidenceCount: number;
    counterEvidenceCount: number;
    queryClass: string;
  },
): ResearchRunTrace {
  let next = withStepStatus(trace, "s2", "done", { ...retrieval });
  next = withStepStatus(next, "s5", retrieval.counterEvidenceCount > 0 ? "done" : "done", {
    counterEvidenceCount: retrieval.counterEvidenceCount,
    emptyHonest: retrieval.counterEvidenceCount === 0,
  });
  return next;
}

export function summariseTrace(trace: ResearchRunTrace): string {
  const lines = [
    `RESEARCH_TRACE run=${trace.runId} mode=${trace.mode} capability=${trace.capability}`,
    `question: ${trace.question}`,
    ...trace.steps.map((s) => `STEP ${s.id} [${s.role}] ${s.status}: ${s.title}${s.note ? ` — ${s.note}` : ""}`),
  ];
  return lines.join("\n");
}

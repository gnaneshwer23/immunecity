/**
 * SME evaluation runner — reports honest denominators; never invents scores or pass rates.
 */
import {
  SME_GOLD_SET_POLICY,
  SME_GOLD_SET_SCAFFOLD,
  summariseSmeGoldSet,
  type SmeGoldCase,
  type SmeGoldHarnessReport,
} from "@/lib/sme/goldSet";
import {
  buildSmeMelanomaWorkQueue,
  buildSmePriorityQueues,
  summariseSmeWorkQueue,
  type SmeWorkItem,
} from "@/lib/sme/workQueue";

export type SmeEvalDenominator = {
  name: string;
  numerator: number;
  denominator: number;
  /** Honest display e.g. "0/15" — never coerces empty to 100%. */
  display: string;
  /** True when numerator would be misleading without SME fill. */
  pendingHuman: boolean;
};

export type SmeEvalReport = {
  ranAt: string;
  policy: typeof SME_GOLD_SET_POLICY;
  gold: SmeGoldHarnessReport;
  workQueue: ReturnType<typeof summariseSmeWorkQueue>;
  denominators: SmeEvalDenominator[];
  /** Always false until a named SME signs docs/SME_GOLD_SET_SIGNOFF.md. */
  gateCBulkApproved: false;
  keynoteAutoRematched: false;
  trialIntelligenceEnabled: false;
  note: string;
};

function denom(name: string, numerator: number, denominator: number, pendingHuman: boolean): SmeEvalDenominator {
  return {
    name,
    numerator,
    denominator,
    display: `${numerator}/${denominator}`,
    pendingHuman,
  };
}

/**
 * Run the SME eval harness over in-memory scaffolds (and optional Neon-merged cases).
 * Does not write the KG, invent PMIDs, or flip Gate C.
 */
export function runSmeEvalHarness(opts?: {
  goldCases?: readonly SmeGoldCase[];
  workItems?: readonly SmeWorkItem[];
  now?: Date;
}): SmeEvalReport {
  const goldCases = opts?.goldCases ?? SME_GOLD_SET_SCAFFOLD;
  const workItems = opts?.workItems ?? buildSmeMelanomaWorkQueue();
  const gold = summariseSmeGoldSet(goldCases);
  const workQueue = summariseSmeWorkQueue(workItems);
  const priority = buildSmePriorityQueues(
    // priority derived from matrix via work items when custom list is melanoma-shaped
  );

  const denominators: SmeEvalDenominator[] = [
    denom("gold_labelled", gold.withLabel, gold.caseCount, gold.withLabel === 0),
    denom("gold_scored", gold.withSmeScore, gold.caseCount, gold.withSmeScore === 0),
    denom("work_resolved", workQueue.resolvedBySme, workQueue.total, workQueue.resolvedBySme === 0),
    denom(
      "priority_keynote_r011_resolved",
      priority.filter((i) => i.status === "resolved_by_sme").length,
      priority.length,
      true,
    ),
  ];

  return {
    ranAt: (opts?.now ?? new Date()).toISOString(),
    policy: SME_GOLD_SET_POLICY,
    gold,
    workQueue,
    denominators,
    gateCBulkApproved: false,
    keynoteAutoRematched: false,
    trialIntelligenceEnabled: false,
    note: "Denominators are honest. Zero labelled/scored means awaiting SME — not a 100% pass. Educational beta — not CDS.",
  };
}

/** Assert harness honesty for unit tests / CI (structure only). */
export function assertSmeEvalHonesty(report: SmeEvalReport): { ok: true } | { ok: false; reason: string } {
  if (report.gateCBulkApproved) return { ok: false, reason: "gateCBulkApproved must stay false" };
  if (report.keynoteAutoRematched) return { ok: false, reason: "keynoteAutoRematched must stay false" };
  if (report.trialIntelligenceEnabled) return { ok: false, reason: "TI must stay off" };
  if (report.policy.inventsSmeScores) return { ok: false, reason: "policy invents scores" };
  if (report.gold.withSmeScore > 0 && report.gold.labelledBySme === 0) {
    return { ok: false, reason: "scores without labelled_by_sme status" };
  }
  for (const d of report.denominators) {
    if (d.numerator > d.denominator) return { ok: false, reason: `${d.name} numerator exceeds denominator` };
    if (d.display !== `${d.numerator}/${d.denominator}`) {
      return { ok: false, reason: `${d.name} display dishonest` };
    }
  }
  return { ok: true };
}

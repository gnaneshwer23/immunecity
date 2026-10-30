/**
 * SME gold-set harness — expert-labelled examples with null scores until SME fills.
 * Engineering never invents labels, scores, or performance metrics.
 */
import { DISCOVERY_GOLD_SET_SCAFFOLD, type DiscoveryGoldCase } from "@/lib/discovery/eval/goldSet";
import { SME_PRIORITY_QUEUE_IDS } from "@/lib/sme/workQueue";

/** Closed set of expert labels SMEs may assign. */
export const SME_GOLD_LABELS = [
  "genuine_gap",
  "false_novelty",
  "contradiction_with_context",
  "coverage_insufficient",
  "spo_mismatch",
  "wrong_citation",
  "acceptable_associative",
  "needs_rewrite",
  /** Discovery 3.0 eval slots — fill only with real SME decisions, never fabricate. */
  "genuine",
  "false",
  "resolved",
  "contradiction",
  "incomplete_retrieval",
] as const;

export type SmeGoldLabel = (typeof SME_GOLD_LABELS)[number];

export type SmeGoldCaseStatus = "pending_sme" | "scaffolded" | "labelled_by_sme";

/**
 * A gold-set case anchors on a real work-item or Discovery gap.
 * label + smeScore stay null until SME review — never invent in code.
 */
export type SmeGoldCase = {
  id: string;
  workItemId: string | null;
  gapKey: string | null;
  pilot: "melanoma_a" | "coverage_b" | "ask_eval" | null;
  /** Null until SME — do not invent. */
  label: SmeGoldLabel | null;
  /** Null until SME — do not invent numeric scores. */
  smeScore: null | number;
  status: SmeGoldCaseStatus;
  notes: string;
};

export const SME_GOLD_SET_POLICY = {
  inventsLabels: false as const,
  inventsSmeScores: false as const,
  inventsPerformanceMetrics: false as const,
  autoApprovesGateC: false as const,
  silentKeynoteRematch: false as const,
  note: "Gold-set slots await human scientific review. Automated tests assert structure and denominators only — never fabricated SME scores or novelty claims.",
} as const;

/** Scaffold cases: KEYNOTE / R011 + Discovery placeholders. Scores stay null. */
export const SME_GOLD_SET_SCAFFOLD: readonly SmeGoldCase[] = [
  {
    id: "SGOLD-KEYNOTE-01",
    workItemId: SME_PRIORITY_QUEUE_IDS[0],
    gapKey: null,
    pilot: "melanoma_a",
    label: null,
    smeScore: null,
    status: "pending_sme",
    notes: "KEYNOTE-006 rematch of PMID 25891173 onto REL-I008-demonstrates_in-TR003 — human only.",
  },
  {
    id: "SGOLD-R011-01",
    workItemId: SME_PRIORITY_QUEUE_IDS[1],
    gapKey: null,
    pilot: "melanoma_a",
    label: null,
    smeScore: null,
    status: "pending_sme",
    notes: "R011 drives_immune_exhaustion_in D012 S-P-O rewrite or claim_support demotion — human only.",
  },
  {
    id: "SGOLD-MELANOMA-GAP-01",
    workItemId: null,
    gapKey: null,
    pilot: "melanoma_a",
    label: null,
    smeScore: null,
    status: "pending_sme",
    notes: "Bind to a real melanoma matrix / Discovery gap_key after SME triage.",
  },
  {
    id: "SGOLD-FALSE-NOVELTY-01",
    workItemId: null,
    gapKey: null,
    pilot: "coverage_b",
    label: null,
    smeScore: null,
    status: "scaffolded",
    notes: "False-novelty placeholder — expected label stays null until SME.",
  },
  {
    id: "SGOLD-CONTRADICTION-01",
    workItemId: null,
    gapKey: null,
    pilot: null,
    label: null,
    smeScore: null,
    status: "scaffolded",
    notes: "Contradiction-with-context placeholder — no SME score invented.",
  },
  {
    id: "SGOLD-INCOMPLETE-RETRIEVAL-01",
    workItemId: null,
    gapKey: null,
    pilot: "coverage_b",
    label: null,
    smeScore: null,
    status: "scaffolded",
    notes: "Eval slot: incomplete_retrieval — bind after bounded pilot shows fail_closed/null hits. No fabricated label.",
  },
  {
    id: "SGOLD-RESOLVED-01",
    workItemId: null,
    gapKey: null,
    pilot: "melanoma_a",
    label: null,
    smeScore: null,
    status: "scaffolded",
    notes: "Eval slot: resolved — only after human SME marks a real candidate resolved.",
  },
  {
    id: "SGOLD-GENUINE-01",
    workItemId: null,
    gapKey: null,
    pilot: "melanoma_a",
    label: null,
    smeScore: null,
    status: "scaffolded",
    notes: "Eval slot: genuine — fill only with real SME-confirmed gap within documented scope.",
  },
  {
    id: "SGOLD-FALSE-01",
    workItemId: null,
    gapKey: null,
    pilot: "coverage_b",
    label: null,
    smeScore: null,
    status: "scaffolded",
    notes: "Eval slot: false — fill only when SME rejects a candidate as not a gap in scope.",
  },
];

/** Merge Discovery gold scaffold ids for a combined inventory view (still unscored). */
export function mergeDiscoveryGoldAsSmeView(
  discovery: readonly DiscoveryGoldCase[] = DISCOVERY_GOLD_SET_SCAFFOLD,
): SmeGoldCase[] {
  return discovery.map((d) => ({
    id: `SGOLD-FROM-${d.id}`,
    workItemId: null,
    gapKey: d.gapKey,
    pilot: d.pilot === "melanoma_a" || d.pilot === "coverage_b" ? d.pilot : null,
    label: null,
    smeScore: null,
    status: d.status === "reviewed_by_sme" ? "labelled_by_sme" : d.status === "scaffolded" ? "scaffolded" : "pending_sme",
    notes: d.notes,
  }));
}

export type SmeGoldHarnessReport = {
  policy: typeof SME_GOLD_SET_POLICY;
  caseCount: number;
  /** Denominator: cases awaiting SME. */
  pendingSme: number;
  /** Numerator only when SME filled — honest zero until then. */
  labelledBySme: number;
  withLabel: number;
  withSmeScore: number;
  /** Honest fraction string; null when denominator is zero. */
  labelledRate: string | null;
  note: string;
};

export function summariseSmeGoldSet(
  cases: readonly SmeGoldCase[] = SME_GOLD_SET_SCAFFOLD,
): SmeGoldHarnessReport {
  const caseCount = cases.length;
  const pendingSme = cases.filter((c) => c.status === "pending_sme").length;
  const labelledBySme = cases.filter((c) => c.status === "labelled_by_sme").length;
  const withLabel = cases.filter((c) => c.label !== null).length;
  const withSmeScore = cases.filter((c) => c.smeScore !== null).length;
  return {
    policy: SME_GOLD_SET_POLICY,
    caseCount,
    pendingSme,
    labelledBySme,
    withLabel,
    withSmeScore,
    labelledRate: caseCount === 0 ? null : `${withLabel}/${caseCount}`,
    note: SME_GOLD_SET_POLICY.note,
  };
}

/** Apply an SME label in memory — used by tests and Neon-backed store after load. Never invents. */
export function applySmeGoldLabel(
  cases: readonly SmeGoldCase[],
  caseId: string,
  patch: { label: SmeGoldLabel; smeScore?: number | null; notes?: string },
): SmeGoldCase[] {
  return cases.map((c) => {
    if (c.id !== caseId) return { ...c };
    return {
      ...c,
      label: patch.label,
      smeScore: patch.smeScore === undefined ? c.smeScore : patch.smeScore,
      notes: patch.notes ?? c.notes,
      status: "labelled_by_sme",
    };
  });
}

export function isValidSmeGoldLabel(v: string): v is SmeGoldLabel {
  return (SME_GOLD_LABELS as readonly string[]).includes(v);
}

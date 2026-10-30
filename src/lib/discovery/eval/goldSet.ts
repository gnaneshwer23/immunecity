/**
 * Discovery scientific benchmark harness scaffolding (Phase 8).
 * Structure only — no invented performance metrics or SME scores.
 * SME reviewers fill expectedStatus / notes later; engineering never fabricates them.
 */
import type { AutoEmitGapStatus, DetectionSource } from "@/lib/discovery/types";

export const DISCOVERY_GOLD_SET_POLICY = {
  inventsPerformanceMetrics: false as const,
  inventsSmeScores: false as const,
  claimsNovelty: false as const,
  autoPromotesReviewedGap: false as const,
  note: "Empty / pending gold-set slots await human scientific review. Automated tests may assert structure and provenance only — never fabricated SME scores.",
} as const;

export type DiscoveryGoldCaseStatus = "pending_sme" | "scaffolded" | "reviewed_by_sme";

/**
 * A gold-set case anchors on a real detectable gap_key from ISI signals.
 * expectedStatus stays null until an SME records it — never invent one in code.
 */
export type DiscoveryGoldCase = {
  id: string;
  gapKey: string | null;
  pilot: "melanoma_a" | "coverage_b" | null;
  detectionSource: DetectionSource | null;
  /** Null until SME review — do not invent. */
  expectedStatus: AutoEmitGapStatus | "reviewed_gap" | null;
  /** Null until SME review — do not invent numeric scores. */
  smeScore: null;
  status: DiscoveryGoldCaseStatus;
  notes: string;
};

/** Scaffold cases: IDs + policy only. gapKey may be bound later from detectDiscoveryCandidates. */
export const DISCOVERY_GOLD_SET_SCAFFOLD: readonly DiscoveryGoldCase[] = [
  {
    id: "DGOLD-MELANOMA-01",
    gapKey: null,
    pilot: "melanoma_a",
    detectionSource: "melanoma_matrix",
    expectedStatus: null,
    smeScore: null,
    status: "pending_sme",
    notes: "Pilot A placeholder — bind to a real melanoma matrix gap_key after SME triage.",
  },
  {
    id: "DGOLD-COVERAGE-01",
    gapKey: null,
    pilot: "coverage_b",
    detectionSource: "evidence_gap",
    expectedStatus: null,
    smeScore: null,
    status: "pending_sme",
    notes: "Pilot B placeholder — bind to a real evidence-gap candidate after SME triage.",
  },
  {
    id: "DGOLD-CONFLICT-01",
    gapKey: null,
    pilot: null,
    detectionSource: "conflict",
    expectedStatus: null,
    smeScore: null,
    status: "scaffolded",
    notes: "Conflict-signal placeholder — no SME score invented.",
  },
];

export type DiscoveryGoldHarnessReport = {
  policy: typeof DISCOVERY_GOLD_SET_POLICY;
  caseCount: number;
  pendingSme: number;
  withExpectedStatus: number;
  withSmeScore: number;
  note: string;
};

export function summariseDiscoveryGoldSet(
  cases: readonly DiscoveryGoldCase[] = DISCOVERY_GOLD_SET_SCAFFOLD,
): DiscoveryGoldHarnessReport {
  return {
    policy: DISCOVERY_GOLD_SET_POLICY,
    caseCount: cases.length,
    pendingSme: cases.filter((c) => c.status === "pending_sme").length,
    withExpectedStatus: cases.filter((c) => c.expectedStatus !== null).length,
    withSmeScore: cases.filter((c) => c.smeScore !== null).length,
    note: DISCOVERY_GOLD_SET_POLICY.note,
  };
}

/** Bind scaffold slots to real detected keys without inventing statuses or scores. */
export function bindGoldCasesToDetectedKeys(
  cases: readonly DiscoveryGoldCase[],
  detected: readonly { gapKey: string; pilot: string | null; detectionSource: string }[],
): DiscoveryGoldCase[] {
  return cases.map((c) => {
    if (c.gapKey) return { ...c };
    const match = detected.find(
      (d) =>
        (c.pilot == null || d.pilot === c.pilot) &&
        (c.detectionSource == null || d.detectionSource === c.detectionSource),
    );
    if (!match) return { ...c };
    return {
      ...c,
      gapKey: match.gapKey,
      // Still pending SME — binding a key is not a score.
      status: c.status === "scaffolded" ? "scaffolded" : "pending_sme",
      expectedStatus: null,
      smeScore: null,
    };
  });
}

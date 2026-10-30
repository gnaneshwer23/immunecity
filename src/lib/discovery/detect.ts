/**
 * Deterministic Research Gap detection (Pilots A/B).
 * Emits candidates from real ISI signals only — never fabricates papers/PMIDs,
 * never auto-emits reviewed_gap.
 */
import {
  ISI_MELANOMA_PILOT_VALIDATION_MATRIX,
  type MelanomaPilotMatrixRow,
} from "@/data/melanomaPilotValidationMatrix";
import { byId } from "@/lib/immune/engine";
import {
  classifyEvidenceGap,
  type EvidenceGapLabel,
  type EvidenceGapSignals,
} from "@/lib/research/evidenceGap";
import { assertDetectionEmitStatus, statusFromCoverageLabel } from "@/lib/discovery/gapStatus";
import {
  DEFAULT_ISI_SEARCH_SCOPE,
  type ResearchGapCandidate,
  type SearchScope,
} from "@/lib/discovery/types";

const MATRIX_EMIT_FLAGS = new Set([
  "S_P_O_MISMATCH",
  "DRAFT_ESTABLISHED",
  "NO_LOCATOR",
  "GATE_C_PROXY",
  "REJECTED_PMID",
  "TO_BE_CURATED",
]);

const MATRIX_EMIT_VERDICTS = new Set(["DEFECT", "Unverified risk", "Incomplete", "Partial"]);

export const DETECTION_POLICY = {
  autoReviewedGap: false as const,
  fabricatesPapers: false as const,
  expandsKnowledgeGraph: false as const,
  pilots: ["melanoma_a", "coverage_b"] as const,
};

function matrixShouldEmit(row: MelanomaPilotMatrixRow): boolean {
  if (row.reviewed) return false; // matrix rows are always reviewed:false; belt-and-braces
  if (MATRIX_EMIT_VERDICTS.has(row.verdict)) return true;
  return row.flags.some((f) => MATRIX_EMIT_FLAGS.has(f));
}

function matrixGapKey(relId: string): string {
  return `GAP-MATRIX-${relId}`;
}

/**
 * Pilot A — melanoma validation matrix → candidates.
 * Documented search scope only; status never reviewed_gap.
 */
export function detectMelanomaMatrixCandidates(
  scope: SearchScope = DEFAULT_ISI_SEARCH_SCOPE,
): ResearchGapCandidate[] {
  const out: ResearchGapCandidate[] = [];
  for (const row of ISI_MELANOMA_PILOT_VALIDATION_MATRIX) {
    if (!matrixShouldEmit(row)) continue;
    const gateCUnavailable = /0 rows|unreviewed|proxy/i.test(row.neonNote);
    const status = gateCUnavailable && row.flags.includes("GATE_C_PROXY")
      ? "coverage_insufficient"
      : "candidate";
    const guarded = assertDetectionEmitStatus(status);
    if (!guarded.ok) continue;

    const subjectName = byId[row.subjectId]?.name ?? row.subjectId;
    const objectName = byId[row.objectId]?.name ?? row.objectId;
    out.push({
      gapKey: matrixGapKey(row.relId),
      title: `Uncertainty on ${row.spoLabel}`,
      summary: [
        `ISI melanoma pilot matrix flags this relationship as ${row.verdict}`,
        `(flags: ${row.flags.join(", ")}).`,
        row.curatorAction,
        "This is an ISI coverage / curation uncertainty — not a claim that literature is absent worldwide.",
      ].join(" "),
      status: guarded.status,
      pilot: "melanoma_a",
      subjectId: row.subjectId,
      objectId: row.objectId,
      relationshipId: row.relId,
      diseaseId: row.objectId === "D012" || row.subjectId === "D012" ? "D012" : null,
      whyItMatters: [
        `Clarifying evidence for ${subjectName} → ${row.predicate} → ${objectName}`,
        "matters for the metastatic melanoma investigation path and Gate C honesty.",
      ].join(" "),
      searchScope: {
        ...scope,
        note: `${scope.note} Source row n=${row.n}; neonNote=${row.neonNote}; locators=${row.locatorsNote}.`,
      },
      detectionSource: "melanoma_matrix",
      detectionDetail: {
        matrixN: row.n,
        verdict: row.verdict,
        flags: [...row.flags],
        graphStatus: row.graphStatus,
        reviewed: false,
      },
      coverageLabel: guarded.status === "coverage_insufficient" ? "insufficient_coverage" : null,
      autoReviewed: false,
    });
  }
  return out;
}

/**
 * Pilot B — evidence-gap classifications for known concept ids.
 * Pass real signals only; omit counts rather than invent zeros.
 */
export function detectEvidenceGapCandidates(
  conceptIds: readonly string[],
  signalsById: Record<string, EvidenceGapSignals> = {},
  scope: SearchScope = DEFAULT_ISI_SEARCH_SCOPE,
): ResearchGapCandidate[] {
  const out: ResearchGapCandidate[] = [];
  const seen = new Set<string>();
  for (const raw of conceptIds) {
    const conceptId = typeof raw === "string" ? raw.trim() : "";
    if (!conceptId || seen.has(conceptId) || !byId[conceptId]) continue;
    seen.add(conceptId);
    const label: EvidenceGapLabel | null = classifyEvidenceGap(
      conceptId,
      signalsById[conceptId] ?? {},
    );
    if (!label) continue;
    const status = statusFromCoverageLabel(label);
    const guarded = assertDetectionEmitStatus(status);
    if (!guarded.ok) continue;
    const node = byId[conceptId]!;
    out.push({
      gapKey: `GAP-EVGAP-${conceptId}-${label}`,
      title: `Evidence gap: ${node.name} (${label})`,
      summary: [
        `classifyEvidenceGap labelled ${conceptId} as ${label} within ISI curated coverage.`,
        "Not a worldwide literature-absence claim.",
      ].join(" "),
      status: guarded.status,
      pilot: "coverage_b",
      subjectId: conceptId,
      objectId: null,
      relationshipId: null,
      diseaseId: conceptId.startsWith("D") ? conceptId : null,
      whyItMatters: `Understanding mapped-evidence status for ${node.name} guides defensible next curation or search questions inside ISI scope.`,
      searchScope: scope,
      detectionSource: label === "conflicting" ? "conflict" : "evidence_gap",
      detectionDetail: {
        coverageLabel: label,
        signals: signalsById[conceptId] ?? {},
      },
      coverageLabel: label,
      autoReviewed: false,
    });
  }
  return out;
}

/** Melanoma path seed concepts for Pilot B scaffolding (existing graph ids only). */
export const PILOT_B_SEED_CONCEPTS = [
  "D012",
  "R011",
  "R012",
  "I008",
  "I009",
  "I025",
  "TR003",
  "TR020",
  "B011",
] as const;

/**
 * Combined detection for Radar scaffolding.
 * Zero fabricated gaps — matrix + evidence-gap only.
 */
export function detectDiscoveryCandidates(opts?: {
  conceptIds?: readonly string[];
  signalsById?: Record<string, EvidenceGapSignals>;
  includeMatrix?: boolean;
}): ResearchGapCandidate[] {
  const includeMatrix = opts?.includeMatrix !== false;
  const matrix = includeMatrix ? detectMelanomaMatrixCandidates() : [];
  const concepts = opts?.conceptIds ?? PILOT_B_SEED_CONCEPTS;
  const gaps = detectEvidenceGapCandidates(concepts, opts?.signalsById ?? {});
  const byKey = new Map<string, ResearchGapCandidate>();
  for (const c of [...matrix, ...gaps]) {
    if (c.autoReviewed) continue; // impossible by type; belt-and-braces
    if (c.status === ("reviewed_gap" as string)) continue;
    byKey.set(c.gapKey, c);
  }
  return [...byKey.values()];
}

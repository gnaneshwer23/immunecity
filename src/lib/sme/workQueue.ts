/**
 * SME review work queue — melanoma pilot + Discovery gap candidates needing human review.
 * Status stays pending_sme until a scientific reviewer decides. Never auto-approves Gate C.
 */
import {
  ISI_MELANOMA_PILOT_VALIDATION_MATRIX,
  type MelanomaMatrixFlag,
  type MelanomaPilotMatrixRow,
} from "@/data/melanomaPilotValidationMatrix";
import type { ResearchGapClass } from "@/lib/discovery/gapClass";
import type { ResearchGapCandidate } from "@/lib/discovery/types";
import { byId } from "@/lib/immune/engine";

export type SmeWorkItemKind =
  | "melanoma_matrix"
  | "keynote_rematch"
  | "r011_spo_rewrite"
  | "discovery_gap";

export type SmeWorkItemStatus = "pending_sme" | "changes_requested" | "resolved_by_sme";

export type SmeHonestyStatus =
  | "defect"
  | "unverified_risk"
  | "incomplete"
  | "partial"
  | "coverage_insufficient"
  | "candidate";

export type SmeClaimType =
  | "literature_candidate"
  | "extracted_claim"
  | "reviewed_claim"
  | "matrix_flag"
  | "discovery_gap";

export interface SmeWorkItem {
  id: string;
  kind: SmeWorkItemKind;
  status: SmeWorkItemStatus;
  /** Subject–predicate–object display. */
  spo: string;
  relId: string | null;
  subjectId: string | null;
  predicate: string | null;
  objectId: string | null;
  honesty: SmeHonestyStatus;
  claimType: SmeClaimType;
  flags: MelanomaMatrixFlag[] | string[];
  rejectedPmidNotes: string | null;
  searchCoverageNote: string;
  curatorAction: string;
  /** Suggested fixture PMID for human rematch only — never applied automatically. */
  suggestedPmid: string | null;
  suggestedDoi: string | null;
  gapKey?: string | null;
  gapClass?: ResearchGapClass | null;
  dossierHref?: string | null;
  requiresHumanReview: true;
  autoApprove: false;
  autoRematch: false;
}

/** Explicit KEYNOTE / R011 queues from the melanoma validation matrix — no silent fix. */
export const SME_PRIORITY_QUEUE_IDS = [
  "SME-KEYNOTE-I008-TR003",
  "SME-R011-EXHAUSTION-D012",
] as const;

function honestyFromVerdict(v: MelanomaPilotMatrixRow["verdict"]): SmeHonestyStatus {
  if (v === "DEFECT") return "defect";
  if (v === "Unverified risk") return "unverified_risk";
  if (v === "Incomplete") return "incomplete";
  return "partial";
}

function matrixToWorkItem(row: MelanomaPilotMatrixRow): SmeWorkItem {
  const subjectName = byId[row.subjectId]?.name ?? row.subjectId;
  const objectName = byId[row.objectId]?.name ?? row.objectId;
  const isKeynote =
    row.relId === "REL-I008-demonstrates_in-TR003" ||
    (row.flags.includes("REJECTED_PMID") && row.relId.includes("TR003"));
  const isR011 = row.relId === "REL-R011-drives_immune_exhaustion_in-D012";

  let kind: SmeWorkItemKind = "melanoma_matrix";
  let id = `SME-MEL-${String(row.n).padStart(2, "0")}`;
  let suggestedPmid: string | null = null;
  let suggestedDoi: string | null = null;

  if (isKeynote) {
    kind = "keynote_rematch";
    id = "SME-KEYNOTE-I008-TR003";
    suggestedPmid = "25891173";
    suggestedDoi = "10.1056/NEJMoa1503093";
  } else if (isR011) {
    kind = "r011_spo_rewrite";
    id = "SME-R011-EXHAUSTION-D012";
  } else if (row.relId.includes("TR003") && row.n === 5) {
    suggestedPmid = "25891173";
    suggestedDoi = "10.1056/NEJMoa1503093";
  } else if (row.relId.includes("TR020") && row.n === 6) {
    suggestedPmid = "26027431";
    suggestedDoi = "10.1056/NEJMoa1504030";
  }

  const rejectedPmidNotes = row.flags.includes("REJECTED_PMID")
    ? row.neonNote
    : row.neonNote.toLowerCase().includes("reject")
      ? row.neonNote
      : null;

  return {
    id,
    kind,
    status: "pending_sme",
    spo: `${subjectName} → ${row.predicate} → ${objectName}`,
    relId: row.relId,
    subjectId: row.subjectId,
    predicate: row.predicate,
    objectId: row.objectId,
    honesty: honestyFromVerdict(row.verdict),
    claimType: "literature_candidate",
    flags: [...row.flags],
    rejectedPmidNotes,
    searchCoverageNote: `${row.locatorsNote} · ${row.neonNote}`,
    curatorAction: row.curatorAction,
    suggestedPmid,
    suggestedDoi,
    requiresHumanReview: true,
    autoApprove: false,
    autoRematch: false,
  };
}

/**
 * Build the full SME work queue from the melanoma matrix.
 * All items start pending_sme — engineering never marks resolved.
 */
export function buildSmeMelanomaWorkQueue(
  rows: readonly MelanomaPilotMatrixRow[] = ISI_MELANOMA_PILOT_VALIDATION_MATRIX,
): SmeWorkItem[] {
  return rows.map(matrixToWorkItem);
}

/** Priority KEYNOTE + R011 work items only. */
export function buildSmePriorityQueues(
  rows: readonly MelanomaPilotMatrixRow[] = ISI_MELANOMA_PILOT_VALIDATION_MATRIX,
): SmeWorkItem[] {
  const all = buildSmeMelanomaWorkQueue(rows);
  return all.filter((i) => (SME_PRIORITY_QUEUE_IDS as readonly string[]).includes(i.id));
}

/** Flagged melanoma / Discovery-gap style candidates needing human review. */
export function listFlaggedSmeCandidates(opts?: {
  flags?: MelanomaMatrixFlag[];
  honesty?: SmeHonestyStatus[];
}): SmeWorkItem[] {
  let items = buildSmeMelanomaWorkQueue();
  if (opts?.flags?.length) {
    const want = new Set(opts.flags);
    items = items.filter((i) => i.flags.some((f) => want.has(f as MelanomaMatrixFlag)));
  }
  if (opts?.honesty?.length) {
    const want = new Set(opts.honesty);
    items = items.filter((i) => want.has(i.honesty));
  }
  return items;
}

/** Priority for Discovery queue: opportunities first, then scientific gaps, then curation. */
export function discoveryGapSmePriority(gapClass: ResearchGapClass | string | null | undefined): number {
  if (gapClass === "research_opportunity") return 0;
  if (gapClass === "scientific_evidence_gap") return 1;
  if (gapClass === "isi_curation_gap") return 2;
  return 3;
}

/**
 * Map Discovery gap candidates into SME work items (all three classes).
 * Engineering never marks resolved — decisions stay pending_sme.
 * Gold-set expected labels stay null until a human fills them.
 */
export function discoveryGapsToSmeWorkItems(
  gaps: readonly ResearchGapCandidate[],
): SmeWorkItem[] {
  const items = gaps.map((g) => {
    const subjectName = g.subjectId ? byId[g.subjectId]?.name ?? g.subjectId : null;
    const objectName = g.objectId ? byId[g.objectId]?.name ?? g.objectId : null;
    const honesty: SmeHonestyStatus =
      g.status === "coverage_insufficient" ? "coverage_insufficient" : "candidate";
    return {
      id: `SME-DISC-${g.gapKey}`,
      kind: "discovery_gap" as const,
      status: "pending_sme" as const,
      spo:
        subjectName && objectName
          ? `${subjectName} → ? → ${objectName}`
          : subjectName ?? g.title,
      relId: g.relationshipId,
      subjectId: g.subjectId,
      predicate: null,
      objectId: g.objectId,
      honesty,
      claimType: "discovery_gap" as const,
      flags: [g.gapClass ?? "unclassified", g.detectionSource],
      rejectedPmidNotes: null,
      searchCoverageNote: g.searchScope.note,
      curatorAction:
        g.gapClass === "isi_curation_gap"
          ? "Route to curation / rematch — ISI internal gap, not worldwide absence."
          : g.gapClass === "scientific_evidence_gap"
            ? "Assess documented-scope evidence appraisals (support/contradict/background per question); do not invent studies; gold-set slots stay null until labelled."
            : "Opportunity requires human review before reviewed_opportunity. No auto-approve. Gold-set expected labels remain null until SME fills them.",
      suggestedPmid: null,
      suggestedDoi: null,
      gapKey: g.gapKey,
      gapClass: g.gapClass ?? null,
      dossierHref: `/discovery/gaps/${encodeURIComponent(g.gapKey)}`,
      requiresHumanReview: true as const,
      autoApprove: false as const,
      autoRematch: false as const,
    };
  });
  return items.sort(
    (a, b) => discoveryGapSmePriority(a.gapClass) - discoveryGapSmePriority(b.gapClass),
  );
}

/** Combined melanoma priority + Discovery gaps (opportunities prioritized) for SME workspace. */
export function buildSmeUnifiedWorkQueue(opts?: {
  discoveryGaps?: readonly ResearchGapCandidate[];
  includeMatrix?: boolean;
}): SmeWorkItem[] {
  const matrix = opts?.includeMatrix === false ? [] : buildSmeMelanomaWorkQueue();
  const disc = discoveryGapsToSmeWorkItems(opts?.discoveryGaps ?? []);
  const byIdMap = new Map<string, SmeWorkItem>();
  // Discovery opportunities / scientific gaps first, then KEYNOTE/R011, then matrix.
  for (const i of [...disc, ...buildSmePriorityQueues(), ...matrix]) {
    byIdMap.set(i.id, i);
  }
  const merged = [...byIdMap.values()];
  const discIds = new Set(disc.map((d) => d.id));
  return merged.sort((a, b) => {
    const aDisc = discIds.has(a.id);
    const bDisc = discIds.has(b.id);
    if (aDisc && bDisc) {
      return discoveryGapSmePriority(a.gapClass) - discoveryGapSmePriority(b.gapClass);
    }
    if (aDisc && !bDisc) return -1;
    if (!aDisc && bDisc) return 1;
    return 0;
  });
}

export function summariseSmeWorkQueue(items: readonly SmeWorkItem[] = buildSmeMelanomaWorkQueue()) {
  const byKind: Record<string, number> = {};
  const byHonesty: Record<string, number> = {};
  let pendingSme = 0;
  for (const i of items) {
    byKind[i.kind] = (byKind[i.kind] ?? 0) + 1;
    byHonesty[i.honesty] = (byHonesty[i.honesty] ?? 0) + 1;
    if (i.status === "pending_sme") pendingSme += 1;
  }
  return {
    total: items.length,
    pendingSme,
    resolvedBySme: items.filter((i) => i.status === "resolved_by_sme").length,
    byKind,
    byHonesty,
    priorityPending: buildSmePriorityQueues().filter((i) => i.status === "pending_sme").length,
    autoApprove: false as const,
    autoRematch: false as const,
    note: "All melanoma matrix rows remain pending_sme until a named scientific reviewer decides. KEYNOTE rematch and R011 S-P-O rewrite are explicit queues — no silent fix.",
  };
}

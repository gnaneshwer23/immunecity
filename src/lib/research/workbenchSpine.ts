/**
 * Research workbench E2E spine (architecture Layer G).
 * Question → Search → Screen → Extract → Assess → Hypothesis → Export
 * Maps onto existing workbench steps; unimplemented stages are marked clearly.
 * Provenance is recorded; no autonomous KG write-back.
 */

import type { WorkbenchSession, WorkbenchStep } from "./workbench";
import { listWorkbenchCounterevidence } from "./workbench";

export type SpineStageId =
  | "question"
  | "search"
  | "screen"
  | "extract"
  | "assess"
  | "hypothesis"
  | "export";

export type SpineImplStatus = "implemented" | "partial" | "planned";

export interface SpineStage {
  id: SpineStageId;
  title: string;
  status: SpineImplStatus;
  /** Existing workbench step(s) that cover this stage. */
  mapsTo: WorkbenchStep[];
  note: string;
  /** Session readiness for this stage (structural, not scientific validity). */
  ready: boolean;
  detail: string;
}

export interface SpineProvenance {
  sessionId: string;
  graphVersion: string;
  extensionsVersion: string;
  schemaVersion: string;
  claimCount: number;
  evidenceNoteCount: number;
  counterevidenceCount: number;
  relatedConceptIds: string[];
  relatedRelIds: string[];
  importLog: string[];
  kgWrite: false;
  autoPromote: false;
}

/** Static stage definitions — status honesty for UI. */
export const SPINE_STAGE_DEFS: Array<
  Omit<SpineStage, "ready" | "detail"> & { readiness: (s: WorkbenchSession) => { ready: boolean; detail: string } }
> = [
  {
    id: "question",
    title: "Question",
    status: "implemented",
    mapsTo: ["question"],
    note: "Define research question, scope, and search strategy.",
    readiness: (s) => ({
      ready: !!s.question.text.trim(),
      detail: s.question.text.trim() ? "question set" : "enter a question",
    }),
  },
  {
    id: "search",
    title: "Search",
    status: "partial",
    mapsTo: ["question", "evidence"],
    note: "Search strategy + Ask seed + literature import. Live systematic search UI is partial.",
    readiness: (s) => ({
      ready: !!s.question.searchStrategy.trim() || s.importLog.some((x) => /lit|import|ask/i.test(x)),
      detail: s.question.searchStrategy.trim()
        ? "strategy recorded"
        : s.importLog.length
          ? "imports present"
          : "add search strategy or import lit",
    }),
  },
  {
    id: "screen",
    title: "Screen",
    status: "planned",
    mapsTo: ["evidence"],
    note: "Inclusion/exclusion screening with transparent reasons — scaffold only (use evidence notes).",
    readiness: (s) => ({
      ready: !!(s.question as ResearchQuestionWithScreen).inclusionCriteria?.trim(),
      detail: (s.question as ResearchQuestionWithScreen).inclusionCriteria?.trim()
        ? "inclusion criteria noted"
        : "planned — record inclusion criteria on the question",
    }),
  },
  {
    id: "extract",
    title: "Extract",
    status: "partial",
    mapsTo: ["evidence"],
    note: "Candidate claims with optional passage spans (claim ledger table).",
    readiness: (s) => ({
      ready: (s.claims ?? []).length > 0 || s.evidence.length > 0,
      detail:
        (s.claims ?? []).length > 0
          ? `${s.claims.length} claim candidate(s)`
          : s.evidence.length
            ? `${s.evidence.length} evidence note(s)`
            : "add claims or evidence notes",
    }),
  },
  {
    id: "assess",
    title: "Assess",
    status: "partial",
    mapsTo: ["evidence", "mechanism"],
    note: "Support / partial / contradicts assessment + mechanism paths. Assessor cannot approve Gate C.",
    readiness: (s) => {
      const assessed = (s.claims ?? []).some((c) => c.lifecycle !== "candidate" || c.polarity !== "unassessed");
      const mech = s.mechanism.paths.length > 0 || s.mechanism.gaps.length > 0;
      return {
        ready: assessed || mech || listWorkbenchCounterevidence(s).length > 0,
        detail: assessed
          ? "claim polarity/lifecycle updated"
          : mech
            ? "mechanism paths/gaps"
            : "assess claims or record mechanism",
      };
    },
  },
  {
    id: "hypothesis",
    title: "Hypothesis",
    status: "implemented",
    mapsTo: ["hypothesis", "experiment"],
    note: "Candidate hypothesis + optional experiment proposal (draft only).",
    readiness: (s) => ({
      ready: !!s.hypothesis.claim.trim(),
      detail: s.hypothesis.claim.trim() ? "hypothesis drafted" : "draft a hypothesis",
    }),
  },
  {
    id: "export",
    title: "Export",
    status: "implemented",
    mapsTo: ["review"],
    note: "Versioned export + curation handoff. Human approval required before any KG publication.",
    readiness: (s) => ({
      ready: s.reviewDisposition === "approved_for_export_only" || s.furthestStep === "review",
      detail:
        s.reviewDisposition === "approved_for_export_only"
          ? "approved for export only"
          : "reach review / set export disposition",
    }),
  },
];

/** Optional inclusion criteria field on question (additive; older sessions omit). */
export type ResearchQuestionWithScreen = WorkbenchSession["question"] & {
  inclusionCriteria?: string;
  exclusionNotes?: string;
};

export function workbenchSpine(session: WorkbenchSession): SpineStage[] {
  return SPINE_STAGE_DEFS.map((d) => {
    const { ready, detail } = d.readiness(session);
    return {
      id: d.id,
      title: d.title,
      status: d.status,
      mapsTo: d.mapsTo,
      note: d.note,
      ready,
      detail,
    };
  });
}

export function spineProvenance(session: WorkbenchSession): SpineProvenance {
  return {
    sessionId: session.session_id,
    graphVersion: session.graphVersion,
    extensionsVersion: session.extensionsVersion,
    schemaVersion: session.schemaVersion,
    claimCount: (session.claims ?? []).length,
    evidenceNoteCount: session.evidence.length,
    counterevidenceCount: listWorkbenchCounterevidence(session).length,
    relatedConceptIds: [...session.question.relatedConceptIds],
    relatedRelIds: [...session.question.relatedRelIds],
    importLog: [...session.importLog],
    kgWrite: false,
    autoPromote: false,
  };
}

export function spineStatusLabel(status: SpineImplStatus): string {
  switch (status) {
    case "implemented":
      return "implemented";
    case "partial":
      return "partial";
    case "planned":
      return "not implemented";
  }
}

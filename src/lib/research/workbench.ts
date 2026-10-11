/* Scientific Workbench artefacts (PRD FR-038–040).
   Every generated/user-filled artefact is a candidate until human review. */

import { createHypothesisDraft, type HypothesisDraft } from "./hypothesisDraft";

export type WorkbenchStep =
  | "question"
  | "evidence"
  | "mechanism"
  | "hypothesis"
  | "experiment"
  | "review";

export type ArtefactKind = "candidate";

export interface ResearchQuestion {
  question_id: string;
  text: string;
  searchStrategy: string;
  kind: ArtefactKind;
}

export interface EvidenceNote {
  note_id: string;
  summary: string;
  sourceLabel: string;
  relatedIds: string[];
  kind: ArtefactKind;
}

export interface MechanismNote {
  paths: string[];
  assumptions: string[];
  gaps: string[];
  kind: ArtefactKind;
}

export interface ExperimentProposal {
  experiment_id: string;
  question: string;
  systemModel: string;
  controls: string;
  readouts: string;
  confounders: string;
  safetyEthics: string;
  status: "draft_proposal";
  kind: ArtefactKind;
}

export interface WorkbenchSession {
  session_id: string;
  step: WorkbenchStep;
  question: ResearchQuestion;
  evidence: EvidenceNote[];
  mechanism: MechanismNote;
  hypothesis: HypothesisDraft;
  experiment: ExperimentProposal;
  reviewNotes: string;
  graphVersion: string;
  extensionsVersion: string;
  createdAt: string;
  updatedAt: string;
}

const STEPS: WorkbenchStep[] = ["question", "evidence", "mechanism", "hypothesis", "experiment", "review"];

export function createWorkbenchSession(graphVersion: string, extensionsVersion: string): WorkbenchSession {
  const now = new Date().toISOString();
  const question_id = `Q-DRAFT-${Date.now().toString(36)}`;
  return {
    session_id: `WB-DRAFT-${Date.now().toString(36)}`,
    step: "question",
    question: {
      question_id,
      text: "",
      searchStrategy: "",
      kind: "candidate",
    },
    evidence: [],
    mechanism: {
      paths: [],
      assumptions: ["Graph paths are illustrative; not validated experimental conclusions."],
      gaps: [],
      kind: "candidate",
    },
    hypothesis: createHypothesisDraft({ claim: "", question_id }, graphVersion),
    experiment: {
      experiment_id: `EXP-DRAFT-${Date.now().toString(36)}`,
      question: "",
      systemModel: "",
      controls: "",
      readouts: "",
      confounders: "",
      safetyEthics: "Educational research proposal only — not a certified wet-lab protocol.",
      status: "draft_proposal",
      kind: "candidate",
    },
    reviewNotes: "",
    graphVersion,
    extensionsVersion,
    createdAt: now,
    updatedAt: now,
  };
}

export function workbenchSteps(): readonly WorkbenchStep[] {
  return STEPS;
}

export function workbenchStepIndex(step: WorkbenchStep): number {
  return STEPS.indexOf(step);
}

export function canAdvance(session: WorkbenchSession): { ok: boolean; reason?: string } {
  switch (session.step) {
    case "question":
      return session.question.text.trim()
        ? { ok: true }
        : { ok: false, reason: "Enter a research question first." };
    case "evidence":
      return session.evidence.length
        ? { ok: true }
        : { ok: false, reason: "Add at least one evidence note (candidate)." };
    case "mechanism":
      return session.mechanism.paths.length || session.mechanism.gaps.length
        ? { ok: true }
        : { ok: false, reason: "Record a mechanism path or an explicit gap." };
    case "hypothesis":
      return session.hypothesis.claim.trim()
        ? { ok: true }
        : { ok: false, reason: "Draft a candidate hypothesis claim." };
    case "experiment":
      return session.experiment.question.trim() && session.experiment.readouts.trim()
        ? { ok: true }
        : { ok: false, reason: "Experiment needs a question and readouts." };
    case "review":
      return { ok: false, reason: "Final step — export or revise earlier steps." };
  }
}

export function advanceWorkbench(session: WorkbenchSession): WorkbenchSession {
  const gate = canAdvance(session);
  if (!gate.ok) return session;
  const i = STEPS.indexOf(session.step);
  if (i < 0 || i >= STEPS.length - 1) return session;
  return touch({ ...session, step: STEPS[i + 1]! });
}

export function addEvidenceNote(
  session: WorkbenchSession,
  summary: string,
  sourceLabel: string,
  relatedIds: string[] = [],
): WorkbenchSession {
  const note: EvidenceNote = {
    note_id: `EVN-CAND-${Date.now().toString(36)}`,
    summary: summary.trim(),
    sourceLabel: sourceLabel.trim() || "source not specified",
    relatedIds: relatedIds.map((x) => x.trim()).filter(Boolean),
    kind: "candidate",
  };
  return touch({ ...session, evidence: [...session.evidence, note], step: "evidence" });
}

export function experimentCompleteness(e: ExperimentProposal): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!e.question.trim()) missing.push("question");
  if (!e.systemModel.trim()) missing.push("systemModel");
  if (!e.controls.trim()) missing.push("controls");
  if (!e.readouts.trim()) missing.push("readouts");
  if (!e.confounders.trim()) missing.push("confounders");
  if (!e.safetyEthics.trim()) missing.push("safetyEthics");
  return { ok: missing.length === 0, missing };
}

export function exportWorkbench(session: WorkbenchSession): string {
  return JSON.stringify(
    {
      ...session,
      exportDisclaimer:
        "All artefacts in this export are candidates. Nothing here is approved curated graph content or a certified experimental protocol.",
    },
    null,
    2,
  );
}

function touch(s: WorkbenchSession): WorkbenchSession {
  return { ...s, updatedAt: new Date().toISOString() };
}

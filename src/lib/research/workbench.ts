/* Scientific Workbench artefacts (PRD FR-038–040).
   Researcher flow: question → evidence → mechanism → hypothesis → experiment → review.
   Every generated/user-filled artefact is a candidate until human review.
   Nothing here auto-promotes into the curated knowledge graph. */

import { graphContext } from "@/lib/askGrounding";
import { byId } from "@/lib/immune/engine";
import { hopPhrase, type MechanismResult } from "@/lib/immune/mechanismReasoning";
import { createHypothesisDraft, type HypothesisDraft } from "./hypothesisDraft";
import type { CandidateClaim, CurationManifestExport, LiteratureProject } from "./literatureWorkflow";

/** Bump when export shape changes in a breaking way. */
export const WORKBENCH_SCHEMA_VERSION = "wb-1";

/** sessionStorage key for local draft sessions (browser only; never a KG write). */
export const WORKBENCH_LOCAL_DRAFT_KEY = "immune-city.workbench.local-draft.v1";

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
  /** Graph concept IDs suggested from Ask retrieval (candidate inputs only). */
  relatedConceptIds: string[];
  /** Graph relationship IDs suggested from Ask retrieval (candidate inputs only). */
  relatedRelIds: string[];
  kind: ArtefactKind;
}

export interface EvidenceNote {
  note_id: string;
  summary: string;
  sourceLabel: string;
  relatedIds: string[];
  /** Optional provenance from literature workflow import. */
  sourceClaimId?: string;
  sourceProjectId?: string;
  kind: ArtefactKind;
}

export interface MechanismNote {
  paths: string[];
  assumptions: string[];
  gaps: string[];
  /** Optional IDs from a mechanism workspace seed. */
  startId?: string;
  perturbId?: string;
  outcomeId?: string;
  relatedRelIds: string[];
  kind: ArtefactKind;
  illustrative: true;
}

export interface ExperimentProposal {
  experiment_id: string;
  question: string;
  systemModel: string;
  controls: string;
  readouts: string;
  confounders: string;
  safetyEthics: string;
  /** Never auto-promoted to validated / experimentally_supported. */
  status: "draft_proposal";
  kind: ArtefactKind;
}

export interface WorkbenchSession {
  session_id: string;
  schemaVersion: typeof WORKBENCH_SCHEMA_VERSION;
  step: WorkbenchStep;
  /** Furthest step the user has unlocked by satisfying gates (inclusive). */
  furthestStep: WorkbenchStep;
  question: ResearchQuestion;
  evidence: EvidenceNote[];
  mechanism: MechanismNote;
  hypothesis: HypothesisDraft;
  experiment: ExperimentProposal;
  reviewNotes: string;
  /** Human review disposition — never implies experimental validation. */
  reviewDisposition: "pending" | "needs_revision" | "approved_for_export_only";
  graphVersion: string;
  extensionsVersion: string;
  createdAt: string;
  updatedAt: string;
  /** Links / imports recorded for audit (still candidates). */
  importLog: string[];
}

const STEPS: WorkbenchStep[] = ["question", "evidence", "mechanism", "hypothesis", "experiment", "review"];

const DEFAULT_MECH_ASSUMPTIONS = [
  "Graph paths are illustrative; not validated experimental conclusions.",
  "Mechanism notes remain candidates until human review.",
];

export function workbenchSteps(): readonly WorkbenchStep[] {
  return STEPS;
}

export function workbenchStepIndex(step: WorkbenchStep): number {
  return STEPS.indexOf(step);
}

export function createWorkbenchSession(graphVersion: string, extensionsVersion: string): WorkbenchSession {
  const now = new Date().toISOString();
  const question_id = `Q-DRAFT-${Date.now().toString(36)}`;
  return {
    session_id: `WB-DRAFT-${Date.now().toString(36)}`,
    schemaVersion: WORKBENCH_SCHEMA_VERSION,
    step: "question",
    furthestStep: "question",
    question: {
      question_id,
      text: "",
      searchStrategy: "",
      relatedConceptIds: [],
      relatedRelIds: [],
      kind: "candidate",
    },
    evidence: [],
    mechanism: {
      paths: [],
      assumptions: [...DEFAULT_MECH_ASSUMPTIONS],
      gaps: [],
      relatedRelIds: [],
      kind: "candidate",
      illustrative: true,
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
    reviewDisposition: "pending",
    graphVersion,
    extensionsVersion,
    createdAt: now,
    updatedAt: now,
    importLog: [],
  };
}

/** Gate for advancing from the current step. */
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

/** Only visit unlocked steps (current, prior, or furthest reached). */
export function canVisitStep(session: WorkbenchSession, target: WorkbenchStep): { ok: boolean; reason?: string } {
  const ti = workbenchStepIndex(target);
  const fi = workbenchStepIndex(session.furthestStep);
  if (ti < 0) return { ok: false, reason: "Unknown step." };
  if (ti <= fi) return { ok: true };
  return { ok: false, reason: "Complete prior steps before jumping ahead." };
}

export function setWorkbenchStep(session: WorkbenchSession, target: WorkbenchStep): WorkbenchSession {
  if (!canVisitStep(session, target).ok) return session;
  return touch({ ...session, step: target });
}

export function advanceWorkbench(session: WorkbenchSession): WorkbenchSession {
  const gate = canAdvance(session);
  if (!gate.ok) return session;
  const i = STEPS.indexOf(session.step);
  if (i < 0 || i >= STEPS.length - 1) return session;
  const next = STEPS[i + 1]!;
  const furthest =
    workbenchStepIndex(next) > workbenchStepIndex(session.furthestStep) ? next : session.furthestStep;
  let nextSession = touch({ ...session, step: next, furthestStep: furthest });
  // Carry question text into empty experiment question when first entering experiment.
  if (next === "experiment" && !nextSession.experiment.question.trim()) {
    nextSession = {
      ...nextSession,
      experiment: {
        ...nextSession.experiment,
        question: nextSession.question.text.trim(),
        kind: "candidate",
        status: "draft_proposal",
      },
    };
  }
  // Seed hypothesis mechanism from recorded paths when empty.
  if (next === "hypothesis" && !nextSession.hypothesis.mechanism.trim() && nextSession.mechanism.paths.length) {
    nextSession = {
      ...nextSession,
      hypothesis: {
        ...nextSession.hypothesis,
        mechanism: nextSession.mechanism.paths.join("; "),
        status: "candidate",
        supportingIds: uniqueIds([
          ...nextSession.hypothesis.supportingIds,
          ...nextSession.question.relatedConceptIds,
          ...nextSession.evidence.flatMap((e) => e.relatedIds),
        ]),
      },
    };
  }
  return nextSession;
}

export function retreatWorkbench(session: WorkbenchSession): WorkbenchSession {
  const i = STEPS.indexOf(session.step);
  if (i <= 0) return session;
  return touch({ ...session, step: STEPS[i - 1]! });
}

export function updateQuestion(
  session: WorkbenchSession,
  patch: Partial<Pick<ResearchQuestion, "text" | "searchStrategy">>,
): WorkbenchSession {
  return touch({
    ...session,
    question: {
      ...session.question,
      ...patch,
      kind: "candidate",
    },
  });
}

/**
 * Pull Ask graph matches into the question artefact as candidate related IDs.
 * Does not call the model; uses browser-safe prepareAsk retrieval only via graphContext.
 */
export function seedQuestionFromAsk(session: WorkbenchSession, questionText?: string): WorkbenchSession {
  const text = (questionText ?? session.question.text).trim();
  if (!text) return session;
  const g = graphContext(text);
  const conceptIds = g.nodeIds.filter((id) => byId[id]);
  const relIds = g.relIds;
  const strategyBits: string[] = [];
  if (conceptIds.length) strategyBits.push(`Ask-matched concepts: ${conceptIds.join(", ")}`);
  if (relIds.length) strategyBits.push(`Ask-matched relationships: ${relIds.slice(0, 12).join(", ")}`);
  if (!g.coverage.matched) strategyBits.push("Ask: no graph concepts matched — broaden or use literature step.");
  return touch({
    ...session,
    question: {
      ...session.question,
      text,
      relatedConceptIds: conceptIds,
      relatedRelIds: relIds,
      searchStrategy: session.question.searchStrategy.trim()
        ? session.question.searchStrategy
        : strategyBits.join("\n"),
      kind: "candidate",
    },
    importLog: [...session.importLog, `ask_seed:${conceptIds.length}c/${relIds.length}r`],
  });
}

export function addEvidenceNote(
  session: WorkbenchSession,
  summary: string,
  sourceLabel: string,
  relatedIds: string[] = [],
  meta?: { sourceClaimId?: string; sourceProjectId?: string },
): WorkbenchSession {
  const note: EvidenceNote = {
    note_id: `EVN-CAND-${Date.now().toString(36)}-${session.evidence.length}`,
    summary: summary.trim(),
    sourceLabel: sourceLabel.trim() || "source not specified",
    relatedIds: relatedIds.map((x) => x.trim()).filter(Boolean),
    sourceClaimId: meta?.sourceClaimId,
    sourceProjectId: meta?.sourceProjectId,
    kind: "candidate",
  };
  const furthest =
    workbenchStepIndex("evidence") > workbenchStepIndex(session.furthestStep)
      ? "evidence"
      : session.furthestStep;
  return touch({
    ...session,
    evidence: [...session.evidence, note],
    step: session.step === "question" ? "evidence" : session.step,
    furthestStep: furthest,
  });
}

/** Import literature project claims as evidence notes (candidates only). */
export function importLiteratureCandidates(
  session: WorkbenchSession,
  project: Pick<LiteratureProject, "project_id" | "claims" | "search">,
): WorkbenchSession {
  const claims = project.claims.filter((c) => c.text.trim());
  if (!claims.length) return session;
  let next = session;
  for (const c of claims) {
    next = importClaimAsEvidence(next, c, project.project_id, project.search?.title || project.search?.query);
  }
  return touch({
    ...next,
    importLog: [...next.importLog, `lit_import:${project.project_id}:${claims.length}`],
  });
}

export function importClaimAsEvidence(
  session: WorkbenchSession,
  claim: Pick<CandidateClaim, "claim_id" | "text" | "mappedConceptIds" | "mappedRelationshipIds" | "excerpt">,
  projectId: string,
  sourceLabel?: string,
): WorkbenchSession {
  const label =
    sourceLabel?.trim() ||
    `literature claim ${claim.claim_id} (candidate)`;
  const summary = claim.excerpt?.trim()
    ? `${claim.text.trim()} — excerpt: ${claim.excerpt.trim()}`
    : claim.text.trim();
  const related = uniqueIds([...claim.mappedConceptIds, ...claim.mappedRelationshipIds]);
  return addEvidenceNote(session, summary, label, related, {
    sourceClaimId: claim.claim_id,
    sourceProjectId: projectId,
  });
}

/**
 * Parse a literature project / export JSON string and import claims as evidence.
 * Returns { session, error } — never invents PMIDs.
 */
export function importLiteratureJson(
  session: WorkbenchSession,
  jsonText: string,
): { session: WorkbenchSession; error?: string; imported: number } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { session, error: "Invalid JSON — paste a literature project export.", imported: 0 };
  }
  if (!parsed || typeof parsed !== "object") {
    return { session, error: "Expected a literature project object.", imported: 0 };
  }
  const obj = parsed as Record<string, unknown>;
  const project_id = typeof obj.project_id === "string" ? obj.project_id : "LIT-IMPORT";
  const claims = Array.isArray(obj.claims) ? (obj.claims as CandidateClaim[]) : [];
  const usable = claims.filter((c) => c && typeof c.text === "string" && c.text.trim());
  if (!usable.length) {
    return { session, error: "No candidate claims found in JSON.", imported: 0 };
  }
  const search = (obj.search && typeof obj.search === "object" ? obj.search : {}) as LiteratureProject["search"];
  const next = importLiteratureCandidates(session, { project_id, claims: usable, search });
  return { session: next, imported: usable.length };
}

/**
 * Import an unreviewed curation-candidate manifest as evidence notes.
 * Uses claim_text / source_ref only — never invents PMIDs or approves claims.
 */
export function importCurationManifest(
  session: WorkbenchSession,
  manifest: CurationManifestExport,
): { session: WorkbenchSession; error?: string; imported: number } {
  if (manifest.meta?.curation && manifest.meta.curation !== "unreviewed") {
    return { session, error: "Only unreviewed candidate manifests can enter the workbench.", imported: 0 };
  }
  const projectId = manifest.meta?.project_id || "LIT-MANIFEST";
  let next = session;
  let imported = 0;
  for (const group of manifest.evidence_records ?? []) {
    for (const e of group.evidence ?? []) {
      if (e.status && e.status !== "candidate") continue;
      const text = (e.claim_text || "").trim();
      if (!text) continue;
      const related = uniqueIds([
        group.node_id,
        e.relationship_id ?? "",
      ]);
      const source =
        e.source_ref?.trim() ||
        (e.pmid ? `PMID ${e.pmid} (user-supplied in manifest)` : "") ||
        (e.doi ? `DOI ${e.doi} (user-supplied in manifest)` : "") ||
        `manifest ${e.evidence_id} (candidate)`;
      next = addEvidenceNote(next, text, source, related, {
        sourceClaimId: e.evidence_id,
        sourceProjectId: projectId,
      });
      imported += 1;
    }
  }
  if (!imported) {
    return { session, error: "No candidate claim_text rows found in manifest.", imported: 0 };
  }
  return {
    session: touch({
      ...next,
      importLog: [...next.importLog, `lit_manifest:${projectId}:${imported}`],
    }),
    imported,
  };
}

export function importCurationManifestJson(
  session: WorkbenchSession,
  jsonText: string,
): { session: WorkbenchSession; error?: string; imported: number } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { session, error: "Invalid JSON — paste a curation candidate manifest.", imported: 0 };
  }
  if (!parsed || typeof parsed !== "object") {
    return { session, error: "Expected a curation manifest object.", imported: 0 };
  }
  const obj = parsed as Record<string, unknown>;
  // Project export nests the manifest under export.curationManifest.
  const nested =
    obj.export && typeof obj.export === "object"
      ? (obj.export as Record<string, unknown>).curationManifest
      : undefined;
  const manifest = (nested && typeof nested === "object" ? nested : obj) as CurationManifestExport;
  return importCurationManifest(session, manifest);
}

/**
 * Auto-detect literature project JSON, nested project export, or curation manifest.
 * Prefer claims when present; otherwise fall back to manifest rows.
 */
export function importLiteraturePayload(
  session: WorkbenchSession,
  jsonText: string,
): { session: WorkbenchSession; error?: string; imported: number; source: "project" | "manifest" | "none" } {
  const asProject = importLiteratureJson(session, jsonText);
  if (!asProject.error && asProject.imported > 0) {
    return { ...asProject, source: "project" };
  }
  const asManifest = importCurationManifestJson(session, jsonText);
  if (!asManifest.error && asManifest.imported > 0) {
    return { ...asManifest, source: "manifest" };
  }
  return {
    session,
    error: asProject.error || asManifest.error || "No importable candidate claims found.",
    imported: 0,
    source: "none",
  };
}

/** Restore a previously exported workbench session (candidates only; kgWrite must stay false). */
export function restoreWorkbenchFromExportJson(jsonText: string): {
  session?: WorkbenchSession;
  error?: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { error: "Invalid JSON — paste a scientific workbench export." };
  }
  if (!parsed || typeof parsed !== "object") return { error: "Expected a workbench export object." };
  const obj = parsed as Partial<WorkbenchExport> & { session?: WorkbenchSession };
  if (obj.kind !== "scientific_workbench_export") {
    return { error: "Expected kind scientific_workbench_export." };
  }
  if (obj.kgWrite === true) return { error: "Refusing export marked kgWrite=true." };
  if (obj.experimentallySupported === true) {
    return { error: "Refusing export marked experimentallySupported." };
  }
  if (!obj.session || typeof obj.session !== "object") {
    return { error: "Export missing session payload." };
  }
  const s = obj.session;
  if (!s.question || !s.mechanism || !s.hypothesis || !s.experiment) {
    return { error: "Export session is incomplete." };
  }
  const restored: WorkbenchSession = {
    ...s,
    schemaVersion: WORKBENCH_SCHEMA_VERSION,
    question: { ...s.question, kind: "candidate" },
    evidence: (s.evidence ?? []).map((e) => ({ ...e, kind: "candidate" as const })),
    mechanism: { ...s.mechanism, kind: "candidate", illustrative: true },
    hypothesis: {
      ...s.hypothesis,
      status: s.hypothesis.status === "under_review" ? "under_review" : "candidate",
    },
    experiment: { ...s.experiment, kind: "candidate", status: "draft_proposal" },
    reviewDisposition:
      s.reviewDisposition === "needs_revision" || s.reviewDisposition === "approved_for_export_only"
        ? s.reviewDisposition
        : "pending",
    importLog: [...(s.importLog ?? []), "restore:workbench_export"],
    updatedAt: new Date().toISOString(),
  };
  return { session: restored };
}

/** Per-step structural progress for UI — does not imply scientific validity. */
export function workbenchProgress(session: WorkbenchSession): {
  step: WorkbenchStep;
  label: string;
  ready: boolean;
  detail: string;
}[] {
  const hyp = session.hypothesis.claim.trim().length > 0;
  const exp =
    session.experiment.question.trim().length > 0 && session.experiment.readouts.trim().length > 0;
  return [
    {
      step: "question",
      label: "Question",
      ready: !!session.question.text.trim(),
      detail: session.question.text.trim() ? "draft question set" : "needs question text",
    },
    {
      step: "evidence",
      label: "Evidence",
      ready: session.evidence.length > 0,
      detail: session.evidence.length
        ? `${session.evidence.length} candidate note(s)`
        : "needs ≥1 candidate note",
    },
    {
      step: "mechanism",
      label: "Mechanism",
      ready: session.mechanism.paths.length + session.mechanism.gaps.length > 0,
      detail:
        session.mechanism.paths.length || session.mechanism.gaps.length
          ? `${session.mechanism.paths.length} path(s) · ${session.mechanism.gaps.length} gap(s)`
          : "needs path or gap",
    },
    {
      step: "hypothesis",
      label: "Hypothesis",
      ready: hyp,
      detail: hyp ? `status ${session.hypothesis.status}` : "needs candidate claim",
    },
    {
      step: "experiment",
      label: "Experiment",
      ready: exp,
      detail: exp ? "draft proposal fields set" : "needs question + readouts",
    },
    {
      step: "review",
      label: "Review",
      ready: session.reviewDisposition !== "pending",
      detail: `disposition ${session.reviewDisposition}`,
    },
  ];
}

export function serializeLocalDraft(session: WorkbenchSession): string {
  return JSON.stringify({
    kind: "scientific_workbench_local_draft",
    schemaVersion: WORKBENCH_SCHEMA_VERSION,
    kgWrite: false,
    experimentallySupported: false,
    savedAt: new Date().toISOString(),
    session,
  });
}

export function parseLocalDraft(jsonText: string): { session?: WorkbenchSession; error?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { error: "Invalid local draft JSON." };
  }
  if (!parsed || typeof parsed !== "object") return { error: "Expected a local draft object." };
  const obj = parsed as { kind?: string; kgWrite?: boolean; session?: WorkbenchSession };
  if (obj.kind !== "scientific_workbench_local_draft" && obj.kind !== "scientific_workbench_export") {
    return { error: "Unrecognized draft kind." };
  }
  if (obj.kgWrite === true) return { error: "Refusing draft marked kgWrite=true." };
  if (!obj.session) return { error: "Draft missing session." };
  return restoreWorkbenchFromExportJson(
    JSON.stringify({
      kind: "scientific_workbench_export",
      kgWrite: false,
      experimentallySupported: false,
      session: obj.session,
    }),
  );
}

/** Import mechanism workspace result summaries as candidate paths/gaps. */
export function importMechanismResult(session: WorkbenchSession, result: MechanismResult): WorkbenchSession {
  const paths: string[] = [...session.mechanism.paths];
  const gaps: string[] = [...session.mechanism.gaps];
  const relIds = new Set(session.mechanism.relatedRelIds);

  if (result.pathViaPerturb?.length) {
    const phrase = result.pathViaPerturb.map(hopPhrase).join(" → ");
    const label = `[illustrative] ${result.startId}→${result.perturbId}→${result.outcomeId}: ${phrase}`;
    if (!paths.includes(label)) paths.push(label);
    for (const h of result.pathViaPerturb) relIds.add(h.relId);
  } else if (result.pathToOutcome?.length) {
    const phrase = result.pathToOutcome.map(hopPhrase).join(" → ");
    const label = `[illustrative] ${result.startId}→${result.outcomeId}: ${phrase}`;
    if (!paths.includes(label)) paths.push(label);
    for (const h of result.pathToOutcome) relIds.add(h.relId);
  }

  for (const g of result.gaps) {
    if (!gaps.includes(g)) gaps.push(g);
  }

  const assumptions = uniqueStrings([
    ...session.mechanism.assumptions,
    ...result.assumptions,
    "Imported from Mechanism workspace — illustrative until independently validated.",
  ]);

  const furthest =
    workbenchStepIndex("mechanism") > workbenchStepIndex(session.furthestStep)
      ? "mechanism"
      : session.furthestStep;

  return touch({
    ...session,
    mechanism: {
      ...session.mechanism,
      paths,
      gaps,
      assumptions,
      startId: result.startId,
      perturbId: result.perturbId,
      outcomeId: result.outcomeId,
      relatedRelIds: [...relIds],
      kind: "candidate",
      illustrative: true,
    },
    step: session.step === "evidence" || session.step === "question" ? "mechanism" : session.step,
    furthestStep: furthest,
    importLog: [...session.importLog, `mech_import:${result.startId}/${result.perturbId}/${result.outcomeId}`],
  });
}

export function addMechanismPath(session: WorkbenchSession, path: string): WorkbenchSession {
  const p = path.trim();
  if (!p) return session;
  return touch({
    ...session,
    mechanism: {
      ...session.mechanism,
      paths: [...session.mechanism.paths, p],
      kind: "candidate",
      illustrative: true,
    },
  });
}

export function addMechanismGap(session: WorkbenchSession, gap: string): WorkbenchSession {
  const g = gap.trim();
  if (!g) return session;
  return touch({
    ...session,
    mechanism: {
      ...session.mechanism,
      gaps: [...session.mechanism.gaps, g],
      kind: "candidate",
      illustrative: true,
    },
  });
}

export function updateHypothesis(
  session: WorkbenchSession,
  patch: Partial<Omit<HypothesisDraft, "hypothesis_id" | "status" | "graphVersion" | "createdAt">>,
): WorkbenchSession {
  return touch({
    ...session,
    hypothesis: {
      ...session.hypothesis,
      ...patch,
      status: "candidate",
      question_id: session.question.question_id,
    },
  });
}

export function updateExperiment(
  session: WorkbenchSession,
  patch: Partial<Omit<ExperimentProposal, "experiment_id" | "status" | "kind">>,
): WorkbenchSession {
  return touch({
    ...session,
    experiment: {
      ...session.experiment,
      ...patch,
      status: "draft_proposal",
      kind: "candidate",
    },
  });
}

export function setReviewDisposition(
  session: WorkbenchSession,
  disposition: WorkbenchSession["reviewDisposition"],
  notes?: string,
): WorkbenchSession {
  // approved_for_export_only never means experimentally supported or KG-curated.
  return touch({
    ...session,
    reviewDisposition: disposition,
    reviewNotes: notes !== undefined ? notes : session.reviewNotes,
    hypothesis: { ...session.hypothesis, status: disposition === "needs_revision" ? "under_review" : "candidate" },
  });
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

/** Audit helper: every artefact must remain candidate / draft_proposal. */
export function sessionCandidateFlags(session: WorkbenchSession): {
  allCandidates: boolean;
  flags: Record<string, string>;
} {
  const flags: Record<string, string> = {
    question: session.question.kind,
    evidence: session.evidence.every((e) => e.kind === "candidate") ? "candidate" : "mixed",
    mechanism: session.mechanism.kind,
    hypothesis: session.hypothesis.status,
    experiment: `${session.experiment.kind}/${session.experiment.status}`,
    reviewDisposition: session.reviewDisposition,
  };
  const allCandidates =
    session.question.kind === "candidate" &&
    session.evidence.every((e) => e.kind === "candidate") &&
    session.mechanism.kind === "candidate" &&
    session.mechanism.illustrative === true &&
    (session.hypothesis.status === "candidate" || session.hypothesis.status === "under_review") &&
    session.experiment.kind === "candidate" &&
    session.experiment.status === "draft_proposal" &&
    session.reviewDisposition !== ("experimentally_supported" as string);
  return { allCandidates, flags };
}

export interface WorkbenchExport {
  schemaVersion: typeof WORKBENCH_SCHEMA_VERSION;
  exportVersion: string;
  exportedAt: string;
  kind: "scientific_workbench_export";
  curation: "unreviewed";
  kgWrite: false;
  experimentallySupported: false;
  exportDisclaimer: string;
  session: WorkbenchSession;
  candidateFlags: ReturnType<typeof sessionCandidateFlags>;
}

export function buildWorkbenchExport(session: WorkbenchSession): WorkbenchExport {
  return {
    schemaVersion: WORKBENCH_SCHEMA_VERSION,
    exportVersion: `${WORKBENCH_SCHEMA_VERSION}+g${session.graphVersion}+x${session.extensionsVersion}`,
    exportedAt: new Date().toISOString(),
    kind: "scientific_workbench_export",
    curation: "unreviewed",
    kgWrite: false,
    experimentallySupported: false,
    exportDisclaimer:
      "All artefacts in this export are candidates. Nothing here is approved curated graph content, an experimentally supported finding, or a certified experimental protocol. Human review is required before any curation import.",
    session: {
      ...session,
      question: { ...session.question, kind: "candidate" },
      evidence: session.evidence.map((e) => ({ ...e, kind: "candidate" as const })),
      mechanism: { ...session.mechanism, kind: "candidate", illustrative: true },
      hypothesis: { ...session.hypothesis, status: session.hypothesis.status === "under_review" ? "under_review" : "candidate" },
      experiment: { ...session.experiment, kind: "candidate", status: "draft_proposal" },
    },
    candidateFlags: sessionCandidateFlags(session),
  };
}

export function exportWorkbench(session: WorkbenchSession): string {
  return JSON.stringify(buildWorkbenchExport(session), null, 2);
}

/**
 * Human-gated curation-queue handoff (Phase E honesty).
 * Builds an unreviewed candidate package for download / paste into /curation.
 * NEVER writes the curated KG, NEVER auto-promotes, NEVER invents PMIDs.
 */
export interface WorkbenchCurationHandoff {
  kind: "workbench_curation_queue_handoff";
  schemaVersion: typeof WORKBENCH_SCHEMA_VERSION;
  wired: false;
  kgWrite: false;
  autoPromote: false;
  experimentallySupported: false;
  session_id: string;
  exportedAt: string;
  openRoute: "/curation";
  note: string;
  draftNotes: Array<{
    note_id: string;
    summary: string;
    sourceLabel: string;
    relatedIds: string[];
    kind: "candidate";
  }>;
  hypothesisClaim: string;
  reviewDisposition: WorkbenchSession["reviewDisposition"];
  /** Compatible with literature curation import when at least one graph node maps. */
  candidateManifest: CurationManifestExport | null;
}

export function buildWorkbenchCurationHandoff(session: WorkbenchSession): WorkbenchCurationHandoff {
  const draftNotes = session.evidence.map((e) => ({
    note_id: e.note_id,
    summary: e.summary,
    sourceLabel: e.sourceLabel,
    relatedIds: [...e.relatedIds],
    kind: "candidate" as const,
  }));

  const groups = new Map<string, CurationManifestExport["evidence_records"][number]>();
  for (const note of session.evidence) {
    const conceptId = note.relatedIds.find((id) => byId[id]);
    const relId = note.relatedIds.find((id) => id.startsWith("REL-"));
    if (!conceptId) continue;
    const node = byId[conceptId];
    if (!node) continue;
    if (!groups.has(conceptId)) {
      groups.set(conceptId, {
        node_id: conceptId,
        node_type: node.node_type,
        node_name: node.name,
        evidence: [],
      });
    }
    groups.get(conceptId)!.evidence.push({
      evidence_id: `WB-${session.session_id}-${note.note_id}`.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120),
      source_ref: note.sourceLabel || null,
      status: "candidate",
      source_type: "literature_workflow",
      claim_text: note.summary,
      claim_support: "unassessed",
      relationship_id: relId && relId.startsWith("REL-") ? relId : null,
    });
  }

  const candidateManifest: CurationManifestExport | null =
    groups.size > 0
      ? {
          meta: {
            kind: "literature_candidate_export",
            project_id: `WB-HANDOFF-${session.session_id}`,
            graphVersion: session.graphVersion,
            extensionsVersion: session.extensionsVersion,
            exportedAt: new Date().toISOString(),
            curation: "unreviewed",
            note:
              "Workbench curation-queue handoff — candidates only. Not auto-approved. Not a KG write. Import in /curation for human review; live PubMed/Crossref checks run server-side after import.",
          },
          evidence_records: [...groups.values()],
        }
      : null;

  return {
    kind: "workbench_curation_queue_handoff",
    schemaVersion: WORKBENCH_SCHEMA_VERSION,
    wired: false,
    kgWrite: false,
    autoPromote: false,
    experimentallySupported: false,
    session_id: session.session_id,
    exportedAt: new Date().toISOString(),
    openRoute: "/curation",
    note:
      "Human-gated stub: download this package and import manually in Curation. Nothing is written to the curated knowledge graph from the workbench.",
    draftNotes,
    hypothesisClaim: session.hypothesis.claim.trim(),
    reviewDisposition: session.reviewDisposition,
    candidateManifest,
  };
}

export function exportWorkbenchCurationHandoff(session: WorkbenchSession): string {
  return JSON.stringify(buildWorkbenchCurationHandoff(session), null, 2);
}

function touch(s: WorkbenchSession): WorkbenchSession {
  return { ...s, updatedAt: new Date().toISOString(), schemaVersion: WORKBENCH_SCHEMA_VERSION };
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.map((x) => x.trim()).filter(Boolean))];
}

function uniqueStrings(xs: string[]): string[] {
  return [...new Set(xs.map((x) => x.trim()).filter(Boolean))];
}

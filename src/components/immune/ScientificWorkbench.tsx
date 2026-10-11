import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { byId } from "@/lib/immune/engine";
import { GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION } from "@/lib/immune/graphRelease";
import { reasonMechanism } from "@/lib/immune/mechanismReasoning";
import {
  addEvidenceNote,
  addMechanismGap,
  addMechanismPath,
  advanceWorkbench,
  canAdvance,
  canVisitStep,
  createWorkbenchSession,
  experimentCompleteness,
  exportWorkbench,
  importLiteratureJson,
  importMechanismResult,
  retreatWorkbench,
  seedQuestionFromAsk,
  sessionCandidateFlags,
  setReviewDisposition,
  setWorkbenchStep,
  updateExperiment,
  updateHypothesis,
  updateQuestion,
  WORKBENCH_SCHEMA_VERSION,
  workbenchStepIndex,
  workbenchSteps,
  type WorkbenchSession,
  type WorkbenchStep,
} from "@/lib/research/workbench";
import { hypothesisCompleteness } from "@/lib/research/hypothesisDraft";

const STEP_LABEL: Record<WorkbenchStep, string> = {
  question: "Question",
  evidence: "Evidence",
  mechanism: "Mechanism",
  hypothesis: "Hypothesis",
  experiment: "Experiment",
  review: "Review",
};

function CandidateBadge({ label = "candidate" }: { label?: string }) {
  return <span className="chip" title="Not an established finding — human review required">{label}</span>;
}

export default function ScientificWorkbench() {
  const [session, setSession] = useState<WorkbenchSession>(() =>
    createWorkbenchSession(GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION),
  );
  const [evSummary, setEvSummary] = useState("");
  const [evSource, setEvSource] = useState("");
  const [evIds, setEvIds] = useState("");
  const [pathText, setPathText] = useState("");
  const [litJson, setLitJson] = useState("");
  const [litMsg, setLitMsg] = useState<string | null>(null);
  const [mechStart, setMechStart] = useState("C003");
  const [mechPerturb, setMechPerturb] = useState("I001");
  const [mechOutcome, setMechOutcome] = useState("D001");
  const [mechMsg, setMechMsg] = useState<string | null>(null);

  const gate = canAdvance(session);
  const hyp = hypothesisCompleteness(session.hypothesis);
  const exp = experimentCompleteness(session.experiment);
  const steps = workbenchSteps();
  const flags = sessionCandidateFlags(session);

  return (
    <div className="scientific-workbench">
      <p className="lede">
        Guided research flow (PRD FR-038–040): question → evidence → mechanism → hypothesis → experiment → review.
        Every artefact is labelled <CandidateBadge />. Nothing auto-promotes into the curated graph or marks a claim
        experimentally supported.
      </p>

      <p className="small muted" style={{ marginTop: 8 }}>
        Reuse outputs from{" "}
        <Link to="/reasoning">Ask (Reasoning)</Link>
        {" · "}
        <Link to="/mechanism">Mechanism workspace</Link>
        {" · "}
        <a href="#literature">Literature intelligence</a>
        {" "}below. Imports stay candidates.
      </p>

      <ol className="row" style={{ listStyle: "none", padding: 0, gap: 8, flexWrap: "wrap", marginTop: 12 }} aria-label="Workbench steps">
        {steps.map((s) => {
          const visit = canVisitStep(session, s);
          const unlocked = visit.ok;
          return (
            <li key={s}>
              <button
                type="button"
                className={`chip ${session.step === s ? "on" : unlocked ? "" : "muted"}`}
                disabled={!unlocked}
                title={unlocked ? STEP_LABEL[s] : visit.reason}
                aria-current={session.step === s ? "step" : undefined}
                onClick={() => setSession(setWorkbenchStep(session, s))}
              >
                {workbenchStepIndex(s) + 1}. {STEP_LABEL[s]}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="xs muted">
        Session {session.session_id} · schema {WORKBENCH_SCHEMA_VERSION} · graph v{session.graphVersion} · extensions{" "}
        {session.extensionsVersion} · furthest {session.furthestStep}
        {flags.allCandidates ? " · all artefacts candidate" : " · candidate flag issue"}
      </p>

      {session.step === "question" && (
        <section className="card" style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <h3 style={{ fontSize: "1.05rem" }}>Research question <CandidateBadge /></h3>
          <label className="field">Question
            <textarea
              rows={2}
              value={session.question.text}
              onChange={(e) => setSession(updateQuestion(session, { text: e.target.value }))}
              placeholder="e.g. Does NOD2 impair ileal sensing in Crohn disease?"
            />
          </label>
          <label className="field">Search strategy
            <textarea
              rows={2}
              value={session.question.searchStrategy}
              onChange={(e) => setSession(updateQuestion(session, { searchStrategy: e.target.value }))}
              placeholder="Keywords, databases, inclusion rules — no fabricated PMIDs"
            />
          </label>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn sm"
              disabled={!session.question.text.trim()}
              onClick={() => setSession(seedQuestionFromAsk(session))}
            >
              Seed related IDs from Ask retrieval
            </button>
            <Link className="btn sm" to="/reasoning">Open Ask</Link>
          </div>
          {session.question.relatedConceptIds.length > 0 && (
            <p className="xs muted">
              Related concepts (candidate):{" "}
              {session.question.relatedConceptIds.map((id) => byId[id]?.name ?? id).join(", ")}
            </p>
          )}
        </section>
      )}

      {session.step === "evidence" && (
        <section className="card" style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <h3 style={{ fontSize: "1.05rem" }}>Evidence notes <CandidateBadge /></h3>
          <label className="field">Summary
            <textarea rows={2} value={evSummary} onChange={(e) => setEvSummary(e.target.value)} />
          </label>
          <label className="field">Source label (title / PMID you verified — do not invent)
            <input value={evSource} onChange={(e) => setEvSource(e.target.value)} />
          </label>
          <label className="field">Related concept / relationship IDs (comma-separated)
            <input value={evIds} onChange={(e) => setEvIds(e.target.value)} placeholder="EG07, REL-…" />
          </label>
          <button
            type="button"
            className="btn sm"
            disabled={!evSummary.trim()}
            onClick={() => {
              setSession(addEvidenceNote(
                session,
                evSummary,
                evSource,
                evIds.split(",").map((s) => s.trim()).filter(Boolean),
              ));
              setEvSummary("");
              setEvSource("");
              setEvIds("");
            }}
          >
            Add evidence note
          </button>

          <details style={{ marginTop: 4 }}>
            <summary className="small">Import literature candidates (JSON)</summary>
            <p className="xs muted" style={{ marginTop: 6 }}>
              Paste a Literature project export from <a href="#literature">Literature intelligence</a>. Claims become
              evidence notes — still candidates; no PMIDs invented.
            </p>
            <textarea
              rows={4}
              value={litJson}
              onChange={(e) => setLitJson(e.target.value)}
              placeholder='{ "project_id": "…", "claims": [ { "claim_id": "…", "text": "…" } ] }'
              style={{ width: "100%", marginTop: 8 }}
            />
            <button
              type="button"
              className="btn sm"
              style={{ marginTop: 8 }}
              disabled={!litJson.trim()}
              onClick={() => {
                const r = importLiteratureJson(session, litJson);
                setSession(r.session);
                setLitMsg(r.error ? r.error : `Imported ${r.imported} candidate claim(s).`);
                if (!r.error) setLitJson("");
              }}
            >
              Import as evidence notes
            </button>
            {litMsg ? <p className="xs muted">{litMsg}</p> : null}
          </details>

          <ul className="small">
            {session.evidence.map((n) => (
              <li key={n.note_id}>
                <CandidateBadge /> <b>{n.sourceLabel}:</b> {n.summary}
                {n.relatedIds.length ? <span className="muted"> · {n.relatedIds.join(", ")}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {session.step === "mechanism" && (
        <section className="card" style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <h3 style={{ fontSize: "1.05rem" }}>Mechanism path <CandidateBadge label="candidate · illustrative" /></h3>
          <label className="field">Path or gap description
            <textarea
              rows={2}
              value={pathText}
              onChange={(e) => setPathText(e.target.value)}
              placeholder="e.g. EG02 → B007 → D001 (illustrative)"
            />
          </label>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn sm"
              disabled={!pathText.trim()}
              onClick={() => {
                setSession(addMechanismPath(session, pathText));
                setPathText("");
              }}
            >
              Add path
            </button>
            <button
              type="button"
              className="btn sm"
              disabled={!pathText.trim()}
              onClick={() => {
                setSession(addMechanismGap(session, pathText));
                setPathText("");
              }}
            >
              Record gap
            </button>
            <Link className="btn sm" to="/mechanism">Open Mechanism workspace</Link>
          </div>

          <details>
            <summary className="small">Import from Mechanism workspace (graph walk)</summary>
            <p className="xs muted" style={{ marginTop: 6 }}>
              Runs the same rule-based walk as /mechanism. Result is illustrative and labelled candidate — not a validated finding.
            </p>
            <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <label className="field">Start
                <input value={mechStart} onChange={(e) => setMechStart(e.target.value.trim())} />
              </label>
              <label className="field">Perturb
                <input value={mechPerturb} onChange={(e) => setMechPerturb(e.target.value.trim())} />
              </label>
              <label className="field">Outcome
                <input value={mechOutcome} onChange={(e) => setMechOutcome(e.target.value.trim())} />
              </label>
            </div>
            <button
              type="button"
              className="btn sm"
              style={{ marginTop: 8 }}
              onClick={() => {
                const r = reasonMechanism(mechStart, mechPerturb, mechOutcome, "inhibit");
                if (!r) {
                  setMechMsg("Unknown node IDs or invalid triple — check the graph.");
                  return;
                }
                setSession(importMechanismResult(session, r));
                setMechMsg(`Imported illustrative path/gaps (${r.gaps.length} gap note(s)).`);
              }}
            >
              Import mechanism summary
            </button>
            {mechMsg ? <p className="xs muted">{mechMsg}</p> : null}
          </details>

          <p className="xs muted">Assumptions: {session.mechanism.assumptions.join(" ")}</p>
          <ul className="small">
            {session.mechanism.paths.map((p) => <li key={p}><CandidateBadge /> Path: {p}</li>)}
            {session.mechanism.gaps.map((g) => <li key={g}><CandidateBadge /> Gap: {g}</li>)}
          </ul>
        </section>
      )}

      {session.step === "hypothesis" && (
        <section className="card" style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <h3 style={{ fontSize: "1.05rem" }}>Hypothesis <CandidateBadge /></h3>
          <p className="xs muted">Status locked to candidate / under_review — never auto-marked experimentally supported.</p>
          {(
            [
              ["claim", "Claim"],
              ["mechanism", "Mechanism"],
              ["predictedObservation", "Predicted observation"],
              ["falsificationTest", "Falsification test"],
              ["alternativePath", "Alternative / disconfirming path"],
            ] as const
          ).map(([key, label]) => (
            <label className="field" key={key}>{label}
              <textarea
                rows={2}
                value={session.hypothesis[key]}
                onChange={(e) => setSession(updateHypothesis(session, { [key]: e.target.value }))}
              />
            </label>
          ))}
          <label className="field">Supporting concept/relationship IDs (comma-separated)
            <input
              value={session.hypothesis.supportingIds.join(", ")}
              onChange={(e) => setSession(updateHypothesis(session, {
                supportingIds: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              }))}
            />
          </label>
          <p className="xs muted">
            {session.hypothesis.status} · {hyp.ok ? "Structurally complete candidate" : `Missing: ${hyp.missing.join(", ")}`}
          </p>
        </section>
      )}

      {session.step === "experiment" && (
        <section className="card" style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <h3 style={{ fontSize: "1.05rem" }}>Experiment proposal <CandidateBadge label="draft proposal · candidate" /></h3>
          {(
            [
              ["question", "Experiment question"],
              ["systemModel", "System / model"],
              ["controls", "Controls"],
              ["readouts", "Readouts"],
              ["confounders", "Confounders"],
              ["safetyEthics", "Safety / ethics"],
            ] as const
          ).map(([key, label]) => (
            <label className="field" key={key}>{label}
              <textarea
                rows={2}
                value={session.experiment[key]}
                onChange={(e) => setSession(updateExperiment(session, { [key]: e.target.value }))}
              />
            </label>
          ))}
          <p className="xs muted">{exp.ok ? "Structurally complete draft proposal" : `Missing: ${exp.missing.join(", ")}`}</p>
        </section>
      )}

      {session.step === "review" && (
        <section className="card" style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <h3 style={{ fontSize: "1.05rem" }}>Human review <CandidateBadge label="required" /></h3>
          <p className="small">
            Question: {session.question.text || "—"} · Evidence notes: {session.evidence.length} ·
            Paths: {session.mechanism.paths.length} · Gaps: {session.mechanism.gaps.length} ·
            Hypothesis: {session.hypothesis.status} · Experiment: {session.experiment.status}
          </p>
          <ul className="xs muted">
            {Object.entries(flags.flags).map(([k, v]) => (
              <li key={k}>{k}: {v}</li>
            ))}
          </ul>
          <label className="field">Reviewer notes
            <textarea
              rows={3}
              value={session.reviewNotes}
              onChange={(e) => setSession({ ...session, reviewNotes: e.target.value, updatedAt: new Date().toISOString() })}
            />
          </label>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn sm" onClick={() => setSession(setReviewDisposition(session, "needs_revision"))}>
              Needs revision
            </button>
            <button type="button" className="btn sm" onClick={() => setSession(setReviewDisposition(session, "approved_for_export_only"))}>
              Approve for export only
            </button>
            <button type="button" className="btn sm" onClick={() => setSession(setReviewDisposition(session, "pending"))}>
              Reset disposition
            </button>
          </div>
          <p className="xs muted">
            Disposition: {session.reviewDisposition}. “Approve for export only” does not write the curated KG and does not
            mean experimentally supported. Expert sign-off in curation is a separate step.
          </p>
          {session.importLog.length > 0 && (
            <p className="xs muted">Import log: {session.importLog.join(" · ")}</p>
          )}
        </section>
      )}

      <div className="row" style={{ marginTop: 16, gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn sm"
          disabled={workbenchStepIndex(session.step) === 0}
          onClick={() => setSession(retreatWorkbench(session))}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn sm"
          disabled={!gate.ok}
          title={gate.reason}
          onClick={() => setSession(advanceWorkbench(session))}
        >
          Next step
        </button>
        {!gate.ok && session.step !== "review" ? <span className="xs muted">{gate.reason}</span> : null}
        <button
          type="button"
          className="btn sm"
          onClick={() => {
            const blob = new Blob([exportWorkbench(session)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${session.session_id}.${WORKBENCH_SCHEMA_VERSION}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export versioned JSON
        </button>
        <button
          type="button"
          className="btn sm"
          onClick={() => setSession(createWorkbenchSession(GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION))}
        >
          New session
        </button>
      </div>
    </div>
  );
}

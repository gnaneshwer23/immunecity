import { useState } from "react";
import { GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION } from "@/lib/immune/graphRelease";
import {
  addEvidenceNote,
  advanceWorkbench,
  canAdvance,
  createWorkbenchSession,
  experimentCompleteness,
  exportWorkbench,
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

export default function ScientificWorkbench() {
  const [session, setSession] = useState<WorkbenchSession>(() =>
    createWorkbenchSession(GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION),
  );
  const [evSummary, setEvSummary] = useState("");
  const [evSource, setEvSource] = useState("");
  const [pathText, setPathText] = useState("");
  const gate = canAdvance(session);
  const hyp = hypothesisCompleteness(session.hypothesis);
  const exp = experimentCompleteness(session.experiment);
  const steps = workbenchSteps();

  return (
    <div className="scientific-workbench">
      <p className="lede">
        Research Workbench alpha — every artefact is labelled <b>candidate</b>. Nothing auto-promotes into the curated graph
        or certifies a wet-lab protocol.
      </p>
      <ol className="row" style={{ listStyle: "none", padding: 0, gap: 8, flexWrap: "wrap" }}>
        {steps.map((s) => (
          <li key={s}>
            <button
              type="button"
              className={`chip ${session.step === s ? "" : "muted"}`}
              onClick={() => setSession({ ...session, step: s, updatedAt: new Date().toISOString() })}
            >
              {workbenchStepIndex(s) + 1}. {STEP_LABEL[s]}
            </button>
          </li>
        ))}
      </ol>
      <p className="xs muted">
        Session {session.session_id} · graph v{session.graphVersion} · extensions {session.extensionsVersion}
      </p>

      {session.step === "question" && (
        <section className="card" style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <h3 style={{ fontSize: "1.05rem" }}>Research question <span className="chip">candidate</span></h3>
          <label className="field">Question
            <textarea
              rows={2}
              value={session.question.text}
              onChange={(e) => setSession({
                ...session,
                question: { ...session.question, text: e.target.value },
                updatedAt: new Date().toISOString(),
              })}
            />
          </label>
          <label className="field">Search strategy
            <textarea
              rows={2}
              value={session.question.searchStrategy}
              onChange={(e) => setSession({
                ...session,
                question: { ...session.question, searchStrategy: e.target.value },
                updatedAt: new Date().toISOString(),
              })}
            />
          </label>
        </section>
      )}

      {session.step === "evidence" && (
        <section className="card" style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <h3 style={{ fontSize: "1.05rem" }}>Evidence notes <span className="chip">candidate</span></h3>
          <label className="field">Summary
            <textarea rows={2} value={evSummary} onChange={(e) => setEvSummary(e.target.value)} />
          </label>
          <label className="field">Source label (title / PMID you verified — do not invent)
            <input value={evSource} onChange={(e) => setEvSource(e.target.value)} />
          </label>
          <button
            type="button"
            className="btn sm"
            disabled={!evSummary.trim()}
            onClick={() => {
              setSession(addEvidenceNote(session, evSummary, evSource));
              setEvSummary("");
              setEvSource("");
            }}
          >
            Add evidence note
          </button>
          <ul className="small">
            {session.evidence.map((n) => (
              <li key={n.note_id}><b>{n.sourceLabel}:</b> {n.summary}</li>
            ))}
          </ul>
        </section>
      )}

      {session.step === "mechanism" && (
        <section className="card" style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <h3 style={{ fontSize: "1.05rem" }}>Mechanism path <span className="chip">candidate</span></h3>
          <label className="field">Path or gap description
            <textarea rows={2} value={pathText} onChange={(e) => setPathText(e.target.value)} placeholder="e.g. EG02 → B007 → D001 (illustrative)" />
          </label>
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn sm"
              disabled={!pathText.trim()}
              onClick={() => {
                setSession({
                  ...session,
                  mechanism: { ...session.mechanism, paths: [...session.mechanism.paths, pathText.trim()] },
                  updatedAt: new Date().toISOString(),
                });
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
                setSession({
                  ...session,
                  mechanism: { ...session.mechanism, gaps: [...session.mechanism.gaps, pathText.trim()] },
                  updatedAt: new Date().toISOString(),
                });
                setPathText("");
              }}
            >
              Record gap
            </button>
          </div>
          <p className="xs muted">Assumptions: {session.mechanism.assumptions.join(" ")}</p>
          <ul className="small">
            {session.mechanism.paths.map((p) => <li key={p}>Path: {p}</li>)}
            {session.mechanism.gaps.map((g) => <li key={g}>Gap: {g}</li>)}
          </ul>
        </section>
      )}

      {session.step === "hypothesis" && (
        <section className="card" style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <h3 style={{ fontSize: "1.05rem" }}>Hypothesis <span className="chip">candidate</span></h3>
          <label className="field">Claim
            <textarea rows={2} value={session.hypothesis.claim} onChange={(e) => setSession({ ...session, hypothesis: { ...session.hypothesis, claim: e.target.value }, updatedAt: new Date().toISOString() })} />
          </label>
          <label className="field">Mechanism
            <textarea rows={2} value={session.hypothesis.mechanism} onChange={(e) => setSession({ ...session, hypothesis: { ...session.hypothesis, mechanism: e.target.value }, updatedAt: new Date().toISOString() })} />
          </label>
          <label className="field">Predicted observation
            <textarea rows={2} value={session.hypothesis.predictedObservation} onChange={(e) => setSession({ ...session, hypothesis: { ...session.hypothesis, predictedObservation: e.target.value }, updatedAt: new Date().toISOString() })} />
          </label>
          <label className="field">Falsification test
            <textarea rows={2} value={session.hypothesis.falsificationTest} onChange={(e) => setSession({ ...session, hypothesis: { ...session.hypothesis, falsificationTest: e.target.value }, updatedAt: new Date().toISOString() })} />
          </label>
          <label className="field">Alternative / disconfirming path
            <textarea rows={2} value={session.hypothesis.alternativePath} onChange={(e) => setSession({ ...session, hypothesis: { ...session.hypothesis, alternativePath: e.target.value }, updatedAt: new Date().toISOString() })} />
          </label>
          <p className="xs muted">{hyp.ok ? "Structurally complete candidate" : `Missing: ${hyp.missing.join(", ")}`}</p>
        </section>
      )}

      {session.step === "experiment" && (
        <section className="card" style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <h3 style={{ fontSize: "1.05rem" }}>Experiment proposal <span className="chip">draft proposal</span></h3>
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
                onChange={(e) => setSession({
                  ...session,
                  experiment: { ...session.experiment, [key]: e.target.value },
                  updatedAt: new Date().toISOString(),
                })}
              />
            </label>
          ))}
          <p className="xs muted">{exp.ok ? "Structurally complete draft proposal" : `Missing: ${exp.missing.join(", ")}`}</p>
        </section>
      )}

      {session.step === "review" && (
        <section className="card" style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <h3 style={{ fontSize: "1.05rem" }}>Human review</h3>
          <p className="small">
            Question: {session.question.text || "—"} · Evidence notes: {session.evidence.length} ·
            Paths: {session.mechanism.paths.length} · Gaps: {session.mechanism.gaps.length} ·
            Hypothesis status: {session.hypothesis.status} · Experiment: {session.experiment.status}
          </p>
          <label className="field">Reviewer notes
            <textarea
              rows={3}
              value={session.reviewNotes}
              onChange={(e) => setSession({ ...session, reviewNotes: e.target.value, updatedAt: new Date().toISOString() })}
            />
          </label>
          <p className="xs muted">Expert sign-off is required before any claim enters the curated graph. This UI does not perform that write.</p>
        </section>
      )}

      <div className="row" style={{ marginTop: 16, gap: 8, flexWrap: "wrap" }}>
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
            a.download = `${session.session_id}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export workbench JSON
        </button>
      </div>
    </div>
  );
}

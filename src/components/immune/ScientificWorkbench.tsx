import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { byId } from "@/lib/immune/engine";
import { GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION } from "@/lib/immune/graphRelease";
import { reasonMechanism } from "@/lib/immune/mechanismReasoning";
import {
  addEvidenceNote,
  addMechanismGap,
  addMechanismPath,
  addWorkbenchClaim,
  advanceWorkbench,
  canAdvance,
  canVisitStep,
  createWorkbenchSession,
  experimentCompleteness,
  exportWorkbench,
  exportWorkbenchCurationHandoff,
  importLiteraturePayload,
  importMechanismResult,
  parseLocalDraft,
  restoreWorkbenchFromExportJson,
  retreatWorkbench,
  seedQuestionFromAsk,
  serializeLocalDraft,
  sessionCandidateFlags,
  setReviewDisposition,
  setWorkbenchStep,
  updateExperiment,
  updateHypothesis,
  updateQuestion,
  updateWorkbenchClaimLifecycle,
  WORKBENCH_LOCAL_DRAFT_KEY,
  WORKBENCH_SCHEMA_VERSION,
  workbenchProgress,
  workbenchStepIndex,
  workbenchSteps,
  type WorkbenchSession,
  type WorkbenchStep,
} from "@/lib/research/workbench";
import { claimLifecycleLabel, summariseClaimTable } from "@/lib/research/claimLedger";
import { hypothesisCompleteness } from "@/lib/research/hypothesisDraft";

const STEP_LABEL: Record<WorkbenchStep, string> = {
  question: "Question",
  evidence: "Evidence",
  mechanism: "Mechanism",
  hypothesis: "Hypothesis",
  experiment: "Experiment",
  review: "Review",
};

function CandidateBadge({ label = "candidate · draft" }: { label?: string }) {
  return <span className="chip" title="Not an established finding — human review required">{label}</span>;
}

export type WorkbenchSeed = {
  question?: string;
  startId?: string;
  perturbId?: string;
  outcomeId?: string;
};

type Props = {
  /** Literature / curation JSON handed off from the Literature panel on this page. */
  pendingLitImport?: string | null;
  onPendingLitImportConsumed?: () => void;
  /** Optional URL / cross-page seeds (still candidate). */
  seed?: WorkbenchSeed;
};

export default function ScientificWorkbench({
  pendingLitImport = null,
  onPendingLitImportConsumed,
  seed,
}: Props) {
  const [session, setSession] = useState<WorkbenchSession>(() =>
    createWorkbenchSession(GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION),
  );
  const [evSummary, setEvSummary] = useState("");
  const [evSource, setEvSource] = useState("");
  const [evIds, setEvIds] = useState("");
  const [claimAssertion, setClaimAssertion] = useState("");
  const [claimSpan, setClaimSpan] = useState("");
  const [claimRel, setClaimRel] = useState("");
  const [pathText, setPathText] = useState("");
  const [importJson, setImportJson] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [mechStart, setMechStart] = useState(seed?.startId || "C003");
  const [mechPerturb, setMechPerturb] = useState(seed?.perturbId || "I001");
  const [mechOutcome, setMechOutcome] = useState(seed?.outcomeId || "D001");
  const [mechMsg, setMechMsg] = useState<string | null>(null);
  const [draftMsg, setDraftMsg] = useState<string | null>(null);
  const [handoffMsg, setHandoffMsg] = useState<string | null>(null);
  const [seedApplied, setSeedApplied] = useState(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    if (seedApplied) return;
    if (!seed?.question?.trim() && !seed?.startId) return;
    setSeedApplied(true);
    setSession((prev) => {
      let next = prev;
      if (seed.question?.trim()) {
        next = updateQuestion(next, { text: seed.question.trim() });
        next = seedQuestionFromAsk(next);
      }
      return next;
    });
    if (seed.startId) setMechStart(seed.startId);
    if (seed.perturbId) setMechPerturb(seed.perturbId);
    if (seed.outcomeId) setMechOutcome(seed.outcomeId);
  }, [seed, seedApplied]);

  useEffect(() => {
    if (!pendingLitImport?.trim()) return;
    const r = importLiteraturePayload(sessionRef.current, pendingLitImport);
    setSession(r.session);
    setImportMsg(
      r.error
        ? r.error
        : `Imported ${r.imported} candidate claim(s) from Literature (${r.source}). Still drafts — not curated.`,
    );
    onPendingLitImportConsumed?.();
  }, [pendingLitImport, onPendingLitImportConsumed]);

  const gate = canAdvance(session);
  const hyp = hypothesisCompleteness(session.hypothesis);
  const exp = experimentCompleteness(session.experiment);
  const steps = workbenchSteps();
  const flags = sessionCandidateFlags(session);
  const progress = workbenchProgress(session);
  const claimSummary = summariseClaimTable(session.claims ?? []);

  const applyImportJson = () => {
    const text = importJson.trim();
    if (!text) return;
    const asWb = restoreWorkbenchFromExportJson(text);
    if (asWb.session) {
      setSession(asWb.session);
      setImportMsg("Restored workbench export as local draft (candidates only; no KG write).");
      setImportJson("");
      return;
    }
    const r = importLiteraturePayload(session, text);
    setSession(r.session);
    setImportMsg(
      r.error
        ? `${r.error}${asWb.error ? ` · ${asWb.error}` : ""}`
        : `Imported ${r.imported} candidate claim(s) (${r.source}).`,
    );
    if (!r.error) setImportJson("");
  };

  const saveLocalDraft = () => {
    try {
      localStorage.setItem(WORKBENCH_LOCAL_DRAFT_KEY, serializeLocalDraft(session));
      setDraftMsg("Saved local draft in this browser — not curated, not shared.");
    } catch {
      setDraftMsg("Could not save local draft (storage blocked).");
    }
  };

  const loadLocalDraft = () => {
    try {
      const raw = localStorage.getItem(WORKBENCH_LOCAL_DRAFT_KEY);
      if (!raw) {
        setDraftMsg("No local draft found in this browser.");
        return;
      }
      const parsed = parseLocalDraft(raw);
      if (parsed.error || !parsed.session) {
        setDraftMsg(parsed.error ?? "Could not restore local draft.");
        return;
      }
      setSession(parsed.session);
      setDraftMsg("Restored local draft (candidate artefacts only).");
    } catch {
      setDraftMsg("Could not read local draft.");
    }
  };

  const seedMechFromQuestion = () => {
    const ids = session.question.relatedConceptIds.filter((id) => byId[id]);
    if (ids[0]) setMechStart(ids[0]);
    if (ids[1]) setMechPerturb(ids[1]);
    if (ids[2]) setMechOutcome(ids[2]);
    setMechMsg(
      ids.length
        ? `Prefilled ${Math.min(3, ids.length)} Ask-matched concept ID(s) — still illustrative.`
        : "No Ask-matched concepts yet — seed the question from Ask first.",
    );
  };

  return (
    <div className="scientific-workbench">
      <p className="lede">
        Research investigation: question → evidence → mechanism → hypothesis → experiment → review.
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
        {" "}below. Imports stay candidates. Local drafts never write the KG.
      </p>

      <div className="row" style={{ marginTop: 12, gap: 6, flexWrap: "wrap" }} aria-label="Workbench progress">
        {progress.map((p) => (
          <span
            key={p.step}
            className={`chip ${session.step === p.step ? "on" : ""} ${p.ready ? "" : "muted"}`}
            title={p.detail}
          >
            {p.ready ? "●" : "○"} {p.label}
          </span>
        ))}
      </div>

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
        Session <span suppressHydrationWarning>{session.session_id}</span> · schema {WORKBENCH_SCHEMA_VERSION} · graph v{session.graphVersion} · extensions{" "}
        {session.extensionsVersion} · furthest {session.furthestStep}
        {flags.allCandidates ? " · all artefacts candidate" : " · candidate flag issue"}
      </p>

      <details style={{ marginTop: 10 }}>
        <summary className="small">Import candidates (Ask / lit / workbench export)</summary>
        <p className="xs muted" style={{ marginTop: 6 }}>
          Paste a literature project JSON, curation-candidate manifest, or a prior workbench export.
          No PMIDs or model scores are invented; rows stay draft candidates.
        </p>
        <textarea
          rows={4}
          value={importJson}
          onChange={(e) => setImportJson(e.target.value)}
          placeholder='Literature project, curation manifest, or { "kind": "scientific_workbench_export", … }'
          style={{ width: "100%", marginTop: 8 }}
        />
        <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <button type="button" className="btn sm" disabled={!importJson.trim()} onClick={applyImportJson}>
            Import as candidates
          </button>
          <button type="button" className="btn sm" onClick={saveLocalDraft}>
            Save local draft
          </button>
          <button type="button" className="btn sm" onClick={loadLocalDraft}>
            Restore local draft
          </button>
        </div>
        {importMsg ? <p className="xs muted" role="status">{importMsg}</p> : null}
        {draftMsg ? <p className="xs muted" role="status">{draftMsg}</p> : null}
      </details>

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
          {session.question.relatedRelIds.length > 0 && (
            <p className="xs muted">
              Related relationships (candidate): {session.question.relatedRelIds.slice(0, 8).join(", ")}
              {session.question.relatedRelIds.length > 8 ? "…" : ""}
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

          <p className="xs muted">
            Prefer <a href="#literature">Send to workbench</a> from Literature intelligence, or paste JSON in Import
            candidates above. Claims remain draft until a curator reviews them elsewhere.
          </p>

          <ul className="small">
            {session.evidence.map((n) => (
              <li key={n.note_id}>
                <CandidateBadge /> <b>{n.sourceLabel}:</b> {n.summary}
                {n.relatedIds.length ? <span className="muted"> · {n.relatedIds.join(", ")}</span> : null}
                {n.sourceClaimId ? <span className="muted"> · claim {n.sourceClaimId}</span> : null}
              </li>
            ))}
          </ul>

          <h4 style={{ fontSize: "0.95rem", marginTop: 8 }}>Claim ledger (candidates) <CandidateBadge /></h4>
          <p className="xs muted">
            Layer B scaffold: assertion + optional span + mapped relationship. Lifecycle stays local —
            &quot;Ready for curator&quot; is not Gate C approval and never writes the KG.
          </p>
          <label className="field">Assertion
            <textarea rows={2} value={claimAssertion} onChange={(e) => setClaimAssertion(e.target.value)} />
          </label>
          <label className="field">Passage span (exact quote you verified — do not invent)
            <input value={claimSpan} onChange={(e) => setClaimSpan(e.target.value)} />
          </label>
          <label className="field">Mapped relationship ID (optional)
            <input value={claimRel} onChange={(e) => setClaimRel(e.target.value)} placeholder="REL-…" />
          </label>
          <button
            type="button"
            className="btn sm"
            disabled={!claimAssertion.trim()}
            onClick={() => {
              setSession(
                addWorkbenchClaim(session, {
                  assertion: claimAssertion,
                  passageSpan: claimSpan,
                  mappedRelationshipId: claimRel.startsWith("REL-") ? claimRel.trim() : null,
                }),
              );
              setClaimAssertion("");
              setClaimSpan("");
              setClaimRel("");
            }}
          >
            Add claim candidate
          </button>
          <p className="xs muted">
            {claimSummary.total} claim(s) · mapped {claimSummary.mapped} · with span {claimSummary.withPassage}
          </p>
          {(session.claims ?? []).length > 0 ? (
            <div className="table-wrap" style={{ overflowX: "auto" }}>
              <table className="small" aria-label="Claim ledger candidates">
                <thead>
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Assertion</th>
                    <th scope="col">Polarity</th>
                    <th scope="col">Lifecycle</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(session.claims ?? []).map((c) => (
                    <tr key={c.claim_id}>
                      <td className="muted">{c.claim_id.slice(0, 18)}</td>
                      <td>
                        {c.assertion}
                        {c.passageSpan ? <div className="xs muted">span: {c.passageSpan}</div> : null}
                        {c.mappedRelationshipId ? (
                          <div className="xs muted">{c.mappedRelationshipId}</div>
                        ) : null}
                      </td>
                      <td>{c.polarity}</td>
                      <td>{claimLifecycleLabel(c.lifecycle)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() =>
                            setSession(updateWorkbenchClaimLifecycle(session, c.claim_id, "claim_assessed"))
                          }
                        >
                          Assess
                        </button>{" "}
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() =>
                            setSession(
                              updateWorkbenchClaimLifecycle(
                                session,
                                c.claim_id,
                                "approved",
                                "Ready for curator handoff — not Gate C",
                              ),
                            )
                          }
                        >
                          Curator queue
                        </button>{" "}
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() =>
                            setSession(updateWorkbenchClaimLifecycle(session, c.claim_id, "rejected"))
                          }
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="xs muted">No claim candidates yet — add assertions above.</p>
          )}
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

          <details open>
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
            <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button type="button" className="btn sm" onClick={seedMechFromQuestion}>
                Prefill from Ask-matched IDs
              </button>
              <button
                type="button"
                className="btn sm"
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
            </div>
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
          <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <button
              type="button"
              className="btn sm"
              disabled={session.evidence.length === 0}
              title={
                session.evidence.length === 0
                  ? "Add at least one candidate evidence note first"
                  : "Download a candidate package for manual /curation import — does not write the KG"
              }
              onClick={() => {
                const text = exportWorkbenchCurationHandoff(session);
                const blob = new Blob([text], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${session.session_id}.curation-handoff.json`;
                a.click();
                URL.revokeObjectURL(url);
                setHandoffMsg(
                  "Downloaded curation-queue handoff (wired=false). Open Curation to import manually — nothing was written to the curated graph.",
                );
              }}
            >
              Promote to curation queue (export stub)
            </button>
            <Link to="/curation" className="btn sm">
              Open Curation
            </Link>
          </div>
          <p className="xs muted">
            Handoff is human-gated: download → paste/import in Curation → admin review. Not wired for silent KG mutation.
          </p>
          {handoffMsg ? <p className="xs muted" role="status">{handoffMsg}</p> : null}
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
          onClick={() => {
            setSession(createWorkbenchSession(GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION));
            setImportMsg(null);
            setDraftMsg(null);
            setHandoffMsg(null);
            setMechMsg(null);
          }}
        >
          New session
        </button>
      </div>
    </div>
  );
}

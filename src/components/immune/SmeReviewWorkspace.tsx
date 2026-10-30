/**
 * SME review workspace — melanoma / KEYNOTE / R011 queues + gold-set + rematch.
 * Reviewer-gated actions; never bulk-approves or invents PMIDs / gold scores.
 */
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DetailPanel, Facts, Toolbar } from "@/components/immune/page";
import {
  getSmeWorkspaceSnapshot,
  listSmeEvidenceQueueSlice,
  listSmeWorkItemEvents,
  recordSmeCitationRematch,
  recordSmeSpoRewriteProposal,
  recordSmeWorkDecision,
  upsertSmeGoldLabel,
} from "@/lib/sme/sme.functions";
import { SME_GOLD_LABELS, type SmeGoldCase, type SmeGoldLabel } from "@/lib/sme/goldSet";
import type { SmeWorkItem } from "@/lib/sme/workQueue";
import type { SmeEvalReport } from "@/lib/sme/evalRunner";
import type { SmeHumanChecklistStep } from "@/lib/sme/workItemStatus";

type Snapshot = Awaited<ReturnType<typeof getSmeWorkspaceSnapshot>>;

export default function SmeReviewWorkspace({ gapKey }: { gapKey?: string } = {}) {
  const snapFn = useServerFn(getSmeWorkspaceSnapshot);
  const queueFn = useServerFn(listSmeEvidenceQueueSlice);
  const decideFn = useServerFn(recordSmeWorkDecision);
  const rematchFn = useServerFn(recordSmeCitationRematch);
  const spoFn = useServerFn(recordSmeSpoRewriteProposal);
  const goldFn = useServerFn(upsertSmeGoldLabel);
  const eventsFn = useServerFn(listSmeWorkItemEvents);

  const gapKeyParam = (gapKey ?? "").trim();

  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<SmeWorkItem | null>(null);
  const [evidenceUuid, setEvidenceUuid] = useState("");
  const [rationale, setRationale] = useState("");
  const [pmid, setPmid] = useState("");
  const [doi, setDoi] = useState("");
  const [passage, setPassage] = useState("");
  const [spoSubject, setSpoSubject] = useState("");
  const [spoPredicate, setSpoPredicate] = useState("");
  const [spoObject, setSpoObject] = useState("");
  const [goldCase, setGoldCase] = useState<SmeGoldCase | null>(null);
  const [goldLabel, setGoldLabel] = useState<SmeGoldLabel>("genuine_gap");
  const [goldScore, setGoldScore] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [idByEvidence, setIdByEvidence] = useState<Record<string, string>>({});
  const [queueFilter, setQueueFilter] = useState<"all" | "priority" | "discovery">("all");

  const load = useCallback(async () => {
    setBusy(true);
    setMsg("");
    try {
      const s = await snapFn();
      setSnap(s);
      setMsg(
        s.canReview
          ? `Loaded ${s.workItems.length} work items · pending_sme=${s.workSummary.pendingSme} · resolved=${s.workSummary.resolvedBySme}`
          : "Signed in — scientific reviewer role required for decisions.",
      );
      if (s.canReview) {
        const relIds = s.priority.map((p) => p.relId).filter(Boolean) as string[];
        const slice = await queueFn({ data: { relationshipIds: relIds.length ? relIds : undefined, limit: 40 } });
        setIdByEvidence(slice.idByEvidence);
      }
      if (gapKeyParam) {
        const match =
          s.workItems.find((i) => i.gapKey === gapKeyParam) ??
          s.workItems.find((i) => i.id === `SME-DISC-${gapKeyParam}`);
        if (match) setSelected(match);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "SME workspace failed to load.");
      setSnap(null);
    }
    setBusy(false);
  }, [snapFn, queueFn, gapKeyParam]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selected) return;
    if (selected.suggestedPmid) setPmid(selected.suggestedPmid);
    if (selected.suggestedDoi) setDoi(selected.suggestedDoi);
  }, [selected]);

  const runDecision = async (action: "approve" | "reject" | "request_changes") => {
    if (!selected || !evidenceUuid || rationale.trim().length < 8) {
      setMsg("Select a work item, paste evidence UUID, and write a rationale (≥8 chars).");
      return;
    }
    if (action === "approve" && !window.confirm("Approve as Gate C support? Human decision only — never automatic.")) {
      return;
    }
    setBusy(true);
    try {
      await decideFn({
        data: {
          workItemId: selected.id,
          evidenceUuid,
          action,
          rationale: rationale.trim(),
        },
      });
      setMsg(`${action} recorded (audited).`);
      setRationale("");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Decision failed.");
    }
    setBusy(false);
  };

  const runRematch = async () => {
    if (!selected?.relId || !evidenceUuid) {
      setMsg("Rematch needs a work item with relId and evidence UUID.");
      return;
    }
    setBusy(true);
    try {
      const res = await rematchFn({
        data: {
          workItemId: selected.id,
          evidenceUuid,
          relationshipId: selected.relId,
          pmid,
          doi,
          passageLocator: passage,
          rationale: rationale.trim() || `SME rematch for ${selected.id}`,
        },
      });
      setMsg(res.note);
      setPassage("");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Rematch failed.");
    }
    setBusy(false);
  };

  const saveGold = async () => {
    if (!goldCase) return;
    const parsedScore = goldScore.trim() === "" ? null : Number(goldScore);
    if (parsedScore !== null && (Number.isNaN(parsedScore) || parsedScore < 0 || parsedScore > 1)) {
      setMsg("Optional smeScore must be empty (null) or a number from 0–1 — never invent.");
      return;
    }
    setBusy(true);
    try {
      await goldFn({
        data: {
          caseId: goldCase.id,
          workItemId: goldCase.workItemId,
          gapKey: goldCase.gapKey,
          label: goldLabel,
          smeScore: parsedScore,
          notes: rationale.trim() || goldCase.notes,
        },
      });
      setMsg(
        `Gold label ${goldLabel} saved for ${goldCase.id} (score=${parsedScore === null ? "null" : String(parsedScore)}).`,
      );
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gold label save failed.");
    }
    setBusy(false);
  };

  const runSpoProposal = async () => {
    if (!selected || selected.kind !== "r011_spo_rewrite") {
      setMsg("Select the R011 S-P-O work item before recording a rewrite proposal.");
      return;
    }
    if (!spoSubject.trim() || !spoPredicate.trim() || !spoObject.trim() || rationale.trim().length < 8) {
      setMsg("Proposed S / P / O and rationale (≥8 chars) required. Do not invent — scientist fills.");
      return;
    }
    setBusy(true);
    try {
      const res = await spoFn({
        data: {
          workItemId: selected.id,
          evidenceUuid: evidenceUuid || undefined,
          relationshipId: selected.relId,
          proposedSubject: spoSubject.trim(),
          proposedPredicate: spoPredicate.trim(),
          proposedObject: spoObject.trim(),
          rationale: rationale.trim(),
        },
      });
      setMsg(res.note);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "S-P-O proposal failed.");
    }
    setBusy(false);
  };

  const loadEvents = async (workItemId: string) => {
    setBusy(true);
    try {
      const r = await eventsFn({ data: { workItemId, limit: 30 } });
      setEvents(
        r.events.map((e) => `${e.createdAt} · ${e.actor} · ${e.action} · ${e.rationale.slice(0, 80)}`),
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Audit load failed.");
    }
    setBusy(false);
  };

  const evalReport: SmeEvalReport | null = snap?.evalReport ?? null;
  const priority = snap?.priority ?? [];
  const workItems = snap?.workItems ?? [];
  const goldCases = snap?.goldCases ?? [];

  const filteredQueue = useMemo(() => {
    if (queueFilter === "priority") return priority;
    if (queueFilter === "discovery") {
      return workItems.filter((i) => i.kind === "discovery_gap" || Boolean(i.gapKey));
    }
    return workItems;
  }, [queueFilter, priority, workItems]);

  const gapMatch =
    gapKeyParam &&
    (selected?.gapKey === gapKeyParam || selected?.id === `SME-DISC-${gapKeyParam}`);

  const statusFacts = useMemo(() => {
    if (!snap) return [];
    return [
      { label: "Pending SME", children: String(snap.workSummary.pendingSme) },
      { label: "Resolved", children: String(snap.workSummary.resolvedBySme) },
      { label: "Gold labelled", children: snap.goldSummary.labelledRate },
      {
        label: "Safeguards",
        children: (
          <span className="isi-sme-safeguards">
            autoApprove={String(snap.autoApprove)} · autoRematch={String(snap.autoRematch)} · TI=
            {String(snap.trialIntelligenceEnabled)}
          </span>
        ),
      },
    ];
  }, [snap]);

  return (
    <div className="isi-sme" data-testid="sme-review-workspace">
      <Toolbar
        count={
          snap
            ? `${snap.workSummary.pendingSme} pending · ${snap.workSummary.resolvedBySme} resolved`
            : busy
              ? "Loading…"
              : "—"
        }
      >
        <div className="isi-sme-toolbar-row">
          <button type="button" className="btn sm" disabled={busy} onClick={() => void load()}>
            Refresh
          </button>
          <Link to="/curation" className="btn sm">
            Evidence curation
          </Link>
          <Link to="/discovery" className="btn sm">
            Discovery Radar
          </Link>
        </div>
      </Toolbar>

      {msg ? (
        <p className="isi-sme-status xs muted" role="status">
          {msg}
        </p>
      ) : null}

      {snap ? (
        <div className="isi-sme-overview">
          <p className="isi-note isi-sme-edu">
            Educational / research review tooling — not CDS. Priority KEYNOTE and R011 stay{" "}
            <em>pending_sme</em> until a human scientist decides.
          </p>
          <Facts items={statusFacts} />
        </div>
      ) : null}

      {gapKeyParam ? (
        <div
          className={`isi-sme-deeplink${gapMatch ? " is-matched" : ""}`}
          data-testid="sme-gapkey-deeplink"
          role="status"
        >
          <span className="isi-detail-eyebrow">Deep-link</span>
          <p>
            Focusing gap <code>{gapKeyParam}</code>
            {gapMatch
              ? " — matching work item selected in the queue."
              : " — no matching Discovery work item in this snapshot yet (persist the gap or refresh)."}
          </p>
          {selected && gapMatch ? (
            <p className="xs muted">
              Selected <code>{selected.id}</code> · {selected.status}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="isi-sme-deeplink isi-sme-deeplink-empty" role="status">
          <span className="isi-detail-eyebrow">Queue overview</span>
          <p>
            No <code>gapKey</code> filter — browse priority KEYNOTE / R011 items and Discovery candidates below.
            Open a dossier with <code>?gapKey=…</code> to jump to one gap.
          </p>
        </div>
      )}

      {evalReport ? (
        <details className="isi-sme-eval">
          <summary>Eval denominators (honest)</summary>
          <ul className="isi-sme-eval-list">
            {evalReport.denominators.map((d) => (
              <li key={d.name}>
                <code>{d.name}</code>
                <span>
                  {d.display}
                  {d.pendingHuman ? " · awaiting SME" : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="xs muted">{evalReport.note}</p>
        </details>
      ) : null}

      <div className="isi-workspace isi-sme-workspace">
        <div className="isi-sme-queues" data-testid="sme-priority-queues">
          <div className="isi-panel-head">
            <h3>Work queues</h3>
          </div>
          <div className="isi-sme-queue-tabs" role="tablist" aria-label="Queue filter">
            {(
              [
                ["all", "All items"],
                ["priority", "KEYNOTE / R011"],
                ["discovery", "Discovery gaps"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={queueFilter === id}
                className={`isi-sme-tab${queueFilter === id ? " is-on" : ""}`}
                onClick={() => setQueueFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {queueFilter !== "discovery" ? (
            <div className="isi-sme-priority-block">
              <h4 className="isi-sme-subhead">Priority (KEYNOTE / R011)</h4>
              <p className="xs muted isi-sme-lede-tight">
                Explicit work — no silent fix. Status leaves <code>pending_sme</code> only after audited human
                events.
              </p>
              <ul className="isi-library-list isi-sme-item-list">
                {priority.map((item) => (
                  <WorkItemRow
                    key={item.id}
                    item={item}
                    selected={selected?.id === item.id}
                    onSelect={() => setSelected(item)}
                    onAudit={() => void loadEvents(item.id)}
                  />
                ))}
              </ul>
              <HumanChecklist
                title="KEYNOTE-006 rematch"
                steps={snap?.checklists?.keynote ?? []}
                testId="sme-keynote-checklist"
              />
              <HumanChecklist
                title="R011 S-P-O rewrite"
                steps={snap?.checklists?.r011 ?? []}
                testId="sme-r011-checklist"
              />
            </div>
          ) : null}

          <div className="isi-sme-flagged" data-testid="sme-flagged-list">
            <h4 className="isi-sme-subhead">
              {queueFilter === "priority" ? "Priority only" : "Flagged melanoma / Discovery candidates"}
            </h4>
            {queueFilter === "priority" ? (
              <p className="xs muted">Switch to All or Discovery gaps to browse the wider candidate list.</p>
            ) : (
              <>
                <p className="xs muted isi-sme-lede-tight">
                  S-P-O, honesty, rejected PMID notes, claim type. Engineering never acts as SME.
                </p>
                <ul className="isi-library-list isi-sme-item-list isi-sme-scroll">
                  {filteredQueue.map((item) => (
                    <WorkItemRow
                      key={item.id}
                      item={item}
                      selected={selected?.id === item.id}
                      onSelect={() => setSelected(item)}
                      onAudit={() => void loadEvents(item.id)}
                      compact
                    />
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        <div className="isi-panel-sticky isi-sme-detail">
          {selected ? (
            <DetailPanel
              eyebrow={`${selected.kind} · ${selected.status}`}
              title={selected.id}
              action={
                <button type="button" className="btn sm" onClick={() => void loadEvents(selected.id)}>
                  Audit log
                </button>
              }
            >
              <p className="isi-sme-spo">{selected.spo}</p>
              <Facts
                items={[
                  { label: "Honesty", children: selected.honesty },
                  { label: "Claim type", children: selected.claimType },
                  ...(selected.gapClass
                    ? [
                        {
                          label: "Gap class",
                          children: (
                            <>
                              <code>{selected.gapClass}</code>
                              {selected.dossierHref ? (
                                <>
                                  {" "}
                                  · <a href={selected.dossierHref}>Open dossier</a>
                                </>
                              ) : null}
                            </>
                          ),
                        },
                      ]
                    : []),
                  ...(selected.relId
                    ? [{ label: "Relationship", children: <code>{selected.relId}</code> }]
                    : []),
                  { label: "Coverage", children: selected.searchCoverageNote },
                  ...(selected.rejectedPmidNotes
                    ? [{ label: "Rejected PMID notes", children: selected.rejectedPmidNotes }]
                    : []),
                  { label: "Curator action", children: selected.curatorAction },
                  ...(selected.flags.length
                    ? [
                        {
                          label: "Flags",
                          children: (
                            <span className="isi-sme-flag-text">{selected.flags.join(" · ")}</span>
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            </DetailPanel>
          ) : (
            <div className="isi-sme-empty-detail">
              <span className="isi-detail-eyebrow">Selection</span>
              <h3>Select a work item</h3>
              <p className="muted">
                Choose KEYNOTE, R011, or a Discovery candidate from the queue. Reviewer actions appear here.
              </p>
            </div>
          )}

          {snap?.canReview ? (
            <div className="isi-sme-actions" data-testid="sme-actions">
              <h3 className="isi-sme-subhead">Reviewer actions</h3>
              <p className="xs muted">
                Evidence UUIDs available from Neon queue: {Object.keys(idByEvidence).length}
              </p>

              <fieldset className="isi-fieldset">
                <legend>Decision</legend>
                <label className="isi-sme-field">
                  <span>Evidence UUID</span>
                  <input
                    className="input"
                    value={evidenceUuid}
                    onChange={(e) => setEvidenceUuid(e.target.value)}
                    placeholder="Paste evidence_records.id (uuid)"
                    autoComplete="off"
                  />
                </label>
                {Object.keys(idByEvidence).length ? (
                  <label className="isi-sme-field">
                    <span>Pick from queue slice</span>
                    <select
                      className="input"
                      value={
                        Object.entries(idByEvidence).find(([, uuid]) => uuid === evidenceUuid)?.[0] ?? ""
                      }
                      onChange={(e) => {
                        const uuid = idByEvidence[e.target.value];
                        if (uuid) setEvidenceUuid(uuid);
                      }}
                    >
                      <option value="">—</option>
                      {Object.entries(idByEvidence)
                        .slice(0, 24)
                        .map(([eid, uuid]) => (
                          <option key={eid} value={eid}>
                            {eid} → {uuid.slice(0, 8)}…
                          </option>
                        ))}
                    </select>
                  </label>
                ) : null}
                <label className="isi-sme-field">
                  <span>Rationale</span>
                  <textarea
                    className="input"
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    placeholder="Why approve / reject / request changes / rematch (≥8 chars)"
                    rows={3}
                  />
                </label>
                <div className="isi-sme-btn-row">
                  <button
                    type="button"
                    className="btn sm primary"
                    disabled={busy}
                    onClick={() => void runDecision("approve")}
                  >
                    Approve (human)
                  </button>
                  <button type="button" className="btn sm" disabled={busy} onClick={() => void runDecision("reject")}>
                    Reject
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    disabled={busy}
                    onClick={() => void runDecision("request_changes")}
                  >
                    Request changes
                  </button>
                </div>
              </fieldset>

              <fieldset className="isi-fieldset">
                <legend>Rematch citation</legend>
                <p className="xs muted">Requires PMID + DOI + passage locator. Rematch resets approval.</p>
                <div className="isi-sme-field-row">
                  <label className="isi-sme-field">
                    <span>PMID</span>
                    <input className="input" value={pmid} onChange={(e) => setPmid(e.target.value)} />
                  </label>
                  <label className="isi-sme-field isi-sme-field-grow">
                    <span>DOI</span>
                    <input className="input" value={doi} onChange={(e) => setDoi(e.target.value)} />
                  </label>
                </div>
                <label className="isi-sme-field">
                  <span>Passage locator</span>
                  <textarea
                    className="input"
                    value={passage}
                    onChange={(e) => setPassage(e.target.value)}
                    placeholder="Quote or page/section locator (≥12 chars)"
                    rows={2}
                  />
                </label>
                <button
                  type="button"
                  className="btn sm"
                  disabled={busy || !selected?.relId}
                  onClick={() => void runRematch()}
                >
                  Rematch (resets approval)
                </button>
              </fieldset>

              {selected?.kind === "r011_spo_rewrite" ? (
                <fieldset className="isi-fieldset" data-testid="sme-spo-rewrite">
                  <legend>R011 S-P-O rewrite proposal</legend>
                  <p className="xs muted">
                    Scientist fills proposed S / P / O. Does not rewrite the graph edge or approve Gate C.
                  </p>
                  <div className="isi-sme-field-row">
                    <label className="isi-sme-field">
                      <span>Subject</span>
                      <input
                        className="input"
                        value={spoSubject}
                        onChange={(e) => setSpoSubject(e.target.value)}
                        placeholder="Curator-supplied"
                      />
                    </label>
                    <label className="isi-sme-field">
                      <span>Predicate</span>
                      <input
                        className="input"
                        value={spoPredicate}
                        onChange={(e) => setSpoPredicate(e.target.value)}
                        placeholder="Curator-supplied"
                      />
                    </label>
                    <label className="isi-sme-field">
                      <span>Object</span>
                      <input
                        className="input"
                        value={spoObject}
                        onChange={(e) => setSpoObject(e.target.value)}
                        placeholder="Curator-supplied"
                      />
                    </label>
                  </div>
                  <button type="button" className="btn sm" disabled={busy} onClick={() => void runSpoProposal()}>
                    Record S-P-O proposal
                  </button>
                </fieldset>
              ) : null}

              {events.length ? (
                <ul className="isi-sme-audit xs muted">
                  {events.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <p className="isi-note" style={{ marginTop: "var(--isi-space-4)" }}>
              Decisions, rematch, and gold labels require scientific reviewer or administrator access. Members can
              read the queue snapshot after sign-in.
            </p>
          )}
        </div>
      </div>

      <div className="isi-sme-gold" data-testid="sme-gold-set">
        <div className="isi-panel-head">
          <h3>Gold-set harness</h3>
          <span className="isi-toolbar-count">
            labelled={snap?.goldSummary.labelledRate ?? "—"} · pending_sme={snap?.goldSummary.pendingSme ?? "—"}
          </span>
        </div>
        <p className="xs muted isi-sme-lede-tight">
          Expert labels stay null-scored until an SME fills them. Evaluation runners use honest denominators.
        </p>
        <ul className="isi-library-list isi-sme-item-list">
          {goldCases.map((c) => (
            <li key={c.id} className="isi-sme-gold-row">
              <div className="isi-sme-item-head">
                <strong>
                  <code>{c.id}</code>
                </strong>
                <span className="isi-gap-badge" data-tone={c.label ? "ok" : "info"}>
                  {c.status}
                </span>
              </div>
              <p className="xs muted">
                label={c.label ?? "null"} · score={c.smeScore === null ? "null" : String(c.smeScore)}
              </p>
              <p className="small">{c.notes}</p>
              {snap?.canReview ? (
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => {
                    setGoldCase(c);
                    if (c.label) setGoldLabel(c.label);
                  }}
                >
                  Label…
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {goldCase && snap?.canReview ? (
          <fieldset className="isi-fieldset isi-sme-gold-form">
            <legend>
              Labelling <code>{goldCase.id}</code>
            </legend>
            <div className="isi-sme-field-row">
              <label className="isi-sme-field">
                <span>Label</span>
                <select
                  className="input"
                  value={goldLabel}
                  onChange={(e) => setGoldLabel(e.target.value as SmeGoldLabel)}
                >
                  {SME_GOLD_LABELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="isi-sme-field">
                <span>Optional score 0–1 (empty = null)</span>
                <input
                  className="input"
                  value={goldScore}
                  onChange={(e) => setGoldScore(e.target.value)}
                  placeholder="null"
                  inputMode="decimal"
                />
              </label>
            </div>
            <button type="button" className="btn sm primary" disabled={busy} onClick={() => void saveGold()}>
              Save label
            </button>
          </fieldset>
        ) : null}
      </div>
    </div>
  );
}

function HumanChecklist({
  title,
  steps,
  testId,
}: {
  title: string;
  steps: SmeHumanChecklistStep[];
  testId: string;
}) {
  if (!steps.length) return null;
  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="isi-sme-checklist" data-testid={testId}>
      <div className="isi-sme-checklist-head">
        <h4>{title}</h4>
        <span className="isi-toolbar-count" aria-live="polite">
          {doneCount}/{total} complete
        </span>
      </div>
      <div
        className="grounding-meter isi-sme-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={doneCount}
        aria-label={`${title}: ${doneCount} of ${total} steps complete`}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
      <ul className="isi-sme-check-list">
        {steps.map((s) => (
          <li key={s.id}>
            <label className="isi-sme-check">
              <input type="checkbox" disabled checked={Boolean(s.done)} aria-label={s.label} readOnly />
              <span>
                <span className="isi-sme-check-req">{s.required ? "Required" : "Optional"}</span>
                {s.label}
                <span className="muted isi-sme-check-hint">{s.hint}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="xs muted">
        Slots stay unchecked here — completion is recorded only via audited SME actions.
      </p>
    </div>
  );
}

function WorkItemRow({
  item,
  selected,
  onSelect,
  onAudit,
  compact,
}: {
  item: SmeWorkItem;
  selected: boolean;
  onSelect: () => void;
  onAudit: () => void;
  compact?: boolean;
}) {
  return (
    <li className={`isi-sme-item${selected ? " is-selected" : ""}`}>
      <button type="button" className="isi-sme-item-select" onClick={onSelect}>
        <div className="isi-sme-item-head">
          <strong>
            {item.id} · {item.status}
          </strong>
          <span className="xs muted">
            {item.honesty} · {item.claimType}
          </span>
        </div>
        <p className={`isi-sme-item-spo${compact ? " is-compact" : ""}`}>{item.spo}</p>
        {!compact && item.flags.length ? (
          <p className="xs muted isi-sme-flag-text">{item.flags.join(" · ")}</p>
        ) : null}
      </button>
      <div className="isi-sme-item-actions">
        <button type="button" className="btn sm" onClick={onSelect}>
          Select
        </button>
        <button type="button" className="btn sm" onClick={onAudit}>
          Audit
        </button>
      </div>
    </li>
  );
}

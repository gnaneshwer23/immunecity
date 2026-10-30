/**
 * SME review workspace — melanoma / KEYNOTE / R011 queues + gold-set + rematch.
 * Reviewer-gated actions; never bulk-approves or invents PMIDs / gold scores.
 */
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
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

  // Deep-link from Discovery dossiers: /sme?gapKey=…
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

  const load = useCallback(async () => {
    setBusy(true);
    setMsg("");
    try {
      const s = await snapFn();
      setSnap(s);
      setMsg(
        s.canReview
          ? `Loaded ${s.workItems.length} work items · pending_sme=${s.workSummary.pendingSme} · resolved=${s.workSummary.resolvedBySme} · persistent=${String(s.persistent)}`
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

  return (
    <div data-testid="sme-review-workspace">
      <div className="row" style={{ gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
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
      {msg ? (
        <p className="xs muted" role="status">
          {msg}
        </p>
      ) : null}

      {snap ? (
        <p className="callout small" style={{ marginBottom: 16 }}>
          Educational / research review tooling — not CDS. autoApprove=
          {String(snap.autoApprove)} · autoRematch={String(snap.autoRematch)} · TI=
          {String(snap.trialIntelligenceEnabled)}. Priority KEYNOTE + R011 stay{" "}
          <em>pending_sme</em> until a human scientist decides.
        </p>
      ) : null}

      {evalReport ? (
        <div className="card" style={{ marginBottom: 16, padding: 12 }}>
          <h3 style={{ fontSize: "1.05rem", marginBottom: 8 }}>Eval denominators (honest)</h3>
          <ul className="xs" style={{ margin: 0, paddingLeft: 18 }}>
            {evalReport.denominators.map((d) => (
              <li key={d.name}>
                <code>{d.name}</code>: {d.display}
                {d.pendingHuman ? " · awaiting SME" : ""}
              </li>
            ))}
          </ul>
          <p className="xs muted" style={{ marginTop: 8 }}>
            {evalReport.note}
          </p>
        </div>
      ) : null}

      {gapKeyParam ? (
        <p className="callout small" data-testid="sme-gapkey-deeplink" style={{ marginBottom: 12 }}>
          Deep-link filter: <code>gapKey={gapKeyParam}</code>
          {selected?.gapKey === gapKeyParam || selected?.id === `SME-DISC-${gapKeyParam}`
            ? " — matching work item selected."
            : " — no matching Discovery work item in this snapshot (persist gap or refresh)."}
        </p>
      ) : null}

      <div className="card" style={{ marginBottom: 16, padding: 12 }} data-testid="sme-priority-queues">
        <h3 style={{ fontSize: "1.05rem", marginBottom: 8 }}>Priority queues (KEYNOTE / R011)</h3>
        <p className="small muted" style={{ marginBottom: 10 }}>
          Explicit work — no silent fix or fixture auto-rematch. Status may leave{" "}
          <code>pending_sme</code> only after audited human events.
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {(snap?.priority ?? []).map((item) => (
            <WorkItemCard
              key={item.id}
              item={item}
              selected={selected?.id === item.id}
              onSelect={() => setSelected(item)}
              onAudit={() => void loadEvents(item.id)}
            />
          ))}
        </ul>
        <HumanChecklist
          title="KEYNOTE-006 rematch checklist (PMID 25891173)"
          steps={snap?.checklists?.keynote ?? []}
          testId="sme-keynote-checklist"
        />
        <HumanChecklist
          title="R011 S-P-O rewrite checklist"
          steps={snap?.checklists?.r011 ?? []}
          testId="sme-r011-checklist"
        />
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 12 }} data-testid="sme-flagged-list">
        <h3 style={{ fontSize: "1.05rem", marginBottom: 8 }}>Flagged melanoma / Discovery gap candidates</h3>
        <p className="small muted" style={{ marginBottom: 10 }}>
          S-P-O, honesty status, rejected PMID notes, search coverage, claim type. Includes{" "}
          <code>discovery_gap</code> / <code>isi_curation_gap</code> items routed from Radar — pending_sme
          until a human decides. Engineering never acts as SME.
        </p>
        <div style={{ maxHeight: 420, overflow: "auto" }}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
            {(snap?.workItems ?? []).map((item) => (
              <WorkItemCard
                key={item.id}
                item={item}
                selected={selected?.id === item.id}
                onSelect={() => setSelected(item)}
                onAudit={() => void loadEvents(item.id)}
                compact
              />
            ))}
          </ul>
        </div>
      </div>

      {snap?.canReview ? (
        <div className="card" style={{ marginBottom: 16, padding: 12 }} data-testid="sme-actions">
          <h3 style={{ fontSize: "1.05rem", marginBottom: 8 }}>Reviewer actions</h3>
          <p className="xs muted" style={{ marginBottom: 8 }}>
            Selected: {selected ? <code>{selected.id}</code> : "—"} · Evidence UUIDs from Neon queue:{" "}
            {Object.keys(idByEvidence).length}
          </p>
          <label className="xs" style={{ display: "block", marginBottom: 6 }}>
            Evidence UUID
            <input
              className="input"
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={evidenceUuid}
              onChange={(e) => setEvidenceUuid(e.target.value)}
              placeholder="Paste evidence_records.id (uuid)"
            />
          </label>
          {Object.keys(idByEvidence).length ? (
            <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {Object.entries(idByEvidence)
                .slice(0, 8)
                .map(([eid, uuid]) => (
                  <button
                    key={eid}
                    type="button"
                    className="chip"
                    onClick={() => setEvidenceUuid(uuid)}
                    title={eid}
                  >
                    {eid.slice(0, 24)}…
                  </button>
                ))}
            </div>
          ) : null}
          <label className="xs" style={{ display: "block", marginBottom: 6 }}>
            Rationale
            <textarea
              className="input"
              style={{ display: "block", width: "100%", marginTop: 4, minHeight: 64 }}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Why approve / reject / request changes / rematch"
            />
          </label>
          <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            <button type="button" className="btn sm primary" disabled={busy} onClick={() => void runDecision("approve")}>
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
          <h4 style={{ fontSize: "0.95rem", marginBottom: 6 }}>Rematch citation (PMID + DOI + passage)</h4>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <label className="xs">
              PMID
              <input className="input" value={pmid} onChange={(e) => setPmid(e.target.value)} style={{ display: "block" }} />
            </label>
            <label className="xs">
              DOI
              <input className="input" value={doi} onChange={(e) => setDoi(e.target.value)} style={{ display: "block", minWidth: 220 }} />
            </label>
          </div>
          <label className="xs" style={{ display: "block", marginBottom: 8 }}>
            Passage locator
            <textarea
              className="input"
              style={{ display: "block", width: "100%", marginTop: 4, minHeight: 56 }}
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
              placeholder="Quote or page/section locator (≥12 chars)"
            />
          </label>
          <button type="button" className="btn sm" disabled={busy || !selected?.relId} onClick={() => void runRematch()}>
            Rematch (resets approval)
          </button>
          {selected?.kind === "r011_spo_rewrite" ? (
            <div style={{ marginTop: 16 }} data-testid="sme-spo-rewrite">
              <h4 style={{ fontSize: "0.95rem", marginBottom: 6 }}>R011 S-P-O rewrite proposal (audited only)</h4>
              <p className="xs muted" style={{ marginBottom: 8 }}>
                Scientist fills proposed S / P / O. Does <strong>not</strong> rewrite the graph edge or approve Gate C.
              </p>
              <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                <label className="xs">
                  Subject
                  <input
                    className="input"
                    value={spoSubject}
                    onChange={(e) => setSpoSubject(e.target.value)}
                    style={{ display: "block", minWidth: 120 }}
                    placeholder="Curator-supplied"
                  />
                </label>
                <label className="xs">
                  Predicate
                  <input
                    className="input"
                    value={spoPredicate}
                    onChange={(e) => setSpoPredicate(e.target.value)}
                    style={{ display: "block", minWidth: 140 }}
                    placeholder="Curator-supplied"
                  />
                </label>
                <label className="xs">
                  Object
                  <input
                    className="input"
                    value={spoObject}
                    onChange={(e) => setSpoObject(e.target.value)}
                    style={{ display: "block", minWidth: 120 }}
                    placeholder="Curator-supplied"
                  />
                </label>
              </div>
              <button type="button" className="btn sm" disabled={busy} onClick={() => void runSpoProposal()}>
                Record S-P-O proposal
              </button>
            </div>
          ) : null}
          {events.length ? (
            <ul className="xs muted" style={{ marginTop: 12, paddingLeft: 16 }}>
              {events.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="callout" style={{ marginBottom: 16 }}>
          Decisions, rematch, and gold labels require scientific reviewer or administrator access. Members can
          read the queue snapshot after sign-in.
        </p>
      )}

      <div className="card" style={{ marginBottom: 16, padding: 12 }} data-testid="sme-gold-set">
        <h3 style={{ fontSize: "1.05rem", marginBottom: 8 }}>Gold-set harness</h3>
        <p className="small muted" style={{ marginBottom: 10 }}>
          Expert labels stay null-scored until SME fills. labelled=
          {snap?.goldSummary.labelledRate ?? "—"} · pending_sme={snap?.goldSummary.pendingSme ?? "—"}
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
          {(snap?.goldCases ?? []).map((c) => (
            <li key={c.id} className="card" style={{ padding: 10 }}>
              <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <strong>
                  <code>{c.id}</code> · {c.status}
                </strong>
                <span className="xs muted">
                  label={c.label ?? "null"} · score={c.smeScore === null ? "null" : String(c.smeScore)}
                </span>
              </div>
              <p className="xs" style={{ marginTop: 4 }}>
                {c.notes}
              </p>
              {snap?.canReview ? (
                <button
                  type="button"
                  className="btn sm"
                  style={{ marginTop: 6 }}
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
          <div style={{ marginTop: 12 }}>
            <p className="xs">
              Labelling <code>{goldCase.id}</code>
            </p>
            <select
              className="input"
              value={goldLabel}
              onChange={(e) => setGoldLabel(e.target.value as SmeGoldLabel)}
              style={{ marginRight: 8 }}
            >
              {SME_GOLD_LABELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <label className="xs" style={{ marginRight: 8 }}>
              Optional score 0–1 (leave empty = null)
              <input
                className="input"
                value={goldScore}
                onChange={(e) => setGoldScore(e.target.value)}
                placeholder="null"
                style={{ display: "block", width: 80 }}
              />
            </label>
            <button type="button" className="btn sm primary" disabled={busy} onClick={() => void saveGold()}>
              Save label
            </button>
          </div>
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
  return (
    <div style={{ marginTop: 14 }} data-testid={testId}>
      <h4 style={{ fontSize: "0.95rem", marginBottom: 6 }}>{title}</h4>
      <ul className="xs" style={{ margin: 0, paddingLeft: 18 }}>
        {steps.map((s) => (
          <li key={s.id}>
            <input type="checkbox" disabled checked={false} aria-label={s.label} readOnly />{" "}
            {s.required ? "[required] " : "[optional] "}
            {s.label}
            <span className="muted"> — {s.hint}</span>
          </li>
        ))}
      </ul>
      <p className="xs muted" style={{ marginTop: 4 }}>
        Checkboxes stay unchecked in UI — completion is recorded only via audited SME actions above.
      </p>
    </div>
  );
}

function WorkItemCard({
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
    <li
      className="card"
      style={{
        padding: compact ? 10 : 12,
        outline: selected ? "2px solid var(--accent, #2a6)" : undefined,
      }}
    >
      <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <strong>
          {item.id} · {item.status}
        </strong>
        <span className="xs muted">
          {item.honesty} · {item.claimType} · {item.kind}
        </span>
      </div>
      <p className="small" style={{ marginTop: 4 }}>
        {item.spo}
      </p>
      {item.gapClass ? (
        <p className="xs muted">
          Gap class: <code>{item.gapClass}</code>
          {item.dossierHref ? (
            <>
              {" "}
              · <a href={item.dossierHref}>Open dossier</a>
            </>
          ) : null}
        </p>
      ) : null}
      {item.relId ? (
        <p className="xs muted">
          <code>{item.relId}</code>
        </p>
      ) : null}
      {!compact ? (
        <>
          <p className="xs" style={{ marginTop: 4 }}>
            Coverage: {item.searchCoverageNote}
          </p>
          {item.rejectedPmidNotes ? (
            <p className="xs" style={{ marginTop: 4 }}>
              Rejected PMID notes: {item.rejectedPmidNotes}
            </p>
          ) : null}
          <p className="xs muted">{item.curatorAction}</p>
          {item.flags.length ? (
            <p className="xs" style={{ marginTop: 4 }}>
              {item.flags.map((f) => (
                <span key={f} className="chip" style={{ marginRight: 4 }}>
                  {f}
                </span>
              ))}
            </p>
          ) : null}
        </>
      ) : null}
      <div className="row" style={{ gap: 6, marginTop: 8 }}>
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

/**
 * Persistent Neon-backed scientific review queue for authorised reviewers.
 * Inspect claims + source passages; record decisions via recordScientificReviewDecision.
 * Immutable audit trail via listEvidenceAuditTrail. Never auto-approves.
 */
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listEvidenceAuditTrail,
  listScientificReviewQueue,
  recordScientificReviewDecision,
  listEvidenceRecords,
} from "@/lib/evidence.functions";
import { claimReviewKindLabel, type ClaimReviewKind } from "@/lib/immune/claimRecords";
import type { ReviewQueueSnapshot } from "@/lib/immune/scientificReviewQueue";

type Props = { canReview: boolean };

export default function ScientificReviewQueuePanel({ canReview }: Props) {
  const queueFn = useServerFn(listScientificReviewQueue);
  const auditFn = useServerFn(listEvidenceAuditTrail);
  const decideFn = useServerFn(recordScientificReviewDecision);
  const listFn = useServerFn(listEvidenceRecords);
  const [queue, setQueue] = useState<ReviewQueueSnapshot | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [auditFor, setAuditFor] = useState<string | null>(null);
  const [auditLines, setAuditLines] = useState<string[]>([]);
  const [idByEvidence, setIdByEvidence] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!canReview) return;
    setBusy(true);
    setMsg("");
    try {
      const [q, page] = await Promise.all([
        queueFn({ data: { limit: 80, curation: "unreviewed" } }),
        listFn({ data: { q: "", status: "all", type: "all", curation: "unreviewed", limit: 80 } }),
      ]);
      setQueue(q.queue);
      const map: Record<string, string> = {};
      for (const r of page.items) map[r.evidence_id] = r.id;
      setIdByEvidence(map);
      setMsg(
        `Loaded ${q.queue.items.length} queue item(s). persistent=${String(q.persistent)} autoApprove=false.`,
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Review queue failed to load.");
      setQueue(null);
    }
    setBusy(false);
  }, [canReview, queueFn, listFn]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canReview) {
    return (
      <p className="callout" style={{ marginBottom: 16 }}>
        Scientific review queue requires reviewer or administrator access.
      </p>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 16 }} data-testid="scientific-review-queue">
      <h3 style={{ fontSize: "1.05rem", marginBottom: 8 }}>Scientific review queue</h3>
      <p className="small muted" style={{ marginBottom: 10 }}>
        Neon-backed unreviewed candidates. Inspect claim text / source passages, then record a human decision.
        Audit events are append-only. <strong>No automatic approval.</strong>
      </p>
      <div className="row" style={{ gap: 8, marginBottom: 10 }}>
        <button type="button" className="btn sm" disabled={busy} onClick={() => void load()}>
          Refresh queue
        </button>
      </div>
      {msg ? (
        <p className="xs muted" role="status">
          {msg}
        </p>
      ) : null}
      {queue ? (
        <p className="xs muted" style={{ marginBottom: 8 }}>
          Priorities: conflict={queue.counts.conflict} · ready={queue.counts.ready_for_supports} · needs
          id={queue.counts.needs_identifier} · unassessed={queue.counts.unassessed} · other=
          {queue.counts.other} · blockedSilent={queue.blockedSilentApprovals}
        </p>
      ) : null}
      {!queue?.items.length ? (
        <p className="empty small">No unreviewed items in the persistent queue.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {queue.items.slice(0, 40).map((item) => {
            const kind = (item.claim.reviewKind ?? "literature_candidate") as ClaimReviewKind;
            const uuid = idByEvidence[item.evidenceId];
            return (
              <li key={item.evidenceId} className="card" style={{ padding: 12 }}>
                <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <strong>
                    {item.conceptName ?? item.conceptId ?? "—"} · {item.priority}
                  </strong>
                  <span className="xs muted">{claimReviewKindLabel(kind)}</span>
                </div>
                <p className="xs muted" style={{ marginTop: 4 }}>
                  <code>{item.evidenceId}</code>
                  {item.relationshipId ? (
                    <>
                      {" "}
                      · <code>{item.relationshipId}</code>
                    </>
                  ) : null}
                  {item.claim.locator.pmid ? <> · PMID {item.claim.locator.pmid}</> : null}
                </p>
                {item.sourcePassage ? (
                  <blockquote className="small" style={{ margin: "8px 0", borderLeft: "3px solid var(--border, #ccc)", paddingLeft: 10 }}>
                    {item.sourcePassage}
                  </blockquote>
                ) : (
                  <p className="xs muted">No passage / claim_text recorded yet.</p>
                )}
                <p className="xs">{item.reason}</p>
                <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn sm"
                    disabled={busy || !uuid}
                    title={!uuid ? "UUID not on this page load — refresh" : "Reject claim"}
                    onClick={() => {
                      if (!uuid) return;
                      setBusy(true);
                      decideFn({
                        data: { id: uuid, curation: "rejected", claim_support: "unrelated" },
                      })
                        .then(() => load())
                        .catch((e) => setMsg(e instanceof Error ? e.message : "Decision failed"))
                        .finally(() => setBusy(false));
                    }}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    disabled={busy || !uuid}
                    title="Mark supports — still requires separate Approve when ready_for_supports"
                    onClick={() => {
                      if (!uuid) return;
                      setBusy(true);
                      decideFn({
                        data: { id: uuid, curation: "unreviewed", claim_support: "supports" },
                      })
                        .then(() => load())
                        .catch((e) => setMsg(e instanceof Error ? e.message : "Decision failed"))
                        .finally(() => setBusy(false));
                    }}
                  >
                    Assess supports
                  </button>
                  <button
                    type="button"
                    className="btn sm primary"
                    disabled={busy || !uuid || item.priority !== "ready_for_supports"}
                    title="Approve only when identifier verified + supports assessed"
                    onClick={() => {
                      if (!uuid) return;
                      if (
                        !window.confirm(
                          "Approve this claim as Gate C support? This is a human decision — never automatic.",
                        )
                      )
                        return;
                      setBusy(true);
                      decideFn({
                        data: { id: uuid, curation: "approved", claim_support: "supports" },
                      })
                        .then(() => load())
                        .catch((e) => setMsg(e instanceof Error ? e.message : "Decision failed"))
                        .finally(() => setBusy(false));
                    }}
                  >
                    Approve (human)
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true);
                      setAuditFor(item.evidenceId);
                      auditFn({ data: { evidenceId: item.evidenceId } })
                        .then((r) => {
                          setAuditLines(
                            r.events.map(
                              (e) =>
                                `${e.createdAt} · ${e.actor} · ${e.reason} · ${e.previousCuration ?? "—"}→${e.newCuration ?? "—"}`,
                            ),
                          );
                        })
                        .catch((e) => setMsg(e instanceof Error ? e.message : "Audit load failed"))
                        .finally(() => setBusy(false));
                    }}
                  >
                    Audit trail
                  </button>
                </div>
                {auditFor === item.evidenceId ? (
                  <div className="xs muted" style={{ marginTop: 8 }}>
                    {auditLines.length === 0 ? (
                      <p>No audit events yet (immutable log empty).</p>
                    ) : (
                      <ul style={{ paddingLeft: 16, margin: 0 }}>
                        {auditLines.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

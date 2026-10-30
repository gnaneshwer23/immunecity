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
        `Loaded ${q.queue.items.length} queue item(s) for review.`,
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
      <div className="isi-auth-empty" data-testid="scientific-review-queue">
        <p>Scientific review queue requires reviewer or administrator access.</p>
      </div>
    );
  }

  return (
    <div className="isi-auth-panel" data-testid="scientific-review-queue">
      <p className="isi-auth-lede">
        Unreviewed candidates for scientific review. Inspect claim text / source passages, then record a human decision.
        Audit events are append-only. <strong>No automatic approval.</strong>
      </p>
      <div className="isi-auth-btn-row">
        <button type="button" className="btn sm" disabled={busy} onClick={() => void load()}>
          Refresh queue
        </button>
      </div>
      {msg ? (
        <p className="isi-auth-status" role="status">
          {msg}
        </p>
      ) : null}
      {queue ? (
        <p className="isi-auth-status">
          Priorities: conflict={queue.counts.conflict} · ready={queue.counts.ready_for_supports} · needs id=
          {queue.counts.needs_identifier} · unassessed={queue.counts.unassessed} · other={queue.counts.other} ·
          blockedSilent={queue.blockedSilentApprovals}
        </p>
      ) : null}
      {!queue?.items.length ? (
        <div className="isi-auth-empty">
          <h3>Queue empty</h3>
          <p>No unreviewed items in the persistent queue.</p>
        </div>
      ) : (
        <ul className="isi-auth-queue">
          {queue.items.slice(0, 40).map((item) => {
            const kind = (item.claim.reviewKind ?? "literature_candidate") as ClaimReviewKind;
            const uuid = idByEvidence[item.evidenceId];
            return (
              <li key={item.evidenceId} className="isi-auth-queue-item">
                <div className="isi-auth-queue-head">
                  <strong>
                    {item.conceptName ?? item.conceptId ?? "—"} · {item.priority}
                  </strong>
                  <span className="xs muted">{claimReviewKindLabel(kind)}</span>
                </div>
                <div className="isi-auth-queue-meta">
                  <code>{item.evidenceId}</code>
                  {item.relationshipId ? <code>{item.relationshipId}</code> : null}
                  {item.claim.locator.pmid ? <span>PMID {item.claim.locator.pmid}</span> : null}
                </div>
                {item.sourcePassage ? (
                  <blockquote className="isi-auth-quote">{item.sourcePassage}</blockquote>
                ) : (
                  <p className="xs muted">No passage / claim_text recorded yet.</p>
                )}
                <p className="xs">{item.reason}</p>
                <div className="isi-auth-btn-row">
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
                  <div className="xs muted">
                    {auditLines.length === 0 ? (
                      <p>No audit events yet (immutable log empty).</p>
                    ) : (
                      <ul className="isi-sme-audit">
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

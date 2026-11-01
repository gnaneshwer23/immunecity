/**
 * Human Gate C approve / reject / defer on HSI Discovery REVIEW.
 * Persists to ISI Neon autumn-snow only. Never auto-approves; never flips hsiGrade.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getMyRole } from "@/lib/evidence.functions";
import {
  listHsiGateCQueue,
  recordHsiGateCDecision,
} from "@/lib/hsi/gateC.functions";
import type { GateCQueueItem, GateCQueueSnapshot } from "@/lib/hsi/gateCQueue";
import { buildGateCQueue } from "@/lib/hsi/gateCQueue";
import type { ConsumeLoadResult } from "@/lib/hsi/discoveryConsume";

type Props = {
  /** Published consume pin — used for offline/read-only pending preview. */
  consume: ConsumeLoadResult;
};

function RowActions({
  item,
  busy,
  onDecide,
}: {
  item: GateCQueueItem;
  busy: boolean;
  onDecide: (edgeId: string, decision: "approve" | "reject" | "defer") => void;
}) {
  if (!item.actionable) {
    return (
      <span className="small muted">
        {item.effectiveStatus}
        {item.reviewedBy ? ` · ${item.reviewedBy}` : ""}
      </span>
    );
  }
  return (
    <div className="isi-hsi-btn-row">
      <button
        type="button"
        className="btn sm primary"
        disabled={busy}
        data-testid={`gate-c-approve-${item.edgeId}`}
        title="Human approve on ISI Neon — does not auto-merge KG or flip hsiGrade"
        onClick={() => {
          if (
            !window.confirm(
              `Record human Gate C approve for ${item.edgeId} → ${item.isiRelationshipId ?? "REL"}?\n\nWrites ISI Neon only. Never auto-approves into the KG. Does not flip hsiGrade.`,
            )
          )
            return;
          onDecide(item.edgeId, "approve");
        }}
      >
        Approve
      </button>
      <button
        type="button"
        className="btn sm"
        disabled={busy}
        data-testid={`gate-c-reject-${item.edgeId}`}
        onClick={() => onDecide(item.edgeId, "reject")}
      >
        Reject
      </button>
      <button
        type="button"
        className="btn sm"
        disabled={busy}
        data-testid={`gate-c-defer-${item.edgeId}`}
        onClick={() => onDecide(item.edgeId, "defer")}
      >
        Defer
      </button>
    </div>
  );
}

export function HsiGateCQueuePanel({ consume }: Props) {
  const roleFn = useServerFn(getMyRole);
  const queueFn = useServerFn(listHsiGateCQueue);
  const decideFn = useServerFn(recordHsiGateCDecision);

  const [canReview, setCanReview] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [queue, setQueue] = useState<GateCQueueSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const preview = buildGateCQueue(consume.gateC, []);

  const load = useCallback(async () => {
    setBusy(true);
    setMsg("");
    try {
      const role = await roleFn();
      setSignedIn(true);
      setCanReview(Boolean(role.canReview));
      if (!role.canReview) {
        setQueue(null);
        setMsg("Sign in as scientific reviewer or administrator to record Gate C decisions.");
        setBusy(false);
        return;
      }
      const res = await queueFn({
        data: {
          origin:
            typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      setQueue(res.queue);
      setMsg(
        `Loaded ${res.queue.actionableCount} pending · ${res.queue.decidedCount} decided (ISI Neon autumn-snow).`,
      );
    } catch (e) {
      setSignedIn(false);
      setCanReview(false);
      setQueue(null);
      setMsg(
        e instanceof Error
          ? e.message
          : "Could not load Gate C queue (sign in required for Neon decisions).",
      );
    }
    setBusy(false);
  }, [roleFn, queueFn]);

  useEffect(() => {
    void load();
  }, [load]);

  const onDecide = (edgeId: string, decision: "approve" | "reject" | "defer") => {
    setBusy(true);
    setMsg("");
    decideFn({
      data: {
        edgeId,
        decision,
        autoApprove: false,
        flipHsiGrade: false,
        origin: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    })
      .then((r) => {
        setMsg(r.note);
        return load();
      })
      .catch((e) => {
        setMsg(e instanceof Error ? e.message : "Decision failed");
        setBusy(false);
      });
  };

  const rows = queue?.items ?? preview.items;

  return (
    <section
      className="isi-hsi-gate-c-panel"
      data-testid="hsi-gate-c-queue"
      aria-labelledby="hsi-gate-c-heading"
    >
      <h3 id="hsi-gate-c-heading" className="h4">
        Gate C human queue
      </h3>
      <p className="small muted">
        Pending mapped checklist rows from the HSI Discovery pin. Decisions persist on ISI Neon{" "}
        <code>autumn-snow</code> only — never HSI red-wave, never auto-approve, never flip{" "}
        <code>hsiGrade</code>. Not CDS.
      </p>
      <div className="isi-hsi-pills" style={{ marginTop: 8 }}>
        <span className="chip">autoApprove=false</span>
        <span className="chip">mayFlipHsiGrade=false</span>
        <span className="chip">notCds=true</span>
        <span className="chip">
          pending={queue?.pendingCount ?? preview.pendingCount}
        </span>
      </div>
      <div className="isi-hsi-btn-row" style={{ marginTop: 8 }}>
        <button type="button" className="btn sm" disabled={busy} onClick={() => void load()}>
          Refresh Neon queue
        </button>
        <Link to="/curation" className="btn sm">
          Evidence Check → supports → Approve
        </Link>
      </div>
      {msg ? (
        <p className="small" role="status" style={{ marginTop: 8 }}>
          {msg}
        </p>
      ) : null}
      {!signedIn || !canReview ? (
        <p className="callout" style={{ marginTop: 12 }}>
          Preview shows {preview.actionableCount} publish-pending mapped row(s). Recording approve /
          reject / defer requires Neon Auth + reviewer or administrator.
        </p>
      ) : null}
      {!rows.length ? (
        <p className="small muted" style={{ marginTop: 12 }}>
          No mapped pending Gate C rows in this pin.
        </p>
      ) : (
        <div className="isi-hsi-table-wrap" style={{ marginTop: 12 }}>
          <table className="isi-hsi-table">
            <thead>
              <tr>
                <th>HSI edge</th>
                <th>ISI REL</th>
                <th>PMID</th>
                <th>Status</th>
                <th>Human action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr
                  key={item.edgeId}
                  data-edge-id={item.edgeId}
                  data-actionable={item.actionable ? "true" : "false"}
                >
                  <td>
                    <code>{item.edgeId}</code>
                    <div className="small muted">{item.spoNote ?? item.assertion}</div>
                  </td>
                  <td>
                    {item.isiRelationshipId ? (
                      <code>{item.isiRelationshipId}</code>
                    ) : (
                      <span className="muted">—</span>
                    )}
                    {item.matchKind ? (
                      <div className="small muted">{item.matchKind}</div>
                    ) : null}
                  </td>
                  <td>
                    {item.pmid ? (
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${item.pmid}/`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {item.pmid}
                      </a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className="chip">{item.effectiveStatus}</span>
                  </td>
                  <td>
                    {canReview ? (
                      <RowActions item={item} busy={busy} onDecide={onDecide} />
                    ) : (
                      <span className="small muted">Reviewer required</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default HsiGateCQueuePanel;

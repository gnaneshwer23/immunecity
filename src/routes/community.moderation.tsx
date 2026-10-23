import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/immune/ui";
import { safeClientError, useMember } from "@/components/immune/community/chrome";
import { getCommunityModerationQueue, moderateCommunityTarget } from "@/lib/community.functions";
import { PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/community/moderation")({
  head: () =>
    seoHead({
      title: `Moderation — Community — ${PRODUCT_NAME}`,
      description: "Admin queue to hide or restore community posts and comments, with a recorded reason.",
      path: "/community/moderation",
      noIndex: true,
    }),
  component: ModerationPage,
});

type Queue = Awaited<ReturnType<typeof getCommunityModerationQueue>>;

function ModerationPage() {
  const member = useMember();
  const load = useServerFn(getCommunityModerationQueue);
  const act = useServerFn(moderateCommunityTarget);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [msg, setMsg] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setMsg("");
    try {
      setQueue(await load());
    } catch (err) {
      setQueue(null);
      setMsg(safeClientError(err));
    }
  }

  useEffect(() => {
    if (member) void refresh();
  }, [member]);

  async function run(targetType: "post" | "comment", targetId: string, action: "hide" | "restore") {
    setBusy(true);
    setMsg("");
    try {
      await act({ data: { targetType, targetId, action, reason } });
      setReason("");
      await refresh();
    } catch (err) {
      setMsg(safeClientError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page community-page">
      <PageHead
        kicker="Community · Moderation"
        title="Review reports"
        lede="Existing atlas admins can hide or restore a post or comment. The reason is stored with the action. Signup does not make someone a moderator."
      />
      <p><Link to="/community">Back to topics</Link></p>
      {member === null ? <p><Link to="/auth" search={{ redirect: "/community/moderation" }}>Sign in</Link></p> : null}
      {member === undefined ? <p className="xs muted">Checking access…</p> : null}
      <label className="field">
        Reason for the next action
        <textarea className="community-input" value={reason} onChange={(e) => setReason(e.target.value)} minLength={8} maxLength={500} />
      </label>
      {msg ? <p className="callout" role="status">{msg}</p> : null}
      {queue ? (
        <>
          <h2>Open reports</h2>
          {queue.reports.length ? (
            <ul className="community-stack">
              {queue.reports.map((r) => (
                <li key={r.id} className="card community-card">
                  <p className="xs muted">{r.targetType} · {r.createdAt}</p>
                  <p>{r.reason}</p>
                  <p className="row">
                    <button type="button" className="btn sm" disabled={busy} onClick={() => run(r.targetType === "comment" ? "comment" : "post", r.targetId, "hide")}>Hide</button>
                    <button type="button" className="btn sm" disabled={busy} onClick={() => run(r.targetType === "comment" ? "comment" : "post", r.targetId, "restore")}>Restore</button>
                  </p>
                </li>
              ))}
            </ul>
          ) : <p className="small muted">No open reports.</p>}
          <h2>Hidden posts</h2>
          {queue.hiddenPosts.length ? (
            <ul className="community-stack">
              {queue.hiddenPosts.map((p) => (
                <li key={p.id} className="card community-card">
                  <p>{p.title}</p>
                  <button type="button" className="btn sm" disabled={busy} onClick={() => run("post", p.id, "restore")}>Restore</button>
                </li>
              ))}
            </ul>
          ) : <p className="small muted">No hidden posts.</p>}
        </>
      ) : null}
    </div>
  );
}

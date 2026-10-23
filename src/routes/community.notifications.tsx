import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/immune/ui";
import { CommunityBar, safeClientError, useMember, useUnreadCount } from "@/components/immune/community/chrome";
import { listCommunityNotifications, markCommunityNotificationsRead } from "@/lib/community/phase3.functions";
import { PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/community/notifications")({
  head: () =>
    seoHead({
      title: `Notifications — Community — ${PRODUCT_NAME}`,
      description: "In-app notices for replies on posts you follow and for appeal decisions. No email is sent.",
      path: "/community/notifications",
      noIndex: true,
    }),
  component: NotificationsPage,
});

type Notes = Awaited<ReturnType<typeof listCommunityNotifications>>;

function NotificationsPage() {
  const member = useMember();
  const unread = useUnreadCount(member);
  const load = useServerFn(listCommunityNotifications);
  const mark = useServerFn(markCommunityNotificationsRead);
  const [data, setData] = useState<Notes | null>(null);
  const [msg, setMsg] = useState("");

  async function refresh() {
    setData(await load());
  }

  useEffect(() => {
    if (!member) return;
    refresh().catch((err) => setMsg(safeClientError(err)));
  }, [member]);

  return (
    <div className="page community-page">
      <PageHead kicker="Community" title="Notifications" lede="In-app only. Replies on posts you follow, and decisions on your appeals. No email is sent." />
      <CommunityBar unread={unread} />
      {member === null ? <p><Link to="/auth" search={{ redirect: "/community/notifications" }}>Sign in</Link></p> : null}
      {data?.items.length ? (
        <>
          <button type="button" className="btn sm" onClick={async () => {
            try { await mark({ data: {} }); await refresh(); } catch (err) { setMsg(safeClientError(err)); }
          }}>Mark all read</button>
          <ul className="community-stack">
            {data.items.map((item) => (
              <li key={item.id} className="card community-card">
                <p className="xs muted">{item.read ? "Read" : "Unread"} · {item.createdAt}</p>
                <p>{item.body}</p>
                {item.href ? <a href={item.href}>Open</a> : null}
                {!item.read ? (
                  <button type="button" className="btn sm" onClick={async () => {
                    try { await mark({ data: { id: item.id } }); await refresh(); } catch (err) { setMsg(safeClientError(err)); }
                  }}>Mark read</button>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : data ? <p className="small muted">No notifications.</p> : null}
      {msg ? <p className="callout" role="status">{msg}</p> : null}
    </div>
  );
}

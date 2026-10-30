import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/immune/ui";
import { Section, Toolbar } from "@/components/immune/page";
import { CommunityBar, safeClientError, useMember, useUnreadCount } from "@/components/immune/community/chrome";
import { listCommunityNotifications, markCommunityNotificationsRead } from "@/lib/community/phase3.functions";
import { PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/community/notifications")({
  head: () =>
    seoHead({
      title: `Notifications — Community — ${PRODUCT_NAME}`,
      description:
        "In-app notices for replies on posts you follow and for appeal decisions. No email is sent.",
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
    <main className="page community-page isi-auth-page">
      <PageHead
        kicker="Community"
        title="Notifications"
        lede="In-app only. You are notified when someone replies to a post you wrote or follow, and when a moderator decides an appeal. Authors and repliers are followed automatically. No email is sent."
        stats={
          data
            ? [
                { v: String(data.items.length), l: "Notices" },
                { v: String(data.items.filter((i) => !i.read).length), l: "Unread" },
                { v: "In-app", l: "Delivery" },
              ]
            : undefined
        }
      />
      <CommunityBar unread={unread} />
      {member === undefined ? <p className="small muted">Checking your account.</p> : null}
      {member === null ? (
        <div className="isi-auth-sign-in">
          <p>
            <Link to="/auth" search={{ redirect: "/community/notifications" }}>
              Sign in
            </Link>
          </p>
        </div>
      ) : null}
      {member && !data && !msg ? <p className="small muted">Loading notifications.</p> : null}

      {member ? (
        <Section
          id="inbox"
          title="Inbox"
          lede="Community notices stay in Community. They never enter the curated knowledge graph."
        >
          {data?.items.length ? (
            <>
              <Toolbar count={`${data.items.filter((i) => !i.read).length} unread`}>
                <div className="isi-auth-btn-row">
                  <button
                    type="button"
                    className="btn sm"
                    onClick={async () => {
                      try {
                        await mark({ data: {} });
                        await refresh();
                      } catch (err) {
                        setMsg(safeClientError(err));
                      }
                    }}
                  >
                    Mark all read
                  </button>
                </div>
              </Toolbar>
              <ul className="isi-auth-queue">
                {data.items.map((item) => (
                  <li key={item.id} className="isi-auth-queue-item">
                    <div className="isi-auth-queue-head">
                      <span className="isi-gap-badge" data-tone={item.read ? "neutral" : "info"}>
                        {item.read ? "Read" : "Unread"}
                      </span>
                      <span className="xs muted">{item.createdAt}</span>
                    </div>
                    <p className="isi-auth-lede">{item.body}</p>
                    <div className="isi-auth-btn-row">
                      {item.href ? <a href={item.href}>Open</a> : null}
                      {!item.read ? (
                        <button
                          type="button"
                          className="btn sm"
                          onClick={async () => {
                            try {
                              await mark({ data: { id: item.id } });
                              await refresh();
                            } catch (err) {
                              setMsg(safeClientError(err));
                            }
                          }}
                        >
                          Mark read
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : data ? (
            <div className="isi-auth-empty">
              <h3>No notifications</h3>
              <p>You will see replies and appeal decisions here when they arrive.</p>
            </div>
          ) : null}
          {msg ? (
            <p className="callout" role="status">
              {msg}
            </p>
          ) : null}
        </Section>
      ) : null}
    </main>
  );
}

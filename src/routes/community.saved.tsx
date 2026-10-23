import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/immune/ui";
import { CommunityBar, safeClientError, useMember, useUnreadCount } from "@/components/immune/community/chrome";
import { listCommunitySaves } from "@/lib/community/phase3.functions";
import { PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/community/saved")({
  head: () =>
    seoHead({
      title: `Saved — Community — ${PRODUCT_NAME}`,
      description: "Posts and replies you saved in the community. This is not a personal workspace.",
      path: "/community/saved",
      noIndex: true,
    }),
  component: SavedPage,
});

type Saves = Awaited<ReturnType<typeof listCommunitySaves>>;

function SavedPage() {
  const member = useMember();
  const unread = useUnreadCount(member);
  const load = useServerFn(listCommunitySaves);
  const [data, setData] = useState<Saves | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!member) return;
    load().then(setData).catch((err) => setMsg(safeClientError(err)));
  }, [member, load]);

  return (
    <div className="page community-page">
      <PageHead kicker="Community" title="Saved" lede="Posts and replies you saved. Hidden items stay hidden." />
      <CommunityBar unread={unread} />
      {member === null ? <p><Link to="/auth" search={{ redirect: "/community/saved" }}>Sign in</Link></p> : null}
      {msg ? <p className="callout" role="status">{msg}</p> : null}
      {data?.items.length ? (
        <ul className="community-stack">
          {data.items.map((item) => (
            <li key={item.id} className="card community-card">
              <p className="xs muted">{item.kind === "post" ? "Post" : "Reply"}</p>
              {item.href ? <a href={item.href}>{item.title}</a> : <p>{item.title}</p>}
            </li>
          ))}
        </ul>
      ) : data ? <p className="small muted">Nothing saved yet.</p> : null}
    </div>
  );
}

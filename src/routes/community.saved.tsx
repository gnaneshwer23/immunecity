import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/immune/ui";
import { Section } from "@/components/immune/page";
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
    load()
      .then(setData)
      .catch((err) => setMsg(safeClientError(err)));
  }, [member, load]);

  return (
    <main className="page community-page isi-auth-page">
      <PageHead
        kicker="Community"
        title="Saved"
        lede="Posts and replies you saved. Hidden items stay hidden. This is not a scientific workspace and does not write the knowledge graph."
        stats={data ? [{ v: String(data.items.length), l: "Saved items" }] : undefined}
      />
      <CommunityBar unread={unread} />
      {member === undefined ? <p className="small muted">Checking your account.</p> : null}
      {member === null ? (
        <div className="isi-auth-sign-in">
          <p>
            <Link to="/auth" search={{ redirect: "/community/saved" }}>
              Sign in
            </Link>
          </p>
        </div>
      ) : null}
      {member && !data && !msg ? <p className="small muted">Loading saved items.</p> : null}
      {msg ? (
        <p className="callout" role="status">
          {msg}
        </p>
      ) : null}

      {member ? (
        <Section id="saved" title="Saved items" lede="Community bookmarks only — separate from Atlas concept saves.">
          {data?.items.length ? (
            <ul className="isi-library-list">
              {data.items.map((item) => (
                <li key={item.id}>
                  {item.href ? (
                    <a href={item.href}>
                      <strong>{item.title}</strong>
                      <span className="muted"> · {item.kind === "post" ? "Post" : "Reply"}</span>
                    </a>
                  ) : (
                    <span>
                      <strong>{item.title}</strong>
                      <span className="muted"> · {item.kind === "post" ? "Post" : "Reply"}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : data ? (
            <div className="isi-auth-empty">
              <h3>Nothing saved yet</h3>
              <p>
                Save a post or reply from Community. For graph concepts, use Atlas Save or{" "}
                <Link to="/workspace">My Workspace</Link>.
              </p>
            </div>
          ) : null}
        </Section>
      ) : null}
    </main>
  );
}

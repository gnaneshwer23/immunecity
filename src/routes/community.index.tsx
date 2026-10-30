import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHead } from "@/components/immune/ui";
import { CommunityBar, CommunityNote, kindLabel, useMember, useUnreadCount } from "@/components/immune/community/chrome";
import { listCommunityTopics, listRecentCommunityPosts } from "@/lib/community.functions";
import { PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/community/")({
  loader: async () => {
    const [topics, recent] = await Promise.all([listCommunityTopics(), listRecentCommunityPosts()]);
    return { topics, recent };
  },
  head: () =>
    seoHead({
      title: `Community — ${PRODUCT_NAME}`,
      description:
        "Public immunology discussion topics. Educational conversation among members — not reviewed evidence and not clinical advice.",
      path: "/community",
    }),
  component: CommunityIndex,
});

function CommunityIndex() {
  const { topics: data, recent } = Route.useLoaderData();
  const member = useMember();
  const unread = useUnreadCount(member);
  return (
    <div className="page community-page">
      <PageHead
        kicker="Community"
        title="Discuss the science."
        lede="A public space for members to ask questions and share educational discussion. Posts are visible to every visitor and member. This is not your personal dashboard — that is My Workspace in the account menu. Nothing posted here is added to the knowledge graph."
      />
      <CommunityNote />
      <CommunityBar unread={unread} />
      <p className="row" style={{ margin: "16px 0" }}>
        {member ? (
          <Link className="btn sm primary" to="/community/new">Start a discussion</Link>
        ) : member === null ? (
          <Link className="btn sm primary" to="/auth" search={{ redirect: "/community/new" }}>Sign in to start a discussion</Link>
        ) : (
          <span className="btn sm primary" aria-disabled="true">Start a discussion</span>
        )}
        <Link className="btn sm" to="/community/journal-clubs">Journal clubs</Link>
        {member ? <Link className="btn sm" to="/workspace">My Workspace</Link> : null}
      </p>
      <p className="xs muted" style={{ marginBottom: 16 }}>
        Pick a topic, then start a discussion. Replies appear in{" "}
        <Link to="/community/notifications">Notifications</Link>.
      </p>
      {!data.available ? (
        <p className="isi-empty" role="status">Community isn’t available on this deployment yet. No seeded science posts are invented here.</p>
      ) : data.topics.length === 0 ? (
        <div className="isi-empty" role="status">
          <p>No topics yet. Empty community is not a scientific finding.</p>
          <p>
            {member ? (
              <Link className="btn sm primary" to="/community/new">Start a discussion</Link>
            ) : (
              <Link className="btn sm primary" to="/auth" search={{ redirect: "/community/new" }}>Sign in to start a discussion</Link>
            )}
          </p>
        </div>
      ) : (
        <>
          {recent.available && recent.posts.length > 0 ? (
            <section aria-labelledby="recent-discussions" style={{ marginBottom: 24 }}>
              <h2 id="recent-discussions">Recent discussions</h2>
              <p className="small muted">Visible to everyone. Newest first across all topics.</p>
              <ul className="community-stack">
                {recent.posts.map((p) => (
                  <li key={p.id} className="card community-card">
                    <p className="xs muted community-meta">
                      <span className="badge">{kindLabel(p.kind)}</span>
                      <span>{p.authorName}</span>
                      <Link to="/community/topic/$slug" params={{ slug: p.topicSlug }}>{p.topicTitle}</Link>
                    </p>
                    <h3><Link to="/community/post/$postId" params={{ postId: p.id }}>{p.title}</Link></h3>
                  </li>
                ))}
              </ul>
            </section>
          ) : recent.available ? (
            <div className="isi-empty" role="status" style={{ marginBottom: 24 }}>
              <p>No discussions yet — pick a topic below and start one.</p>
              {member ? (
                <Link className="btn sm primary" to="/community/new">Start a discussion</Link>
              ) : (
                <Link className="btn sm primary" to="/auth" search={{ redirect: "/community/new" }}>Sign in to start a discussion</Link>
              )}
            </div>
          ) : null}
          <h2>Topics</h2>
          <ul className="community-stack">
            {data.topics.map((t) => (
              <li key={t.slug} className="card community-card">
                <h3><Link to="/community/topic/$slug" params={{ slug: t.slug }}>{t.title}</Link></h3>
                <p className="small">{t.description}</p>
                <p className="xs muted">
                  {t.visiblePosts === 0
                    ? "No posts yet — open the topic and start a discussion."
                    : `${t.visiblePosts} visible ${t.visiblePosts === 1 ? "post" : "posts"}`}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="xs muted" style={{ marginTop: 12 }}>
        Report misuse from a post page. Moderators use{" "}
        <Link to="/community/moderation">Moderation</Link>. Journal clubs:{" "}
        <Link to="/community/journal-clubs">scheduled threads only</Link> (no live video). Export or delete your data from{" "}
        <Link to="/community/profile">Profile &amp; privacy</Link>. Private saves live in{" "}
        <Link to="/workspace">My Workspace</Link>.
      </p>
    </div>
  );
}

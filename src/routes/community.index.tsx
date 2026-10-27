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
        Path: open a topic → Start a discussion → others reply on the post → Follow (authors and repliers are followed automatically) → check{" "}
        <Link to="/community/notifications">Notifications</Link> for replies.
      </p>
      {!data.available ? (
        <p className="callout" role="status">Community storage is not available on this database yet. No seeded science posts are invented here.</p>
      ) : data.topics.length === 0 ? (
        <p className="callout" role="status">
          No topics yet. Empty community — not a scientific finding. When a topic exists, sign in and use Start a discussion; nothing here enters the knowledge graph.
          Report misuse from a post page; moderators use <Link to="/community/moderation">Moderation</Link>.
        </p>
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
            <p className="callout" role="status" style={{ marginBottom: 24 }}>
              No discussions yet — the community is ready for members. Sign in, pick a topic below, and use Start a discussion.
              Empty feed is not a scientific finding; posts stay in Community and never enter the knowledge graph.
            </p>
          ) : null}
          <h2>Topics</h2>
          <ul className="community-stack">
            {data.topics.map((t) => (
              <li key={t.slug} className="card community-card">
                <h3><Link to="/community/topic/$slug" params={{ slug: t.slug }}>{t.title}</Link></h3>
                <p className="small">{t.description}</p>
                <p className="xs muted">
                  {t.visiblePosts === 0
                    ? "No visible posts yet — open the topic and use Start a discussion. Empty topic, not reviewed evidence."
                    : `${t.visiblePosts} visible ${t.visiblePosts === 1 ? "post" : "posts"}`}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="xs muted" style={{ marginTop: 12 }}>
        To report a post or reply, open it and use Report. Moderators review the queue at{" "}
        <Link to="/community/moderation">/community/moderation</Link>. Journal clubs:{" "}
        <Link to="/community/journal-clubs">scheduled threads only</Link> (no live video). Export or delete your data from{" "}
        <Link to="/community/profile">Profile &amp; privacy</Link>. Your private saves live in{" "}
        <Link to="/workspace">My Workspace</Link>, not here.
      </p>
    </div>
  );
}

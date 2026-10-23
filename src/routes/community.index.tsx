import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHead } from "@/components/immune/ui";
import { CommunityBar, CommunityNote, useMember, useUnreadCount } from "@/components/immune/community/chrome";
import { listCommunityTopics } from "@/lib/community.functions";
import { PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/community/")({
  loader: () => listCommunityTopics(),
  head: () =>
    seoHead({
      title: `Community — ${PRODUCT_NAME}`,
      description:
        "Immunology discussion topics. Posts are educational conversation, not reviewed evidence and not clinical advice.",
      path: "/community",
    }),
  component: CommunityIndex,
});

function CommunityIndex() {
  const data = Route.useLoaderData();
  const member = useMember();
  const unread = useUnreadCount(member);
  return (
    <div className="page community-page">
      <PageHead
        kicker="Community"
        title="Discuss the science."
        lede="Topic groups for questions, papers, hypotheses and resources. Nothing posted here is added to the knowledge graph."
      />
      <CommunityNote />
      <CommunityBar unread={unread} />
      <p className="row" style={{ margin: "16px 0" }}>
        <Link className="btn sm primary" to="/community/new">New post</Link>
        {member === null ? <Link className="btn sm" to="/auth" search={{ redirect: "/community" }}>Sign in</Link> : null}
      </p>
      {!data.available ? (
        <p className="callout" role="status">Community storage is not available on this database yet.</p>
      ) : (
        <ul className="community-stack">
          {data.topics.map((t) => (
            <li key={t.slug} className="card community-card">
              <h2><Link to="/community/topic/$slug" params={{ slug: t.slug }}>{t.title}</Link></h2>
              <p className="small">{t.description}</p>
              <p className="xs muted">{t.visiblePosts} visible {t.visiblePosts === 1 ? "post" : "posts"}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

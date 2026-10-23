import { seoHead } from "@/lib/seo";
import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PageHead } from "@/components/immune/ui";
import { CommunityBar, CommunityNote, kindLabel, safeClientError, useMember, useUnreadCount } from "@/components/immune/community/chrome";
import { followCommunityTopic, getCommunityTopic } from "@/lib/community.functions";
import { listCommunityJournalClubs } from "@/lib/community/phase3.functions";
import { byId } from "@/lib/immune/engine";
import { PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/community/topic/$slug")({
  loader: async ({ params }) => {
    const topic = await getCommunityTopic({ data: { slug: params.slug } });
    const clubs = await listCommunityJournalClubs({ data: { slug: params.slug } });
    return { ...topic, clubs: clubs.clubs };
  },
  head: ({ loaderData, params }) => {
    const title = loaderData?.topic?.title ?? "Topic";
    return seoHead({
      title: `${title} — Community — ${PRODUCT_NAME}`,
      description: loaderData?.topic?.description ?? "Community topic. Educational discussion, not reviewed evidence.",
      path: `/community/topic/${params.slug}`,
      noIndex: !loaderData?.topic,
    });
  },
  component: TopicPage,
});

function TopicPage() {
  const data = Route.useLoaderData();
  const member = useMember();
  const unread = useUnreadCount(member);
  const follow = useServerFn(followCommunityTopic);
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  if (!data.available) {
    return (
      <div className="page">
        <PageHead kicker="Community" title="Topic unavailable" lede="Community storage is not available on this database yet." />
      </div>
    );
  }
  if (!data.topic) throw notFound();
  const topic = data.topic;

  async function join() {
    setBusy(true);
    setMsg("");
    try {
      await follow({ data: { slug: topic.slug } });
      setMsg("You are a member of this topic. That does not grant moderator.");
      await router.invalidate();
    } catch (err) {
      setMsg(safeClientError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page community-page">
      <PageHead kicker="Community" title={topic.title} lede={topic.description} />
      <CommunityNote />
      <CommunityBar unread={unread} />
      <p className="row" style={{ margin: "16px 0" }}>
        <Link className="btn sm" to="/community">All topics</Link>
        <Link className="btn sm primary" to="/community/new" search={{ topic: topic.slug, concept: "" }}>New post</Link>
        {member ? (
          <button type="button" className="btn sm" disabled={busy} onClick={join}>Join topic</button>
        ) : member === null ? (
          <Link className="btn sm" to="/auth" search={{ redirect: `/community/topic/${topic.slug}` }}>Sign in to join</Link>
        ) : null}
      </p>
      {msg ? <p className="callout" role="status">{msg}</p> : null}
      {data.clubs.length ? (
        <section aria-label="Journal clubs">
          <h2>Journal clubs</h2>
          <ul className="community-stack">
            {data.clubs.map((club) => (
              <li key={club.id} className="card community-card">
                <p className="xs muted">{club.scheduledAt} · {club.paperStatus}</p>
                <h2><Link to="/community/post/$postId" params={{ postId: club.postId }}>{club.title}</Link></h2>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {data.posts.length ? (
        <ul className="community-stack">
          {data.posts.map((p) => (
            <li key={p.id} className="card community-card">
              <p className="xs muted community-meta">
                <span className="badge">{kindLabel(p.kind)}</span>
                <span>{p.authorName}</span>
                {p.referenceStatus ? <span>Reference: {p.referenceStatus}</span> : null}
              </p>
              <h2><Link to="/community/post/$postId" params={{ postId: p.id }}>{p.title}</Link></h2>
              {p.conceptIds.length ? (
                <p className="small">
                  Linked concepts:{" "}
                  {p.conceptIds.map((id) => (
                    <Link key={id} to="/atlas/$id" params={{ id }} style={{ marginRight: 8 }}>
                      {byId[id]?.name ?? id}
                    </Link>
                  ))}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="small muted">No visible posts in this topic yet.</p>
      )}
    </div>
  );
}

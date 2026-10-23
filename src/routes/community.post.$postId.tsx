import { seoHead } from "@/lib/seo";
import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PageHead } from "@/components/immune/ui";
import { CommunityNote, kindLabel, safeClientError, useMember } from "@/components/immune/community/chrome";
import { createCommunityComment, getCommunityPost, reportCommunityTarget } from "@/lib/community.functions";
import { byId } from "@/lib/immune/engine";
import { postKindNote } from "@/lib/community/rules";
import { PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/community/post/$postId")({
  loader: ({ params }) => getCommunityPost({ data: { postId: params.postId } }),
  head: ({ loaderData, params }) =>
    seoHead({
      title: loaderData?.post ? `${loaderData.post.title} — Community — ${PRODUCT_NAME}` : `Post — ${PRODUCT_NAME}`,
      description: "Community post. Educational discussion, not reviewed evidence or clinical advice.",
      path: `/community/post/${params.postId}`,
      noIndex: !loaderData?.post,
    }),
  component: PostPage,
  notFoundComponent: () => (
    <div className="page">
      <PageHead kicker="Community" title="Post not found" lede="It may be hidden or the address is wrong." />
      <Link to="/community">Back to topics</Link>
    </div>
  ),
});

type CommentRow = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  authorName: string;
};

function thread(rows: CommentRow[], parentId: string | null, depth: number): CommentRow[] {
  if (depth > 8) return [];
  const ids = new Set(rows.map((r) => r.id));
  return rows.filter((r) => {
    const parent = r.parentId && ids.has(r.parentId) ? r.parentId : null;
    return parent === parentId;
  });
}

function CommentTree({
  rows,
  parentId,
  depth,
  onReply,
}: {
  rows: CommentRow[];
  parentId: string | null;
  depth: number;
  onReply: (id: string) => void;
}) {
  const items = thread(rows, parentId, depth);
  if (!items.length) return null;
  return (
    <ul className="community-thread">
      {items.map((c) => (
        <li key={c.id} className="card community-card">
          <p className="xs muted">{c.authorName}</p>
          <p className="community-body">{c.body}</p>
          <button type="button" className="btn sm" onClick={() => onReply(c.id)}>Reply</button>
          <CommentTree rows={rows} parentId={c.id} depth={depth + 1} onReply={onReply} />
        </li>
      ))}
    </ul>
  );
}

function PostPage() {
  const data = Route.useLoaderData();
  const member = useMember();
  const router = useRouter();
  const commentFn = useServerFn(createCommunityComment);
  const reportFn = useServerFn(reportCommunityTarget);
  const [body, setBody] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [report, setReport] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (!data.available) {
    return (
      <div className="page">
        <PageHead kicker="Community" title="Post unavailable" lede="Community storage is not available on this database yet." />
      </div>
    );
  }
  if (!data.post) throw notFound();
  const post = data.post;
  const note = postKindNote(post.kind);
  const signIn = `/auth?redirect=${encodeURIComponent(`/community/post/${post.id}`)}`;

  async function sendComment(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await commentFn({ data: { postId: post.id, parentId, body } });
      setBody("");
      setParentId(null);
      await router.invalidate();
    } catch (err) {
      setMsg(safeClientError(err));
    } finally {
      setBusy(false);
    }
  }

  async function sendReport(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await reportFn({ data: { targetType: "post", targetId: post.id, reason: report } });
      setReport("");
      setMsg("Report sent to moderators.");
    } catch (err) {
      setMsg(safeClientError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page community-page">
      <PageHead kicker={`Community · ${post.topicTitle}`} title={post.title} lede={`${kindLabel(post.kind)} · ${post.authorName}`} />
      <CommunityNote />
      <p className="row" style={{ margin: "12px 0" }}>
        <Link className="btn sm" to="/community/topic/$slug" params={{ slug: post.topicSlug }}>Topic</Link>
      </p>
      {note ? <p className="callout">{note}</p> : null}
      <article className="card community-card">
        <p className="community-body">{post.body}</p>
      </article>
      {post.references.length ? (
        <section className="card community-card" aria-label="References">
          <h2>References</h2>
          <ul>
            {post.references.map((r, i) => (
              <li key={`${r.pmid ?? ""}-${r.doi ?? ""}-${i}`}>
                {r.pmid ? <a href={`https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`}>PMID {r.pmid}</a> : null}
                {r.pmid && r.doi ? " · " : null}
                {r.doi ? <a href={`https://doi.org/${r.doi}`}>DOI {r.doi}</a> : null}
                {" "}
                <span className="badge">{r.verificationStatus}</span>
                {r.title ? <span className="small"> {r.title}</span> : null}
                <span className="xs muted"> {r.verificationDetail}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {post.conceptIds.length ? (
        <section className="card community-card" aria-label="Linked concepts">
          <h2>Linked concepts</h2>
          <ul>
            {post.conceptIds.map((id) => (
              <li key={id}>
                <Link to="/atlas/$id" params={{ id }}>{byId[id]?.name ?? id}</Link>
                {" · "}
                <Link to="/graph" search={{ focus: id }}>Graph</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section aria-label="Replies">
        <h2>Replies</h2>
        <CommentTree rows={post.comments} parentId={null} depth={0} onReply={setParentId} />
        {member ? (
          <form onSubmit={sendComment} className="card community-card">
            <label className="field">
              {parentId ? "Reply in thread" : "Reply"}
              <textarea className="community-input" value={body} onChange={(e) => setBody(e.target.value)} required minLength={2} maxLength={4000} />
            </label>
            {parentId ? <button type="button" className="btn sm" onClick={() => setParentId(null)}>Reply to the post instead</button> : null}
            <button className="btn sm primary" type="submit" disabled={busy}>Publish reply</button>
          </form>
        ) : member === null ? (
          <p><a href={signIn}>Sign in to reply</a></p>
        ) : null}
      </section>
      <section className="card community-card" aria-label="Report">
        <h2>Report</h2>
        {member ? (
          <form onSubmit={sendReport}>
            <label className="field">
              Reason
              <textarea className="community-input" value={report} onChange={(e) => setReport(e.target.value)} required minLength={8} maxLength={1000} />
            </label>
            <button className="btn sm" type="submit" disabled={busy}>Send report</button>
          </form>
        ) : member === null ? (
          <p><a href={signIn}>Sign in to report</a></p>
        ) : null}
      </section>
      {msg ? <p className="callout" role="status">{msg}</p> : null}
    </div>
  );
}

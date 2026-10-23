import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/immune/ui";
import { safeClientError, useMember } from "@/components/immune/community/chrome";
import { getMyWorkspace } from "@/lib/workspace.functions";
import { byId } from "@/lib/immune/engine";
import { PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/workspace")({
  head: () =>
    seoHead({
      title: `My Workspace — ${PRODUCT_NAME}`,
      description: "Your saved concepts, followed topics, and discussions. Educational only. This page does not change the knowledge graph.",
      path: "/workspace",
      noIndex: true,
    }),
  component: WorkspacePage,
});

type Workspace = Awaited<ReturnType<typeof getMyWorkspace>>;

function WorkspacePage() {
  const member = useMember();
  const load = useServerFn(getMyWorkspace);
  const [data, setData] = useState<Workspace | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!member) return;
    let cancel = false;
    load()
      .then((result) => {
        if (!cancel) setData(result);
      })
      .catch((err) => {
        if (!cancel) setMsg(safeClientError(err));
      });
    return () => {
      cancel = true;
    };
  }, [member, load]);

  const concepts = (data?.concepts ?? []).flatMap((row) => {
    const node = byId[row.id];
    return node ? [{ id: row.id, name: node.name }] : [];
  });

  return (
    <div className="page community-page">
      <PageHead
        kicker="Account"
        title="My Workspace"
        lede="Concepts you saved, community topics you follow, and discussions you wrote or follow. This list is yours alone. Saving a concept does not change the knowledge graph, and nothing here is clinical advice."
      />
      {member === undefined ? <p className="small muted">Checking your account.</p> : null}
      {member === null ? <p><Link to="/auth" search={{ redirect: "/workspace" }}>Sign in</Link></p> : null}
      {member && !data && !msg ? <p className="small muted">Loading your workspace.</p> : null}
      {msg ? <p className="callout" role="alert">{msg}</p> : null}
      {data ? (
        <div className="community-stack">
          <section className="card community-card" aria-labelledby="workspace-concepts">
            <h2 id="workspace-concepts">Saved concepts</h2>
            {!data.conceptsAvailable ? (
              <p className="small muted">Saved concepts are not available on this database yet.</p>
            ) : concepts.length ? (
              <ul className="community-stack">
                {concepts.map((concept) => (
                  <li key={concept.id}>
                    <Link to="/atlas/$id" params={{ id: concept.id }}>{concept.name}</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small muted">You have not saved a concept yet. Open a concept and save it. Saving does not change the knowledge graph.</p>
            )}
          </section>
          <section className="card community-card" aria-labelledby="workspace-topics">
            <h2 id="workspace-topics">Followed topics</h2>
            {!data.communityAvailable ? (
              <p className="small muted">Followed topics are not available on this database yet.</p>
            ) : data.topics.length ? (
              <ul className="community-stack">
                {data.topics.map((topic) => (
                  <li key={topic.slug}>
                    <Link to="/community/topic/$slug" params={{ slug: topic.slug }}>{topic.title}</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small muted">You are not following a topic yet.</p>
            )}
          </section>
          <section className="card community-card" aria-labelledby="workspace-discussions">
            <h2 id="workspace-discussions">Discussions</h2>
            {!data.communityAvailable ? (
              <p className="small muted">Discussions are not available on this database yet.</p>
            ) : data.discussions.length ? (
              <ul className="community-stack">
                {data.discussions.map((post) => (
                  <li key={post.id}>
                    <Link to="/community/post/$postId" params={{ postId: post.id }}>{post.title}</Link>
                    <p className="xs muted">
                      {post.wrote && post.follows ? "You wrote this and you follow it." : post.wrote ? "You wrote this." : "You follow this."}
                      {post.hidden ? " Hidden." : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small muted">You have no discussions yet.</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

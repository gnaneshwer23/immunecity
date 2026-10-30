import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/immune/ui";
import { safeClientError, useMember } from "@/components/immune/community/chrome";
import { getMyWorkspace } from "@/lib/workspace.functions";
import { byId } from "@/lib/immune/engine";
import { PRODUCT_NAME } from "@/lib/brand";
import {
  loadSavedPaths,
  pathGraphSearch,
  removeResearchPath,
  type ResearchPath,
} from "@/lib/research/savedPaths";
import { lessonForGraphConcept } from "@/lib/academy/graphBridge";

export const Route = createFileRoute("/workspace")({
  head: () =>
    seoHead({
      title: `My Workspace — ${PRODUCT_NAME}`,
      description: "Your saved concepts, research paths, followed topics, and discussions. Educational only. This page does not change the knowledge graph.",
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
  const [paths, setPaths] = useState<ResearchPath[]>([]);

  useEffect(() => {
    setPaths(loadSavedPaths());
  }, []);

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
        lede="Personal dashboard — saved concepts, short research paths (ordered graph ids in this browser), community topics, and discussions. Nothing here invents biology or writes the knowledge graph."
      />
      {member === undefined ? <p className="small muted">Checking your account.</p> : null}
      {member === null ? <p><Link to="/auth" search={{ redirect: "/workspace" }}>Sign in to open your personal dashboard</Link></p> : null}
      {member && !data && !msg ? <p className="small muted">Loading your workspace.</p> : null}
      {msg ? <p className="callout" role="alert">{msg}</p> : null}

      <div className="community-stack" style={{ marginTop: 16 }}>
        <section className="card community-card" aria-labelledby="workspace-paths">
          <h2 id="workspace-paths">Saved research paths</h2>
          <p className="small muted">
            Ordered lists of existing concept ids from the Path tracer. Stored in this browser only — not a second
            scientific database. Open Atlas or the graph to inspect the same curated facts.
          </p>
          {paths.length ? (
            <ul className="community-stack">
              {paths.map((path) => (
                <li key={path.id}>
                  <b>{path.title}</b>
                  <p className="xs muted" style={{ margin: "4px 0 8px" }}>
                    {path.conceptIds.map((id) => byId[id]?.name ?? id).join(" → ")}
                  </p>
                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    {path.conceptIds.slice(0, 4).map((id) => (
                      <Link key={id} className="chip" to="/atlas/$id" params={{ id }}>
                        {byId[id]?.name ?? id}
                      </Link>
                    ))}
                    <Link className="btn sm" to="/graph" search={pathGraphSearch(path)}>
                      Open in graph
                    </Link>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => setPaths(removeResearchPath(path.id))}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="small muted">
              No paths yet. Trace two concepts on{" "}
              <Link to="/reasoning" hash="tracer">Reasoning → Path tracer</Link> and choose Save research path.
            </p>
          )}
        </section>
      </div>

      {data ? (
        <div className="community-stack">
          <section className="card community-card" aria-labelledby="workspace-concepts">
            <h2 id="workspace-concepts">Saved concepts</h2>
            {!data.conceptsAvailable ? (
              <p className="small muted">Saved concepts are not available on this database yet.</p>
            ) : concepts.length ? (
              <ul className="community-stack">
                {concepts.map((concept) => {
                  const lessonId = lessonForGraphConcept(concept.id);
                  return (
                    <li key={concept.id}>
                      <Link to="/atlas/$id" params={{ id: concept.id }}>{concept.name}</Link>
                      <span className="xs muted"> · </span>
                      <Link to="/graph" search={{ focus: concept.id }}>graph</Link>
                      {lessonId ? (
                        <>
                          <span className="xs muted"> · </span>
                          <Link to="/mechanism/$id" params={{ id: lessonId }}>lesson</Link>
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="small muted">You have not saved a concept yet. Open a concept in the Atlas and use Save. Saving does not change the knowledge graph.</p>
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
              <p className="small muted">You are not following a topic yet. Open <Link to="/community">Community</Link> and join a topic.</p>
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
              <p className="small muted">
                You have no discussions yet.{" "}
                <Link to="/community/new">Start a discussion</Link> — posts stay in Community and never enter the knowledge graph.
              </p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

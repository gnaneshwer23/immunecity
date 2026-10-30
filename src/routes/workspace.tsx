import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/immune/ui";
import { PageToc, Section } from "@/components/immune/page";
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

const TOC = [
  { id: "paths", label: "Research paths" },
  { id: "concepts", label: "Saved concepts" },
  { id: "community", label: "Community" },
];

export const Route = createFileRoute("/workspace")({
  head: () =>
    seoHead({
      title: `My Workspace — ${PRODUCT_NAME}`,
      description:
        "Your saved concepts, research paths, followed topics, and discussions. Educational only. This page does not change the knowledge graph.",
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
    <main className="page isi-auth-page">
      <PageHead
        kicker="Account"
        title="My Workspace"
        lede="Personal dashboard — saved concepts, short research paths (ordered graph ids in this browser), community topics, and discussions. Nothing here invents biology or writes the knowledge graph."
        stats={
          member
            ? [
                { v: String(paths.length), l: "Local paths" },
                { v: String(concepts.length), l: "Saved concepts" },
                { v: String(data?.topics.length ?? "…"), l: "Followed topics" },
              ]
            : undefined
        }
      />

      {member === undefined ? <p className="small muted">Checking your account.</p> : null}
      {member === null ? (
        <div className="isi-auth-sign-in">
          <p>
            <Link to="/auth" search={{ redirect: "/workspace" }}>
              Sign in to open your personal dashboard
            </Link>
          </p>
        </div>
      ) : null}
      {member && !data && !msg ? <p className="small muted">Loading your workspace.</p> : null}
      {msg ? (
        <p className="callout" role="alert">
          {msg}
        </p>
      ) : null}

      {member ? (
        <>
          <PageToc items={TOC} />

          <Section
            id="paths"
            title="Saved research paths"
            lede="Ordered lists of existing concept ids from the Path tracer. Stored in this browser only — not a second scientific database."
          >
            {paths.length ? (
              <ul className="isi-auth-queue">
                {paths.map((path) => (
                  <li key={path.id} className="isi-auth-queue-item">
                    <div className="isi-auth-queue-head">
                      <strong>{path.title}</strong>
                      <div className="isi-auth-btn-row">
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
                    </div>
                    <p className="isi-auth-lede">
                      {path.conceptIds.map((id) => byId[id]?.name ?? id).join(" → ")}
                    </p>
                    <div className="isi-auth-queue-meta">
                      {path.conceptIds.slice(0, 6).map((id) => (
                        <Link key={id} to="/atlas/$id" params={{ id }}>
                          {byId[id]?.name ?? id}
                        </Link>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="isi-auth-empty">
                <h3>No paths yet</h3>
                <p>
                  Trace two concepts on{" "}
                  <Link to="/reasoning" hash="tracer">
                    Reasoning → Path tracer
                  </Link>{" "}
                  and choose Save research path.
                </p>
              </div>
            )}
          </Section>

          <Section
            id="concepts"
            title="Saved concepts"
            lede="Account-synced bookmarks of existing atlas concepts. Saving does not change the knowledge graph."
          >
            {!data ? null : !data.conceptsAvailable ? (
              <p className="isi-auth-empty">Saved concepts are not available on this database yet.</p>
            ) : concepts.length ? (
              <ul className="isi-library-list">
                {concepts.map((concept) => {
                  const lessonId = lessonForGraphConcept(concept.id);
                  return (
                    <li key={concept.id}>
                      <Link to="/atlas/$id" params={{ id: concept.id }}>
                        <strong>{concept.name}</strong>
                        <span className="muted">
                          {" "}
                          · graph
                          {lessonId ? " · lesson" : ""}
                        </span>
                      </Link>
                      <span className="isi-auth-queue-meta" style={{ marginTop: 4 }}>
                        <Link to="/graph" search={{ focus: concept.id }}>
                          Open graph
                        </Link>
                        {lessonId ? (
                          <Link to="/mechanism/$id" params={{ id: lessonId }}>
                            Lesson
                          </Link>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="isi-auth-empty">
                <h3>Nothing saved</h3>
                <p>
                  You have not saved a concept yet. Open a concept in the Atlas and use Save. Saving does not
                  change the knowledge graph.
                </p>
              </div>
            )}
          </Section>

          <Section
            id="community"
            title="Community"
            lede="Followed topics and discussions stay in Community — they never enter the curated knowledge graph."
          >
            {!data ? null : (
              <div className="isi-auth-member-grid">
                <div className="isi-auth-member-block">
                  <h3>Followed topics</h3>
                  {!data.communityAvailable ? (
                    <p className="xs muted">Followed topics are not available on this database yet.</p>
                  ) : data.topics.length ? (
                    <ul className="isi-library-list">
                      {data.topics.map((topic) => (
                        <li key={topic.slug}>
                          <Link to="/community/topic/$slug" params={{ slug: topic.slug }}>
                            <strong>{topic.title}</strong>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="xs muted">
                      You are not following a topic yet. Open <Link to="/community">Community</Link> and join a
                      topic.
                    </p>
                  )}
                </div>
                <div className="isi-auth-member-block">
                  <h3>Discussions</h3>
                  {!data.communityAvailable ? (
                    <p className="xs muted">Discussions are not available on this database yet.</p>
                  ) : data.discussions.length ? (
                    <ul className="isi-library-list">
                      {data.discussions.map((post) => (
                        <li key={post.id}>
                          <Link to="/community/post/$postId" params={{ postId: post.id }}>
                            <strong>{post.title}</strong>
                            <span className="muted">
                              {" "}
                              ·{" "}
                              {post.wrote && post.follows
                                ? "You wrote this and you follow it."
                                : post.wrote
                                  ? "You wrote this."
                                  : "You follow this."}
                              {post.hidden ? " Hidden." : ""}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="xs muted">
                      You have no discussions yet.{" "}
                      <Link to="/community/new">Start a discussion</Link> — posts stay in Community and never
                      enter the knowledge graph.
                    </p>
                  )}
                </div>
              </div>
            )}
          </Section>
        </>
      ) : null}
    </main>
  );
}

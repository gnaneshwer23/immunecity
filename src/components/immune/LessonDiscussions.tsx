import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { NodeChip } from "@/components/immune/ui";
import { listConceptDiscussions } from "@/lib/community.functions";
import { discussionStartSearch } from "@/lib/academy/progress";
import { byId } from "@/lib/immune/engine";

type PostLink = { id: string; title: string };

/** Existing posts for a graph id, plus a start-discussion link. Does not create a thread. */
export default function LessonDiscussions({ conceptIds }: { conceptIds: string[] }) {
  const ids = conceptIds.filter((id) => byId[id] && discussionStartSearch(id));
  const [posts, setPosts] = useState<Record<string, PostLink[]>>({});

  useEffect(() => {
    let cancel = false;
    Promise.all(
      ids.slice(0, 4).map(async (id) => {
        try {
          const res = await listConceptDiscussions({ data: { conceptId: id } });
          return [id, res.posts] as const;
        } catch {
          return [id, []] as const;
        }
      }),
    ).then((rows) => {
      if (!cancel) setPosts(Object.fromEntries(rows));
    });
    return () => {
      cancel = true;
    };
  }, [ids.join("|")]);

  if (!ids.length) return null;
  return (
    <div>
      <h4>Community</h4>
      <p className="xs muted">
        These links use graph ids already on this lesson. A discussion appears here only after someone publishes it.
      </p>
      <ul className="si-list">
        {ids.map((id) => {
          const search = discussionStartSearch(id);
          if (!search) return null;
          return (
            <li key={id}>
              <NodeChip id={id} />{" "}
              <Link to="/community/new" search={search}>Start a discussion</Link>
              {(posts[id] ?? []).map((post) => (
                <span key={post.id}>
                  {" · "}
                  <Link to="/community/post/$postId" params={{ postId: post.id }}>{post.title}</Link>
                </span>
              ))}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { askPrefill } from "@/lib/immune/concepts";
import { byId, lessonsForNode } from "@/lib/immune/engine";
import { listConceptDiscussions } from "@/lib/community.functions";

function ConceptDiscussions({ id }: { id: string }) {
  const list = useServerFn(listConceptDiscussions);
  const q = useQuery({
    queryKey: ["concept-discussions", id],
    queryFn: () => list({ data: { conceptId: id } }),
    staleTime: 60_000,
    retry: false,
  });
  const posts = q.data?.posts ?? [];
  if (!posts.length) return null;
  return (
    <span className="entity-discuss">
      {posts.map((p) => (
        <Link key={p.id} className="btn sm" to="/community/post/$postId" params={{ postId: p.id }}>
          Discuss: {p.title}
        </Link>
      ))}
    </span>
  );
}

/** Real routes only. Discuss renders when a community entity link already exists. */
export default function EntityActions({ id, showAsk = true }: { id: string; showAsk?: boolean }) {
  const n = byId[id];
  if (!n) return null;
  const lessonId = lessonsForNode[id]?.[0];
  const question = askPrefill(id, "");
  return (
    <div className="row entity-actions">
      {lessonId ? (
        <Link className="btn sm" to="/mechanism/$id" params={{ id: lessonId }}>Explore mechanism</Link>
      ) : (
        <Link className="btn sm" to="/reasoning" search={{ from: id }}>Explore mechanism</Link>
      )}
      <Link className="btn sm" to="/evidence">View evidence</Link>
      {showAsk ? (
        <Link className="btn sm" to="/ask" search={{ about: id, q: question }}>Ask Immune</Link>
      ) : null}
      <ConceptDiscussions id={id} />
    </div>
  );
}

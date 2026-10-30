import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { askPrefill } from "@/lib/immune/concepts";
import { byId, lessonsForNode } from "@/lib/immune/engine";
import { discussionStartSearch } from "@/lib/academy/progress";
import { lessonForGraphConcept, resolveLessonId } from "@/lib/academy/graphBridge";
import { listConceptDiscussions } from "@/lib/community.functions";
import { getConceptSaved, toggleConceptSave } from "@/lib/workspace.functions";
import { safeClientError, useMember } from "@/components/immune/community/chrome";

function ConceptDiscussions({ id }: { id: string }) {
  const list = useServerFn(listConceptDiscussions);
  const q = useQuery({
    queryKey: ["concept-discussions", id],
    queryFn: () => list({ data: { conceptId: id } }),
    staleTime: 60_000,
    retry: false,
  });
  if (q.isPending) return null;
  const posts = q.data?.posts ?? [];
  const search = discussionStartSearch(id);
  if (!posts.length) {
    if (!search) return null;
    return (
      <Link className="btn sm" to="/community/new" search={search}>Start a discussion</Link>
    );
  }
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

function ConceptSave({ id }: { id: string }) {
  const member = useMember();
  const read = useServerFn(getConceptSaved);
  const toggle = useServerFn(toggleConceptSave);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const q = useQuery({
    queryKey: ["concept-save", id, member?.id],
    queryFn: () => read({ data: { conceptId: id } }),
    enabled: Boolean(member?.id),
    staleTime: 30_000,
    retry: false,
  });
  if (member === undefined) return null;
  if (member === null) {
    return (
      <Link className="btn sm" to="/auth" search={{ redirect: `/atlas/${encodeURIComponent(id)}` }}>
        Save
      </Link>
    );
  }
  const saved = q.data?.saved ?? false;
  return (
    <>
      <button
        type="button"
        className="btn sm"
        aria-pressed={saved}
        disabled={busy}
        title="Save this concept. This does not change the knowledge graph."
        onClick={() => {
          setBusy(true);
          setMsg("");
          toggle({ data: { conceptId: id } })
            .then((result) => {
              queryClient.setQueryData(["concept-save", id, member.id], { saved: result.saved, available: true });
            })
            .catch((err) => setMsg(safeClientError(err)))
            .finally(() => setBusy(false));
        }}
      >
        {saved ? "Saved" : "Save"}
      </button>
      {msg ? <span className="xs" role="alert">{msg}</span> : null}
    </>
  );
}

/** Real routes only. Start a discussion opens the new-post form and does not publish. */
export default function EntityActions({
  id,
  showAsk = true,
  fromLesson,
}: {
  id: string;
  showAsk?: boolean;
  /** Prefer this Academy lesson for return when arriving from a lesson deep link. */
  fromLesson?: string;
}) {
  const n = byId[id];
  if (!n) return null;
  const lessonId =
    resolveLessonId(fromLesson) ?? lessonForGraphConcept(id) ?? lessonsForNode[id]?.[0] ?? null;
  const question = askPrefill(id, "");
  return (
    <div className="row entity-actions">
      {lessonId ? (
        <Link className="btn sm" to="/mechanism/$id" params={{ id: lessonId }}>
          {fromLesson ? "Back to lesson" : "Explore mechanism"}
        </Link>
      ) : (
        <Link className="btn sm" to="/reasoning" search={{ from: id }}>Explore mechanism</Link>
      )}
      <Link className="btn sm" to="/evidence">View evidence</Link>
      {showAsk ? (
        <Link className="btn sm" to="/ask" search={{ about: id, q: question }}>Ask Immune</Link>
      ) : null}
      <ConceptDiscussions id={id} />
      <ConceptSave id={id} />
    </div>
  );
}

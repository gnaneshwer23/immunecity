import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { searchPublicCatalog } from "@/lib/siteSearch.functions";
import {
  catalogGroups,
  searchConcepts,
  searchCourses,
  type DiscussionHit,
  type PublicationHit,
  type SearchGroup,
  type SearchHit,
} from "@/lib/siteSearch";

function HitLink({ hit }: { hit: SearchHit }) {
  const body = (
    <>
      <span className="site-search-title">{hit.title}</span>
      <span className="site-search-meta">
        {hit.kind === "concept" ? hit.typeLabel : hit.kind === "discussion" ? hit.subtype : hit.kind === "course" ? "Course" : "Publication"}
        {hit.status ? <span className="site-search-status">{hit.status}</span> : null}
      </span>
    </>
  );
  if (hit.kind === "concept") {
    return <Link to="/atlas/$id" params={{ id: hit.id }}>{body}</Link>;
  }
  if (hit.kind === "course" && hit.lessonId) {
    return <Link to="/mechanism/$id" params={{ id: hit.lessonId }}>{body}</Link>;
  }
  if (hit.kind === "course") {
    return <Link to="/academy">{body}</Link>;
  }
  if (hit.kind === "publication" && hit.nodeId) {
    return <Link to="/atlas/$id" params={{ id: hit.nodeId }}>{body}</Link>;
  }
  if (hit.kind === "publication") {
    return <Link to="/evidence">{body}</Link>;
  }
  if (hit.postId) {
    return <Link to="/community/post/$postId" params={{ postId: hit.postId }}>{body}</Link>;
  }
  if (hit.topicSlug) {
    return <Link to="/community/topic/$slug" params={{ slug: hit.topicSlug }}>{body}</Link>;
  }
  return <Link to="/community">{body}</Link>;
}

export default function SiteSearch() {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const remote = useServerFn(searchPublicCatalog);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [remoteState, setRemoteState] = useState<{
    q: string;
    publications: { state: "ready" | "empty" | "unavailable"; items: PublicationHit[] };
    discussions: { state: "ready" | "empty" | "unavailable"; items: DiscussionHit[] };
  } | null>(null);

  const remoteQuery = query.trim().slice(0, 80);
  const concepts = useMemo(() => searchConcepts(remoteQuery), [remoteQuery]);
  const courses = useMemo(() => searchCourses(remoteQuery), [remoteQuery]);
  const ready = remoteQuery.length >= 2;
  const remoteMatches = remoteState && remoteState.q === remoteQuery;
  const groups: SearchGroup[] = useMemo(() => {
    if (!ready) return [];
    return catalogGroups({
      concepts,
      courses,
      publications: remoteMatches
        ? remoteState.publications
        : { state: "empty", items: [] },
      discussions: remoteMatches
        ? remoteState.discussions
        : { state: "empty", items: [] },
    }).map((group) => {
      if (remoteMatches) return group;
      if (group.id === "publications" || group.id === "discussions") {
        return { ...group, state: "pending", note: group.id === "publications" ? "Searching approved publications…" : "Searching discussions…", items: [] };
      }
      return group;
    });
  }, [ready, concepts, courses, remoteMatches, remoteState]);

  useEffect(() => {
    if (!ready) return;
    const q = remoteQuery;
    let cancel = false;
    const timer = window.setTimeout(() => {
      remote({ data: { q } })
        .then((result) => {
          if (!cancel) setRemoteState({ q, publications: result.publications, discussions: result.discussions });
        })
        .catch(() => {
          if (!cancel) {
            setRemoteState({
              q,
              publications: { state: "unavailable", items: [] },
              discussions: { state: "unavailable", items: [] },
            });
          }
        });
    }, 250);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [remoteQuery, ready, remote]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="site-search" ref={rootRef}>
      <form role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="sr-only" htmlFor={`${listId}-q`}>Search concepts, publications, courses, and discussions</label>
        <span className="site-search-field">
          <Search size={16} aria-hidden />
          <input
            id={`${listId}-q`}
            type="search"
            value={query}
            placeholder="Search"
            autoComplete="off"
            aria-controls={listId}
            aria-expanded={open && ready}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
        </span>
      </form>
      {open && ready ? (
        <div className="site-search-panel" id={listId}>
          {groups.map((group) => (
            <section key={group.id} aria-label={group.label}>
              <h2>{group.label}</h2>
              {group.items.length ? (
                <ul>
                  {group.items.map((hit) => (
                    <li key={`${hit.kind}-${hit.id}`}>
                      <HitLink hit={hit} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{group.note}</p>
              )}
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

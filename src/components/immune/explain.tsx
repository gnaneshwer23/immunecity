/* Visual-explainer building blocks shared by content pages: illustrated heads,
   key takeaways, explained sections and on-demand sources (closed by default). */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookMarked, ChevronDown, ExternalLink } from "lucide-react";
import { approvedQuery, type ApprovedCitation } from "@/lib/citations.functions";
import type { DomainId } from "@/lib/immune/concepts";
import heroCity from "@/assets/explain/hero-city.jpg";
import cellsArt from "@/assets/explain/cells.jpg";
import moleculesArt from "@/assets/explain/molecules.jpg";
import diseaseArt from "@/assets/explain/disease.jpg";
import therapyArt from "@/assets/explain/therapy.jpg";
import researchArt from "@/assets/explain/research.jpg";

export const ART = { heroCity, cellsArt, moleculesArt, diseaseArt, therapyArt, researchArt };

export const DOMAIN_ART: Record<DomainId, string> = {
  foundations: heroCity,
  cells: cellsArt,
  molecules: moleculesArt,
  signalling: moleculesArt,
  disease: diseaseArt,
  therapies: therapyArt,
  methods: researchArt,
  research: researchArt,
};

export function ExplainHero({ kicker, title, summary, art, children }: { kicker: ReactNode; title: ReactNode; summary: ReactNode; art: string; children?: ReactNode }) {
  return (
    <header className="ex-hero">
      <div className="ex-hero-copy">
        <span className="ex-kicker">{kicker}</span>
        <h1>{title}</h1>
        <p className="ex-summary">{summary}</p>
        {children}
      </div>
      <img className="ex-hero-art" src={art} alt="" width={1024} height={768} />
    </header>
  );
}

export function KeyTakeaways({ items, title = "In short" }: { items: ReactNode[]; title?: string }) {
  if (!items.length) return null;
  return (
    <section className="ex-takeaways" aria-label={title}>
      <h2>{title}</h2>
      <ol>{items.map((t, i) => <li key={i}><span className="ex-num">{i + 1}</span><span>{t}</span></li>)}</ol>
    </section>
  );
}

export function ExplainerSection({ title, summary, visual, children, id }: { title: ReactNode; summary?: ReactNode; visual?: ReactNode; children?: ReactNode; id?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="ex-section" id={id}>
      <div className="ex-section-text">
        <h2>{title}</h2>
        {summary ? <p className="ex-section-summary">{summary}</p> : null}
        {children ? (
          <>
            <button type="button" className="ex-more" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              {open ? "Show less" : "Show more detail"} <ChevronDown size={14} className={open ? "rot" : ""} />
            </button>
            {open ? <div className="ex-detail">{children}</div> : null}
          </>
        ) : null}
      </div>
      {visual ? <div className="ex-section-visual">{visual}</div> : null}
    </section>
  );
}

/** Filter approved citations to a set of concept and/or relationship IDs. */
export function citationsFor(all: ApprovedCitation[], nodeIds: string[], relIds: string[] = []) {
  const n = new Set(nodeIds), r = new Set(relIds);
  const seen = new Set<string>();
  return all.filter((c) => (n.has(c.node_id) || (c.relationship_id && r.has(c.relationship_id))) && !seen.has(c.evidence_id) && seen.add(c.evidence_id));
}

export function useSources(nodeIds: string[], relIds: string[] = []) {
  const q = useQuery(approvedQuery);
  return { ...q, isLoading: q.isPending, items: q.data ? citationsFor(q.data, nodeIds, relIds) : [] };
}

/** Small pill near the top of a page; jumps to and opens the sources fold. */
export function SourcesPill({ count }: { count: number | null }) {
  return (
    <a className="ex-pill" href="#sources" onClick={() => window.dispatchEvent(new Event("ex-open-sources"))}>
      <BookMarked size={13} /> Sources{count != null ? ` (${count})` : ""}
    </a>
  );
}

/** Superscript marker next to a claim: opens the sources fold at that entry. */
export function CiteMarker({ n }: { n: number }) {
  return (
    <a className="ex-cite" href={`#src-${n}`} aria-label={`Source ${n}`} onClick={() => window.dispatchEvent(new Event("ex-open-sources"))}>
      <sup>{n}</sup>
    </a>
  );
}

export function SourcesFold({ items, isLoading, isError, note }: { items: ApprovedCitation[]; isLoading?: boolean; isError?: boolean; note?: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const open = () => { if (ref.current) ref.current.open = true; };
    if (window.location.hash.startsWith("#src") || window.location.hash === "#sources") open();
    window.addEventListener("ex-open-sources", open);
    return () => window.removeEventListener("ex-open-sources", open);
  }, []);
  return (
    <details ref={ref} id="sources" className="ex-sources">
      <summary>
        <BookMarked size={16} /> Sources &amp; evidence
        <span className="ex-sources-count">{isLoading ? "loading…" : isError ? "unavailable" : `${items.length} reviewed`}</span>
        <ChevronDown size={16} className="ex-sources-chev" />
      </summary>
      <div className="ex-sources-body">
        {isError ? (
          <p className="small muted">The evidence service is temporarily unavailable, so reviewed sources can't be shown right now. This doesn't mean there are none.</p>
        ) : isLoading ? (
          <p className="small muted">Loading reviewed sources…</p>
        ) : items.length ? (
          <ol>
            {items.map((c, i) => (
              <li key={c.evidence_id} id={`src-${i + 1}`}>
                <a href={c.url} target="_blank" rel="noreferrer">{c.label} <ExternalLink size={12} /></a>
                <span className="xs muted"> · supports: {c.claim_support}{c.relationship_id ? ` · link ${c.relationship_id}` : ""}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="small muted">No reviewed sources yet. Content here comes from the curated knowledge graph and is awaiting claim-level review.</p>
        )}
        {note ? <div className="xs muted ex-sources-note">{note}</div> : null}
      </div>
    </details>
  );
}

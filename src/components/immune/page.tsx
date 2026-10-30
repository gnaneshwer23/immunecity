/* Shared page anatomy for product pages: titled sections, a sticky
   "On this page" rail with scroll-spy, labelled fact panels and the journey
   footer. Every journey page reads in the same order:
   head → on this page → sections → continue the journey. */
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { JOURNEY_NAV, type JourneyItem } from "@/data/marketingNav";

export type TocItem = { id: string; label: string };

/** Page section with a consistent two-column header.
 * `n` is accepted for call-site compatibility but not shown — editorial titles carry the section. */
export function Section({
  id,
  n: _n,
  title,
  lede,
  aside,
  children,
  className,
}: {
  id?: string;
  /** @deprecated Unused visually; kept so existing `n={…}` call sites need not churn. */
  n?: number;
  title: ReactNode;
  lede?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  void _n;
  const headId = id ? `${id}-title` : undefined;
  return (
    <section
      className={`section isi-sec${className ? ` ${className}` : ""}`}
      id={id}
      aria-labelledby={headId}
    >
      <header className="isi-sec-head">
        <div className="isi-sec-titles">
          <h2 id={headId}>{title}</h2>
        </div>
        {lede || aside ? (
          <div className="isi-sec-side">
            {lede ? <p className="lede">{lede}</p> : null}
            {aside}
          </div>
        ) : null}
      </header>
      {children}
    </section>
  );
}

/** Sticky in-page navigation; highlights the section currently in view. */
export function PageToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const ids = items.map((i) => i.id).join("|");
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const els = ids
      .split("|")
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);
  if (items.length < 2) return null;
  return (
    <nav className="isi-toc" aria-label="On this page">
      <span className="isi-toc-label">On this page</span>
      <ol>
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} aria-current={active === i.id ? "location" : undefined}>
              {i.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Labelled facts inside a detail panel (replaces ad-hoc label/value grids). */
export function Facts({ items }: { items: { label: string; children: ReactNode }[] }) {
  return (
    <dl className="isi-facts">
      {items.map((f) => (
        <div key={f.label}>
          <dt>{f.label}</dt>
          <dd>{f.children}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Detail panel for the currently selected item in an explorer. */
export function DetailPanel({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="dyn-detail isi-detail" aria-live="polite">
      <div className="isi-detail-head">
        <div>
          {eyebrow ? <span className="isi-detail-eyebrow">{eyebrow}</span> : null}
          <h3>{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Toolbar row above filterable lists: controls on the left, result count right. */
export function Toolbar({ children, count }: { children: ReactNode; count?: ReactNode }) {
  return (
    <div className="isi-toolbar">
      <div className="isi-toolbar-controls">{children}</div>
      {count != null ? (
        <span className="isi-toolbar-count" role="status">
          {count}
        </span>
      ) : null}
    </div>
  );
}

type Flat = JourneyItem & { group: string; index: number; total: number };

/** Journey pages in reading order (first occurrence of each path, no hashes). */
const JOURNEY_FLAT: Flat[] = (() => {
  const seen = new Set<string>();
  const out: Flat[] = [];
  JOURNEY_NAV.forEach((g) => {
    const items = g.items.filter((i) => !i.hash);
    items.forEach((i, index) => {
      if (seen.has(i.path)) return;
      seen.add(i.path);
      out.push({ ...i, group: g.label, index: index + 1, total: items.length });
    });
  });
  return out;
})();

function journeyPosition(pathname: string) {
  const at = JOURNEY_FLAT.findIndex(
    (i) => pathname === i.path || pathname.startsWith(`${i.path}/`),
  );
  if (at < 0) return null;
  return { current: JOURNEY_FLAT[at]!, prev: JOURNEY_FLAT[at - 1], next: JOURNEY_FLAT[at + 1] };
}

/** "Continue the journey" band: previous and next page in Explore → Research → Academy → Community → Ask order. */
export function JourneyNext() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pos = journeyPosition(pathname);
  if (!pos) return null;
  const { current, prev, next } = pos;
  return (
    <nav className="isi-journey" aria-label="Continue the journey">
      <div className="isi-journey-where">
        <span className="isi-journey-label">{current.group}</span>
        <strong>{current.title}</strong>
      </div>
      <div className="isi-journey-links">
        {prev ? (
          <Link to={prev.path as "/"} className="isi-journey-card prev">
            <span className="isi-journey-dir">
              <ArrowLeft size={14} aria-hidden /> Previous
              {prev.group !== current.group ? ` · ${prev.group}` : ""}
            </span>
            <strong>{prev.title}</strong>
            <small>{prev.desc}</small>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={next.path as "/"} className="isi-journey-card next">
            <span className="isi-journey-dir">
              Next{next.group !== current.group ? ` · ${next.group}` : ""}{" "}
              <ArrowRight size={14} aria-hidden />
            </span>
            <strong>{next.title}</strong>
            <small>{next.desc}</small>
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

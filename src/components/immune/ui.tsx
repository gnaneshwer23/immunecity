import { Link, useRouterState } from "@tanstack/react-router";
import { JOURNEY_NAV } from "@/data/marketingNav";
import type { ReactNode } from "react";
import { TYPES, byId } from "@/lib/immune/engine";

export function PageHead({ kicker, title, lede, stats }: { kicker: ReactNode; title: ReactNode; lede?: ReactNode; stats?: { v: ReactNode; l: string }[] }) {
  return (
    <header className="page-head bio-page-head">
      <Breadcrumbs />
      <div className="kicker bio-eyebrow"><span className="status-dot" />{kicker}</div>
      <h1>{title}</h1>
      {lede ? <p>{lede}</p> : null}
      {stats?.length ? (
        <div className="bio-page-stats">
          {stats.map((s) => <div className="bio-page-stat" key={s.l}><b>{s.v}</b><span>{s.l}</span></div>)}
        </div>
      ) : null}
    </header>
  );
}

export function NodeChip({ id, label }: { id: string; label?: string }) {
  const n = byId[id];
  if (!n) return null;
  const draft = Boolean(n.draft);
  return (
    <Link
      className="chip"
      to="/graph"
      search={{ focus: id }}
      title={`${n.name} · ${TYPES[n.node_type].label}${draft ? " · draft extension (not curated core)" : ""}`}
    >
      <span className="dot" style={{ background: `var(${TYPES[n.node_type].c})` }} />
      {label || n.name}
      {draft ? (
        <span className="badge rs rs-draft" style={{ marginLeft: 4, fontSize: "0.65rem" }}>
          draft
        </span>
      ) : null}
    </Link>
  );
}

export function NodeLink({ id, label }: { id: string; label?: string }) {
  const n = byId[id];
  if (!n) return null;
  return (
    <Link className="nodelink" to="/graph" search={(prev: Record<string, unknown>) => ({ ...prev, focus: id })}>
      {label || n.name}
    </Link>
  );
}

/* Prominent label for illustrative, non-clinical models. */
export function EduBanner({ children }: { children: ReactNode }) {
  return (
    <div className="edu-banner" role="note">
      <span className="badge edu-badge">Illustrative · educational only</span>
      <span className="small">{children} <a href="/methods#models">See the model assumptions</a>.</span>
    </div>
  );
}

/** Home / Journey / Page trail derived from the shared journey menu. */
export function Breadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const group = JOURNEY_NAV.find((g) => g.items.some((i) => !i.hash && (pathname === i.path || pathname.startsWith(`${i.path}/`))));
  const item = group?.items.find((i) => !i.hash && (pathname === i.path || pathname.startsWith(`${i.path}/`)));
  if (!group || !item) return null;
  const deeper = pathname !== item.path;
  return (
    <nav className="isi-crumbs" aria-label="Breadcrumb">
      <ol>
        <li><Link to="/">Home</Link></li>
        <li>{group.label}</li>
        <li>{deeper ? <Link to={item.path as "/"}>{item.title}</Link> : <span aria-current="page">{item.title}</span>}</li>
        {deeper ? <li><span aria-current="page">Detail</span></li> : null}
      </ol>
    </nav>
  );
}

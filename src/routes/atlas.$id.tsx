import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BookOpen, MessageSquare, Network } from "lucide-react";
import { TYPES, byId, human, relId, spineLabel, type NodeType } from "@/lib/immune/engine";
import {
  askShortcuts,
  conceptExtras,
  conceptNeighbours,
  domainsFor,
  isSparse,
  learningSteps,
  neighboursByType,
} from "@/lib/immune/concepts";
import { inspect } from "@/lib/immune/inspector";
import { StatusBadge } from "@/components/immune/ScientificInspector";
import { PRODUCT_NAME } from "@/lib/brand";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/atlas/$id")({
  loader: ({ params }) => {
    const n = byId[params.id];
    if (!n) throw notFound();
    return { id: n.id };
  },
  head: ({ loaderData, params }) => {
    const n = loaderData ? byId[loaderData.id] : undefined;
    if (!n) return seoHead({ title: `Concept unavailable | ${PRODUCT_NAME}`, description: "This concept is not in the knowledge atlas.", path: `/atlas/${params.id}`, noIndex: true });
    return seoHead({
      title: `${n.name} — ${TYPES[n.node_type].label} | ${PRODUCT_NAME} Atlas`,
      description: (n.desc || `${n.name} in the immunology knowledge graph`).slice(0, 155),
      path: `/atlas/${n.id}`,
      type: "article",
      noIndex: Boolean(n.draft) || isSparse(n.id),
    });
  },
  notFoundComponent: () => (
    <div className="page">
      <h1>We don't have that concept</h1>
      <p className="lede">It may have been renamed or not yet added. <Link to="/atlas">Browse the Knowledge Atlas</Link>.</p>
    </div>
  ),
  component: ConceptPage,
});

const GROUP_ORDER: NodeType[] = ["CELL", "MOLECULE", "RECEPTOR", "PATHWAY", "COMPARTMENT", "DISEASE", "PATHOGEN", "INTERVENTION", "TRIAL", "BIOMARKER", "DATA", "AI_METHOD", "DISCOVERY"];

function MiniDiagram({ id }: { id: string }) {
  const n = byId[id]!;
  const ns = conceptNeighbours(id).slice(0, 12);
  const W = 560, H = 300, cx = W / 2, cy = H / 2, R = 115;
  return (
    <svg className="isi-mini" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${n.name} and ${ns.length} directly linked concepts`}>
      {ns.map((x, i) => {
        const a = (i / Math.max(ns.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const px = cx + Math.cos(a) * R * 1.7, py = cy + Math.sin(a) * R;
        return (
          <g key={relId(x.edge) + x.dir}>
            <line x1={cx} y1={cy} x2={px} y2={py} className="isi-mini-edge" />
            <circle cx={px} cy={py} r={6} style={{ fill: `var(${TYPES[x.node.node_type].c})` }} />
            <text x={px} y={py - 10} textAnchor="middle" className="isi-mini-label">{x.node.name.length > 22 ? x.node.name.slice(0, 21) + "…" : x.node.name}</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={11} style={{ fill: `var(${TYPES[n.node_type].c})` }} />
      <text x={cx} y={cy + 28} textAnchor="middle" className="isi-mini-center">{n.name}</text>
    </svg>
  );
}

function ConceptPage() {
  const { id } = Route.useLoaderData();
  const n = byId[id]!;
  const x = conceptExtras(n);
  const groups = neighboursByType(id);
  const steps = learningSteps(id);
  const doms = domainsFor(id);
  const total = conceptNeighbours(id).length;

  return (
    <article className="page isi-concept">
      <nav className="isi-crumbs" aria-label="Breadcrumb">
        <ol>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/atlas">Knowledge Atlas</Link></li>
          {doms[0] ? <li>{doms[0].title}</li> : null}
          <li><span aria-current="page">{n.name}</span></li>
        </ol>
      </nav>
      <header className="isi-concept-head">
        <span className="isi-concept-kicker">
          <span className="dot" style={{ background: `var(${TYPES[n.node_type].c})` }} /> {TYPES[n.node_type].label} · <span className="mono">{n.id}</span>
          {x.evidenceStatus ? <> · concept status: {x.evidenceStatus.toLowerCase()}</> : null}
        </span>
        <h1>{n.name}</h1>
        {x.aliases.length ? <p className="small muted">Also called: {x.aliases.join(", ")}</p> : null}
        <p className="isi-concept-def">{n.desc || "No definition has been recorded for this concept yet."}</p>
        {n.draft ? <p className="si-warn" role="note">Draft — not curated core. Added to close a coverage gap and awaiting expert review.</p> : null}
        {!n.draft && total < 2 ? <p className="si-warn" role="note">Sparsely connected — only {total} link recorded so far.</p> : null}
        <div className="isi-concept-actions">
          <Link className="btn sm primary" to="/ask" search={{ about: n.id }}><MessageSquare size={14} /> Ask ISI about {n.name}</Link>
          <Link className="btn sm" to="/graph" search={{ focus: n.id }}><Network size={14} /> Open in graph</Link>
          <Link className="btn sm" to="/research" search={{ lib: n.name }} hash="library"><BookOpen size={14} /> Find papers</Link>
        </div>
      </header>

      <div className="isi-concept-grid">
        <div>
          {(x.clinical || x.spineSteps.length) ? (
            <section className="section">
              <h2>Why it matters</h2>
              {x.spineSteps.length ? (
                <p>Sits at {x.spineSteps.map((s) => spineLabel(s)).join(", ").toLowerCase()} on the 15-step causal chain.</p>
              ) : null}
              {x.clinical ? <p>{x.clinical}</p> : null}
              <p className="xs muted">From the curated graph record; individual claims are not yet claim-level reviewed.</p>
            </section>
          ) : null}

          <section className="section">
            <h2>Direct connections</h2>
            {total ? <MiniDiagram id={id} /> : <p className="muted">No links recorded yet.</p>}
          </section>

          <section className="section">
            <h2>Related concepts and evidence</h2>
            <p className="small muted">Select a link to see its mechanism and evidence for that specific relationship.</p>
            {GROUP_ORDER.filter((t) => groups[t]?.length).map((t) => (
              <div key={t} className="isi-rel-group">
                <h3>{TYPES[t].label}</h3>
                <ul className="isi-rel-list">
                  {groups[t]!.map((r) => (
                    <li key={relId(r.edge) + r.dir}>
                      <button type="button" className="isi-rel-btn" onClick={() => inspect({ kind: "relationship", id: relId(r.edge) })}>
                        {r.dir === "out" ? <>{human(r.edge.relation)}</> : <>{human(r.edge.relation)} (by)</>}
                      </button>{" "}
                      <Link to="/atlas/$id" params={{ id: r.node.id }}>{r.node.name}</Link>{" "}
                      {r.edge.location ? <span className="xs muted">· {r.edge.location}</span> : null}{" "}
                      <StatusBadge edge={r.edge} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </div>

        <aside className="isi-concept-side">
          <section>
            <h2>Learn next</h2>
            {steps.prereq.length ? (
              <><h3>Comes before</h3><ul>{steps.prereq.map((p) => <li key={p.id}><Link to="/atlas/$id" params={{ id: p.id }}>{p.name}</Link></li>)}</ul></>
            ) : null}
            {steps.next.length ? (
              <><h3>Leads to</h3><ul>{steps.next.map((p) => <li key={p.id}><Link to="/atlas/$id" params={{ id: p.id }}>{p.name}</Link></li>)}</ul></>
            ) : null}
            {!steps.prereq.length && !steps.next.length ? <p className="small muted">No learning path recorded yet.</p> : null}
          </section>
          <section>
            <h2>Ask ISI</h2>
            <ul>
              {askShortcuts(n).map((q) => (
                <li key={q}><Link to="/ask" search={{ about: n.id, q }}>{q}</Link></li>
              ))}
            </ul>
          </section>
          <section>
            <h2>Research</h2>
            <p className="small">Search five Nature Portfolio journals for "{n.name}". Results are source metadata, not reviewed evidence.</p>
            <Link to="/research" search={{ lib: n.name }} hash="library">Search publications →</Link>
          </section>
          {doms.length ? (
            <section>
              <h2>Atlas domains</h2>
              <ul>{doms.map((d) => <li key={d.id}><Link to="/atlas" hash={d.id}>{d.title}</Link></li>)}</ul>
            </section>
          ) : null}
        </aside>
      </div>
    </article>
  );
}

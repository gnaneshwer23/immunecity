import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Check, Copy, MessageSquare, Network } from "lucide-react";
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
import { absoluteUrl, conceptJsonLd, seoHead } from "@/lib/seo";
import { GRAPH_CORE_VERSION } from "@/lib/immune/graphRelease";
import { XREF_SOURCES, conceptSameAs, conceptXrefs } from "@/data/xrefs";
import TranslationalPath from "@/components/immune/TranslationalPath";
import { DOMAIN_ART, ExplainHero, ExplainerSection, KeyTakeaways, SourcesFold, SourcesPill, useSources } from "@/components/immune/explain";

export const Route = createFileRoute("/atlas/$id")({
  loader: ({ params }) => {
    const n = byId[params.id];
    if (!n) throw notFound();
    return { id: n.id };
  },
  head: ({ loaderData, params }) => {
    const n = loaderData ? byId[loaderData.id] : undefined;
    if (!n) return seoHead({ title: `Concept unavailable | ${PRODUCT_NAME}`, description: "This concept is not in the knowledge atlas.", path: `/atlas/${params.id}`, noIndex: true });
    const noIndex = Boolean(n.draft) || isSparse(n.id);
    const description = (n.desc || `${n.name} in the immunology knowledge graph`).slice(0, 155);
    const head = seoHead({
      title: `${n.name} — ${TYPES[n.node_type].label} | ${PRODUCT_NAME} Atlas`,
      description,
      path: `/atlas/${n.id}`,
      type: "article",
      noIndex,
    });
    if (noIndex) return head;
    const ld = conceptJsonLd({
      id: n.id,
      name: n.name,
      description,
      typeLabel: TYPES[n.node_type].label,
      aliases: conceptExtras(n).aliases,
      graphVersion: GRAPH_CORE_VERSION,
      sameAs: conceptSameAs(n.id),
    });
    return { ...head, scripts: [{ type: "application/ld+json", children: JSON.stringify(ld) }] };
  },
  notFoundComponent: () => (
    <div className="page">
      <h1>Concept not found</h1>
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
        // Round so server and browser trig results serialise identically (avoids hydration mismatch).
        const px = Math.round((cx + Math.cos(a) * R * 1.7) * 100) / 100, py = Math.round((cy + Math.sin(a) * R) * 100) / 100;
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

function pluralType(t: NodeType, count: number): string {
  const label = TYPES[t].label.toLowerCase();
  if (count === 1 || label === "data") return label;
  return /[^aeiou]y$/.test(label) ? `${label.slice(0, -1)}ies` : `${label}s`;
}

function withArticle(word: string): string {
  return /^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`;
}

function Identifiers({ id }: { id: string }) {
  const xrefs = conceptXrefs(id);
  if (!xrefs.length) return null;
  return (
    <section aria-labelledby="xref-heading">
      <h2 id="xref-heading">Identifiers</h2>
      <dl className="isi-xrefs">
        {xrefs.map((x) => (
          <div key={x.source + x.id}>
            <dt>{XREF_SOURCES[x.source].name}</dt>
            <dd>
              <a href={XREF_SOURCES[x.source].href(x.id)} target="_blank" rel="noopener noreferrer" title={x.label}>
                <span className="mono">{x.id}</span>
              </a>
              {x.match === "close" ? <span className="xs muted"> · related term</span> : null}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CiteThisPage({ name, id, typeLabel }: { name: string; id: string; typeLabel: string }) {
  const [copied, setCopied] = useState(false);
  const citation = `${PRODUCT_NAME}. “${name}” (${typeLabel.toLowerCase()}). ${PRODUCT_NAME} Knowledge Atlas, graph release ${GRAPH_CORE_VERSION}. ${absoluteUrl(`/atlas/${id}`)}`;
  const copy = () => {
    navigator.clipboard?.writeText(citation).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      },
      () => setCopied(false),
    );
  };
  return (
    <section className="isi-cite" aria-labelledby="cite-heading">
      <h2 id="cite-heading">Cite this page</h2>
      <p className="isi-cite-text">{citation}</p>
      <button type="button" className="btn sm" onClick={copy} aria-live="polite">
        {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy citation</>}
      </button>
      <p className="xs muted">Add the date you accessed it. Cite primary literature for scientific claims — see Sources below.</p>
    </section>
  );
}

function firstSentence(s: string) {
  const m = s.match(/^.+?[.!?](\s|$)/);
  return (m ? m[0] : s).trim();
}

function ConceptPage() {
  const { id } = Route.useLoaderData();
  const n = byId[id]!;
  const x = conceptExtras(n);
  const groups = neighboursByType(id);
  const steps = learningSteps(id);
  const doms = domainsFor(id);
  const all = conceptNeighbours(id);
  const total = all.length;
  const outN = all.filter((r) => r.dir === "out").length;
  const inN = total - outN;
  const art = DOMAIN_ART[doms[0]?.id ?? "foundations"];
  const src = useSources([id], all.map((r) => relId(r.edge)));
  const desc = n.desc || "No definition is recorded for this concept yet.";
  const topTypes = GROUP_ORDER.filter((t) => groups[t]?.length)
    .sort((a, b) => groups[b]!.length - groups[a]!.length)
    .slice(0, 3)
    .map((t) => `${groups[t]!.length} ${pluralType(t, groups[t]!.length)}`);
  const typeLabel = TYPES[n.node_type].label;

  const takeaways = [
    <><b>What it is:</b> {withArticle(typeLabel.toLowerCase())}{doms[0] ? <>, filed under <Link to="/atlas" hash={doms[0].id}>{doms[0].title}</Link></> : null}.</>,
    total
      ? <><b>How it connects:</b> {total} direct link{total === 1 ? "" : "s"} — it acts on {outN} and is acted on by {inN}{topTypes.length ? <>, chiefly {topTypes.join(", ")}</> : null}.</>
      : <><b>How it connects:</b> no links recorded yet.</>,
    x.spineSteps.length
      ? <><b>Where it sits:</b> {x.spineSteps.map((s) => spineLabel(s)).join(", ").toLowerCase()} on the 15-step immune chain.</>
      : x.clinical ? <><b>Why it matters:</b> {firstSentence(x.clinical)}</> : null,
  ].filter(Boolean);

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

      <ExplainHero
        art={art}
        kicker={<><span className="dot" style={{ background: `var(${TYPES[n.node_type].c})` }} /> {TYPES[n.node_type].label}</>}
        title={n.name}
        summary={firstSentence(desc)}
      >
        {x.aliases.length ? <p className="small muted">Also called: {x.aliases.join(", ")}</p> : null}
        {n.draft ? <p className="si-warn" role="note">Draft — awaiting expert review.</p> : null}
        {!n.draft && total < 2 ? <p className="si-warn" role="note">Sparsely connected — only {total} link{total === 1 ? "" : "s"} recorded so far.</p> : null}
        <div className="isi-concept-actions">
          <Link className="btn sm primary" to="/ask" search={{ about: n.id }}><MessageSquare size={14} /> Ask about {n.name}</Link>
          <Link className="btn sm" to="/graph" search={{ focus: n.id }}><Network size={14} /> See in graph</Link>
          <SourcesPill count={src.isLoading || src.isError ? null : src.items.length} />
        </div>
      </ExplainHero>

      <KeyTakeaways items={takeaways} />

      <div className="isi-concept-grid">
        <div>
          {desc !== firstSentence(desc) || x.clinical ? (
            <ExplainerSection title="What it does" summary={x.clinical ? firstSentence(x.clinical) : "Definition from the curated knowledge graph."}>
              <p>{desc}</p>
              {x.clinical ? <p>{x.clinical}</p> : null}
            </ExplainerSection>
          ) : null}

          <ExplainerSection
            title="Connections at a glance"
            summary={total ? `Each dot is a concept directly linked to ${n.name}. Colour marks the concept type.` : "No links recorded yet."}
            visual={total ? <MiniDiagram id={id} /> : null}
          >
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
                      <StatusBadge edge={r.edge} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </ExplainerSection>

          <TranslationalPath id={id} />

          {(steps.prereq.length || steps.next.length) ? (
            <section className="ex-section">
              <div className="ex-section-text" style={{ gridColumn: "1 / -1" }}>
                <h2>Learn next</h2>
                <div className="ex-cards">
                  {[...steps.prereq.slice(0, 3).map((p) => ({ p, k: "Comes before" })), ...steps.next.slice(0, 3).map((p) => ({ p, k: "Leads to" }))].map(({ p, k }) => (
                    <Link key={k + p.id} className="ex-card" to="/atlas/$id" params={{ id: p.id }}>
                      <span className="xs muted">{k}</span>
                      <b>{p.name}</b>
                      <span className="xs muted">{TYPES[p.node_type].label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="isi-concept-side">
          <section>
            <h2>Questions to ask</h2>
            <ul>
              {askShortcuts(n).map((q) => (
                <li key={q}><Link to="/ask" search={{ about: n.id, q }}>{q}</Link></li>
              ))}
            </ul>
          </section>
          <section>
            <h2>Read the research</h2>
            <p className="small">Find publications mentioning {n.name}.</p>
            <Link to="/research" search={{ lib: n.name }} hash="library"><BookOpen size={13} /> Search publications →</Link>
          </section>
          <Identifiers id={n.id} />
          <CiteThisPage name={n.name} id={n.id} typeLabel={typeLabel} />
          {doms.length ? (
            <section>
              <h2>Part of</h2>
              <ul>{doms.map((d) => <li key={d.id}><Link to="/atlas" hash={d.id}>{d.title}</Link></li>)}</ul>
            </section>
          ) : null}
        </aside>
      </div>

      <SourcesFold
        items={src.items}
        isLoading={src.isLoading}
        isError={src.isError}
        note={<>Graph ID <span className="mono">{n.id}</span>{x.evidenceStatus ? <> · concept status: {x.evidenceStatus.toLowerCase()}</> : null}. Select any connection above to inspect evidence for that specific link.</>}
      />
    </article>
  );
}

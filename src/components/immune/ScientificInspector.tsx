import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { X, ArrowUpRight } from "lucide-react";
import { TYPES, byId, cellForNode, edgeByRel, edgeRef, human, inn, lessonsForNode, out, relId, type KGEdge } from "@/lib/immune/engine";
import { approvedQuery } from "@/lib/citations.functions";
import { citationsFor, relationshipStatus, STATUS_INFO } from "@/lib/immune/evidenceStatus";
import { inspect, useInspected } from "@/lib/immune/inspector";
import { CONTENT } from "@/data/content";

export function StatusBadge({ edge }: { edge: KGEdge }) {
  const { data = [], isError } = useQuery(approvedQuery);
  if (isError) {
    return <span className="badge rs" title="Evidence service unavailable — status not loaded">status unavailable</span>;
  }
  const s = relationshipStatus(edge, data);
  return <span className={`badge rs rs-${s}`} title={STATUS_INFO[s].desc}>{STATUS_INFO[s].label}</span>;
}

function EdgeRow({ e, dir }: { e: KGEdge; dir: "out" | "in" }) {
  const other = byId[dir === "out" ? e.object_id : e.subject_id];
  return (
    <li>
      <button type="button" className="si-row" onClick={() => inspect({ kind: "relationship", id: relId(e) })}>
        {dir === "in" ? <><b>{other?.name}</b> {human(e.relation)} this</> : <>{human(e.relation)} <b>{other?.name}</b></>}
      </button>{" "}
      <StatusBadge edge={e} />
    </li>
  );
}

function ConceptBody({ id }: { id: string }) {
  const { data = [], isError } = useQuery(approvedQuery);
  const n = byId[id];
  if (!n) return <p className="small">Unknown concept.</p>;
  const ups = inn[id] || [];
  const downs = out[id] || [];
  const conceptCites = data.filter((c) => c.node_id === id && !c.relationship_id);
  const lessons = (lessonsForNode[id] || []).map((lid) => CONTENT.lessons.find((l: any) => l.id === lid)).filter(Boolean) as any[];
  return (
    <>
      <span className="si-kicker">Concept · {TYPES[n.node_type].label} · <span className="mono">{n.id}</span></span>
      <h2 className="si-title">{n.name}</h2>
      {isError ? <p className="si-warn" role="alert">Evidence service unavailable — approved sources could not be loaded (not the same as zero citations).</p> : null}
      {n.draft ? <p className="si-warn">Draft concept — added to close a coverage gap, awaiting expert review.</p> : null}
      <section><h3>Definition</h3><p className="small">{n.desc || "No definition recorded."}</p></section>
      <section><h3>Upstream ({ups.length})</h3>{ups.length ? <ul className="si-list">{ups.map((e) => <EdgeRow key={relId(e)} e={e} dir="in" />)}</ul> : <p className="xs muted">None recorded.</p>}</section>
      <section><h3>Downstream ({downs.length})</h3>{downs.length ? <ul className="si-list">{downs.map((e) => <EdgeRow key={relId(e)} e={e} dir="out" />)}</ul> : <p className="xs muted">None recorded.</p>}</section>
      <section>
        <h3>Concept-level sources</h3>
        {conceptCites.length ? <ul className="si-list">{conceptCites.map((c) => <li key={c.evidence_id}><a href={c.url} target="_blank" rel="noreferrer">{c.label}</a></li>)}</ul> : <p className="xs muted">No approved concept-level source yet.</p>}
        <p className="xs muted">Concept sources describe the concept; they do not count as support for any single link.</p>
      </section>
      <section>
        <h3>Appears in</h3>
        <div className="si-links">
          <Link className="btn sm primary" to="/atlas/$id" params={{ id }}>Open concept page</Link>
          <Link className="btn sm" to="/graph" search={{ focus: id }}>Knowledge graph</Link>
          <Link className="btn sm" to="/reasoning" search={{ from: id }}>Path tracer</Link>
          {(cellForNode[id] || []).length ? <Link className="btn sm" to="/learn">Cell atlas</Link> : null}
          {lessons.map((l) => <Link key={l.id} className="btn sm" to="/mechanism/$id" params={{ id: l.id }}>{l.title ?? l.id}</Link>)}
        </div>
      </section>
    </>
  );
}

function limitations(e: KGEdge, status: string): string[] {
  const l: string[] = [];
  if (e.draft) l.push("Drafted to fill a coverage gap; wording and direction need expert review.");
  if (status !== "approved") l.push("No approved source has been checked against this exact claim yet.");
  if (e.confidence !== "high") l.push(`Recorded confidence is ${e.confidence}.`);
  if (!e.location) l.push("No tissue context recorded; the effect may not hold in every compartment.");
  if (typeof e.weight !== "number") l.push("Effect size is a default from confidence, not a measured weight.");
  l.push("A single link simplifies dose, timing and species differences.");
  return l;
}

function RelationshipBody({ id }: { id: string }) {
  const { data = [], isError } = useQuery(approvedQuery);
  const e = edgeByRel[id];
  if (!e) return <p className="small">Unknown relationship.</p>;
  const s = byId[e.subject_id], o = byId[e.object_id];
  const status = relationshipStatus(e, data);
  const ref = edgeRef(e);
  const cites = citationsFor(e, data);
  return (
    <>
      <span className="si-kicker">Relationship · <span className="mono">{id}</span></span>
      <h2 className="si-title si-claim">
        <button type="button" className="si-row" onClick={() => inspect({ kind: "concept", id: e.subject_id })}>{s?.name}</button>
        <em>{human(e.relation)}</em>
        <button type="button" className="si-row" onClick={() => inspect({ kind: "concept", id: e.object_id })}>{o?.name}</button>
      </h2>
      {isError ? (
        <p className="si-warn" role="alert">Evidence service unavailable — review status below may be incomplete.</p>
      ) : null}
      <p className="si-status"><span className={`badge rs rs-${status}`}>{STATUS_INFO[status].label}</span> <span className="xs muted">{STATUS_INFO[status].desc}</span></p>
      <section><h3>Mechanism</h3><p className="small">{e.mechanism || "No mechanism text recorded."}</p></section>
      <section>
        <h3>Context</h3>
        <dl className="si-dl">
          <dt>Predicate</dt><dd className="mono">{e.relation}</dd>
          <dt>Tissue</dt><dd>{e.location || "Not specified"}</dd>
          <dt>Confidence</dt><dd>{e.confidence}</dd>
          <dt>Evidence level</dt><dd>{e.evidence_status?.toLowerCase() || "—"}</dd>
          <dt>Weight</dt><dd>{typeof e.weight === "number" ? e.weight : "default"}</dd>
        </dl>
      </section>
      <section>
        <h3>Primary literature</h3>
        <ul className="si-list">
          {ref ? <li><a href={ref.url} target="_blank" rel="noreferrer">{ref.label}</a> <span className="xs muted">{ref.kind === "citation" ? "recorded citation, identifier not verified" : "recorded on the link, claim not yet assessed"}</span></li> : null}
          {cites.map((c) => <li key={c.evidence_id}><a href={c.url} target="_blank" rel="noreferrer">{c.label}</a> <span className="xs muted">claim: {c.claim_support}</span></li>)}
          {!ref && !cites.length ? <li className="xs muted">No source yet — this link is awaiting curation.</li> : null}
        </ul>
      </section>
      <section>
        <h3>Review log</h3>
        {cites.length ? (
          <ul className="si-list">{cites.map((c) => <li key={c.evidence_id} className="xs">{c.evidence_id} · approved · {c.claim_support}{c.reviewed_at ? ` · ${new Date(c.reviewed_at).toLocaleDateString()}` : ""}</li>)}</ul>
        ) : <p className="xs muted">Not reviewed.</p>}
      </section>
      <section><h3>Limitations</h3><ul className="si-list xs">{limitations(e, status).map((x) => <li key={x}>{x}</li>)}</ul></section>
      <div className="si-links">
        <Link className="btn sm" to="/graph" search={{ focus: e.subject_id }}>Show in graph <ArrowUpRight size={13} /></Link>
        <Link className="btn sm" to="/methods">How statuses work</Link>
      </div>
    </>
  );
}

export default function ScientificInspector() {
  const t = useInspected();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!t) return;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") inspect(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [t]);
  if (!t) return null;
  return (
    <aside className="sci-inspector" role="dialog" aria-modal="false" aria-label="Scientific detail" tabIndex={-1} ref={ref}>
      <div className="si-bar">
        <span className="si-brand">Scientific detail</span>
        <button type="button" className="id-close" onClick={() => inspect(null)} aria-label="Close scientific detail"><X size={16} /></button>
      </div>
      <div className="si-body">{t.kind === "concept" ? <ConceptBody id={t.id} /> : <RelationshipBody id={t.id} />}</div>
    </aside>
  );
}

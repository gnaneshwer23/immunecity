import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { approvedQuery } from "@/lib/citations.functions";
import { byId, human, TYPES, type NodeType } from "@/lib/immune/engine";
import { inspect } from "@/lib/immune/inspector";
import { honestEvidenceStatus, supportingCitationsFor } from "@/lib/immune/evidenceStatus";
import { caseGraphContext, searchCaseGraph } from "@/lib/research/caseGraph";

export default function CaseGraphExplorer({ conditionId, anchor, onAnchor }: {
  conditionId: string; anchor: string | null; onAnchor: (id: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [history, setHistory] = useState<string[]>([]);
  const context = caseGraphContext(conditionId, anchor);
  const { data: citations = [], isSuccess, isError } = useQuery(approvedQuery);
  const choose = (id: string) => { if (context.anchorId) setHistory([...history, context.anchorId]); onAnchor(id); };
  const visible = context.nodes.filter((n) => filter === "all" || n.node_type === filter);
  const visual = context.nodes.slice(0, 16);
  const positions = new Map(visual.map((n, i) => [n.id, { x: i === 0 ? 400 : 400 + 280 * Math.cos((i - 1) * 2 * Math.PI / Math.max(1, visual.length - 1)), y: i === 0 ? 220 : 220 + 170 * Math.sin((i - 1) * 2 * Math.PI / Math.max(1, visual.length - 1)) }]));
  return <section aria-label="Case knowledge graph" className="case-graph">
    <h3>Connected knowledge graph</h3>
    <p>Explore the shared scientific map without leaving this investigation. Case measurements remain separate; they do not establish these relationships in the individual.</p>
    <p>{context.mapping ? `Condition mapping: ${context.mapping.scope.replaceAll("_", " ")} → ${byId[context.mapping.id]!.name}.` : "Coverage gap: no explicit condition mapping in this graph release. Search a concept to explore separately; this does not establish a disease association."}</p>
    {context.mapping?.scope === "broader_disease_family" && <p>Inflammatory bowel disease is a broader family anchor; links may not apply to the selected subtype.</p>}
    <label>Search graph concepts<input value={query} maxLength={150} onChange={(e) => setQuery(e.target.value)} /></label>
    <div className="programme-flow">{searchCaseGraph(query).map((n) => <button className="btn" key={n.id} onClick={() => choose(n.id)}>{n.name} · {n.id}</button>)}</div>
    <div className="programme-flow">
      <button className="btn" onClick={() => { onAnchor(null); setHistory([]); setFilter("all"); }}>Return to condition anchor</button>
      <button className="btn" disabled={!history.length} onClick={() => { onAnchor(history[history.length - 1]!); setHistory(history.slice(0, -1)); }}>Previous concept</button>
      <a href="#programme-context">Return to case</a>
    </div>
    {context.anchorId && <>
      <h4>Exploring: {byId[context.anchorId]!.name}</h4>
      <button className="btn" onClick={() => inspect({ kind: "concept", id: context.anchorId! })}>Inspect current concept</button>{" "}
      <Link to="/atlas/$id" params={{ id: context.anchorId }} target="_blank" rel="noopener noreferrer">Open full Atlas in a new tab</Link>
      <p>{context.scope} {context.userSelectedExploration && "This is a user-selected exploration anchor, not a mapped condition mechanism."}</p>
      <svg viewBox="0 0 800 440" style={{ width: "100%", maxHeight: 440 }} role="group" aria-label="Interactive concept neighbourhood">
        {context.relations.map(({ id, edge }) => {
          const a = positions.get(edge.subject_id), b = positions.get(edge.object_id);
          return a && b ? <line key={id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--border)" strokeWidth={2} /> : null;
        })}
        {visual.map((n) => { const p = positions.get(n.id)!; return <g key={n.id} role="button" tabIndex={0} aria-label={`Explore ${n.name}`} onClick={() => choose(n.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(n.id); } }} style={{ cursor: "pointer" }}>
          <title>{n.name} · {n.node_type}</title><circle cx={p.x} cy={p.y} r={n.id === context.anchorId ? 24 : 16} fill="var(--primary)" />
          <text x={p.x} y={p.y + 38} textAnchor="middle" fill="var(--text)" fontSize={12}>{n.name.length > 23 ? `${n.name.slice(0, 21)}…` : n.name}</text>
        </g>; })}
      </svg>
      <p>Visual preview: first {visual.length} concepts. Lines show connectivity only; the table below preserves relationship direction and predicates.</p>
      <label>Concept category<select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All concepts</option>{Object.entries(TYPES).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}</select></label>
      <div className="programme-flow">{visible.map((n) => <button key={n.id} className="btn" onClick={() => choose(n.id)}>{n.name} · {TYPES[n.node_type].label}</button>)}</div>
      {!visible.length && <p>No concepts of this category in the bounded neighbourhood. This is a graph coverage limit, not absence of scientific evidence.</p>}
      <p>{Object.entries(context.coverage).map(([type, count]) => `${TYPES[type as NodeType].label}: ${count}`).join(" · ")}</p>
      <h4>Directional relationships and evidence</h4>
      <p>{isSuccess ? "Approved-source service loaded. Support counts require approved evidence mapped to the exact relationship and assessed as supporting it." : isError ? "Evidence service unavailable: approved support is unknown. Graph labels are not approval." : "Loading approved-source coverage; support is not yet known."}</p>
      <div role="region" aria-label="Connected graph relationships" tabIndex={0} style={{ overflowX: "auto" }}><table><thead><tr><th>Relationship</th><th>Context / graph status</th><th>Approved support / inspection</th></tr></thead><tbody>{context.relations.map(({ id, edge }) => <tr key={id}><td><button className="btn" onClick={() => choose(edge.subject_id)}>{byId[edge.subject_id]!.name}</button><br />→ {human(edge.relation)} →<br /><button className="btn" onClick={() => choose(edge.object_id)}>{byId[edge.object_id]!.name}</button></td><td>{edge.location || "Context not curated"}<br />Graph label: {honestEvidenceStatus(edge)}{edge.draft && " · draft"}<br />{edge.mechanism}</td><td>{isSuccess ? `${supportingCitationsFor(edge, citations).length} approved supporting records` : "Support unknown"}<br /><button className="btn" onClick={() => inspect({ kind: "relationship", id })}>Inspect relationship evidence</button></td></tr>)}</tbody></table></div>
      {!context.relations.length && <p>No mapped relationships in this neighbourhood.</p>}
    </>}
  </section>;
}

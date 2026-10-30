import { X } from "lucide-react";
import { byId, human, relId, TYPES, type KGEdge } from "@/lib/immune/engine";
import { edgePanelFields } from "@/lib/immune/graphPhase2";
import { inspect } from "@/lib/immune/inspector";
import EdgeReference from "./EdgeReference";
import { NodeLink } from "./ui";

export default function GraphEdgeDetail({
  edge,
  onClose,
  relatedConceptId,
}: {
  edge: KGEdge;
  onClose: () => void;
  /** Concept still open in the detail slot — keeps evidence exploration continuous. */
  relatedConceptId?: string | null;
}) {
  const s = byId[edge.subject_id];
  const o = byId[edge.object_id];
  if (!s || !o) return null;
  const fields = edgePanelFields(edge, s.name, o.name);
  const related = relatedConceptId ? byId[relatedConceptId] : null;
  return (
    <div className="inline-detail">
      <div className="id-head">
        <div className="id-title">
          <span className="id-kicker">Connection · {human(edge.relation)}</span>
          <h4>{s.name} → {o.name}</h4>
        </div>
        <button className="id-close" onClick={onClose} aria-label="Close connection detail"><X size={14} /></button>
      </div>
      {related ? (
        <p className="xs muted" style={{ marginTop: 8 }} role="status">
          Linked from open concept <b>{related.name}</b> — concept and edge panels stay together while you inspect evidence.
        </p>
      ) : null}
      <div className="id-section" style={{ marginTop: 10 }}>
        <h5 className="id-sub">Relationship</h5>
        <p className="small">
          <span className="dot" style={{ background: `var(${TYPES[s.node_type].c})`, display: "inline-block", width: 8, height: 8, borderRadius: 4, marginRight: 6 }} />
          <NodeLink id={s.id} label={s.name} /> <b>{human(edge.relation)}</b>{" "}
          <span className="dot" style={{ background: `var(${TYPES[o.node_type].c})`, display: "inline-block", width: 8, height: 8, borderRadius: 4, margin: "0 6px" }} />
          <NodeLink id={o.id} label={o.name} />
        </p>
        <dl className="small" style={{ display: "grid", gap: 6, marginTop: 8 }}>
          <div><dt className="xs muted">Direction</dt><dd>{fields.direction}</dd></div>
          <div><dt className="xs muted">Predicate</dt><dd>{human(fields.predicate)}</dd></div>
          <div><dt className="xs muted">Tissue</dt><dd>{fields.tissue}</dd></div>
          <div><dt className="xs muted">Mechanism</dt><dd>{fields.mechanism}</dd></div>
          <div><dt className="xs muted">Source</dt><dd>{fields.source}</dd></div>
          <div><dt className="xs muted">Reviewer</dt><dd>{fields.reviewer}</dd></div>
          <div><dt className="xs muted">Review decision</dt><dd>{fields.reviewDecision}</dd></div>
          <div><dt className="xs muted">Version</dt><dd>{fields.version}</dd></div>
          <div><dt className="xs muted">Timestamp</dt><dd>{fields.timestamp}</dd></div>
        </dl>
      </div>
      <div className="id-section">
        <h5 className="id-sub">Evidence status</h5>
        <p className="small"><EdgeReference edge={edge} /></p>
        <p className="xs muted" style={{ marginTop: 8 }}>
          Evidence status on the edge: <b>{fields.evidenceStatus}</b>. Review badges reflect relationship-level
          curation only — concept-level cites do not inflate link support. An empty or pending citation is a
          curation gap, not a negative finding. Reviewer, review decision, version, and timestamp say “Not recorded”
          when the graph record does not carry them.
        </p>
      </div>
      <button className="btn sm" style={{ marginTop: 10 }} onClick={() => inspect({ kind: "relationship", id: relId(edge) })}>Full scientific detail</button>
    </div>
  );
}

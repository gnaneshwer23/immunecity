import { X } from "lucide-react";
import { byId, human, relId, TYPES, type KGEdge } from "@/lib/immune/engine";
import { inspect } from "@/lib/immune/inspector";
import EdgeReference from "./EdgeReference";
import { NodeLink } from "./ui";

export default function GraphEdgeDetail({ edge, onClose }: { edge: KGEdge; onClose: () => void }) {
  const s = byId[edge.subject_id];
  const o = byId[edge.object_id];
  if (!s || !o) return null;
  return (
    <div className="inline-detail">
      <div className="id-head">
        <div className="id-title">
          <span className="id-kicker">Connection · {human(edge.relation)}</span>
          <h4>{s.name} → {o.name}</h4>
        </div>
        <button className="id-close" onClick={onClose} aria-label="Close connection detail"><X size={14} /></button>
      </div>
      <div className="id-section" style={{ marginTop: 10 }}>
        <h5 className="id-sub">Relationship</h5>
        <p className="small">
          <span className="dot" style={{ background: `var(${TYPES[s.node_type].c})`, display: "inline-block", width: 8, height: 8, borderRadius: 4, marginRight: 6 }} />
          <NodeLink id={s.id} label={s.name} /> <b>{human(edge.relation)}</b>{" "}
          <span className="dot" style={{ background: `var(${TYPES[o.node_type].c})`, display: "inline-block", width: 8, height: 8, borderRadius: 4, margin: "0 6px" }} />
          <NodeLink id={o.id} label={o.name} />
        </p>
        <p className="small muted" style={{ marginTop: 6 }}>{edge.mechanism}</p>
      </div>
      <div className="id-section">
        <h5 className="id-sub">Confidence &amp; context</h5>
        <p className="small">
          Confidence: <b>{edge.confidence}</b>
          {edge.location ? <> · Tissue: <b>{edge.location}</b></> : null}
          {typeof edge.weight === "number" ? <> · Measured weight: <b className="mono">{edge.weight}</b></> : null}
        </p>
      </div>
      <div className="id-section">
        <h5 className="id-sub">Sources</h5>
        <p className="small"><EdgeReference edge={edge} /></p>
      </div>
      <button className="btn sm" style={{ marginTop: 10 }} onClick={() => inspect({ kind: "relationship", id: relId(edge) })}>Full scientific detail</button>
    </div>
  );
}

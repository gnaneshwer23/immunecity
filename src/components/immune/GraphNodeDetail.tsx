import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { TYPES, byId, human, inn, out } from "@/lib/immune/engine";
import EdgeReference, { NodeCitations } from "./EdgeReference";
import { NodeLink } from "./ui";
import { inspect } from "@/lib/immune/inspector";

export default function GraphNodeDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const n = byId[id];
  if (!n) return null;
  const outs = out[id] || [];
  const ins = inn[id] || [];
  return (
    <div className="inline-detail">
      <div className="id-head">
        <div className="id-title">
          <span className="id-kicker">{TYPES[n.node_type].label} · {n.id}</span>
          <h4>{n.name}</h4>
        </div>
        <button className="id-close" onClick={onClose} aria-label="Close detail"><X size={14} /></button>
      </div>
      <p className="small" style={{ marginTop: 10 }}>{n.desc}</p>
      <NodeCitations id={id} />
      <div className="row" style={{ marginTop: 12, gap: 6 }}>
        <Link className="btn sm" to="/graph" search={{ focus: id, sim: id, mode: "inhibit" }}>Simulate blocking</Link>
        <Link className="btn sm" to="/graph" search={{ focus: id, sim: id, mode: "activate" }}>Simulate giving</Link>
        <Link className="btn sm" to="/reasoning" search={{ from: id }}>Trace from here</Link>
        <button className="btn sm" onClick={() => inspect({ kind: "concept", id })}>Full scientific detail</button>
      </div>
      {outs.length ? (
        <div className="id-section">
          <h5 className="id-sub">Acts on ({outs.length})</h5>
          <ul className="id-list">
            {outs.map((r, i) => (
              <li key={i}>
                <b>{human(r.relation)}</b> <NodeLink id={r.object_id} /> — <span className="muted">{r.mechanism}</span>
                <br /><EdgeReference edge={r} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {ins.length ? (
        <div className="id-section">
          <h5 className="id-sub">Acted on by ({ins.length})</h5>
          <ul className="id-list">
            {ins.map((r, i) => (
              <li key={i}>
                <NodeLink id={r.subject_id} /> <b>{human(r.relation)}</b> it — <span className="muted">{r.mechanism}</span>
                <br /><EdgeReference edge={r} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

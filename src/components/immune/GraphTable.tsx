import { useMemo, useState } from "react";
import { KG, byId, human, relId } from "@/lib/immune/engine";
import { inspect } from "@/lib/immune/inspector";
import { StatusBadge } from "./ScientificInspector";

/* Keyboard- and screen-reader-friendly alternative to the force graph. */
export default function GraphTable() {
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(50);
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return KG.relationships.filter((r) => !t || `${byId[r.subject_id]?.name} ${r.relation} ${byId[r.object_id]?.name}`.toLowerCase().includes(t));
  }, [q]);
  return (
    <details className="graph-a11y card">
      <summary>Text view of all {KG.relationships.length} links (accessible table)</summary>
      <label className="field" style={{ margin: "10px 0" }}>Filter links
        <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(50); }} placeholder="e.g. TNF, macrophage, inhibits" />
      </label>
      <p className="xs muted" aria-live="polite">{rows.length} links match.</p>
      <div className="gt-scroll">
        <table className="rs-table gt">
          <caption className="sr-only">Causal links: subject, relation, object, review status</caption>
          <thead><tr><th scope="col">Subject</th><th scope="col">Relation</th><th scope="col">Object</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Details</span></th></tr></thead>
          <tbody>
            {rows.slice(0, limit).map((r) => (
              <tr key={relId(r)}>
                <td>{byId[r.subject_id]?.name}</td><td>{human(r.relation)}</td><td>{byId[r.object_id]?.name}</td>
                <td><StatusBadge edge={r} /></td>
                <td><button type="button" className="si-open" onClick={() => inspect({ kind: "relationship", id: relId(r) })}>details</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > limit ? <button className="btn sm" onClick={() => setLimit(limit + 100)}>Show more</button> : null}
    </details>
  );
}

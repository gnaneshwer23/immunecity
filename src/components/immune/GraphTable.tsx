import { useMemo, useState } from "react";
import { KG, byId, human, relId, TYPES } from "@/lib/immune/engine";
import { inspect } from "@/lib/immune/inspector";
import { StatusBadge } from "./ScientificInspector";

type Props = {
  /** When true, render as the primary list/detail explorer (not a collapsed details). */
  embedded?: boolean;
  /** Focus a subject concept in the graph (list → graph handoff). */
  onFocusConcept?: (id: string) => void;
};

/* Keyboard- and screen-reader-friendly alternative to the force graph. */
export default function GraphTable({ embedded = false, onFocusConcept }: Props) {
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(50);
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return KG.relationships.filter(
      (r) =>
        !t ||
        `${byId[r.subject_id]?.name} ${r.relation} ${byId[r.object_id]?.name} ${r.mechanism ?? ""}`
          .toLowerCase()
          .includes(t),
    );
  }, [q]);

  const body = (
    <>
      <label className="field" style={{ margin: embedded ? "0 0 10px" : "10px 0" }}>
        Filter links
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setLimit(50);
          }}
          placeholder="e.g. TNF, macrophage, inhibits"
          aria-label="Filter causal links"
        />
      </label>
      <p className="xs muted" aria-live="polite">
        {rows.length === 0
          ? q.trim()
            ? `No links match “${q.trim()}”. This is a filter miss — not a scientific negative finding.`
            : "No links in the current graph release."
          : `${rows.length} links match.`}
      </p>
      <div className="gt-scroll">
        <table className="rs-table gt">
          <caption className="sr-only">
            Causal links: subject, relation, object, review status
          </caption>
          <thead>
            <tr>
              <th scope="col">Subject</th>
              <th scope="col">Relation</th>
              <th scope="col">Object</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((r) => {
              const subj = byId[r.subject_id];
              const obj = byId[r.object_id];
              return (
                <tr key={relId(r)}>
                  <td>
                    {subj ? (
                      <button
                        type="button"
                        className="gt-concept"
                        onClick={() => onFocusConcept?.(subj.id)}
                        title={TYPES[subj.node_type].label}
                      >
                        {subj.name}
                      </button>
                    ) : (
                      r.subject_id
                    )}
                  </td>
                  <td>{human(r.relation)}</td>
                  <td>
                    {obj ? (
                      <button
                        type="button"
                        className="gt-concept"
                        onClick={() => onFocusConcept?.(obj.id)}
                        title={TYPES[obj.node_type].label}
                      >
                        {obj.name}
                      </button>
                    ) : (
                      r.object_id
                    )}
                  </td>
                  <td>
                    <StatusBadge edge={r} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="si-open"
                      onClick={() => inspect({ kind: "relationship", id: relId(r) })}
                    >
                      details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > limit ? (
        <button className="btn sm" type="button" onClick={() => setLimit(limit + 100)}>
          Show more
        </button>
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <div className="graph-a11y graph-a11y-embedded card">
        <h2 className="graph-list-title">List &amp; detail</h2>
        <p className="xs muted" style={{ marginBottom: 12 }}>
          Accessible alternative to the force graph. Open details for evidence status; tap a concept
          name to centre it on the graph view.
        </p>
        {body}
      </div>
    );
  }

  return (
    <details className="graph-a11y card">
      <summary>
        Text view of all {KG.relationships.length} links (accessible table)
      </summary>
      {body}
    </details>
  );
}

import { useMemo, useState } from "react";
import { graphHealth } from "@/lib/immune/health";
import { NodeLink } from "./ui";

export default function HealthReport() {
  const h = useMemo(() => graphHealth(), []);
  const [open, setOpen] = useState<string | null>(null);
  const items: { k: string; label: string; ids: string[] }[] = [
    { k: "isolated", label: "Concepts with no links", ids: h.isolated },
    { k: "unused", label: "Concepts no lesson uses", ids: h.unusedByLessons },
    { k: "contra", label: "Concept pairs with opposite-sign links", ids: h.contradictions.map((c) => c.a) },
    { k: "draft", label: "Draft concepts awaiting expert review", ids: h.draft },
  ];
  return (
    <div className="card" style={{ margin: "16px 0" }}>
      <h3 style={{ fontSize: "1.05rem", marginBottom: 8 }}>Graph health</h3>
      <p className="small muted" style={{ marginBottom: 10 }}>{h.uncited} of {h.edges} links have no source yet.</p>
      {items.map((it) => (
        <div key={it.k} style={{ marginBottom: 6 }}>
          <button className="nodelink small" onClick={() => setOpen(open === it.k ? null : it.k)}>{it.label}: {it.ids.length}</button>
          {open === it.k ? (
            <div className="xs" style={{ marginTop: 4 }}>
              {it.k === "contra"
                ? h.contradictions.map((c, i) => <div key={i}><NodeLink id={c.a} /> → <NodeLink id={c.b} />: {c.relations.join(" vs ")}</div>)
                : it.ids.slice(0, 80).map((id) => <span key={id} style={{ marginRight: 8 }}><NodeLink id={id} /></span>)}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

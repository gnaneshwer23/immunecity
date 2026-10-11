import { byId, human, out } from "@/lib/immune/engine";
import { CONTENT } from "@/data/content";
import EdgeReference from "./EdgeReference";
import { NodeLink } from "./ui";

export default function TherapyDetail({ id, hits }: { id: string; hits: { flagLabel: string; msg: string; effect: number }[] }) {
  const n = byId[id];
  const edges = out[id] || [];
  const targets = edges.filter((r) => r.relation !== "tested_in");
  const trials = edges.filter((r) => r.relation === "tested_in");
  return (
    <div className="inline-detail">
      <p className="small">{n?.desc}</p>
      <dl className="id-rows">
        <dt>Mechanism</dt>
        <dd>
          {targets.map((r, i) => (
            <div key={i}><b>{human(r.relation)}</b> <NodeLink id={r.object_id} /> — {r.mechanism} <EdgeReference edge={r} /></div>
          ))}
        </dd>
        <dt>Rules applied</dt>
        <dd>{hits.map((h) => <div key={h.flagLabel + h.msg}>{h.effect > 0 ? "+" : ""}{h.effect} · {h.flagLabel}</div>)}</dd>
        {trials.length ? (
          <>
            <dt>Trials</dt>
            <dd>
              {trials.map((r) => {
                const t = CONTENT.trialLessons[r.object_id];
                return <div key={r.object_id}><NodeLink id={r.object_id} />{t ? ` · ${t.year} · ${t.result}` : ""}</div>;
              })}
            </dd>
          </>
        ) : null}
      </dl>
      <p className="xs muted" style={{ marginTop: 10 }}>Educational reasoning with graph context — not patient-specific treatment advice.</p>
    </div>
  );
}

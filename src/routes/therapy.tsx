import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { nodesOf, out, human, byId } from "@/lib/immune/engine";
import { CONTENT } from "@/data/content";
import { PageHead, NodeLink, NodeChip } from "@/components/immune/ui";
import PhoneFold from "@/components/immune/PhoneFold";
import { getLiveTrials, type LiveTrial } from "@/lib/liveData.functions";

export const Route = createFileRoute("/therapy")({
  head: () => ({
    meta: [
      { title: "Therapy: interventions and their targets — Immune Super Intelligence" },
      { name: "description", content: "Every intervention in the causal graph, what it targets and which trials tested it." },
      { property: "og:title", content: "Therapy — Immune Super Intelligence" },
      { property: "og:description", content: "Immune therapies mapped to their mechanisms and pivotal trials." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Therapy,
});

/* Trials point at what they test with `evaluates` (trial → intervention),
   so build a reverse index: intervention id → trial node ids. */
const TRIALS_BY_DRUG: Record<string, string[]> = {};
nodesOf("TRIAL").forEach((t) =>
  (out[t.id] || []).forEach((r) => {
    if (r.relation === "evaluates") (TRIALS_BY_DRUG[r.object_id] ||= []).push(t.id);
  }),
);

function Therapy() {
  const [q, setQ] = useState("");
  const [cls, setCls] = useState<string | null>(null);
  const all = useMemo(() => nodesOf("INTERVENTION"), []);
  /* Target-type filter: group interventions by the concept type they act on. */
  const classes = useMemo(() => {
    const counts: Record<string, number> = {};
    all.forEach((n) => {
      const types = new Set(
        (out[n.id] || []).filter((r) => r.relation !== "tested_in").map((r) => byId[r.object_id]?.node_type).filter(Boolean) as string[],
      );
      types.forEach((t) => { counts[t] = (counts[t] || 0) + 1; });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [all]);
  const list = all.filter((n) => {
    if (!n.name.toLowerCase().includes(q.trim().toLowerCase())) return false;
    if (!cls) return true;
    return (out[n.id] || []).some((r) => r.relation !== "tested_in" && byId[r.object_id]?.node_type === cls);
  });
  const [live, setLive] = useState<Record<string, LiveTrial>>({});
  useEffect(() => {
    let on = true;
    const names = nodesOf("TRIAL").map((t) => t.name);
    getLiveTrials({ data: { names } }).then((r) => { if (on && r) setLive(r); }).catch(() => {});
    return () => { on = false; };
  }, []);
  return (
    <div className="page">
      <PageHead
        kicker="Layer 08 · Therapy"
        title="Pull one lever, follow the chain"
        lede={`${all.length} interventions, each linked to what it acts on and the trials that tested it.`}
        stats={[
          { v: all.length, l: "INTERVENTIONS" },
          { v: "LIVE", l: "TRIAL STATUS" },
        ]}
      />
      <section className="section">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter therapies…" aria-label="Filter therapies" style={{ maxWidth: 360, marginBottom: 16 }} />
        <div className="therapy-filters">
          <button className={`chip${cls === null ? " on" : ""}`} onClick={() => setCls(null)}>All targets · {all.length}</button>
          {classes.map(([t, c]) => (
            <button key={t} className={`chip${cls === t ? " on" : ""}`} onClick={() => setCls(cls === t ? null : t)}>
              {t.toLowerCase()} targets · {c}
            </button>
          ))}
        </div>
        <h2 className="sr-only">Therapies</h2>
        <PhoneFold label={`Show all ${list.length} therapies`} className="phone-fold-list" key={`${q}|${cls}`}>
        <div className="grid auto">
          {list.map((n) => {
            const targets = out[n.id] || [];
            const trials = TRIALS_BY_DRUG[n.id] || [];
            return (
              <article className="card" key={n.id}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <h3 style={{ fontSize: "1.05rem" }}>{n.name}</h3>
                  <NodeChip id={n.id} label="Graph" />
                </div>
                <p className="small muted" style={{ margin: "8px 0 10px" }}>{n.desc}</p>
                {targets.length ? <div className="xs">{targets.slice(0, 4).map((r, i) => <div key={i}><span className="mono muted">{human(r.relation)} · </span><NodeLink id={r.object_id} /></div>)}</div> : null}
                {trials.length ? <div className="xs" style={{ marginTop: 8 }}>{trials.map((tid) => {
                  const t = CONTENT.trialLessons[tid];
                  const lt = live[byId[tid]?.name ?? ""];
                  return (
                    <div key={tid}>
                      <span className="mono muted">TRIAL · </span><NodeLink id={tid} />{t ? ` · ${t.year}` : ""}
                      {lt?.status ? (
                        lt.url ? (
                          <a className="live-badge" href={lt.url} target="_blank" rel="noreferrer">
                            ● {lt.status.replace(/_/g, " ").toLowerCase()}{lt.phase ? ` · ph ${lt.phase.replace(/[^0-9/]/g, "")}` : ""}
                          </a>
                        ) : (
                          <span className="live-badge">● {lt.status.replace(/_/g, " ").toLowerCase()}</span>
                        )
                      ) : null}
                    </div>
                  );
                })}</div> : null}
              </article>
            );
          })}
        </div>
        </PhoneFold>
      </section>
    </div>
  );
}

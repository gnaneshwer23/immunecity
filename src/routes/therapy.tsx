import { ART } from "@/components/immune/explain";
import { seoHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { nodesOf, out, human, byId } from "@/lib/immune/engine";
import { CONTENT } from "@/data/content";
import { PageHead, NodeLink, NodeChip } from "@/components/immune/ui";
import PhoneFold from "@/components/immune/PhoneFold";
import { Section, Toolbar } from "@/components/immune/page";
import { getLiveTrials, type LiveTrial } from "@/lib/liveData.functions";

export const Route = createFileRoute("/therapy")({
  head: () => seoHead({ title: "Therapy: interventions and their targets — Immune Super Intelligence", description: "Every intervention in the causal graph, what it targets and which trials tested it.", path: "/therapy" }),
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
  const [liveState, setLiveState] = useState<"loading" | "ready" | "partial" | "unavailable">("loading");
  useEffect(() => {
    let on = true;
    const names = nodesOf("TRIAL").map((t) => t.name);
    getLiveTrials({ data: { names } }).then((r) => {
      if (!on) return;
      setLive(r);
      const values = Object.values(r);
      setLiveState(values.every((t) => t.unavailable) ? "unavailable" : values.some((t) => t.unavailable) ? "partial" : "ready");
    }).catch(() => { if (on) setLiveState("unavailable"); });
    return () => { on = false; };
  }, []);
  const status = (lt: LiveTrial) => lt.status!.replace(/_/g, " ").toLowerCase() + (lt.phase ? ` · ph ${lt.phase.replace(/[^0-9/]/g, "")}` : "");
  return (
    <div className="page">
      <PageHead art={ART.therapyArt}
        kicker="Explore · Therapy explorer"
        title="Pull one lever, follow the chain"
        lede={`${all.length} interventions, each linked to what it acts on and the trials that tested it. Filter by the kind of target to compare mechanisms of action.`}
        stats={[
          { v: all.length, l: "INTERVENTIONS" },
          { v: Object.keys(TRIALS_BY_DRUG).length, l: "WITH LINKED TRIALS" },
          { v: liveState === "loading" ? "Loading" : liveState === "unavailable" ? "Unavailable" : liveState === "partial" ? "Partial" : "Live", l: "CLINICALTRIALS.GOV STATUS" },
        ]}
      />
      <Section id="therapies" n={1} title="Interventions and their targets"
        lede="Each card names what the intervention acts on in the graph and the landmark trials that tested it, with the current registry status where ClinicalTrials.gov returns one.">
        <Toolbar count={`${list.length} of ${all.length} shown`}>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter therapies by name…" aria-label="Filter therapies" />
          <div className="therapy-filters" role="group" aria-label="Filter by target type">
            <button className={`chip${cls === null ? " on" : ""}`} aria-pressed={cls === null} onClick={() => setCls(null)}>All targets · {all.length}</button>
            {classes.map(([t, c]) => (
              <button key={t} className={`chip${cls === t ? " on" : ""}`} aria-pressed={cls === t} onClick={() => setCls(cls === t ? null : t)}>
                {t.toLowerCase()} · {c}
              </button>
            ))}
          </div>
        </Toolbar>
        {liveState !== "ready" ? <p className="small muted" role="status" style={{ marginBottom: 16 }}>{liveState === "loading" ? "Checking ClinicalTrials.gov statuses…" : "Some trial statuses are temporarily unavailable. Curated therapy and trial lessons remain available."}</p> : null}
        {!list.length ? <p className="empty card">No therapy matches this filter. Clear the search or choose another target type.</p> : null}
        <PhoneFold label={`Show all ${list.length} therapies`} className="phone-fold-list" key={`${q}|${cls}`}>
        <div className="grid auto">
          {list.map((n) => {
            const targets = (out[n.id] || []).filter((r) => r.relation !== "tested_in");
            const trials = TRIALS_BY_DRUG[n.id] || [];
            return (
              <article className="card therapy-card" key={n.id}>
                <div className="isi-detail-head">
                  <h3>{n.name}</h3>
                  <NodeChip id={n.id} label="Graph" />
                </div>
                <p className="small muted">{n.desc}</p>
                <dl className="isi-lines">
                  {targets.length ? (
                    <>
                      <dt>Acts on</dt>
                      <dd>{targets.slice(0, 4).map((r, i) => <div key={i}><span className="muted">{human(r.relation)} </span><NodeLink id={r.object_id} /></div>)}</dd>
                    </>
                  ) : null}
                  {trials.length ? (
                    <>
                      <dt>Trials</dt>
                      <dd>{trials.map((tid) => {
                        const t = CONTENT.trialLessons[tid];
                        const lt = live[byId[tid]?.name ?? ""];
                        return (
                          <div key={tid}>
                            <NodeLink id={tid} />{t ? <span className="muted"> · {t.year}</span> : null}
                            {lt?.status ? (
                              lt.url ? <a className="live-badge" href={lt.url} target="_blank" rel="noreferrer">● {status(lt)}</a> : <span className="live-badge">● {status(lt)}</span>
                            ) : lt?.unavailable ? <span className="muted"> · status unavailable</span> : lt ? <span className="muted"> · no registry match</span> : null}
                          </div>
                        );
                      })}</dd>
                    </>
                  ) : null}
                </dl>
              </article>
            );
          })}
        </div>
        </PhoneFold>
      </Section>
    </div>
  );
}

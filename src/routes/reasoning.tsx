import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Fragment, useEffect, useMemo, useState } from "react";
import { CONTENT } from "@/data/content";
import { KG, byId, SEM, human, shortestPath } from "@/lib/immune/engine";
import EdgeReference from "@/components/immune/EdgeReference";
import { PageHead, NodeChip } from "@/components/immune/ui";
import AskAtlas from "@/components/immune/AskAtlas";

export const Route = createFileRoute("/reasoning")({
  validateSearch: zodValidator(z.object({ from: fallback(z.string(), "").default("") })),
  head: () => ({
    meta: [
      { title: "Reasoning: cases and path tracer — Immune City" },
      { name: "description", content: "Clinical questions answered by walking the causal graph, and a tracer that links any two concepts." },
      { property: "og:title", content: "Causal reasoning, out loud — Immune City" },
      { property: "og:description", content: "Walk the immune graph between any two concepts." },
    ],
  }),
  component: Reasoning,
});

const SORTED = [...KG.nodes].sort((a, b) => a.name.localeCompare(b.name));

function Reasoning() {
  const { from: urlFrom } = Route.useSearch();
  const [openCase, setOpenCase] = useState(0);
  const [from, setFrom] = useState(urlFrom && byId[urlFrom] ? urlFrom : "C003");
  const [to, setTo] = useState("D001");
  useEffect(() => { if (urlFrom && byId[urlFrom]) setFrom(urlFrom); }, [urlFrom]);

  const path = useMemo(() => (!byId[from] || !byId[to] || from === to ? null : shortestPath(from, to, false)), [from, to]);
  const c = CONTENT.cases[openCase]!;

  return (
    <div className="page">
      <PageHead
        kicker="Layer 11 · Reasoning"
        title="Causal reasoning, out loud"
        lede="Questions the field actually asks, answered by walking the graph rather than reciting facts. Below, stitch any two concepts together and read the mechanism on each edge."
        stats={[
          { v: CONTENT.cases.length, l: "CASES" },
          { v: "A→B", l: "PATH TRACER" },
        ]}
      />
      <section className="section">
        <h2>Ask the atlas</h2>
        <AskAtlas />
      </section>
      <section className="section">
        <h2>Case reasoning</h2>
        <div className="lesson-tabs">
          {CONTENT.cases.map((x, i) => (
            <button key={x.role} className={i === openCase ? "on" : undefined} onClick={() => setOpenCase(i)}>
              <span className="m">{i + 1}</span>{x.role}
            </button>
          ))}
        </div>
        <div className="card">
          <p className="kicker" style={{ marginBottom: 6 }}>{c.role}</p>
          <h3 style={{ fontSize: "1.15rem", marginBottom: 10 }}>{c.q}</h3>
          <div className="row" style={{ marginBottom: 14 }}>{c.path.filter((id: string) => byId[id]).map((id: string) => <NodeChip key={id} id={id} />)}</div>
          <p>{c.answer}</p>
        </div>
      </section>
      <section className="section">
        <h2>Path tracer</h2>
        <p className="lede">Pick any two concepts. The tracer finds the shortest chain of causal links between them, directed or not.</p>
        <div className="card">
          <div className="row" style={{ gap: 12, marginBottom: 16 }}>
            <label className="field" style={{ flex: 1, minWidth: 200 }}>
              From
              <select value={from} onChange={(e) => setFrom(e.target.value)}>
                {SORTED.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </label>
            <button className="btn sm" style={{ marginTop: 22 }} onClick={() => { const a = from; setFrom(to); setTo(a); }} aria-label="Swap direction">⇄</button>
            <label className="field" style={{ flex: 1, minWidth: 200 }}>
              To
              <select value={to} onChange={(e) => setTo(e.target.value)}>
                {SORTED.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </label>
          </div>
          {from === to ? (
            <p className="empty">Choose two different concepts.</p>
          ) : path && path.length ? (
            <div className="trace-chain">
              <div className="pn"><NodeChip id={from} /></div>
              {path.map((s, i) => (
                <Fragment key={i}>
                  <div className="trace-hop" style={{ animationDelay: `${i * 120}ms` }}>
                    <div className="trace-arrow">
                      <b>{s.fwd ? human(s.r.relation) : `← ${human(s.r.relation)}`}</b>
                      {s.r.mechanism ? ` · ${s.r.mechanism}` : ""}
                      {SEM[s.r.relation] === "r+" ? " (reverse edge)" : ""}
                      <br />
                      <EdgeReference edge={s.r} />
                    </div>
                    <div className="pn"><NodeChip id={s.to} /></div>
                  </div>
                </Fragment>
              ))}
            </div>
          ) : (
            <p className="empty">No causal path connects these two concepts in the current graph. That gap is itself a finding — it may be a missing curation, or a genuinely absent link.</p>
          )}
        </div>
      </section>
    </div>
  );
}

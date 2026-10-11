import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Fragment, useEffect, useMemo, useState } from "react";
import { CONTENT } from "@/data/content";
import { KG, byId, SEM, human, shortestPath } from "@/lib/immune/engine";
import EdgeReference from "@/components/immune/EdgeReference";
import { PageHead, NodeChip } from "@/components/immune/ui";
import AskAtlas from "@/components/immune/AskAtlas";
import MechanismWorkspace from "@/components/immune/MechanismWorkspace";
import { approvedQuery } from "@/lib/citations.functions";
import { EXEMPLAR_PATHWAYS, reportExemplar } from "@/lib/immune/exemplarPathways";

export const Route = createFileRoute("/reasoning")({
  validateSearch: zodValidator(z.object({ from: fallback(z.string(), "").default("") })),
  head: () => ({
    meta: [
      { title: "Reasoning: mechanism workspace — Immune Super Intelligence" },
      { name: "description", content: "Graph-retrieved Ask, case walks, path tracer, exemplar scaffolds, and illustrative start–perturbation–outcome reasoning. Educational beta — teaching with references." },
      { property: "og:title", content: "Mechanism reasoning — Immune Super Intelligence" },
      { property: "og:description", content: "Trace immunology from concept to perturbation to outcome. Illustrative walks; reviewed cites when available." },
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
  const { data: approvedCites = [], isError: evidenceUnavailable } = useQuery(approvedQuery);
  const c = CONTENT.cases[openCase]!;

  return (
    <div className="page">
      <PageHead
        kicker="Layer 11 · Reasoning"
        title="Mechanism reasoning"
        lede="Ask with retrieved graph context (and reviewed relationship cites when they exist), walk published cases, trace any two concepts, then run start → perturbation → outcome reasoning. Rule-based walks are illustrative unless independently validated."
        stats={[
          { v: CONTENT.cases.length, l: "CASES" },
          { v: "A→B", l: "PATH TRACER" },
          { v: "Δ", l: "PERTURBATION" },
        ]}
      />
      <section className="section">
        <h2>Ask Immune Super Intelligence</h2>
        <p className="lede">Graph-retrieved teaching — answers are restricted to retrieved concepts, causal links and relationship-level review status, with reviewed cites when present. Sparse approved claim cites mean this is not fully evidence-grounded AI.</p>
        <AskAtlas />
      </section>
      <section className="section">
        <h2>Exemplar pathways</h2>
        {evidenceUnavailable ? (
          <p className="lede" role="alert">Evidence service unavailable — pathway maturity below cannot be recomputed from live approvals (not the same as zero reviewed support).</p>
        ) : (
          <p className="lede">PRD priority pathways — connected in the graph. TNF→RA on-path claim review is furthest along; PD-1 partial; IFN→SLE still largely scaffold-ish. Maturity badges recompute from live approvals.</p>
        )}
        <div className="grid auto">
          {EXEMPLAR_PATHWAYS.map((p) => {
            const report = reportExemplar(p, approvedCites);
            return (
              <article className="card" key={p.id}>
                <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                  <h3 style={{ fontSize: "1.05rem" }}>{p.title}</h3>
                  <span className="chip">{report.maturity}</span>
                </div>
                <p className="small muted" style={{ marginTop: 8 }}>{p.purpose}</p>
                <div className="row" style={{ marginTop: 10, flexWrap: "wrap", gap: 6 }}>
                  {p.waypointIds.filter((id) => byId[id]).map((id) => <NodeChip key={id} id={id} />)}
                </div>
                <p className="xs muted" style={{ marginTop: 10 }}>
                  {report.connected ? "Waypoints are graph-connected." : `Gap: ${report.missingSegment ?? "incomplete path"}`}
                  {" · "}
                  Claim review: {report.maturity === "scaffold" ? "not yet reviewed (scaffold)" : report.maturity}
                </p>
                {p.mechanism ? (
                  <p className="xs muted">Mechanism defaults: {byId[p.mechanism.startId]?.name} → {byId[p.mechanism.perturbId]?.name} → {byId[p.mechanism.outcomeId]?.name}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
      <section className="section">
        <h2>Mechanism workspace</h2>
        <p className="lede">Choose a starting concept, an intervention or perturbation, and an outcome. Inspect paths, polarity, evidence status, assumptions and gaps.</p>
        <MechanismWorkspace initialStart={urlFrom && byId[urlFrom] ? urlFrom : "C003"} />
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

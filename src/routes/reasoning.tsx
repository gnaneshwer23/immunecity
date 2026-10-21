import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Fragment, useEffect, useMemo, useState } from "react";
import { CONTENT } from "@/data/content";
import { KG, byId, SEM, human, shortestPath } from "@/lib/immune/engine";
import EdgeReference from "@/components/immune/EdgeReference";
import { PageHead, NodeChip } from "@/components/immune/ui";
import { PageToc, Section } from "@/components/immune/page";

const TOC = [
  { id: "ask", label: "Ask" },
  { id: "how-ai-works", label: "How the AI works" },
  { id: "pathways", label: "Pathways" },
  { id: "workspace", label: "Workspace" },
  { id: "cases", label: "Cases" },
  { id: "tracer", label: "Path tracer" },
];
import AskAtlas from "@/components/immune/AskAtlas";
import MechanismWorkspace from "@/components/immune/MechanismWorkspace";
import { approvedQuery } from "@/lib/citations.functions";
import {
  EXEMPLAR_MATURITY_LABEL,
  EXEMPLAR_PATHWAYS,
  exemplarAllowsEvidenceGroundedClaim,
  reportExemplar,
} from "@/lib/immune/exemplarPathways";
import { STATUS_INFO } from "@/lib/immune/evidenceStatus";
import PhoneFold from "@/components/immune/PhoneFold";
import { AiPrinciples, CapabilityRegistry, ResearchWorkspace } from "@/components/immune/ScientificAiPanel";

export const Route = createFileRoute("/reasoning")({
  validateSearch: zodValidator(z.object({ from: fallback(z.string(), "").default("") })),
  head: () =>
    seoHead({
      title: "Reasoning & Scientific AI — Immune Super Intelligence",
      description:
        "Ask Immune with graph context and Gate C cites when present, see fail-closed retrieval, trace paths and run start–perturbation–outcome reasoning. Educational beta — not fully evidence-grounded AI.",
      path: "/reasoning",
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
        kicker="Investigate · Scientific reasoning"
        title="AI that works through the biology"
        lede="Ask with retrieved graph context (and Gate C cites when they exist), inspect fail-closed grounding, walk exemplar pathways, trace any two concepts, then run start → perturbation → outcome reasoning. Rule-based walks are illustrative unless independently validated — not fully evidence-grounded AI."
        stats={[
          { v: CONTENT.cases.length, l: "CASES" },
          { v: "A→B", l: "PATH TRACER" },
          { v: "Δ", l: "PERTURBATION" },
        ]}
      />
      <PageToc items={TOC} />
      <Section
        id="ask"
        n={1}
        title="Ask Immune"
        lede={
          <>
            Graph-retrieved teaching — answers use retrieved concepts, causal links and relationship-level review status.
            Gate C reviewed cites appear when present; provisional PubMed/Europe PMC hits stay labelled unreviewed;
            counterevidence (contradicts/partial) is a separate bucket (empty when Neon has none); citation checks
            fail-closed. Sparse Gate C means this is not fully evidence-grounded AI.{" "}
            <Link to="/ask">Full Ask page</Link>
            {" · "}
            <Link to="/methods" hash="live-ev-heading">
              Live coverage
            </Link>
          </>
        }
      >
        <AskAtlas />
      </Section>
      <Section
        id="how-ai-works"
        n={2}
        title="How the AI works"
        lede="Before any answer is written, Ask runs this retrieval: question → graph context → Gate C / counterevidence / provisional lit status. The demo below makes no AI call and invents no sources."
      >
        <PhoneFold label="Show the retrieval demo">
          <ResearchWorkspace />
        </PhoneFold>
        <h3 style={{ marginTop: 24 }}>How we talk about AI</h3>
        <AiPrinciples />
        <h3 style={{ marginTop: 24 }}>What is wired today</h3>
        <PhoneFold label="Show all capabilities">
          <CapabilityRegistry />
        </PhoneFold>
      </Section>
      <Section id="pathways" n={3} title="Exemplar pathways">
        {evidenceUnavailable ? (
          <p className="lede" role="alert">Evidence service unavailable — pathway maturity below cannot be recomputed from live approvals (not the same as zero reviewed support).</p>
        ) : (
          <p className="lede">
            PRD priority pathways — graph-connected teaching scaffolds. Maturity badges recompute from live approved+supports cites.
            Partial and scaffold pathways are not evidence-grounded AI demos.
          </p>
        )}
        <PhoneFold label="Show all pathways">
        <div className="grid auto">
          {EXEMPLAR_PATHWAYS.map((p) => {
            const report = reportExemplar(p, approvedCites);
            const maturityTitle = EXEMPLAR_MATURITY_LABEL[report.maturity];
            return (
              <article className="card" key={p.id} aria-labelledby={`exemplar-${p.id}-title`}>
                <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                  <h3 id={`exemplar-${p.id}-title`} style={{ fontSize: "1.05rem" }}>{p.title}</h3>
                  <span
                    className={`badge rs rs-${report.maturity === "reviewed" ? "approved" : report.maturity === "partially-reviewed" ? "claim-assessed" : "unreviewed"}`}
                    title={maturityTitle}
                    aria-label={maturityTitle}
                  >
                    {report.maturity}
                  </span>
                </div>
                <p className="small muted" style={{ marginTop: 8 }}>{p.purpose}</p>
                <div className="row" style={{ marginTop: 10, flexWrap: "wrap", gap: 6 }}>
                  {p.waypointIds.filter((id) => byId[id]).map((id) => <NodeChip key={id} id={id} />)}
                </div>
                <p className="xs muted" style={{ marginTop: 10 }}>
                  {report.connected ? "Waypoints are graph-connected." : `Gap: ${report.missingSegment ?? "incomplete path"}`}
                  {" · "}
                  {report.approvedEdgeCount}/{report.uniqueRelIds.length} unique on-path edges with approved+supports
                  {" · "}
                  {maturityTitle}
                  {!exemplarAllowsEvidenceGroundedClaim(report.maturity) ? " · not evidence-grounded" : ""}
                </p>
                {report.edgeReviews.length ? (
                  <ul className="xs muted" style={{ marginTop: 8, paddingLeft: 18 }}>
                    {report.edgeReviews.map((e) => (
                      <li key={e.relId}>
                        <code>{e.relId}</code>{" "}
                        <span className={`badge rs rs-${e.review}`} title={STATUS_INFO[e.review].desc}>{e.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {p.notes.slice(0, 2).map((n) => (
                  <p className="xs muted" key={n} style={{ marginTop: 6 }}>{n}</p>
                ))}
                {p.mechanism ? (
                  <p className="xs muted" style={{ marginTop: 6 }}>Mechanism defaults: {byId[p.mechanism.startId]?.name} → {byId[p.mechanism.perturbId]?.name} → {byId[p.mechanism.outcomeId]?.name}</p>
                ) : null}
              </article>
            );
          })}
        </div>
        </PhoneFold>
      </Section>
      <Section id="workspace" n={4} title="Mechanism workspace" lede="Choose a starting concept, an intervention or perturbation, and an outcome. Inspect paths, polarity, evidence status, assumptions and gaps.">
        <MechanismWorkspace initialStart={urlFrom && byId[urlFrom] ? urlFrom : "C003"} />
      </Section>
      <Section id="cases" n={5} title="Case reasoning">
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
      </Section>
      <Section id="tracer" n={6} title="Path tracer" lede="Pick any two concepts. The tracer finds the shortest chain of causal links between them, directed or not.">
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
      </Section>
    </div>
  );
}

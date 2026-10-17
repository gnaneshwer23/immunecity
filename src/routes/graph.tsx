import { seoHead } from "@/lib/seo";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { lazy, Suspense, useEffect, useState } from "react";
import { PageHead } from "@/components/immune/ui";

const GraphView = lazy(() => import("@/components/immune/GraphView"));

export const Route = createFileRoute("/graph")({
  validateSearch: zodValidator(
    z.object({
      focus: fallback(z.string(), "").default(""),
      sim: fallback(z.string(), "").default(""),
      mode: fallback(z.string(), "").default(""),
    }),
  ),
  head: () => seoHead({ title: "Knowledge graph: the causal map — Immune Super Intelligence", description: "Explore every immune concept and typed causal link, and simulate blocking or activating any node.", path: "/graph" }),
  component: GraphPage,
});

/** Match GraphView chrome so ClientOnly → Suspense does not collapse the stage. */
function Fallback() {
  return (
    <div className="page graph-explorer" aria-busy="true">
      <PageHead
        kicker="Layer 04 · Immune City · Knowledge graph"
        title="The causal map"
        lede="Loading the graph…"
      />
      <div className="graph-layout">
        <aside className="graph-panel" aria-hidden="true">
          <div className="card">
            <h2 className="graph-panel-h">Find a concept</h2>
            <p className="xs muted">Preparing filters…</p>
          </div>
        </aside>
        <div className="graph-stage graph-stage-loading">
          <p className="empty" role="status">
            Preparing the explorer — typed concepts and directional links from the curated graph.
          </p>
        </div>
      </div>
    </div>
  );
}

const GUIDE_KEY = "isi-graph-guide-dismissed";
function GraphGuide() {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(localStorage.getItem(GUIDE_KEY) !== "1"); }, []);
  if (!show) return null;
  return (
    <aside className="ex-guide page" aria-label="How to use the graph">
      <ol>
        <li><span className="ex-num">1</span><span><b>Search or click</b> a concept to focus on it.</span></li>
        <li><span className="ex-num">2</span><span><b>Follow the arrows</b> — they show what causes what.</span></li>
        <li><span className="ex-num">3</span><span><b>Select a link</b> to see how well it is supported.</span></li>
      </ol>
      <button type="button" className="btn sm" onClick={() => { localStorage.setItem(GUIDE_KEY, "1"); setShow(false); }}>Got it</button>
    </aside>
  );
}

function GraphPage() {
  const { focus, sim, mode } = Route.useSearch();
  return (
    <>
    <GraphGuide />
    <ClientOnly fallback={<Fallback />}>
      <Suspense fallback={<Fallback />}>
        <GraphView focusId={focus || null} simId={sim || null} modeParam={mode} />
      </Suspense>
    </ClientOnly>
    </>
  );
}

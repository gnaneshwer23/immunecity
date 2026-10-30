import { seoHead } from "@/lib/seo";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { lazy, Suspense, useEffect, useState } from "react";
import { PageHead } from "@/components/immune/ui";
import LessonReturn from "@/components/immune/LessonReturn";
import { resolveLessonId } from "@/lib/academy/graphBridge";

const GraphView = lazy(() => import("@/components/immune/GraphView"));

export const Route = createFileRoute("/graph")({
  validateSearch: zodValidator(
    z.object({
      focus: fallback(z.string(), "").default(""),
      sim: fallback(z.string(), "").default(""),
      mode: fallback(z.string(), "").default(""),
      fromLesson: fallback(z.string(), "").default(""),
    }),
  ),
  head: () => seoHead({ title: "Knowledge graph: the causal map — Immune Super Intelligence", description: "Explore typed immune concepts and directional causal links, and simulate blocking or activating a node.", path: "/graph" }),
  component: GraphPage,
});

/** Match GraphView chrome so ClientOnly → Suspense does not collapse the stage (CWV-minded shell). */
function Fallback() {
  return (
    <div className="page graph-explorer" aria-busy="true">
      <PageHead
        kicker="Explore · Knowledge graph"
        title="The causal map"
        lede="Loading typed concepts and directional links — the first paint keeps this shell so the layout does not jump."
      />
      <div className="graph-layout">
        <aside className="graph-panel" aria-hidden="true">
          <div className="card">
            <h2 className="graph-panel-h">Find a concept</h2>
            <p className="xs muted">Preparing search and filters…</p>
          </div>
          <div className="card">
            <h2 className="graph-panel-h">Evidence status</h2>
            <p className="xs muted">Edge evidence-status filter loads with the explorer.</p>
          </div>
        </aside>
        <div className="graph-stage graph-stage-loading">
          <p className="empty" role="status">
            Preparing the explorer — arrows mean source → target. An empty filter later is not evidence of absence.
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
        <li><span className="ex-num">1</span><span><b>Search or select</b> a concept to focus on it.</span></li>
        <li><span className="ex-num">2</span><span><b>Follow the arrows</b> — they show directional relationships.</span></li>
        <li><span className="ex-num">3</span><span><b>Select a link</b> to inspect its evidence status.</span></li>
      </ol>
      <button type="button" className="btn sm" onClick={() => { localStorage.setItem(GUIDE_KEY, "1"); setShow(false); }}>Got it</button>
    </aside>
  );
}

function GraphPage() {
  const { focus, sim, mode, fromLesson: fromLessonRaw } = Route.useSearch();
  const fromLesson = resolveLessonId(fromLessonRaw) ?? undefined;
  return (
    <>
    <GraphGuide />
    <LessonReturn fromLesson={fromLesson} />
    <ClientOnly fallback={<Fallback />}>
      <Suspense fallback={<Fallback />}>
        <GraphView focusId={focus || null} simId={sim || null} modeParam={mode} fromLesson={fromLesson} />
      </Suspense>
    </ClientOnly>
    </>
  );
}

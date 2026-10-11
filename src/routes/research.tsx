import { useCallback, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { CONTENT } from "@/data/content";
import { IMPLEMENTATION_PHASES } from "@/data/implementation-phases";
import { byId } from "@/lib/immune/engine";
import { PageHead, NodeChip } from "@/components/immune/ui";
import ScientificWorkbench from "@/components/immune/ScientificWorkbench";
import LiteratureQueue from "@/components/immune/LiteratureQueue";
import ModelRegistryPanel from "@/components/immune/ModelRegistryPanel";

export const Route = createFileRoute("/research")({
  validateSearch: zodValidator(
    z.object({
      q: fallback(z.string(), "").default(""),
      start: fallback(z.string(), "").default(""),
      perturb: fallback(z.string(), "").default(""),
      outcome: fallback(z.string(), "").default(""),
    }),
  ),
  head: () => ({
    meta: [
      { title: "Research workbench — Immune City" },
      { name: "description", content: "Scientific workbench, literature candidates and model-registry interfaces — phases B–E partial; candidates only until curated. Educational beta — teaching tools, not live clinical predictors." },
      { property: "og:title", content: "Research workbench — Immune City" },
      { property: "og:description", content: "Candidate research workflows and interface-only model adapters — not live predictors or auto-published claims." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Research,
});

type Frontier = { title: string; node: string; status: string; text: string };
type Road = { text: string; related: string[] };

function Research() {
  const frontier = (CONTENT["frontier"] ?? []) as Frontier[];
  const roadmap = (CONTENT["roadmap"] ?? []) as Road[];
  const phaseE = IMPLEMENTATION_PHASES.find((p) => p.id === "E");
  const search = Route.useSearch();
  const [litHandoff, setLitHandoff] = useState<string | null>(null);
  const clearLitHandoff = useCallback(() => setLitHandoff(null), []);

  const seed = {
    question: search.q || undefined,
    startId: search.start && byId[search.start] ? search.start : undefined,
    perturbId: search.perturb && byId[search.perturb] ? search.perturb : undefined,
    outcomeId: search.outcome && byId[search.outcome] ? search.outcome : undefined,
  };

  return (
    <div className="page">
      <PageHead
        kicker="Layer 12 · Research"
        title="Scientific AI Workbench"
        lede="Question → evidence → mechanism → hypothesis → experiment → human review. Generated artefacts are candidates — never established findings or curated graph writes. Literature ingest and advanced adapters remain partial / interface-only."
        stats={[
          { v: "6", l: "WORKBENCH STEPS" },
          { v: frontier.length, l: "FRONTIER TOPICS" },
          { v: phaseE?.status.replace("_", " ") ?? "partial", l: "PHASE E" },
        ]}
      />

      <section className="section" id="workbench">
        <h2>Workbench</h2>
        <ScientificWorkbench
          pendingLitImport={litHandoff}
          onPendingLitImportConsumed={clearLitHandoff}
          seed={seed}
        />
      </section>

      <section className="section" id="literature">
        <h2>Literature intelligence</h2>
        <p className="lede">
          Phase C workflow — export candidates or send them into the workbench evidence step above (still drafts).
        </p>
        <LiteratureQueue onSendToWorkbench={setLitHandoff} />
      </section>

      <section className="section" id="model-registry">
        <h2>Advanced model registry</h2>
        <p className="lede">
          Phase D interfaces for future omics, structure, pMHC/epitope, genomics, and agent adapters.
          Status remains <b>interface-only</b> — see also <Link to="/methods" hash="models">Methods §4</Link>.
        </p>
        <ModelRegistryPanel />
      </section>

      <section className="section" id="phases">
        <h2>Implementation phases B–E</h2>
        <p className="lede">
          Status reflects shipped, testable code — not marketing claims. See also <Link to="/methods">Methods &amp; trust</Link>.
        </p>
        <div className="grid auto">
          {IMPLEMENTATION_PHASES.map((p) => (
            <article className="card" key={p.id}>
              <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                <span className="chip">Phase {p.id}</span>
                <span className="badge rs">{p.status.replace("_", " ")}</span>
              </div>
              <h3 style={{ fontSize: "1.05rem", marginTop: 10 }}>{p.title}</h3>
              <p className="small muted" style={{ marginTop: 8 }}>{p.notes}</p>
              <ul className="small" style={{ marginTop: 8 }}>
                {p.acceptance.slice(0, 3).map((a) => <li key={a}>{a}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Frontier</h2>
        <div className="grid auto">
          {frontier.map((f) => (
            <article className="card frontier-card" data-status={f.status} key={f.title}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="chip">{f.status}</span>
                {byId[f.node] ? <NodeChip id={f.node} label="Graph" /> : null}
              </div>
              <h3 style={{ fontSize: "1.05rem", marginTop: 10 }}>{f.title}</h3>
              <p className="small muted" style={{ marginTop: 8 }}>{f.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section">
        <h2>Roadmap</h2>
        <p className="lede">What the atlas still needs to become a complete causal model.</p>
        <ol className="small roadmap-tl">
          {roadmap.map((r, i) => (
            <li key={r.text}>
              <span className="rm-num">{String(i + 1).padStart(2, "0")}</span>
              {r.text} {r.related.filter((id) => byId[id]).map((id) => <NodeChip key={id} id={id} />)}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

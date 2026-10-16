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
import { PRODUCT_NAME } from "@/lib/brand";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/research")({
  validateSearch: zodValidator(
    z.object({
      q: fallback(z.string(), "").default(""),
      start: fallback(z.string(), "").default(""),
      perturb: fallback(z.string(), "").default(""),
      outcome: fallback(z.string(), "").default(""),
    }),
  ),
  head: () =>
    seoHead({
      title: `Scientific Research Workbench | ${PRODUCT_NAME}`,
      description:
        "Organise research questions, evidence, mechanisms and candidate hypotheses. Interface-only model adapters — not live predictors or auto-published claims.",
      path: "/research",
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
        kicker="Layer 12 · Research Workbench"
        title="Turn a research question into a reviewable investigation."
        lede="A guided workspace for organising evidence, tracing mechanisms and drafting candidate hypotheses and experiment proposals. Generated artefacts stay separate from approved scientific knowledge — never auto-promoted to the curated graph. Literature is a local candidate workflow (not live PubMed bulk ingest); model adapters are planned / interface-only stubs."
        stats={[
          { v: "6", l: "WORKBENCH STEPS" },
          { v: frontier.length, l: "FRONTIER TOPICS" },
          { v: phaseE?.status.replace("_", " ") ?? "partial", l: "PHASE E" },
        ]}
      />

      <section className="section" id="workbench">
        <h2>Workbench</h2>
        <p className="lede">
          Phase E — candidates only. Curation queue handoff is a human-gated export stub (wired=false); no silent KG write-back.
        </p>
        <ScientificWorkbench
          pendingLitImport={litHandoff}
          onPendingLitImportConsumed={clearLitHandoff}
          seed={seed}
        />
      </section>

      <section className="section" id="literature">
        <h2>Literature intelligence</h2>
        <p className="lede">
          Phase C workflow — local metadata + candidate claims. Not live bulk PubMed ingest; export candidates or send them into the workbench evidence step (still drafts).
        </p>
        <LiteratureQueue onSendToWorkbench={setLitHandoff} />
      </section>

      <section className="section" id="model-registry">
        <h2>Advanced model registry</h2>
        <p className="lede">
          Phase D interfaces for future omics, structure, pMHC/epitope, genomics, and agent adapters.
          Badges read <b>planned / interface-only · not live</b> — see also <Link to="/methods" hash="models">Methods §4</Link>.
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

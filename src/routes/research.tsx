import { ART } from "@/components/immune/explain";
import { useCallback, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { CONTENT } from "@/data/content";
import { IMPLEMENTATION_PHASES } from "@/data/implementation-phases";
import { byId } from "@/lib/immune/engine";
import { PageHead, NodeChip } from "@/components/immune/ui";
import { PageToc, Section } from "@/components/immune/page";

const TOC = [
  { id: "library", label: "Library" },
  { id: "literature", label: "Literature" },
  { id: "workbench", label: "Workbench" },
  { id: "model-registry", label: "Models" },
  { id: "frontier", label: "Frontier" },
  { id: "phases", label: "Phases" },
  { id: "roadmap", label: "Roadmap" },
];
import ScientificWorkbench from "@/components/immune/ScientificWorkbench";
import LiteratureQueue from "@/components/immune/LiteratureQueue";
import ResearchLibrary from "@/components/immune/ResearchLibrary";
import ModelRegistryPanel from "@/components/immune/ModelRegistryPanel";
import PhoneFold from "@/components/immune/PhoneFold";
import { PRODUCT_NAME } from "@/lib/brand";
import { seoHead } from "@/lib/seo";
import type { SearchMetadata } from "@/lib/research/literatureWorkflow";

export const Route = createFileRoute("/research")({
  validateSearch: zodValidator(
    z.object({
      q: fallback(z.string(), "").default(""),
      start: fallback(z.string(), "").default(""),
      perturb: fallback(z.string(), "").default(""),
      outcome: fallback(z.string(), "").default(""),
      lib: fallback(z.string().max(200), "").default(""),
    }),
  ),
  head: () =>
    seoHead({
      title: `Research Library & Workbench | ${PRODUCT_NAME}`,
      description:
        "Search Nature Portfolio immunology journal metadata, start reviewable evidence candidates and organise hypotheses on a partial workbench spine. Nothing is auto-approved or auto-published.",
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
  const [litSeed, setLitSeed] = useState<{ key: string; seed: Partial<SearchMetadata> } | null>(null);

  const seed = {
    question: search.q || undefined,
    startId: search.start && byId[search.start] ? search.start : undefined,
    perturbId: search.perturb && byId[search.perturb] ? search.perturb : undefined,
    outcomeId: search.outcome && byId[search.outcome] ? search.outcome : undefined,
  };

  return (
    <div className="page">
      <PageHead art={ART.researchArt}
        kicker="Investigate · Research library"
        title="Turn a research question into a reviewable investigation."
        lede="A guided workspace for organising evidence, tracing mechanisms and drafting candidate hypotheses and experiment proposals. Generated artefacts stay separate from approved scientific knowledge — never auto-promoted to the curated graph. Literature candidates stay local until a curator imports them at /curation; Ask may separately list provisional PubMed/Europe PMC hits as unreviewed. Model adapters are planned / interface-only stubs."
        stats={[
          { v: "6", l: "WORKBENCH STEPS" },
          { v: frontier.length, l: "FRONTIER TOPICS" },
          { v: phaseE?.status.replace("_", " ") ?? "partial", l: "PHASE E" },
        ]}
      />
      <PageToc items={TOC} />

      <Section
        id="library"
        n={1}
        title="Research Library · Nature Portfolio journals"
        lede={
          <>
            Search live article metadata from five Nature Portfolio journals (no affiliation implied). Proposing an
            article starts an unreviewed local candidate in the literature workflow below — it never becomes Gate C
            without curator review. Export a curation manifest and import at{" "}
            <Link to="/curation">/curation</Link> (admin); Research Library propose does not auto-write Neon evidence.
            Ask Immune may also fetch provisional PubMed/Europe PMC hits that stay labelled unreviewed.
          </>
        }
      >
        <ResearchLibrary
          initialQuery={search.lib}
          onPropose={(a) => {
            setLitSeed({
              key: `${a.doi}-${Date.now()}`,
              seed: {
                source: "paste_metadata",
                query: a.title,
                doi: a.doi,
                title: a.title,
                journal: a.journal,
                year: a.year ? String(a.year) : undefined,
                notes: `Proposed from Research Library (Crossref metadata, fetched ${new Date().toISOString()}).`,
              },
            });
            requestAnimationFrame(() => document.getElementById("literature")?.scrollIntoView({ behavior: "smooth" }));
          }}
        />
      </Section>

      <Section id="literature" n={2} title="Literature intelligence" lede="Phase C workflow — local metadata + candidate claims. Not live bulk PubMed ingest; export candidates or send them into the workbench evidence step (still drafts).">
        {litSeed ? (
          <p className="small" role="status">Started a candidate from <b>{litSeed.seed.title}</b> (DOI {litSeed.seed.doi}). Status: unreviewed.</p>
        ) : null}
        <PhoneFold label="Show literature queue"><LiteratureQueue key={litSeed?.key ?? "blank"} seed={litSeed?.seed} onSendToWorkbench={setLitHandoff} /></PhoneFold>
      </Section>

      <Section
        id="workbench"
        n={3}
        title="Workbench"
        lede={
          <>
            Partial spine: Question→Search→Screen→Extract→Assess→Hypothesis→Export with claim-ledger candidates and
            counterevidence hints when present. Export for human review at{" "}
            <Link to="/curation">/curation</Link>; nothing is automatically published to the knowledge graph. See also{" "}
            <Link to="/methods" hash="models">
              Methods § models
            </Link>
            .
          </>
        }
      >
        <ScientificWorkbench
          pendingLitImport={litHandoff}
          onPendingLitImportConsumed={clearLitHandoff}
          seed={seed}
        />
      </Section>

      <Section id="model-registry" n={4} title="Advanced model registry" lede={<>Phase D interfaces for future omics, structure, pMHC/epitope, genomics, and agent adapters. Badges read <b>planned / interface-only · not live</b> — see also <Link to="/methods" hash="models">Methods §4</Link>.</>}>
        <PhoneFold label="Show model registry"><ModelRegistryPanel /></PhoneFold>
      </Section>

      <Section id="frontier" n={5} title="Frontier">
        <PhoneFold label="Show all frontier topics">
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
        </PhoneFold>
      </Section>

      <Section id="phases" n={6} title="Implementation phases B–E" lede={<>Status reflects shipped, testable code — not marketing claims. See also <Link to="/methods">Methods &amp; trust</Link>.</>}>
        <PhoneFold label="Show all phases">
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
        </PhoneFold>
      </Section>

      <Section id="roadmap" n={7} title="Roadmap" lede="What the atlas still needs to become a complete causal model.">
        <PhoneFold label="Show full roadmap">
        <ol className="small roadmap-tl">
          {roadmap.map((r, i) => (
            <li key={r.text}>
              <span className="rm-num">{String(i + 1).padStart(2, "0")}</span>
              {r.text} {r.related.filter((id) => byId[id]).map((id) => <NodeChip key={id} id={id} />)}
            </li>
          ))}
        </ol>
        </PhoneFold>
      </Section>
    </div>
  );
}

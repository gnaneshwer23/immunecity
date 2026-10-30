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
  { id: "hub", label: "Research tools" },
  { id: "library", label: "Library" },
  { id: "literature", label: "Literature" },
  { id: "collections", label: "Collections" },
  { id: "workbench", label: "Workbench" },
  { id: "brief", label: "Draft brief" },
  { id: "model-registry", label: "Models" },
  { id: "frontier", label: "Frontier" },
  { id: "phases", label: "Phases" },
  { id: "roadmap", label: "Roadmap" },
];

const RESEARCH_HUB = [
  { to: "/discovery" as const, title: "Research Radar", desc: "Evidence-governed unknowns and next questions from ISI coverage." },
  { to: "/evidence" as const, title: "Evidence explorer", desc: "Landmark trials and live claim-review coverage." },
  { to: "/reasoning" as const, title: "Scientific reasoning", desc: "Path tracing and retrieval demos — tools, not a second chatbot." },
  { to: "/simulator" as const, title: "System simulator", desc: "Illustrative teaching model — not a patient prediction." },
  { to: "/pipeline" as const, title: "Disease pipelines", desc: "Therapies by mechanism with landmark and active trials." },
  { to: "/ask" as const, title: "Ask Immune", desc: "Start an investigation in the conversational gateway." },
] as const;
import ScientificWorkbench from "@/components/immune/ScientificWorkbench";
import LiteratureQueue from "@/components/immune/LiteratureQueue";
import ResearchLibrary from "@/components/immune/ResearchLibrary";
import EvidenceCollectionsPanel from "@/components/immune/EvidenceCollectionsPanel";
import ResearchBriefPanel from "@/components/immune/ResearchBriefPanel";
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
        "Search Nature Portfolio immunology journal metadata, save evidence collections, draft source-traceable research briefs, and organise hypotheses on a partial workbench spine. Nothing is auto-approved or auto-published to the knowledge graph.",
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
        kicker="Research"
        title="Turn a research question into a reviewable investigation."
        lede="Organise evidence collections, classify gaps from real coverage signals, draft AI/unreviewed research briefs, and keep candidate hypotheses separate from approved scientific knowledge. From here, open Research Radar, evidence coverage, reasoning tools and teaching simulators. Literature candidates stay local until imported at Curation. Nothing from this page writes the curated knowledge graph."
        stats={[
          { v: "6", l: "WORKBENCH STEPS" },
          { v: frontier.length, l: "FRONTIER TOPICS" },
          { v: phaseE?.status.replace("_", " ") ?? "partial", l: "PHASE E" },
        ]}
      />
      <PageToc items={TOC} />

      <Section id="hub" title="Research tools" lede="Specialised surfaces stay available as contextual tools — not extra top-level destinations.">
        <ul className="isi-library-list">
          {RESEARCH_HUB.map((item) => (
            <li key={item.to}>
              <Link to={item.to}>
                <strong>{item.title}</strong>
              </Link>
              <p className="isi-radar-why">{item.desc}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="library"
        n={1}
        title="Research Library · Nature Portfolio journals"
        lede={
          <>
            Search live article metadata from five Nature Portfolio journals (no affiliation implied). Proposing an
            article starts an unreviewed local candidate — it never becomes an approved claim without curator review.
            Export a curation manifest and import at{" "}
            <Link to="/curation">Curation</Link> (admin). Propose does not write the evidence database. Ask Immune may
            also fetch provisional PubMed/Europe PMC hits that stay labelled unreviewed.
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

      <Section id="literature" n={2} title="Literature intelligence" lede="Local metadata and candidate claims — not bulk PubMed ingest. Export candidates or send them into the workbench evidence step; they remain drafts.">
        {litSeed ? (
          <p className="small" role="status">Started a candidate from <b>{litSeed.seed.title}</b> (DOI {litSeed.seed.doi}). Status: unreviewed.</p>
        ) : null}
        <PhoneFold label="Show literature queue"><LiteratureQueue key={litSeed?.key ?? "blank"} seed={litSeed?.seed} onSendToWorkbench={setLitHandoff} /></PhoneFold>
      </Section>

      <Section
        id="collections"
        n={3}
        title="Evidence collections"
        lede="Signed-in members can save named sets of existing graph concept ids plus optional evidence record refs. Neon-backed — syncs across devices for your account. Additive storage only — never a knowledge-graph write. Gap labels describe ISI curated coverage, not worldwide literature absence."
      >
        <EvidenceCollectionsPanel />
      </Section>

      <Section
        id="workbench"
        n={4}
        title="Workbench"
        lede={
          <>
            Guided steps from question through search, extract, assess, hypothesis and export. Local drafts use this
            browser’s localStorage (device-only — not Neon, not cross-device). Candidates and counterevidence hints
            stay drafts until human review at <Link to="/curation">Curation</Link>. Nothing is automatically
            published to the knowledge graph. See{" "}
            <Link to="/methods" hash="models">
              Methods · models
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

      <Section
        id="brief"
        n={5}
        title="Research brief (AI/draft)"
        lede="Draft-only synthesis with rationale, evidence, hypotheses, biomarkers, trials and limitations. Cites retrieved ids only and fails closed on unsupported references. Export JSON or Markdown for human review — cannot approve into the KG."
      >
        <ResearchBriefPanel
          seedQuestion={search.q || undefined}
          seedConceptIds={[search.start, search.perturb, search.outcome].filter((id): id is string => Boolean(id && byId[id]))}
        />
      </Section>

      <Section id="model-registry" n={6} title="Advanced model registry" lede={<>Planned interfaces for future omics, structure, pMHC/epitope, genomics and agent adapters. Badges read <b>planned / interface-only · not live</b> — see <Link to="/methods" hash="models">Methods · models</Link>.</>}>
        <PhoneFold label="Show model registry"><ModelRegistryPanel /></PhoneFold>
      </Section>

      <Section id="frontier" n={7} title="Frontier">
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

      <Section id="phases" n={8} title="Implementation phases B–E" lede={<>Status reflects shipped, testable code — not marketing claims. See also <Link to="/methods">Methods &amp; trust</Link>.</>}>
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

      <Section id="roadmap" n={9} title="Roadmap" lede="What the atlas still needs to become a complete causal model.">
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

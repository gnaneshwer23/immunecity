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

const TOC = [
  { id: "discover", label: "Discover" },
  { id: "evidence", label: "Evidence" },
  { id: "library", label: "Library" },
  { id: "literature", label: "Literature" },
  { id: "collections", label: "Collections" },
  { id: "workbench", label: "Workbench" },
  { id: "brief", label: "Draft brief" },
  { id: "tools", label: "Contextual tools" },
  { id: "model-registry", label: "Models" },
  { id: "roadmap", label: "Roadmap" },
];

const DISCOVER_STEPS = [
  {
    to: "/discovery/onboarding" as const,
    title: "Set research focus",
    desc: "Tell Radar which diseases, mechanisms and modalities matter to you.",
  },
  {
    to: "/discovery" as const,
    title: "Research Radar",
    desc: "Evidence-governed unknowns and next questions from ISI coverage.",
  },
  {
    to: "/discovery/gaps" as const,
    title: "Open a dossier",
    desc: "Save, verify and follow research candidates — human review still required.",
  },
  {
    to: "/discovery/alerts" as const,
    title: "Monitoring",
    desc: "In-app notices when followed questions see new ISI signals.",
  },
] as const;

const CONTEXTUAL_TOOLS = [
  {
    to: "/reasoning" as const,
    title: "Scientific reasoning",
    desc: "Path tracing and retrieval demos — tools, not a second chatbot.",
  },
  {
    to: "/simulator" as const,
    title: "System simulator",
    desc: "Illustrative teaching model — not a patient prediction.",
  },
  {
    to: "/pipeline" as const,
    title: "Disease pipelines & trials",
    desc: "Therapies by mechanism with landmark and active trials. Trial Intelligence stays experimental and off in production.",
  },
] as const;

type Frontier = { title: string; node: string; status: string; text: string };
type Road = { text: string; related: string[] };

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
      <PageHead
        art={ART.researchArt}
        kicker="Research"
        title="Turn a research question into a reviewable investigation."
        lede="Start from Research Radar and dossiers, then organise evidence collections and draft briefs. Literature candidates stay local until imported at Curation. Nothing from this page writes the curated knowledge graph."
        stats={[
          { v: "Radar", l: "START HERE" },
          { v: frontier.length, l: "FRONTIER TOPICS" },
          { v: "Ask", l: "GATEWAY" },
        ]}
      />
      <PageToc items={TOC} />

      <Section
        id="discover"
        title="Discover"
        lede="Evidence-to-discovery ladder — one clear path, not a tool dump. Coverage gaps describe ISI curated signals, not worldwide literature absence."
      >
        <p style={{ marginBottom: 12 }}>
          <Link className="btn primary" to="/discovery">
            Open Research Radar
          </Link>
          {" · "}
          <Link to="/ask" search={search.q ? { q: search.q } : undefined}>
            Ask Immune
          </Link>
        </p>
        <ol className="isi-ladder" aria-label="Discover path">
          {DISCOVER_STEPS.map((step) => (
            <li key={step.to}>
              <Link to={step.to}>
                <strong>{step.title}</strong>
              </Link>
              <p className="isi-radar-why">{step.desc}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="evidence"
        title="Evidence"
        lede="Landmark trials and live claim-review coverage. Reviewed support stays separate from provisional literature."
      >
        <p>
          <Link className="btn primary" to="/evidence">
            Evidence explorer
          </Link>
          {" · "}
          <a href="#collections">Saved collections</a>
          {" · "}
          <Link to="/methods" hash="live-ev-heading">
            Methods · live coverage
          </Link>
        </p>
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
        lede="Signed-in members can save named sets of graph concepts plus optional evidence record refs. Collections sync across devices for your account. Additive storage only — never a knowledge-graph write. Gap labels describe ISI curated coverage, not worldwide literature absence."
      >
        <EvidenceCollectionsPanel />
      </Section>

      <Section
        id="workbench"
        n={4}
        title="Workbench"
        lede={
          <>
            Guided steps from question through search, extract, assess, hypothesis and export. Local drafts stay on this device until you export them. Candidates and counterevidence hints stay drafts until human review at{" "}
            <Link to="/curation">Curation</Link>. Nothing is automatically published to the knowledge graph. See{" "}
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
        lede="Draft-only synthesis with rationale, evidence, hypotheses, biomarkers, trials and limitations. Cites retrieved concepts only and fails closed on unsupported references. Export JSON or Markdown for human review — cannot approve into the KG."
      >
        <ResearchBriefPanel
          seedQuestion={search.q || undefined}
          seedConceptIds={[search.start, search.perturb, search.outcome].filter((id): id is string => Boolean(id && byId[id]))}
        />
      </Section>

      <Section
        id="tools"
        title="Contextual tools"
        lede="Specialised surfaces stay available here — not extra top-level destinations."
      >
        <div className="isi-tools">
          {CONTEXTUAL_TOOLS.map((item) => (
            <div key={item.to} className="isi-tool">
              <Link to={item.to}>
                <strong>{item.title}</strong>
              </Link>
              <p className="isi-radar-why">{item.desc}</p>
            </div>
          ))}
        </div>
        <p className="isi-tool-limit" style={{ marginTop: 12 }}>
          Patient / biomarker views: <Link to="/patient">Patient explorer</Link>
          {" · "}
          Trial Intelligence production flag stays off — see{" "}
          <Link to="/methods" hash="models">
            Methods
          </Link>
          .
        </p>
      </Section>

      <Section id="model-registry" n={6} title="Advanced model registry" lede={<>Planned interfaces for future omics, structure, pMHC/epitope, genomics and agent adapters. Badges read <b>planned / interface-only · not live</b> — see <Link to="/methods" hash="models">Methods · models</Link>.</>}>
        <PhoneFold label="Show model registry"><ModelRegistryPanel /></PhoneFold>
      </Section>

      <Section id="roadmap" title="Frontier and roadmap" lede={<>What the atlas still needs. Implementation phase status ({phaseE?.status.replace("_", " ") ?? "partial"}) reflects shipped code — not marketing claims. See <Link to="/methods">Methods &amp; trust</Link>.</>}>
        <PhoneFold label="Show frontier, phases and roadmap">
          <div className="grid auto" style={{ marginBottom: 16 }}>
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
          <div className="grid auto" style={{ marginBottom: 16 }}>
            {IMPLEMENTATION_PHASES.map((p) => (
              <article className="card" key={p.id}>
                <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                  <span className="chip">Phase {p.id}</span>
                  <span className="badge rs">{p.status.replace("_", " ")}</span>
                </div>
                <h3 style={{ fontSize: "1.05rem", marginTop: 10 }}>{p.title}</h3>
                <p className="small muted" style={{ marginTop: 8 }}>{p.notes}</p>
              </article>
            ))}
          </div>
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

import { ART } from "@/components/immune/explain";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { CONTENT } from "@/data/content";
import { byId } from "@/lib/immune/engine";
import { PageHead, NodeChip } from "@/components/immune/ui";
import { PageToc, Section } from "@/components/immune/page";
import ResearchLibrary from "@/components/immune/ResearchLibrary";
import EvidenceCollectionsPanel from "@/components/immune/EvidenceCollectionsPanel";
import ResearchJourney from "@/components/immune/ResearchJourney";
import { PRODUCT_NAME } from "@/lib/brand";
import { seoHead } from "@/lib/seo";

const TOC = [
  { id: "discover", label: "Discover" },
  { id: "evidence", label: "Evidence" },
  { id: "library", label: "Library" },
  { id: "collections", label: "Collections" },
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

export const Route = createFileRoute("/research")({
  beforeLoad: ({ location }) => {
    const section = location.hash.replace(/^#/, "");
    if (["synthetic-programme", "workbench", "brief", "melanoma"].includes(section) || section.startsWith("programme-")) {
      throw redirect({ to: "/internal-research" });
    }
  },
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
      title: `Research Library & Evidence | ${PRODUCT_NAME}`,
      description:
        "Search immunology journal metadata, explore evidence and organise source-linked research. Nothing is automatically approved into the knowledge graph.",
      path: "/research",
    }),
  component: Research,
});

function Research() {
  const search = Route.useSearch();

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
        title="Explore the evidence behind immune biology."
        lede="Start from Research Radar and dossiers, then organise evidence collections and draft briefs. Literature candidates stay local until imported at Curation. Nothing from this page writes the curated knowledge graph."
        stats={[
          { v: "Radar", l: "START HERE" },
          { v: "Evidence", l: "SOURCE CONTEXT" },
          { v: "Ask", l: "GATEWAY" },
        ]}
      />
      <PageToc items={TOC} />
      <ResearchJourney />

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
        <p><Link to="/ask">Ask Immune</Link> can prepare a source-linked investigation brief. Generated outputs remain unreviewed.</p>
      </Section>

      <Section
        id="library"
        n={1}
        title="Research Library · Nature Portfolio journals"
        lede="Search live article metadata from Nature Portfolio journals. Metadata identifies a publication; it does not establish support for a scientific claim. No journal affiliation is implied."
      >
        <ResearchLibrary initialQuery={search.lib} />
      </Section>

      <Section
        id="collections"
        n={3}
        title="Evidence collections"
        lede="Signed-in members can save named sets of graph concepts plus optional evidence record refs. Collections sync across devices for your account. Additive storage only — never a knowledge-graph write. Gap labels describe ISI curated coverage, not worldwide literature absence."
      >
        <EvidenceCollectionsPanel />
      </Section>

    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ART } from "@/components/immune/explain";
import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WontClaimList } from "@/components/immune/marketing";
import { CONTENT } from "@/data/content";
import { VISION_MOTTO } from "@/data/vision";
import {
  ASK_NAME,
  ASK_PUBLIC_LINE,
  BRAND_EYEBROW,
  COMMUNITY_PATH,
  EXPLORE_PATH,
  HERO_HEADLINE,
  HERO_SUPPORT,
  HERO_TRUST,
  PRODUCT_NAME,
  PRODUCT_SHORT,
  TAGLINE,
} from "@/lib/brand";
import { approvedQuery, loadEvidenceCoverage } from "@/lib/citations.functions";
import { byId, human } from "@/lib/immune/engine";
import {
  EXEMPLAR_MATURITY_LABEL,
  EXEMPLAR_PATHWAYS,
  reportExemplar,
} from "@/lib/immune/exemplarPathways";
import { seoHead } from "@/lib/seo";
import { inspect } from "@/lib/immune/inspector";
import { graphReleaseSnapshot } from "@/lib/immune/graphRelease";
import ResearchJourney from "@/components/immune/ResearchJourney";

const HOME_DRAFT_TEASERS = [
  {
    title: "Fibre → butyrate → Treg → IBD",
    blurb: "Microbiota–butyrate–Treg teaching chain toward IBD context — draft, review incomplete.",
    lessonId: "microbiome",
    hash: "draft-pathway",
  },
  {
    title: "Vaccine → germinal centre → memory",
    blurb: "How vaccination builds germinal-centre affinity and lasting memory — draft lesson.",
    lessonId: "vaccines",
    hash: "draft-vaccine",
  },
  {
    title: "Shared epitope → ACPA → RA",
    blurb: "HLA shared-epitope associations into the RA neighbourhood — draft teaching path.",
    lessonId: "immunogenetics",
    hash: "draft-hla",
  },
] as const;

const HOME_DRAFT_ROUTES = HOME_DRAFT_TEASERS.filter((t) =>
  CONTENT.routes.some((r) => r.title === t.title && "draft" in r && r.draft),
);


export const Route = createFileRoute("/")({
  loader: () => loadEvidenceCoverage(),
  head: () =>
    seoHead({
      title: `${PRODUCT_NAME} | ${TAGLINE}`,
      description:
        "Immune Super Intelligence — explore mechanisms through a curated causal graph with labelled sources. Educational resource — not clinical decision support.",
      path: "/",
    }),
  component: Home,
});

/** Home causal preview: TNF→RA exemplar (documented maturity; live cites still load in the graph). */
const HOME_EXEMPLAR = EXEMPLAR_PATHWAYS.find((p) => p.id === "ex-tnf-ra")!;
/** Section D: interferon axis — recognition → signalling → cytokine → activation → outcome. */
const MECHANISM_EXEMPLAR = EXEMPLAR_PATHWAYS.find((p) => p.id === "ex-ifn-sle")!;

function InteractiveMechanism() {
  const { data: cites = [], isPending, isError } = useQuery(approvedQuery);
  const report = reportExemplar(MECHANISM_EXEMPLAR, cites);
  const seen = new Set<string>();
  const hops = report.segments.flatMap((seg) =>
    (seg.steps ?? []).map((step, i) => ({ step, rid: seg.relIds[i]!, review: seg.reviews[i]! })),
  ).filter((h) => (seen.has(h.rid) ? false : (seen.add(h.rid), true)));
  return (
    <>
      {isPending ? (
        <p className="home-causal-note" role="status">Loading review status…</p>
      ) : isError ? (
        <p className="home-causal-note" role="alert">
          Evidence service unavailable — review badges may be stale.
        </p>
      ) : null}
      <ol className="isi-mech" aria-label={`${MECHANISM_EXEMPLAR.title} — inspect each step`}>
        {hops.map(({ step, rid, review }, i) => {
          const subj = byId[step.r.subject_id];
          const obj = byId[step.r.object_id];
          if (!subj || !obj) return null;
          const label = report.edgeReviews.find((x) => x.relId === rid)?.label ?? String(review);
          return (
            <li key={rid} className="isi-mech-step">
              <span className="isi-mech-n">{String(i + 1).padStart(2, "0")}</span>
              <div className="isi-mech-body">
                <button type="button" className="isi-mech-node" onClick={() => inspect({ kind: "concept", id: subj.id })}>{subj.name}</button>
                <button type="button" className="isi-mech-rel" onClick={() => inspect({ kind: "relationship", id: rid })} aria-label={`Inspect evidence: ${subj.name} ${human(step.r.relation)} ${obj.name}`}>
                  {human(step.r.relation)} →
                </button>
                <button type="button" className="isi-mech-node" onClick={() => inspect({ kind: "concept", id: obj.id })}>{obj.name}</button>
              </div>
              <span className={`badge rs rs-${review}`}>{label}</span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function HomeCausalPathway() {
  const { data: cites = [], isPending, isError } = useQuery(approvedQuery);
  const report = reportExemplar(HOME_EXEMPLAR, cites);
  const maturityLine = isPending
    ? "Loading review status…"
    : isError
      ? "Evidence service unavailable — status may be stale."
      : EXEMPLAR_MATURITY_LABEL[report.maturity];

  return (
    <div className="home-pathway">
      <div className="bio-section-heading">
        <div>
          <span className="mkt-section-label">Curated pathway</span>
          <h2 id="demo-heading">{HOME_EXEMPLAR.title}</h2>
        </div>
        <p>
          Relationships from the curated graph — each hop opens its record and current review status.{" "}
          {maturityLine}
        </p>
      </div>
      <ol className="home-causal-path" aria-label={`${HOME_EXEMPLAR.title} relationships`}>
        {report.segments.flatMap((seg, si) =>
          (seg.steps ?? []).map((step, i) => {
            const rid = seg.relIds[i]!;
            // Segments can share a link; show each relationship once.
            const firstSeen = report.segments.findIndex((s2) => s2.relIds.includes(rid));
            if (firstSeen !== si || seg.relIds.indexOf(rid) !== i) return null;
            const review = seg.reviews[i]!;
            const label = report.edgeReviews.find((x) => x.relId === rid)?.label ?? String(review);
            const subj = byId[step.r.subject_id];
            const obj = byId[step.r.object_id];
            if (!subj || !obj) return null;
            return (
              <li key={`${si}-${rid}-${i}`}>
                <Link
                  className="home-causal-hop"
                  to="/graph"
                  search={{ focus: step.r.subject_id }}
                  title={`Open ${subj.name} in the knowledge graph`}
                >
                  <span className="home-causal-names">
                    <strong>{subj.name}</strong>
                    <span className="home-causal-rel">{human(step.r.relation)}</span>
                    <strong>{obj.name}</strong>
                  </span>
                  <span className={`badge rs rs-${review}`}>{label}</span>
                </Link>
              </li>
            );
          }),
        )}
      </ol>
      <p className="home-causal-note">
        {HOME_EXEMPLAR.purpose} Teaching axis — not a complete disease model.{" "}
        <Link to="/overview">More pathways</Link>
        {" · "}
        <Link to="/methods">Evidence methods</Link>
      </p>
      {HOME_DRAFT_ROUTES.length ? (
        <div className="home-draft-teaser-list" aria-label="Draft teaching chains">
          {HOME_DRAFT_ROUTES.map((t) => (
            <aside key={t.title} className="home-draft-teaser">
              <span className="badge rs rs-draft">Draft</span>
              <p>
                {t.blurb}{" "}
                <Link to="/overview" hash={t.hash}>
                  Overview
                </Link>
                {" · "}
                <Link to="/mechanism/$id" params={{ id: t.lessonId }}>
                  Lesson
                </Link>
              </p>
            </aside>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const SNAP = graphReleaseSnapshot();

function HomeCoverageGlance() {
  const { coverage: data, coverageError } = Route.useLoaderData();
  if (coverageError || !data) {
    return (
      <p className="home-causal-note" role="alert">
        Reviewed evidence coverage is temporarily unavailable. This does not mean there are zero
        reviewed claims.{" "}
        <Link to="/methods" hash="live-ev-heading">
          Methods coverage
        </Link>
      </p>
    );
  }
  return (
    <p className="home-causal-note" role="status">
      Reviewed relationship claims: <b>{data.distinctGateCRels}</b> of {data.runtimeRelationships}.
      Most links still await claim review.{" "}
      <Link to="/methods" hash="live-ev-heading">
        Methods
      </Link>
      {" · "}
      <Link to="/evidence" hash="coverage">
        Evidence explorer
      </Link>
    </p>
  );
}

function Home() {
  const { coverage } = Route.useLoaderData();
  return (
    <div className="precision-home">
      <section className="precision-hero" aria-labelledby="precision-title">
        <div className="precision-hero-copy">
          <p className="precision-eyebrow">Immune Super Intelligence · Translational research</p>
          <h1 id="precision-title">See the connections.<br /><em>Shape the next question.</em></h1>
          <p className="precision-lede">Bring immune biology, source-linked evidence and research investigations into one connected workspace.</p>
          <div className="precision-actions">
            <Link className="btn primary" to="/research" hash="synthetic-programme">Open research workbench <ArrowRight size={18} /></Link>
            <Link className="precision-text-link" to="/graph">Explore the knowledge graph <ArrowRight size={18} /></Link>
          </div>
          <p className="precision-caption">For research and education. Findings and review status remain visible.</p>
        </div>
        <div className="precision-hero-field" aria-label="Connected research workspace preview">
          <div className="precision-orbit precision-orbit-one" /><div className="precision-orbit precision-orbit-two" />
          <div className="precision-field-core"><span>ISI</span><small>Connected biology</small></div>
          <Link className="precision-field-node field-node-a" to="/atlas">01 / Concepts<br /><strong>Knowledge Atlas</strong></Link>
          <Link className="precision-field-node field-node-b" to="/evidence">02 / Sources<br /><strong>Evidence explorer</strong></Link>
          <Link className="precision-field-node field-node-c" to="/research" hash="synthetic-programme">03 / Investigations<br /><strong>Research workbench</strong></Link>
          <span className="precision-field-caption">Concept → relationship → evidence → investigation</span>
        </div>
      </section>

      <section className="precision-facts" aria-label="Graph release and evidence service">
        <div><strong>{SNAP.coreNodes}</strong><span>Core graph concepts</span></div>
        <div><strong>{SNAP.coreRelationships}</strong><span>Core relationships · review varies</span></div>
        <div><strong>{SNAP.coreVersion}</strong><span>Graph release</span></div>
        <div><strong>{coverage ? "Retrieved" : "Unavailable"}</strong><span>Server evidence coverage</span></div>
      </section>

      <section className="precision-section" aria-labelledby="precision-work-heading">
        <div className="precision-section-head"><p className="precision-eyebrow">One workspace, connected questions</p><h2 id="precision-work-heading">Move between the biology<br />and the evidence behind it.</h2></div>
        <div className="precision-product-grid">
          <article><span className="precision-index">01 / Explore</span><h3>A map you can investigate.</h3><p>Follow cells, receptors, pathways, biomarkers, therapies and trials. Inspect direction, context and the review status of each relationship.</p><Link to="/graph">Open the graph <ArrowRight size={16} /></Link></article>
          <article><span className="precision-index">02 / Ask</span><h3>Questions with context.</h3><p>Use Ask Immune to explore the curated map and source-linked material, with uncertainty and missing evidence kept explicit.</p><Link to="/ask">Ask Immune <ArrowRight size={16} /></Link></article>
          <article><span className="precision-index">03 / Investigate</span><h3>A question becomes a dossier.</h3><p>Inspect observations, explore graph context, test a scenario and export an investigation with its sources and limitations.</p><Link to="/research" hash="synthetic-programme">Open the workbench <ArrowRight size={16} /></Link></article>
        </div>
      </section>

      <section className="precision-section precision-mechanism" aria-labelledby="precision-mechanism-heading">
        <div><p className="precision-eyebrow">Inside the knowledge graph</p><h2 id="precision-mechanism-heading">A relationship deserves<br />more than a reference.</h2><p>Open a concept to understand its context. Open a relationship to inspect the exact claim and its mapped evidence.</p><Link className="precision-text-link" to="/atlas/$id" params={{ id: "D001" }}>Explore rheumatoid arthritis <ArrowRight size={18} /></Link></div>
        <div className="precision-mechanism-panel"><HomeCausalPathway /></div>
      </section>

      <section className="precision-section" aria-labelledby="precision-investigation-heading">
        <div className="precision-section-head"><p className="precision-eyebrow">Research in practice</p><h2 id="precision-investigation-heading">Follow the investigation.<br />Keep the context.</h2><p>Explore immune, gut, brain and metabolic condition contexts in an interactive demonstration. Fictional records let you test the workflow without entering patient information.</p></div>
        <ResearchJourney />
        <div className="precision-usecases">
          <Link to="/research" hash="synthetic-programme"><span>Cross-condition investigation</span><strong>Observations → graph context → research plan</strong><p>Compare longitudinal records and inspect the effect of changing scenario inputs.</p></Link>
          <Link to="/research" hash="melanoma"><span>Melanoma immunotherapy</span><strong>Mechanisms → trial context → hypothesis</strong><p>Explore landmark publication locators and draft a falsifiable investigation.</p></Link>
        </div>
      </section>

      <section className="precision-section precision-evidence" aria-labelledby="precision-evidence-heading">
        <div><p className="precision-eyebrow">Evidence and accountability</p><h2 id="precision-evidence-heading">Trace the claim.<br />See the limits.</h2><p>A graph label is not scientific approval. Supporting evidence must be assessed against the exact relationship, with human review before approval.</p><HomeCoverageGlance /><div className="precision-actions"><Link className="btn" to="/evidence">Evidence explorer</Link><Link className="precision-text-link" to="/methods">Methods & coverage <ArrowRight size={16} /></Link></div></div>
        <ol className="precision-review-list"><li><span>01</span><div><h3>Source provenance</h3><p>Publication identity, relationship mapping and source context remain distinct.</p></div></li><li><span>02</span><div><h3>Human scientific review</h3><p>Candidates and hypotheses remain unreviewed until an authorised reviewer acts.</p></div></li><li><span>03</span><div><h3>Visible uncertainty</h3><p>Coverage gaps and conflicting findings are part of the investigation, not hidden conclusions.</p></div></li></ol>
      </section>

      <section className="precision-section precision-learning" aria-labelledby="precision-learning-heading"><div><p className="precision-eyebrow">Build understanding</p><h2 id="precision-learning-heading">Learn the system.<br />Discuss the science.</h2></div><div><p>Explore immune mechanisms through the Academy and discuss research in journal clubs. Educational discussion stays separate from reviewed evidence.</p><div className="precision-actions"><Link className="btn" to="/academy">Explore Academy</Link><Link className="precision-text-link" to="/community/journal-clubs">Journal clubs <ArrowRight size={16} /></Link></div></div></section>

      <section className="precision-close" aria-labelledby="precision-close-heading"><p className="precision-eyebrow">From connected biology to a better question</p><h2 id="precision-close-heading">Start your next investigation.</h2><div className="precision-actions"><Link className="btn primary" to="/research" hash="synthetic-programme">Open research workbench <ArrowRight size={18} /></Link><Link className="precision-text-link" to="/ask">Ask Immune <ArrowRight size={18} /></Link></div><p className="precision-caption">Research use only. Clinical decisions and trial eligibility require qualified review.</p></section>
    </div>
  );
}

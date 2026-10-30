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
        Live coverage unavailable
        {coverageError ? ` (${coverageError})` : ""}. That is a service error, not a finding of zero
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
  return (
    <div className="home-page home-page-helix">
      {/* 1 — Value prop: brand-first hero */}
      <section className="home-helix-hero isi-dark-band" aria-label={PRODUCT_NAME}>
        <div className="home-helix-visual" aria-hidden="true">
          <img className="home-hero-art" src={ART.heroCity} alt="" width={1536} height={1024} />
        </div>
        <div className="home-helix-copy">
          <div className="bio-eyebrow home-helix-eyebrow">
            <span className="status-dot" /> {BRAND_EYEBROW}
          </div>
          <p className="home-brand-signal">{PRODUCT_NAME}</p>
          <h1>{HERO_HEADLINE}</h1>
          <p className="hero-description">{HERO_SUPPORT}</p>
          <div className="bio-actions">
            <Button asChild className="bio-primary home-helix-primary">
              <Link to="/ask">
                {ASK_NAME} <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="bio-secondary home-helix-secondary">
              <Link to={EXPLORE_PATH}>
                Explore biology <ArrowRight />
              </Link>
            </Button>
          </div>
          <p className="home-helix-foot">{HERO_TRUST}</p>
        </div>
      </section>

      <div className="bio-content home-sections">
        {/* 2 — Prominent Ask entry */}
        <section className="bio-section" aria-labelledby="ask-gateway-heading">
          <div className="bio-section-heading">
            <div>
              <span className="mkt-section-label">{ASK_NAME}</span>
              <h2 id="ask-gateway-heading">Ask first. Open the graph when you need depth.</h2>
            </div>
            <p>
              {ASK_PUBLIC_LINE} Answers stay educational — missing evidence is stated clearly. From a reply you can open
              Atlas, Research Radar or a lesson without losing the question.
            </p>
          </div>
          <div className="bio-actions">
            <Button asChild className="bio-primary">
              <Link to="/ask">Open {ASK_NAME}</Link>
            </Button>
            <Button asChild variant="ghost" className="bio-secondary">
              <Link to="/ask" search={{ q: "How does TNF drive rheumatoid arthritis?" }}>
                Try a mechanism question
              </Link>
            </Button>
          </div>
        </section>

        {/* 3 — Biological exploration */}
        <section className="bio-section" aria-labelledby="explore-heading">
          <div className="bio-section-heading">
            <div>
              <span className="mkt-section-label">Explore</span>
              <h2 id="explore-heading">From isolated facts to connected mechanisms.</h2>
            </div>
            <p>
              The curated map shows what a concept connects to, in which direction, and how far claim review has
              progressed — not a list of papers alone.
            </p>
          </div>
          <div className="home-compare">
            <div className="home-compare-col home-compare-flat">
              <span className="home-compare-label">A typical search</span>
              <p className="home-compare-q">“What does TNF do?”</p>
              <ul>
                <li>Lists of papers and definitions</li>
                <li>Cause and effect look the same</li>
                <li>No clear path to disease or therapy</li>
              </ul>
            </div>
            <div className="home-compare-col home-compare-connected">
              <span className="home-compare-label">In {PRODUCT_SHORT}</span>
              <HomeCausalPathway />
            </div>
          </div>
          <p className="home-causal-note">
            <Link to={EXPLORE_PATH}>Explore hub</Link>
            {" · "}
            <Link to="/atlas">Knowledge Atlas</Link>
            {" · "}
            <Link to="/graph">Knowledge graph</Link>
          </p>
        </section>

        <section className="bio-section" aria-labelledby="mech-heading">
          <div className="bio-section-heading">
            <div>
              <span className="mkt-section-label">Mechanism</span>
              <h2 id="mech-heading">{MECHANISM_EXEMPLAR.title}</h2>
            </div>
            <p>
              Graph links in order. Open a concept for detail, or an arrow for the evidence on that relationship.
            </p>
          </div>
          <InteractiveMechanism />
          <p className="home-causal-note">
            <Link to="/mechanism">More mechanisms</Link>
            {" · "}
            <Link to="/graph">Full knowledge graph</Link>
          </p>
        </section>

        {/* 4 — Evidence to discovery */}
        <section className="bio-section isi-split" aria-labelledby="research-heading">
          <div>
            <span className="mkt-section-label">Research</span>
            <h2 id="research-heading">From evidence to the next defensible question.</h2>
            <p className="lede">
              Search journal metadata, organise candidate claims, and open Research Radar for coverage-governed unknowns.
              Nothing enters the curated graph until a person reviews it.
            </p>
            <div className="bio-actions">
              <Button asChild className="bio-primary">
                <Link to="/research" hash="library">
                  <BookOpen /> Research library
                </Link>
              </Button>
              <Button asChild variant="ghost" className="bio-secondary">
                <Link to="/discovery">Research Radar</Link>
              </Button>
            </div>
            <HomeCoverageGlance />
          </div>
          <ol className="isi-ladder" aria-label="How research material is labelled">
            <li>
              <b>Source material</b>
              <span>Journal metadata or provisional literature — identity only until reviewed.</span>
            </li>
            <li>
              <b>Candidate claim</b>
              <span>A drafted statement mapped to a relationship — still unreviewed.</span>
            </li>
            <li>
              <b>Counterevidence</b>
              <span>Contradicts and partial assessments stay separate from approved support.</span>
            </li>
            <li>
              <b>Research opportunity</b>
              <span>Radar candidates from ISI coverage signals — not claimed worldwide absence.</span>
            </li>
          </ol>
        </section>

        {/* 5 — Academy */}
        <section className="bio-section" aria-labelledby="academy-heading">
          <div className="bio-section-heading">
            <div>
              <span className="mkt-section-label">Academy</span>
              <h2 id="academy-heading">Learn mechanisms as connected systems.</h2>
            </div>
            <p>
              Foundation modules are open to read. Intermediate and advanced tracks are still being written — labelled
              unfinished, not finished courses.
            </p>
          </div>
          <div className="bio-actions">
            <Button asChild className="bio-primary">
              <Link to="/academy">Open Academy</Link>
            </Button>
            <Button asChild variant="ghost" className="bio-secondary">
              <Link to="/mechanism/$id" params={{ id: "tlr4" }}>
                Start a foundation lesson
              </Link>
            </Button>
          </div>
        </section>

        {/* 6 — Community */}
        <section className="bio-section" aria-labelledby="community-heading">
          <div className="bio-section-heading">
            <div>
              <span className="mkt-section-label">Community</span>
              <h2 id="community-heading">Discuss immunology with clear limits.</h2>
            </div>
            <p>
              Educational discussion and journal clubs. Not clinical advice, and not part of the reviewed knowledge
              graph.
            </p>
          </div>
          <div className="bio-actions">
            <Button asChild className="bio-primary">
              <Link to={COMMUNITY_PATH}>Join the conversation</Link>
            </Button>
            <Button asChild variant="ghost" className="bio-secondary">
              <Link to="/community/journal-clubs">Journal clubs</Link>
            </Button>
          </div>
        </section>

        {/* 7 — Trust / governance */}
        <section className="bio-section" aria-labelledby="trust-heading">
          <div className="bio-section-heading">
            <div>
              <span className="mkt-section-label">Trust</span>
              <h2 id="trust-heading">Review status stays visible.</h2>
            </div>
            <p>
              Graph today: {SNAP.coreNodes} core concepts and {SNAP.coreRelationships} core links, plus{" "}
              {SNAP.draftNodes} draft concepts and {SNAP.draftRelationships} draft links awaiting review.
            </p>
          </div>
          <ul className="home-limit-list">
            <li>
              <strong>Claim-linked cites</strong>
              <span>A citation supports a relationship only after it is mapped and reviewed for that claim.</span>
            </li>
            <li>
              <strong>Unreviewed stays labelled</strong>
              <span>Teaching links remain visible with clear status while review continues.</span>
            </li>
            <li>
              <strong>Human scientific review</strong>
              <span>No auto-approval into the curated graph. Expert workspaces stay behind account access.</span>
            </li>
          </ul>
          <WontClaimList />
          <p className="home-trust-link">
            <Link to="/methods" hash="live-ev-heading">
              Methods & live coverage
            </Link>
            <Link to="/disclaimer">Educational disclaimer</Link>
          </p>
        </section>

        {/* 8 — Simple CTA */}
        <section className="bio-banner home-final-cta" aria-labelledby="cta-heading">
          <div>
            <div className="bio-eyebrow">{VISION_MOTTO.join(" · ")}</div>
            <h2 id="cta-heading">Start with a question.</h2>
            <p>Ask Immune answers from the curated map — then open biology or research when you need more.</p>
          </div>
          <nav className="isi-final-links" aria-label="Start">
            <Link to="/ask">
              {ASK_NAME} <ArrowRight size={16} />
            </Link>
            <Link to={EXPLORE_PATH}>
              Explore biology <ArrowRight size={16} />
            </Link>
            <Link to="/research">
              Research <ArrowRight size={16} />
            </Link>
            <Link to="/methods" hash="live-ev-heading">
              Methods <ArrowRight size={16} />
            </Link>
          </nav>
        </section>
      </div>
    </div>
  );
}

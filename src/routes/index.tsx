import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CausalSpine } from "@/components/immune/CausalSpine";
import { IsiCityBand } from "@/components/immune/IsiCityBand";
import { VISION_MOTTO } from "@/data/vision";
import { TrustBlock } from "@/components/immune/marketing";
import {
  BRAND_EYEBROW,
  EXPLORE_CTA,
  EXPLORE_PATH,
  FLAGSHIP_NAME,
  HERO_HEADLINE,
  HERO_SUPPORT,
  HERO_TRUST,
  LEARN_CTA,
  LEARN_PATH,
  PRODUCT_NAME,
  TAGLINE,
} from "@/lib/brand";
import { byId, human } from "@/lib/immune/engine";
import {
  EXEMPLAR_MATURITY_LABEL,
  EXEMPLAR_PATHWAYS,
  reportExemplar,
} from "@/lib/immune/exemplarPathways";
import { seoHead } from "@/lib/seo";

const HelixHeroVisual = lazy(() =>
  import("@/components/immune/HelixHeroVisual").then((m) => ({ default: m.HelixHeroVisual })),
);

export const Route = createFileRoute("/")({
  head: () =>
    seoHead({
      title: `${PRODUCT_NAME} | ${TAGLINE}`,
      description:
        "Immune Super Intelligence — see the immune system as a connected system. Explore mechanisms, a curated causal knowledge graph and Ask that educates with references. Educational beta; not clinical advice.",
      path: "/",
    }),
  component: Home,
});

const HOW_IT_WORKS = [
  { n: "01", to: "/learn", title: "Start with a concept", copy: "Pick a cell, molecule, pathway or disease." },
  { n: "02", to: "/mechanism", title: "Trace the mechanism", copy: "Walk the steps from molecules to cells, tissues and outcomes." },
  { n: "03", to: "/methods", title: "Inspect the evidence", copy: "See sources, review status and limits behind each link." },
  { n: "04", to: "/research", title: "Draft a hypothesis", copy: "Organise candidates in the workbench — drafts until human review." },
] as const;

/** Home causal preview: TNF→RA exemplar (documented maturity; live cites still load in the graph). */
const HOME_EXEMPLAR = EXEMPLAR_PATHWAYS.find((p) => p.id === "ex-tnf-ra")!;

function HomeCausalPathway() {
  const report = reportExemplar(HOME_EXEMPLAR);

  return (
    <div className="home-pathway">
      <div className="bio-section-heading">
        <div>
          <span className="bio-section-number">LIVE GRAPH PATHWAY</span>
          <h2 id="demo-heading">{HOME_EXEMPLAR.title}</h2>
        </div>
        <p>
          Real relationships from the curated graph — each hop links to a graph record with its current evidence
          status. Maturity: {EXEMPLAR_MATURITY_LABEL[report.maturity]}.
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
        {HOME_EXEMPLAR.purpose} Teaching axis only — not disease-complete.{" "}
        <Link to="/overview">Platform exemplars</Link>
        {" · "}
        <Link to="/methods">Evidence lifecycle</Link>
      </p>
    </div>
  );
}

function Home() {
  return (
    <div className="home-page home-page-helix">
      <section className="home-helix-hero" aria-label={PRODUCT_NAME}>
        <div className="home-helix-visual" aria-hidden="true">
          <Suspense fallback={<div className="helix-stage helix-fallback" />}>
            <HelixHeroVisual />
          </Suspense>
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
              <Link to={EXPLORE_PATH}>
                {EXPLORE_CTA} <ArrowUpRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="bio-secondary home-helix-secondary">
              <Link to={LEARN_PATH}>
                {LEARN_CTA} <ArrowRight />
              </Link>
            </Button>
          </div>
          <p className="home-helix-foot">{HERO_TRUST}</p>
        </div>
      </section>

      <div className="bio-content home-sections">
        {/* B — What ISI enables */}
        <section className="bio-section" aria-labelledby="enables-heading">
          <div className="bio-section-heading">
            <div>
              <span className="bio-section-number">01 / WHAT ISI ENABLES</span>
              <h2 id="enables-heading">Not isolated facts — connected mechanisms.</h2>
            </div>
            <p>A search returns a fact. ISI shows what it connects to, in which direction, and how well it is supported.</p>
          </div>
          <div className="home-compare">
            <div className="home-compare-col home-compare-flat">
              <span className="home-compare-label">A typical search</span>
              <p className="home-compare-q">"What does TNF do?"</p>
              <ul>
                <li>A list of papers and definitions</li>
                <li>No direction: cause and effect look the same</li>
                <li>No path to disease, target or therapy</li>
                <li>Evidence quality left for you to judge</li>
              </ul>
            </div>
            <div className="home-compare-col home-compare-connected">
              <span className="home-compare-label">In Immune City</span>
              <HomeCausalPathway />
            </div>
          </div>
        </section>

        {/* C — Learn / Explore / Investigate */}
        <section className="bio-section" aria-labelledby="pillars-heading">
          <div className="bio-section-heading">
            <div>
              <span className="bio-section-number">02 / LEARN · EXPLORE · INVESTIGATE</span>
              <h2 id="pillars-heading">Three ways into the same system.</h2>
            </div>
            <p>Pick the journey that matches what you came to do.</p>
          </div>
          <div className="platform-pillars">
            <Link className="platform-pillar" to="/learn">
              <span className="platform-pillar-kicker">Learn</span>
              <h3>Understand the parts</h3>
              <p>Cells in the Cell atlas, step-by-step cascades, and the Academy foundation track. Intermediate and Advanced tracks are still in development.</p>
              <span className="platform-pillar-cta">Open the Cell atlas</span>
            </Link>
            <Link className="platform-pillar" to="/graph">
              <span className="platform-pillar-kicker">Explore</span>
              <h3>Follow the connections</h3>
              <p>Move through the knowledge graph from molecules and cells to disease, targets, therapies and trials.</p>
              <span className="platform-pillar-cta">Open the knowledge graph</span>
            </Link>
            <Link className="platform-pillar" to="/research">
              <span className="platform-pillar-kicker">Investigate</span>
              <h3>Test an idea</h3>
              <p>Check the evidence behind a link, trace paths, and draft hypotheses that stay labelled as candidates until reviewed.</p>
              <span className="platform-pillar-cta">Open the Research workbench</span>
            </Link>
          </div>
        </section>

        {/* D — The Immune City model */}
        <section className="bio-section" aria-labelledby="home-spine-heading">
          <div className="bio-section-heading">
            <div>
              <span className="bio-section-number">03 / THE IMMUNE CITY MODEL</span>
              <h2 id="home-spine-heading">Fifteen causal stages, from trigger to discovery.</h2>
            </div>
            <p>
              Every concept sits on one chain, so you always know where you are and what comes next. Click a stage
              to see its question and examples. The twelve layers are mapped on <Link to="/overview">Platform</Link>.
            </p>
          </div>
          <CausalSpine compact />
          <IsiCityBand />
        </section>

        {/* E — Workflows */}
        <section className="bio-section" id="how-it-works" aria-labelledby="how-heading">
          <div className="bio-section-heading">
            <div>
              <span className="bio-section-number">04 / WORKFLOWS AVAILABLE TODAY</span>
              <h2 id="how-heading">From a question to inspectable biology.</h2>
            </div>
            <p>Each step opens a working page.</p>
          </div>
          <ol className="home-steps">
            {HOW_IT_WORKS.map((step) => (
              <li key={step.n} className="home-step">
                <Link to={step.to} className="home-step-link">
                  <span className="home-step-n">{step.n}</span>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="bio-section" aria-labelledby="trust-heading">
          <div className="bio-section-heading">
            <div>
              <span className="bio-section-number">05 / EVIDENCE &amp; TRUST</span>
              <h2 id="trust-heading">Review status stays visible.</h2>
            </div>
            <p>Summarised here — Methods holds the full lifecycle.</p>
          </div>
          <TrustBlock className="home-trust" />
          <ul className="home-limit-list">
            <li>
              <strong>Reviewed when mapped</strong>
              <span>Citations support a relationship only after claim-level review — not concept-level padding.</span>
            </li>
            <li>
              <strong>Unreviewed stays labelled</strong>
              <span>Teaching edges remain visible with honest status; coverage is still sparse overall.</span>
            </li>
            <li>
              <strong>Educational beta</strong>
              <span>Not clinical decision support. Ask retrieves from the graph — not fully evidence-grounded AI.</span>
            </li>
          </ul>
          <p className="home-trust-link">
            <Link to="/methods">Evidence &amp; Methods</Link>
            <Link to="/disclaimer">Educational disclaimer</Link>
          </p>
        </section>


        <section className="bio-banner home-final-cta" aria-labelledby="cta-heading">
          <div>
            <div className="bio-eyebrow">{VISION_MOTTO.join(" · ")}</div>
            <h2 id="cta-heading">Explore immunology through connected mechanisms.</h2>
            <p>
              Start with a cell, pathway or scientific question—and follow the relationships that connect it to the
              wider immune system.
            </p>
          </div>
          <div className="bio-actions">
            <Button asChild className="bio-primary">
              <Link to="/graph">
                Open the knowledge graph <ArrowUpRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="bio-secondary">
              <Link to="/mechanism">Walk a mechanism</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

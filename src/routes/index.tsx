import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrustBlock } from "@/components/immune/marketing";
import {
  BRAND_EYEBROW,
  EXPLORE_CTA,
  EXPLORE_PATH,
  FLAGSHIP_NAME,
  HERO_HEADLINE,
  HERO_SUPPORT,
  LEARN_CTA,
  LEARN_PATH,
  PRODUCT_NAME,
  TAGLINE,
} from "@/lib/brand";
import {
  CAPABILITY_STATUS_LABEL,
  featuresByStatus,
  type CapabilityStatus,
} from "@/data/capabilityStatus";
import { byId, human } from "@/lib/immune/engine";
import {
  EXEMPLAR_MATURITY_LABEL,
  EXEMPLAR_PATHWAYS,
  reportExemplar,
} from "@/lib/immune/exemplarPathways";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    seoHead({
      title: `${PRODUCT_NAME} | ${TAGLINE}`,
      description:
        "Immune Super Intelligence — learn immunology as a connected system. Explore mechanisms, a curated causal knowledge graph and Ask that educates with references. Educational model; not clinical advice.",
      path: "/",
    }),
  component: Home,
});

const HOW_IT_WORKS = [
  { n: "01", title: "Start with a question", copy: "Choose an immune concept, pathway, disease or research problem." },
  { n: "02", title: "Trace the biology", copy: "Explore the relationships connecting molecules, cells, tissues and outcomes." },
  { n: "03", title: "Inspect the evidence", copy: "Open the sources, context, review status and limitations behind a relationship." },
  { n: "04", title: "Investigate further", copy: "Use the research workbench to organise evidence, mechanisms and candidate hypotheses." },
] as const;

const AUDIENCES = [
  {
    title: "Learners and educators",
    copy: "Understand mechanisms through structured explanations and linked pathways.",
  },
  {
    title: "Immunology researchers",
    copy: "Explore causal relationships, inspect sources and identify gaps worth investigating.",
  },
  {
    title: "Computational biologists and AI teams",
    copy: "Understand the current graph and tool architecture and explore potential integration work.",
  },
] as const;

/** Concise trust strip — beta + partial only; avoid dumping every planned stub. */
const TRUST_STATUSES: CapabilityStatus[] = ["beta", "partial"];

/** Home causal preview: TNF→RA exemplar (documented reviewed maturity; live cites still load in the graph). */
const HOME_EXEMPLAR = EXEMPLAR_PATHWAYS.find((p) => p.id === "ex-tnf-ra")!;

function HomeCausalPathway({ embedded = false }: { embedded?: boolean }) {
  const report = reportExemplar(HOME_EXEMPLAR);

  return (
    <div className={`home-pathway${embedded ? " home-pathway-hero" : ""}`}>
      {embedded ? (
        <div className="home-pathway-hero-meta">
          <span className="bio-section-number">Live graph pathway</span>
          <h2 id="demo-heading">{HOME_EXEMPLAR.title}</h2>
          <p>
            Real relationships from the curated graph. Maturity: {EXEMPLAR_MATURITY_LABEL[report.maturity]}.
          </p>
        </div>
      ) : (
        <div className="bio-section-heading">
          <div>
            <span className="bio-section-number">01 / INTERACTIVE DEMO</span>
            <h2 id="demo-heading">{HOME_EXEMPLAR.title}</h2>
          </div>
          <p>
            A real pathway from the curated graph — each hop links to a graph record with its current evidence status.
            Maturity: {EXEMPLAR_MATURITY_LABEL[report.maturity]}.
          </p>
        </div>
      )}
      <ol className="home-causal-path" aria-label={`${HOME_EXEMPLAR.title} relationships`}>
        {report.segments.flatMap((seg) =>
          (seg.steps ?? []).map((step, i) => {
            const rid = seg.relIds[i]!;
            const review = seg.reviews[i]!;
            const label = report.edgeReviews.find((x) => x.relId === rid)?.label ?? String(review);
            const subj = byId[step.r.subject_id];
            const obj = byId[step.r.object_id];
            if (!subj || !obj) return null;
            return (
              <li key={`${rid}-${i}`}>
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
    <div className="home-page">
      <section className="bio-hero home-hero-split" aria-label={PRODUCT_NAME}>
        <div className="bio-hero-inner home-hero-copy">
          <div className="bio-eyebrow">
            <span className="status-dot" /> {BRAND_EYEBROW}
          </div>
          <p className="home-brand-signal">{PRODUCT_NAME}</p>
          <h1>{HERO_HEADLINE}</h1>
          <p className="hero-description">{HERO_SUPPORT}</p>
          <p className="hero-brand-note">
            <b>{PRODUCT_NAME}</b> is the umbrella. <b>{FLAGSHIP_NAME}</b> is the interactive atlas; Immunology Academy
            and Ask sit under the same brand.
          </p>
          <div className="bio-actions">
            <Button asChild className="bio-primary">
              <Link to={EXPLORE_PATH}>
                {EXPLORE_CTA} <ArrowUpRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="bio-secondary">
              <Link to={LEARN_PATH}>
                {LEARN_CTA} <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
        <div className="home-hero-demo" aria-labelledby="demo-heading">
          <HomeCausalPathway embedded />
        </div>
      </section>

      <div className="bio-content home-sections">
        <section className="bio-section" aria-labelledby="pillars-heading">
          <div className="bio-section-heading">
            <div>
              <span className="bio-section-number">02 / LEARN · EXPLORE · INVESTIGATE</span>
              <h2 id="pillars-heading">Three connected experiences.</h2>
            </div>
            <p>One brand — not separate products.</p>
          </div>
          <div className="platform-pillars">
            <Link className="platform-pillar" to={LEARN_PATH}>
              <span className="platform-pillar-kicker">Learn</span>
              <h3>Immunology Academy</h3>
              <p>
                Foundation track is primary and navigable. Intermediate and Advanced are labelled development scaffolds —
                not a finished curriculum or certification.
              </p>
              <span className="platform-pillar-cta">{LEARN_CTA}</span>
            </Link>
            <Link className="platform-pillar" to={EXPLORE_PATH}>
              <span className="platform-pillar-kicker">Explore</span>
              <h3>{FLAGSHIP_NAME}</h3>
              <p>
                Navigate immune cells, molecules, mechanisms, diseases, therapies and trials in a connected graph.
              </p>
              <span className="platform-pillar-cta">{EXPLORE_CTA}</span>
            </Link>
            <Link className="platform-pillar" to="/scientific-ai">
              <span className="platform-pillar-kicker">Investigate</span>
              <h3>Scientific AI</h3>
              <p>
                Ask and research workflows that retrieve from the graph—with clear limits on what models do today.
              </p>
              <span className="platform-pillar-cta">Explore Scientific AI</span>
            </Link>
          </div>
        </section>

        <section className="bio-section" id="how-it-works" aria-labelledby="how-heading">
          <div className="bio-section-heading">
            <div>
              <span className="bio-section-number">03 / HOW IT WORKS</span>
              <h2 id="how-heading">From a question to inspectable biology.</h2>
            </div>
            <p>One clear path into the atlas and research tools.</p>
          </div>
          <ol className="home-steps">
            {HOW_IT_WORKS.map((step) => (
              <li key={step.n} className="home-step">
                <span className="home-step-n">{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bio-section" aria-labelledby="audience-heading">
          <div className="bio-section-heading">
            <div>
              <span className="bio-section-number">04 / WHO IT IS FOR</span>
              <h2 id="audience-heading">Built for exploration and teaching.</h2>
            </div>
            <p>Not marketed as a patient treatment tool.</p>
          </div>
          <div className="home-audiences">
            {AUDIENCES.map((a) => (
              <div key={a.title} className="home-audience">
                <h3>{a.title}</h3>
                <p>{a.copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bio-section" aria-labelledby="trust-heading">
          <div className="bio-section-heading">
            <div>
              <span className="bio-section-number">05 / TRUST &amp; CAPABILITY</span>
              <h2 id="trust-heading">What works today.</h2>
            </div>
            <p>Status from one maintained capability list — not hard-coded page claims.</p>
          </div>
          <TrustBlock className="home-trust" />
          <div className="home-status-grid home-status-compact">
            {TRUST_STATUSES.map((status) => {
              const items = featuresByStatus(status);
              if (!items.length) return null;
              return (
                <div key={status} className="home-status-col">
                  <h3>{CAPABILITY_STATUS_LABEL[status]}</h3>
                  <ul>
                    {items.map((f) => (
                      <li key={f.id}>
                        <Link to={f.relatedAppRoute}>{f.name}</Link>
                        <span>{f.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="home-trust-link">
            <Link to="/methods">Evidence &amp; Methods</Link>
            <Link to="/overview">Platform overview</Link>
          </p>
        </section>

        <section className="bio-banner home-final-cta" aria-labelledby="cta-heading">
          <div>
            <div className="bio-eyebrow">Open {FLAGSHIP_NAME}</div>
            <h2 id="cta-heading">Explore immunology through connected mechanisms.</h2>
            <p>
              Start with a cell, pathway or scientific question—and follow the relationships that connect it to the
              wider immune system.
            </p>
          </div>
          <div className="bio-actions">
            <Button asChild className="bio-primary">
              <Link to={EXPLORE_PATH}>
                {EXPLORE_CTA} <ArrowUpRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="bio-secondary">
              <Link to={LEARN_PATH}>{LEARN_CTA}</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

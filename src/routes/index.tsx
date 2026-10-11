import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import cellImage from "@/assets/immune-cell.jpg";
import {
  BRAND_EYEBROW,
  CANONICAL_URL,
  EXPLORE_CTA,
  EXPLORE_PATH,
  FLAGSHIP_NAME,
  HERO_HEADLINE,
  HERO_SUPPORT,
  PRODUCT_NAME,
} from "@/lib/brand";
import {
  CAPABILITY_STATUS_LABEL,
  featuresByStatus,
  type CapabilityStatus,
} from "@/data/capabilityStatus";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${PRODUCT_NAME} | Immunology × Scientific AI` },
      {
        name: "description",
        content:
          "Explore an AI-native approach to immunology, connecting biological mechanisms, scientific evidence and research workflows.",
      },
      { property: "og:title", content: `${PRODUCT_NAME} | Immunology × Scientific AI` },
      {
        property: "og:description",
        content:
          "Educational beta: learn mechanisms, explore a curated causal graph, and investigate research questions with transparent AI limits.",
      },
      { property: "og:url", content: CANONICAL_URL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: CANONICAL_URL }],
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

const STATUS_ORDER: CapabilityStatus[] = ["beta", "partial", "in_development", "planned"];

function Home() {
  return (
    <div className="home-page">
      <section className="bio-hero" aria-label={PRODUCT_NAME}>
        <img
          className="bio-hero-image"
          src={cellImage}
          alt="Scientific illustration of a cluster of translucent immune cells"
          width={1536}
          height={1024}
          fetchPriority="high"
        />
        <div className="bio-hero-inner">
          <div className="bio-eyebrow">
            <span className="status-dot" /> {BRAND_EYEBROW}
          </div>
          <h1>{PRODUCT_NAME}</h1>
          <p className="hero-subtitle">{HERO_HEADLINE}</p>
          <p className="hero-description">{HERO_SUPPORT}</p>
          <div className="bio-actions">
            <Button asChild className="bio-primary">
              <Link to={EXPLORE_PATH}>
                {EXPLORE_CTA} <ArrowUpRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="bio-secondary">
              <a href="#how-it-works">
                See how it works <ArrowRight />
              </a>
            </Button>
          </div>
          <div className="bio-hero-note">Educational beta · curated graph · references when reviewed</div>
        </div>
      </section>

      <div className="bio-content home-sections">
        <section className="bio-section" aria-labelledby="pillars-heading">
          <div className="bio-section-heading">
            <div>
              <span className="bio-section-number">01 / THREE EXPERIENCES</span>
              <h2 id="pillars-heading">Learn. Explore. Investigate.</h2>
            </div>
            <p>Connected experiences under one brand — not separate products.</p>
          </div>
          <div className="platform-pillars">
            <Link className="platform-pillar" to="/mechanism">
              <span className="platform-pillar-kicker">Learn immunology</span>
              <h3>Immunology Academy</h3>
              <p>
                Build from core immune concepts to specialised mechanisms with structured lessons and connected
                pathways. Foundation track is a navigable scaffold today.
              </p>
              <span className="platform-pillar-cta">Explore the Academy</span>
            </Link>
            <Link className="platform-pillar" to={EXPLORE_PATH}>
              <span className="platform-pillar-kicker">Explore the science</span>
              <h3>{FLAGSHIP_NAME}</h3>
              <p>
                Navigate immune cells, molecules, mechanisms, diseases, therapies and trials in a connected graph.
              </p>
              <span className="platform-pillar-cta">Explore {FLAGSHIP_NAME}</span>
            </Link>
            <Link className="platform-pillar" to="/scientific-ai">
              <span className="platform-pillar-kicker">Investigate with AI</span>
              <h3>Scientific AI</h3>
              <p>
                Use AI-assisted workflows to trace mechanisms, organise evidence and develop research questions—within
                clearly defined limits.
              </p>
              <span className="platform-pillar-cta">Explore Scientific AI</span>
            </Link>
          </div>
        </section>

        <section className="bio-section" id="how-it-works" aria-labelledby="how-heading">
          <div className="bio-section-heading">
            <div>
              <span className="bio-section-number">02 / HOW IT WORKS</span>
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

        <section className="bio-section" aria-labelledby="trust-heading">
          <div className="bio-section-heading">
            <div>
              <span className="bio-section-number">03 / TRANSPARENCY</span>
              <h2 id="trust-heading">What is labelled — and what is not.</h2>
            </div>
          </div>
          <p className="home-trust">
            {FLAGSHIP_NAME} combines a structured immunology graph with an evolving evidence-review and AI workflow.
            Some relationships remain unreviewed, and some advanced AI integrations are still planned. We label drafts
            and limitations explicitly rather than presenting them as validated scientific findings. Educating with
            references — not clinical decision support.
          </p>
          <p className="home-trust-link">
            <Link to="/methods">Read the methods</Link>
            <Link to="/disclaimer">Educational disclaimer</Link>
          </p>
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

        <section className="bio-section" aria-labelledby="status-heading">
          <div className="bio-section-heading">
            <div>
              <span className="bio-section-number">05 / AVAILABLE NOW</span>
              <h2 id="status-heading">Current beta · In development · Planned</h2>
            </div>
            <p>Status from one maintained capability list — not hard-coded page claims.</p>
          </div>
          <div className="home-status-grid">
            {STATUS_ORDER.map((status) => {
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
        </section>

        <section className="bio-banner home-final-cta" aria-labelledby="cta-heading">
          <div>
            <div className="bio-eyebrow">Open the {FLAGSHIP_NAME} beta</div>
            <h2 id="cta-heading">Explore immunology through connected mechanisms.</h2>
            <p>
              Start with a cell, pathway or scientific question—and follow the relationships that connect it to the
              wider immune system.
            </p>
          </div>
          <Button asChild className="bio-primary">
            <Link to={EXPLORE_PATH}>
              Open the {FLAGSHIP_NAME} beta <ArrowUpRight />
            </Link>
          </Button>
        </section>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHead } from "@/components/immune/ui";
import { Button } from "@/components/ui/button";
import { EXPLORE_CTA, EXPLORE_PATH, FLAGSHIP_NAME, pageTitle, PRODUCT_NAME, PROPOSITION } from "@/lib/brand";
import { seoHead } from "@/lib/seo";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () =>
    seoHead({
      title: pageTitle("About"),
      description: `Mission and principles of ${PRODUCT_NAME}: visible knowledge structure, explicit uncertainty, and transparent AI evaluation.`,
      path: "/about",
    }),
  component: About,
});

function About() {
  return (
    <div className="page marketing-page">
      <PageHead
        kicker="Organisation"
        title={`About ${PRODUCT_NAME}`}
        lede={PROPOSITION}
      />

      <section className="section">
        <h2>Mission</h2>
        <p>
          {PRODUCT_NAME} explores how immunology and advanced AI can work together. We are building an environment
          where biological concepts, causal relationships, scientific evidence and computational tools can be explored
          in one connected workflow. Our approach is to make the knowledge structure visible, keep uncertainty explicit
          and develop AI capabilities through transparent evaluation rather than unsupported claims.
        </p>
      </section>

      <section className="section">
        <h2>Brand architecture</h2>
        <ul>
          <li>
            <b>{PRODUCT_NAME}</b> — umbrella brand for mission, principles and roadmap. We do not claim current
            “superintelligence.”
          </li>
          <li>
            <b>{FLAGSHIP_NAME}</b> — flagship interactive causal immunology knowledge platform (the live educational
            beta you can explore here).
          </li>
          <li>
            <b>Immunology Academy</b> — structured learning journey; foundation track is a navigable scaffold today.
          </li>
          <li>
            <b>Scientific AI Workbench</b> — guided research workflow; candidate artefacts remain drafts until human
            review.
          </li>
        </ul>
      </section>

      <section className="section">
        <h2>Principles</h2>
        <ul>
          <li>Educating with references from a curated graph — not clinical decision support.</li>
          <li>Relationship-level evidence: a citation supports a link only when mapped and reviewed for that claim.</li>
          <li>Drafts, unreviewed links and planned integrations are labelled honestly.</li>
          <li>Patient and therapy layers stay educational explorations — not diagnosis or prescribing tools.</li>
        </ul>
      </section>

      <section className="section">
        <h2>Roadmap honesty</h2>
        <p>
          Graph exploration, cell atlas content, mechanism walks and several teaching tools are available in beta.
          Evidence curation, fully evidence-grounded AI and the research workbench are still evolving. Omics and
          molecular prediction integrations remain planned until implemented and tested. Details live on{" "}
          <Link to="/methods">Methods &amp; trust</Link> and <Link to="/insights">Insights</Link>.
        </p>
      </section>

      <section className="section mkt-banner" aria-labelledby="about-cta">
        <div>
          <h2 id="about-cta">Work with us</h2>
          <p>
            Educators, immunology researchers, computational biologists and technology teams — we welcome focused
            collaboration conversations.
          </p>
        </div>
        <div className="bio-actions">
          <Button asChild className="bio-primary">
            <Link to="/collaborate">
              Collaborate <ArrowUpRight />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="bio-secondary">
            <Link to={EXPLORE_PATH}>{EXPLORE_CTA}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

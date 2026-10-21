import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  LearningOutboundLink,
  MarketingBody,
  MarketingCta,
  MarketingHero,
  MarketingSection,
} from "@/components/immune/marketing";
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
    <div className="mkt-page">
      <MarketingHero
        eyebrow="Organisation"
        title={`About ${PRODUCT_NAME}`}
        lede={PROPOSITION}
        foot="Visible structure · explicit uncertainty · transparent AI evaluation"
      />

      <MarketingBody>
        <MarketingSection id="mission" eyebrow="Mission" title="Make immunology inspectable.">
          <p className="mkt-prose">
            {PRODUCT_NAME} explores how immunology and scientific AI can work together. We are building an environment
            where biological concepts, causal relationships, evidence and computational tools sit in one connected
            workflow — with structure visible, uncertainty labelled and AI capabilities evaluated transparently rather
            than overstated.
          </p>
        </MarketingSection>

        <MarketingSection
          id="architecture"
          eyebrow="Brand"
          title="One umbrella. Clear products."
          lede="We do not claim current “superintelligence.” Names describe roles, not maturity."
        >
          <ol className="mkt-brand-arch">
            <li>
              <span className="mkt-brand-arch-n">01</span>
              <div>
                <strong>{PRODUCT_NAME}</strong>
                <p>Umbrella brand for mission, principles and roadmap.</p>
              </div>
            </li>
            <li>
              <span className="mkt-brand-arch-n">02</span>
              <div>
                <strong>{FLAGSHIP_NAME}</strong>
                <p>
                  Flagship interactive causal immunology platform — start at the{" "}
                  <Link to="/overview">Platform overview</Link>.
                </p>
              </div>
            </li>
            <li>
              <span className="mkt-brand-arch-n">03</span>
              <div>
                <strong>Immunology Academy</strong>
                <p>
                  Learning tracks at <Link to="/academy">Academy</Link> (Foundation available; Intermediate and Advanced
                  in development). Companion videos:{" "}
                  <LearningOutboundLink className="mkt-text-link" />. Not a certification programme.
                </p>
              </div>
            </li>
            <li>
              <span className="mkt-brand-arch-n">04</span>
              <div>
                <strong>Ask &amp; research workbench</strong>
                <p>
                  Graph-based teaching with labelled sources, and guided research workflows. Candidates stay drafts
                  until human review.{" "}
                  <Link to="/ask">Ask Immune</Link>
                  {" · "}
                  <Link to="/research" hash="workbench">Workbench</Link>
                </p>
              </div>
            </li>
          </ol>
        </MarketingSection>

        <MarketingSection id="principles" eyebrow="Principles" title="How we build.">
          <ul className="mkt-principle-list">
            <li>Educate with references from a curated graph — not clinical decision support.</li>
            <li>Relationship-level evidence: a citation supports a link only when mapped and reviewed for that claim.</li>
            <li>Drafts, unreviewed links and planned integrations are labelled clearly.</li>
            <li>Patient and therapy layers are educational explorations — not diagnosis or prescribing tools.</li>
          </ul>
        </MarketingSection>

        <MarketingSection id="editorial" eyebrow="Editorial responsibility" title="Who stands behind the content.">
          <p className="mkt-prose">
            {PRODUCT_NAME} is created and edited by Dr Gnaneshwer Jadav (PhD, Immunology). The editor is responsible
            for the curated knowledge graph, the review status shown on each relationship and the guardrails Ask
            Immune works within. A relationship is marked as supported only after a cited source has been mapped
            to that specific claim and reviewed; everything else stays labelled as unreviewed or draft. Corrections
            and source suggestions are welcome via <Link to="/collaborate">Collaborate</Link>.
          </p>
        </MarketingSection>

        <MarketingSection id="roadmap" eyebrow="Status" title="Shipped where it works. Labelled where it does not.">
          <p className="mkt-prose">
            Graph exploration, cell atlas content, mechanism walks and several teaching tools are available today.
            Ask Immune draws on graph context and labelled sources — it is not fully evidence-grounded AI. Most
            relationship claims are not yet claim-reviewed. The research workbench remains a guided draft workflow.
            Fully evidence-grounded AI, denser counterevidence curation and omics integrations remain planned. Details
            on <Link to="/methods" hash="live-ev-heading">Evidence &amp; Methods</Link>.
          </p>
        </MarketingSection>

        <MarketingCta
          title="Work with us."
          lede="Educators, immunology researchers, computational biologists and technology teams — we welcome focused collaboration conversations."
        >
          <Button asChild className="bio-primary">
            <Link to="/collaborate">
              Collaborate <ArrowUpRight />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="bio-secondary">
            <Link to={EXPLORE_PATH}>{EXPLORE_CTA}</Link>
          </Button>
        </MarketingCta>
      </MarketingBody>
    </div>
  );
}

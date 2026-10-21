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
        foot="Visible knowledge structure · explicit uncertainty · transparent AI evaluation"
      />

      <MarketingBody>
        <MarketingSection id="mission" eyebrow="01 / MISSION" title="Make immunology inspectable.">
          <p className="mkt-prose">
            {PRODUCT_NAME} explores how immunology and advanced AI can work together. We are building an environment
            where biological concepts, causal relationships, scientific evidence and computational tools can be explored
            in one connected workflow. Our approach is to make the knowledge structure visible, keep uncertainty
            explicit and develop AI capabilities through transparent evaluation rather than unsupported claims.
          </p>
        </MarketingSection>

        <MarketingSection
          id="architecture"
          eyebrow="02 / BRAND ARCHITECTURE"
          title="One umbrella. Clear products."
          lede="We do not claim current “superintelligence.” Names describe roles, not maturity theatre."
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
                  Flagship interactive causal immunology knowledge platform — start at the{" "}
                  <Link to="/overview">Platform overview</Link>.
                </p>
              </div>
            </li>
            <li>
              <span className="mkt-brand-arch-n">03</span>
              <div>
                <strong>Immunology Academy</strong>
                <p>
                  Learning tracks at <Link to="/academy">Academy</Link> (Foundation primary; Intermediate and Advanced
                  labelled in development). Companion educational videos:{" "}
                  <LearningOutboundLink className="mkt-text-link" />. Not certification.
                </p>
              </div>
            </li>
            <li>
              <span className="mkt-brand-arch-n">04</span>
              <div>
                <strong>Ask &amp; research workbench</strong>
                <p>
                  Graph-retrieved teaching (partial — Gate C when present, provisional lit labelled, fail-closed
                  citation checks) and guided research workflows; candidates stay drafts until human review.{" "}
                  <Link to="/ask">Ask Immune</Link>
                  {" · "}
                  <Link to="/research" hash="workbench">Workbench</Link>
                </p>
              </div>
            </li>
          </ol>
        </MarketingSection>

        <MarketingSection id="principles" eyebrow="03 / PRINCIPLES" title="How we build.">
          <ul className="mkt-principle-list">
            <li>Educating with references from a curated graph — not clinical decision support.</li>
            <li>Relationship-level evidence: a citation supports a link only when mapped and reviewed for that claim.</li>
            <li>Drafts, unreviewed links and planned integrations are labelled honestly.</li>
            <li>Patient and therapy layers stay educational explorations — not diagnosis or prescribing tools.</li>
          </ul>
        </MarketingSection>

        <MarketingSection id="roadmap" eyebrow="04 / ROADMAP HONESTY" title="Beta where it works. Labels where it does not.">
          <p className="mkt-prose">
            Graph exploration, cell atlas content, mechanism walks and several teaching tools are available in beta.
            Ask Immune is partial (not fully evidence-grounded); Gate C claim coverage remains sparse; the research
            workbench and claim ledger are partial spines. Live Neon rate limiting and a Methods/Evidence coverage
            dashboard are shipped. Fully evidence-grounded AI, dense counterevidence curation and omics/molecular
            prediction integrations remain incomplete or planned. Details live on{" "}
            <Link to="/methods" hash="live-ev-heading">Evidence &amp; Methods</Link>.
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

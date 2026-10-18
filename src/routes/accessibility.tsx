import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHead } from "@/components/immune/ui";
import { PageToc, Section } from "@/components/immune/page";

const TOC = [
  { id: "what-we-provide", label: "What we provide" },
  { id: "known-limits", label: "Known limits" },
  { id: "feedback", label: "Feedback" },
];
import { CONTACT_EMAIL, pageTitle, PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/accessibility")({
  head: () => seoHead({ title: pageTitle("Accessibility"), description: `Accessibility aims for ${PRODUCT_NAME}: WCAG 2.2 AA as a design target, with known limits for complex graph visuals.`, path: "/accessibility" }),
  component: Accessibility,
});

function Accessibility() {
  return (
    <div className="page marketing-page">
      <PageHead
        kicker="Trust · Accessibility"
        title="Accessibility"
        lede={`${PRODUCT_NAME} aims for WCAG 2.2 AA as a design and test target. Automated scans alone are not a conformance claim.`}
      />
      <PageToc items={TOC} />
      <Section id="what-we-provide" n={1} title="What we provide">
        <ul>
          <li>Skip link to main content and keyboard-reachable primary navigation.</li>
          <li>Text alternatives and table views for graph exploration where implemented.</li>
          <li>Status conveyed with text labels as well as colour (evidence and capability badges).</li>
          <li>Respect for reduced-motion preferences on decorative animations where styled.</li>
        </ul>
      </Section>
      <Section id="known-limits" n={2} title="Known limits">
        <p>
          The interactive knowledge graph is complex. Keyboard and screen-reader experiences may be incomplete for some
          graph interactions; use the graph table alternative and Scientific Inspector where available. We continue to
          improve focus order, labels and contrast.
        </p>
      </Section>
      <Section id="feedback" n={3} title="Feedback">
        <p>
          Accessibility feedback: {CONTACT_EMAIL}. Related pages: <Link to="/methods">Methods &amp; trust</Link>,{" "}
          <Link to="/disclaimer">educational disclaimer</Link>.
        </p>
      </Section>
    </div>
  );
}

import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHead } from "@/components/immune/ui";
import { CONTACT_EMAIL, pageTitle, PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/accessibility")({
  head: () => seoHead({ title: pageTitle("Accessibility"), description: `Accessibility aims for ${PRODUCT_NAME}: WCAG 2.2 AA as a design target, with known limits for complex graph visuals.`, path: "/accessibility" }),
  component: Accessibility,
});

function Accessibility() {
  return (
    <div className="page marketing-page">
      <PageHead
        kicker="Trust"
        title="Accessibility"
        lede={`${PRODUCT_NAME} aims for WCAG 2.2 AA as a design and test target. Automated scans alone are not a conformance claim.`}
      />
      <section className="section">
        <h2>What we provide</h2>
        <ul>
          <li>Skip link to main content and keyboard-reachable primary navigation.</li>
          <li>Text alternatives and table views for graph exploration where implemented.</li>
          <li>Status conveyed with text labels as well as colour (evidence and capability badges).</li>
          <li>Respect for reduced-motion preferences on decorative animations where styled.</li>
        </ul>
      </section>
      <section className="section">
        <h2>Known limits</h2>
        <p>
          The interactive knowledge graph is complex. Keyboard and screen-reader experiences may be incomplete for some
          graph interactions; use the graph table alternative and Scientific Inspector where available. We continue to
          improve focus order, labels and contrast.
        </p>
      </section>
      <section className="section">
        <h2>Feedback</h2>
        <p>
          Accessibility feedback: {CONTACT_EMAIL}. Related pages: <Link to="/methods">Methods &amp; trust</Link>,{" "}
          <Link to="/disclaimer">educational disclaimer</Link>.
        </p>
      </section>
    </div>
  );
}

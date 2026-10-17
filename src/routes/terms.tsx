import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHead } from "@/components/immune/ui";
import { FLAGSHIP_NAME, pageTitle, PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/terms")({
  head: () => seoHead({ title: pageTitle("Terms"), description: `Terms of use for the ${PRODUCT_NAME} educational beta and ${FLAGSHIP_NAME} atlas.`, path: "/terms" }),
  component: Terms,
});

function Terms() {
  return (
    <div className="page marketing-page">
      <PageHead
        kicker="Trust"
        title="Terms of use"
        lede={`By using ${PRODUCT_NAME} you agree to use the educational beta responsibly and in line with the educational disclaimer.`}
      />
      <section className="section">
        <h2>Licence to use</h2>
        <p>
          You may explore the public site and atlas for personal learning, teaching preparation and non-clinical research
          exploration. You may not represent outputs as clinical advice, regulatory approval or validated scientific
          findings unless independently verified.
        </p>
      </section>
      <section className="section">
        <h2>Content and accuracy</h2>
        <p>
          Graph content, simulations and AI-assisted text may be incomplete, simplified or unreviewed. Draft material is
          labelled. See <Link to="/methods">Methods &amp; trust</Link> and the{" "}
          <Link to="/disclaimer">educational disclaimer</Link>.
        </p>
      </section>
      <section className="section">
        <h2>Accounts and curation</h2>
        <p>
          Curation access is restricted to provisioned admin roles. You must not attempt to bypass access controls or
          submit fabricated identifiers as evidence.
        </p>
      </section>
      <section className="section">
        <h2>Changes</h2>
        <p>
          We may update these terms as the beta evolves. Continued use after changes constitutes acceptance of the
          revised terms where permitted by law.
        </p>
      </section>
    </div>
  );
}

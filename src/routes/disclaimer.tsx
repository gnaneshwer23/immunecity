import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHead } from "@/components/immune/ui";
import { FLAGSHIP_NAME, pageTitle, PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/disclaimer")({
  head: () => seoHead({ title: pageTitle("Educational disclaimer"), description: `${PRODUCT_NAME} is an educational scientific exploration beta — not clinical decision support or patient-specific advice.`, path: "/disclaimer" }),
  component: Disclaimer,
});

function Disclaimer() {
  return (
    <div className="page marketing-page">
      <PageHead
        kicker="Trust"
        title="Educational disclaimer"
        lede={`${PRODUCT_NAME} and ${FLAGSHIP_NAME} are for learning, teaching and research exploration with references — not for diagnosing, treating or managing individual patients.`}
      />
      <section className="section">
        <h2>What this product is</h2>
        <p>
          An educational beta that connects immunology concepts in a curated causal knowledge graph, with illustrative
          mechanism walks and Ask responses that retrieve graph context and reviewed citations when present.
        </p>
      </section>
      <section className="section">
        <h2>What this product is not</h2>
        <ul>
          <li>Not a medical device or clinical decision support system.</li>
          <li>Not a source of diagnosis, prescribing advice or personalised treatment recommendations.</li>
          <li>Not a claim that every graph link is reviewed or that AI answers are fully evidence-grounded.</li>
          <li>Not validated clinical software; Patient and Therapy layers are educational explorations only.</li>
        </ul>
      </section>
      <section className="section">
        <h2>Evidence and drafts</h2>
        <p>
          Some relationships remain unreviewed. Draft extensions are labelled. For how citations attach to claims, see{" "}
          <Link to="/methods">Methods &amp; trust</Link> and <Link to="/evidence">Evidence coverage</Link>.
        </p>
      </section>
    </div>
  );
}

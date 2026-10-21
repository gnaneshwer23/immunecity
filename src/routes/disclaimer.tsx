import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHead } from "@/components/immune/ui";
import { PageToc, Section } from "@/components/immune/page";

const TOC = [
  { id: "what-this-product-is", label: "What this product is" },
  { id: "what-this-product-is-not", label: "What this product is not" },
  { id: "evidence-and-drafts", label: "Evidence and drafts" },
];
import { FLAGSHIP_NAME, pageTitle, PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/disclaimer")({
  head: () => seoHead({ title: pageTitle("Educational disclaimer"), description: `${PRODUCT_NAME} is an educational scientific exploration resource — not clinical decision support or patient-specific advice.`, path: "/disclaimer" }),
  component: Disclaimer,
});

function Disclaimer() {
  return (
    <div className="page marketing-page">
      <PageHead
        kicker="Trust · Educational disclaimer"
        title="Educational disclaimer"
        lede={`${PRODUCT_NAME} and ${FLAGSHIP_NAME} support learning, teaching and research exploration with references — not diagnosing, treating or managing individual patients.`}
      />
      <PageToc items={TOC} />
      <Section id="what-this-product-is" n={1} title="What this product is">
        <p>
          An educational resource that connects immunology concepts in a curated causal knowledge graph, with
          illustrative mechanism walks and Ask responses that retrieve graph context and reviewed citations when present.
        </p>
      </Section>
      <Section id="what-this-product-is-not" n={2} title="What this product is not">
        <ul>
          <li>Not a medical device or clinical decision support system.</li>
          <li>Not a source of diagnosis, prescribing advice or personalised treatment recommendations.</li>
          <li>Not a claim that every graph link is reviewed or that AI answers are fully evidence-grounded.</li>
          <li>Not validated clinical software; Patient and Therapy layers are educational explorations only.</li>
        </ul>
      </Section>
      <Section id="evidence-and-drafts" n={3} title="Evidence and drafts">
        <p>
          Some relationships remain unreviewed. Draft extensions are labelled. For how citations attach to claims, see{" "}
          <Link to="/methods">Evidence &amp; Methods</Link> and <Link to="/evidence">Evidence coverage</Link>.
        </p>
      </Section>
    </div>
  );
}

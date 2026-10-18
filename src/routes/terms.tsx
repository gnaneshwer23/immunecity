import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHead } from "@/components/immune/ui";
import { PageToc, Section } from "@/components/immune/page";

const TOC = [
  { id: "licence-to-use", label: "Licence to use" },
  { id: "content-and-accuracy", label: "Content and accuracy" },
  { id: "accounts-and-curation", label: "Accounts and curation" },
  { id: "changes", label: "Changes" },
];
import { FLAGSHIP_NAME, pageTitle, PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/terms")({
  head: () => seoHead({ title: pageTitle("Terms"), description: `Terms of use for the ${PRODUCT_NAME} educational beta and ${FLAGSHIP_NAME} atlas.`, path: "/terms" }),
  component: Terms,
});

function Terms() {
  return (
    <div className="page marketing-page">
      <PageHead
        kicker="Trust · Terms of use"
        title="Terms of use"
        lede={`By using ${PRODUCT_NAME} you agree to use the educational beta responsibly and in line with the educational disclaimer.`}
      />
      <PageToc items={TOC} />
      <Section id="licence-to-use" n={1} title="Licence to use">
        <p>
          You may explore the public site and atlas for personal learning, teaching preparation and non-clinical research
          exploration. You may not represent outputs as clinical advice, regulatory approval or validated scientific
          findings unless independently verified.
        </p>
      </Section>
      <Section id="content-and-accuracy" n={2} title="Content and accuracy">
        <p>
          Graph content, simulations and AI-assisted text may be incomplete, simplified or unreviewed. Draft material is
          labelled. See <Link to="/methods">Methods &amp; trust</Link> and the{" "}
          <Link to="/disclaimer">educational disclaimer</Link>.
        </p>
      </Section>
      <Section id="accounts-and-curation" n={3} title="Accounts and curation">
        <p>
          Curation access is restricted to provisioned admin roles. You must not attempt to bypass access controls or
          submit fabricated identifiers as evidence.
        </p>
      </Section>
      <Section id="changes" n={4} title="Changes">
        <p>
          We may update these terms as the beta evolves. Continued use after changes constitutes acceptance of the
          revised terms where permitted by law.
        </p>
      </Section>
    </div>
  );
}

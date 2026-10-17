import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHead } from "@/components/immune/ui";
import { CONTACT_EMAIL, pageTitle, PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/privacy")({
  head: () => seoHead({ title: pageTitle("Privacy"), description: `Privacy notice for ${PRODUCT_NAME}: what we collect for the educational beta and collaboration enquiries.`, path: "/privacy" }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="page marketing-page">
      <PageHead
        kicker="Trust"
        title="Privacy"
        lede="This notice describes information handled by the public educational beta and collaboration pages. It is not legal advice."
      />
      <section className="section">
        <h2>What we process</h2>
        <ul>
          <li>
            <b>Account and curation (admins).</b> If you sign in for citation curation, authentication and role data are
            handled by Neon Auth; curation records and role data use the configured Neon database. Curation writes are admin-gated.
          </li>
          <li>
            <b>Ask usage.</b> Questions and retrieved graph context are sent to the configured AI service: Lovable's AI
            gateway or OpenAI. The app does not save chat history to its evidence database. Provider and hosting logs
            may have separate retention policies; no promise of zero retention is made. Do not submit patient-identifiable information.
          </li>
          <li>
            <b>Collaborate form.</b> Enquiries open your email client to {CONTACT_EMAIL}; we process what you choose to
            send. Do not include patient details or confidential research data.
          </li>
          <li>
            <b>Technical logs.</b> Hosting and error reporting may retain standard request metadata needed to operate
            and secure the service.
          </li>
        </ul>
      </section>
      <section className="section">
        <h2>Browser storage and external services</h2>
        <p>Research drafts saved by you and Academy progress remain in this browser's storage until cleared.
          Fonts are requested from Fontshare and Google Fonts; those services receive standard request metadata.
          Protein and trial lookups use UniProt and ClinicalTrials.gov. Hosting and optional preview error reporting use Lovable.</p>
        <p>For details of the responsible operator, applicable data rights and retention periods, contact {CONTACT_EMAIL}.
          These operational details require confirmation by the operator before a broader production launch.</p>
      </section>
      <section className="section">
        <h2>What we ask you not to send</h2>
        <p>
          Do not upload or type patient-identifiable data, clinical notes or confidential proprietary datasets into Ask,
          the workbench or collaboration messages.
        </p>
      </section>
      <section className="section">
        <h2>Contact</h2>
        <p>
          Privacy questions: {CONTACT_EMAIL}. Also see the <Link to="/disclaimer">educational disclaimer</Link> and{" "}
          <Link to="/terms">terms</Link>.
        </p>
      </section>
    </div>
  );
}

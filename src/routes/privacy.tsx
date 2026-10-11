import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHead } from "@/components/immune/ui";
import { CONTACT_EMAIL, pageTitle, PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: pageTitle("Privacy") },
      {
        name: "description",
        content: `Privacy notice for ${PRODUCT_NAME}: what we collect for the educational beta and collaboration enquiries.`,
      },
    ],
  }),
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
            handled by the configured auth provider; curation writes are admin-gated.
          </li>
          <li>
            <b>Ask usage.</b> Questions may be processed by server-side Ask endpoints subject to rate limits and
            guardrails. Do not submit patient-identifiable information.
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

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { PageHead } from "@/components/immune/ui";
import { Button } from "@/components/ui/button";
import { CAPABILITY_STATUS_LABEL, featuresForPage } from "@/data/capabilityStatus";
import { pageTitle, PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/scientific-ai")({
  head: () => ({
    meta: [
      { title: `Scientific AI for Immunology | ${PRODUCT_NAME}` },
      {
        name: "description",
        content:
          "Explore how evidence-aware AI, graph reasoning and research workflows can support immunology exploration.",
      },
      { property: "og:title", content: `Scientific AI for Immunology | ${PRODUCT_NAME}` },
    ],
  }),
  component: ScientificAi,
});

function ScientificAi() {
  const features = featuresForPage("scientific-ai").concat(
    featuresForPage("research").filter((f) => f.id === "research-workbench"),
  );

  return (
    <div className="page marketing-page">
      <PageHead
        kicker="Scientific AI"
        title="AI that works through the biology—not around it."
        lede="We are developing AI workflows that use structured immunology knowledge, scientific evidence and inspectable mechanisms to help people explore questions and organise research. Outputs are limited by the available graph, evidence and validation."
      />

      <section className="section">
        <h2>How we talk about AI safely</h2>
        <ul>
          <li>
            Prefer <b>AI-assisted scientific exploration</b> over “superintelligent discovery.”
          </li>
          <li>
            Model-generated ideas are <b>candidate hypotheses</b> — show alternatives and disconfirming evidence where
            available.
          </li>
          <li>Show graph release, retrieved relationships, source IDs and tool versions where available.</li>
          <li>
            We do not claim clinical validation, experimental confirmation or superior discovery performance without
            measured evidence.
          </li>
        </ul>
      </section>

      <section className="section">
        <h2>Capability status</h2>
        <div className="home-status-grid" style={{ gridTemplateColumns: "1fr" }}>
          <div className="home-status-col">
            <ul>
              {features.map((f) => (
                <li key={f.id}>
                  <Link to={f.relatedAppRoute as "/reasoning"}>
                    {f.name}
                  </Link>{" "}
                  <span className={`cap-badge status-${f.status}`}>{CAPABILITY_STATUS_LABEL[f.status]}</span>
                  <span>{f.description}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section bio-banner" style={{ marginTop: 28 }}>
        <div>
          <h2 style={{ margin: 0 }}>See the approach in the atlas</h2>
          <p style={{ marginTop: 10 }}>
            Ask retrieves from the graph; the workbench organises candidates; the model registry documents planned
            adapters that return not_available until wired.
          </p>
        </div>
        <div className="bio-actions" style={{ marginTop: 0 }}>
          <Button asChild className="bio-primary">
            <Link to="/reasoning">
              Open Reasoning <ArrowUpRight />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="bio-secondary">
            <Link to="/research">Research workbench</Link>
          </Button>
          <Button asChild variant="ghost" className="bio-secondary">
            <Link to="/methods">Read the methods</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

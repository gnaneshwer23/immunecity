import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { PageHead } from "@/components/immune/ui";
import { Button } from "@/components/ui/button";
import { CAPABILITY_STATUS_LABEL, featuresForPage, type CapabilityStatus } from "@/data/capabilityStatus";
import { PRODUCT_NAME } from "@/lib/brand";
import { prepareAsk } from "@/lib/askGrounding";
import { byId } from "@/lib/immune/engine";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/scientific-ai")({
  head: () =>
    seoHead({
      title: `Scientific AI for Immunology | ${PRODUCT_NAME}`,
      description:
        "Explore how evidence-aware AI, graph reasoning and research workflows can support immunology exploration — educating with references, not clinical advice.",
      path: "/scientific-ai",
    }),
  component: ScientificAi,
});

const DEMO_QUESTION = "How does TNF connect macrophages to rheumatoid arthritis?";

const STATUS_ORDER: CapabilityStatus[] = ["beta", "partial", "in_development", "planned"];

function WorkingExample() {
  // Browser-safe retrieval only — no model call, no invented PMIDs.
  const prepared = prepareAsk(DEMO_QUESTION);
  const { grounding } = prepared;
  const links = grounding.links.slice(0, 6);
  const concepts = grounding.nodes.slice(0, 6);

  return (
    <section className="section" aria-labelledby="sai-demo-heading">
      <h2 id="sai-demo-heading">One working retrieval example</h2>
      <p>
        This demo runs the same graph retrieval Ask uses before any model synthesis. It does not call the language
        model and does not invent sources. Status: Ask remains <b>{CAPABILITY_STATUS_LABEL.partial}</b> — graph-retrieved
        teaching, not fully evidence-grounded AI.
      </p>
      <div className="sai-demo">
        <h3>Question</h3>
        <p className="sai-demo-q">{DEMO_QUESTION}</p>
        <div className="sai-demo-lists">
          <div>
            <h4>Retrieved concepts</h4>
            <ul>
              {concepts.length ? (
                concepts.map((n) => (
                  <li key={n.id}>
                    <Link to="/graph" search={{ focus: n.id }}>
                      {n.name}
                    </Link>{" "}
                    <span className="xs muted">({n.id}{n.draft ? " · draft" : ""})</span>
                  </li>
                ))
              ) : (
                <li className="muted">No concept match for this question.</li>
              )}
            </ul>
          </div>
          <div>
            <h4>Retrieved relationships</h4>
            <ul>
              {links.length ? (
                links.map((l) => {
                  const subj = byId[l.subjectId];
                  const obj = byId[l.objectId];
                  return (
                    <li key={l.relId}>
                      <Link to="/graph" search={{ focus: l.subjectId }}>
                        {subj?.name ?? l.subjectId} {l.relation} {obj?.name ?? l.objectId}
                      </Link>
                      <br />
                      <span className={`badge rs rs-${l.review}`}>{l.reviewLabel}</span>
                      {l.reviewedPmids.length ? (
                        <span className="xs muted"> · reviewed PMID(s) when mapped: {l.reviewedPmids.join(", ")}</span>
                      ) : (
                        <span className="xs muted"> · no approved claim cite on this edge in this retrieval</span>
                      )}
                    </li>
                  );
                })
              ) : (
                <li className="muted">No relationships retrieved.</li>
              )}
            </ul>
          </div>
        </div>
        <p className="sai-demo-limits">
          Limitations: query class <code>{grounding.queryClass}</code> · graph snapshot{" "}
          <code>{grounding.trace.graphSnapshot}</code> · prompt <code>{grounding.trace.promptVersion}</code>. Without
          live Neon cites in this static render, reviewed PMID counts may be empty even when production has approved
          rows — open <Link to="/reasoning">Reasoning / Ask</Link> for the live path. Model adapters and omics remain
          planned stubs.
        </p>
      </div>
    </section>
  );
}

function ScientificAi() {
  const features = [
    ...featuresForPage("scientific-ai"),
    ...featuresForPage("research").filter((f) => f.id === "research-workbench"),
  ];

  const byBucket = STATUS_ORDER.map((status) => ({
    status,
    items: features.filter((f) => f.status === status),
  })).filter((b) => b.items.length);

  return (
    <div className="page marketing-page">
      <PageHead
        kicker="Scientific AI"
        title="AI that works through the biology—not around it."
        lede="We are developing AI workflows that use structured immunology knowledge, scientific evidence and inspectable mechanisms to help people explore questions and organise research. Outputs are limited by the available graph, evidence and validation."
      />

      <WorkingExample />

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
        <p className="small muted">Buckets match the maintained capability registry — Ask, literature workflows, workbench and model adapters.</p>
        <div className="home-status-grid sci-ai-status">
          {byBucket.map(({ status, items }) => (
            <div key={status} className="home-status-col">
              <h3>{CAPABILITY_STATUS_LABEL[status]}</h3>
              <ul>
                {items.map((f) => (
                  <li key={f.id}>
                    <Link to={f.relatedAppRoute as "/reasoning"}>{f.name}</Link>{" "}
                    <span className={`cap-badge status-${f.status}`}>{CAPABILITY_STATUS_LABEL[f.status]}</span>
                    <span>{f.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Ask entry</h2>
        <p>
          Use the Ask control on any page (or open Reasoning) to run graph-retrieved teaching. Models for omics and
          molecular prediction remain planned — dry-runs report not available and never invent scores.
        </p>
      </section>

      <section className="section mkt-banner" aria-labelledby="sai-cta">
        <div>
          <h2 id="sai-cta">Try Ask on a real question</h2>
          <p>
            Ask retrieves from the graph; the workbench organises candidates; planned model adapters stay unavailable
            until wired and tested.
          </p>
        </div>
        <div className="bio-actions">
          <Button asChild className="bio-primary">
            <Link to="/reasoning">
              Open Ask / Reasoning <ArrowUpRight />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="bio-secondary">
            <Link to="/research">Research workbench</Link>
          </Button>
          <Button asChild variant="ghost" className="bio-secondary">
            <Link to="/methods">Evidence &amp; Methods</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

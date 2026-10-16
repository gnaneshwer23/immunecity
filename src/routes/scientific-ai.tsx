import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingBody, MarketingCta, MarketingHero, MarketingSection, StatusChip } from "@/components/immune/marketing";
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

function ResearchWorkspace() {
  const prepared = prepareAsk(DEMO_QUESTION);
  const { grounding } = prepared;
  const links = grounding.links.slice(0, 6);
  const concepts = grounding.nodes.slice(0, 6);
  const withPmid = links.filter((l) => l.reviewedPmids.length > 0);

  return (
    <div className="mkt-workspace" aria-label="Ask retrieval workspace demo">
      <div className="mkt-workspace-bar">
        <span className="mkt-workspace-kicker">Retrieval workspace · no model call</span>
        <StatusChip label={CAPABILITY_STATUS_LABEL.partial} tone="warn" />
      </div>

      <div className="mkt-workspace-q">
        <span className="mkt-workspace-label">Question</span>
        <p>{DEMO_QUESTION}</p>
      </div>

      <div className="mkt-workspace-grid">
        <section className="mkt-workspace-panel">
          <h3>Retrieved concepts</h3>
          {concepts.length ? (
            <ul>
              {concepts.map((n) => (
                <li key={n.id}>
                  <Link to="/graph" search={{ focus: n.id }}>
                    {n.name}
                  </Link>
                  <span>
                    {n.id}
                    {n.draft ? " · draft" : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mkt-empty">No concept match for this question.</p>
          )}
        </section>

        <section className="mkt-workspace-panel">
          <h3>Relationships</h3>
          {links.length ? (
            <ul>
              {links.map((l) => {
                const subj = byId[l.subjectId];
                const obj = byId[l.objectId];
                return (
                  <li key={l.relId}>
                    <Link to="/graph" search={{ focus: l.subjectId }}>
                      {subj?.name ?? l.subjectId} {l.relation} {obj?.name ?? l.objectId}
                    </Link>
                    <span className={`badge rs rs-${l.review}`}>{l.reviewLabel}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mkt-empty">No relationships retrieved.</p>
          )}
        </section>

        <section className="mkt-workspace-panel">
          <h3>Sources &amp; evidence status</h3>
          {withPmid.length ? (
            <ul>
              {withPmid.map((l) => (
                <li key={`src-${l.relId}`}>
                  <span>Reviewed PMID(s): {l.reviewedPmids.join(", ")}</span>
                  <span className={`badge rs rs-${l.review}`}>{l.reviewLabel}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mkt-empty">
              No approved claim cites on these edges in this static retrieval. Open Reasoning for the live Ask path —
              empty here is not proof that production has zero cites.
            </p>
          )}
        </section>

        <section className="mkt-workspace-panel mkt-workspace-limits">
          <h3>Limitations</h3>
          <ul className="mkt-limit-list">
            <li>
              Query class <code>{grounding.queryClass}</code>
            </li>
            <li>
              Graph snapshot <code>{grounding.trace.graphSnapshot}</code>
            </li>
            <li>
              Prompt <code>{grounding.trace.promptVersion}</code>
            </li>
            <li>Ask remains graph-retrieved teaching — not fully evidence-grounded AI.</li>
            <li>Omics / molecular model adapters remain planned stubs and never invent scores.</li>
          </ul>
        </section>
      </div>
    </div>
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
    <div className="mkt-page">
      <MarketingHero
        eyebrow="Scientific AI"
        title="AI that works through the biology—not around it."
        lede="Workflows use structured immunology knowledge, scientific evidence and inspectable mechanisms. Outputs are limited by the available graph, evidence and validation — not marketed as autonomous discovery."
        actions={
          <>
            <Button asChild className="bio-primary">
              <Link to="/reasoning">
                Open Ask / Reasoning <ArrowUpRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="bio-secondary">
              <Link to="/research">Research workbench</Link>
            </Button>
          </>
        }
        foot={`Ask status: ${CAPABILITY_STATUS_LABEL.partial} · candidate hypotheses stay drafts until human review`}
      />

      <MarketingBody>
        <MarketingSection
          id="workspace"
          eyebrow="01 / RETRIEVAL WORKSPACE"
          title="Question → graph context → evidence status."
          lede="This demo runs the same browser-safe retrieval Ask uses before any model synthesis. It does not call the language model and does not invent sources."
        >
          <ResearchWorkspace />
        </MarketingSection>

        <MarketingSection
          id="safety"
          eyebrow="02 / HOW WE TALK ABOUT AI"
          title="Prefer exploration language over hype."
        >
          <ul className="mkt-principle-list">
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
        </MarketingSection>

        <MarketingSection
          id="capability"
          eyebrow="03 / CAPABILITY REGISTRY"
          title="What is wired today."
          lede="Buckets match the maintained capability list — not hard-coded marketing claims."
        >
          <div className="mkt-cap-grid">
            {byBucket.map(({ status, items }) => (
              <div key={status} className="mkt-cap-col">
                <h3>{CAPABILITY_STATUS_LABEL[status]}</h3>
                <ul>
                  {items.map((f) => (
                    <li key={f.id}>
                      <Link to={f.relatedAppRoute as "/reasoning"}>{f.name}</Link>
                      <span>{f.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </MarketingSection>

        <MarketingCta
          title="Try Ask on a real question."
          lede="Ask retrieves from the graph; the workbench organises candidates; planned model adapters stay unavailable until wired and tested."
        >
          <Button asChild className="bio-primary">
            <Link to="/reasoning">
              Open Ask / Reasoning <ArrowUpRight />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="bio-secondary">
            <Link to="/methods">Evidence &amp; Methods</Link>
          </Button>
        </MarketingCta>
      </MarketingBody>
    </div>
  );
}

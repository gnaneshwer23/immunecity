import { Link } from "@tanstack/react-router";
import { StatusChip } from "@/components/immune/marketing";
import { CAPABILITY_STATUS_LABEL, featuresForPage, type CapabilityStatus } from "@/data/capabilityStatus";
import { prepareAsk } from "@/lib/askGrounding";
import { byId } from "@/lib/immune/engine";

/** "How the AI works" pieces, shown on the combined Reasoning & AI page. */
const DEMO_QUESTION = "How does TNF connect macrophages to rheumatoid arthritis?";

const STATUS_ORDER: CapabilityStatus[] = ["beta", "partial", "in_development", "planned"];

export function ResearchWorkspace() {
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
              No approved claim cites on these edges in this static retrieval. Use Ask above for the live path —
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
            <li>
              Ask Immune remains graph-retrieved teaching with provisional lit labelled, fail-closed citation checks,
              and a separate counterevidence bucket — not fully evidence-grounded AI.
            </li>
            <li>Molecular model adapters are planned only and never invent scores.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}


export function AiPrinciples() {
  return (
    <ul className="mkt-principle-list">
      <li>Prefer <b>AI-assisted scientific exploration</b> over “superintelligent discovery.”</li>
      <li>
        Model-generated ideas are <b>candidate hypotheses</b> — show alternatives and disconfirming evidence where
        curated; never invent counterevidence when Neon has none.
      </li>
      <li>Show graph release, retrieved relationships, source IDs and tool versions where available.</li>
      <li>
        Fail closed on invented citation IDs, overclaims of reviewed support, and unlabelled provisional literature — do not pad
        support gaps.
      </li>
      <li>We do not claim clinical validation, experimental confirmation or superior discovery performance without measured evidence.</li>
    </ul>
  );
}

export function CapabilityRegistry() {
  const features = [
    ...featuresForPage("scientific-ai"),
    ...featuresForPage("research").filter((f) => f.id === "research-workbench"),
  ];
  const byBucket = STATUS_ORDER.map((status) => ({ status, items: features.filter((f) => f.status === status) })).filter((b) => b.items.length);
  return (
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
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHead } from "@/components/immune/ui";
import { IMPLEMENTATION_PHASES } from "@/data/implementation-phases";
import { graphReleaseLabel, graphReleaseSnapshot } from "@/lib/immune/graphRelease";
import {
  EXEMPLAR_MATURITY_LABEL,
  EXEMPLAR_PATHWAYS,
  reportExemplar,
} from "@/lib/immune/exemplarPathways";
import { pageTitle, FLAGSHIP_NAME, PRODUCT_NAME } from "@/lib/brand";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/insights")({
  head: () =>
    seoHead({
      title: pageTitle("Insights"),
      description: `Build notes, methods context and honest capability status for ${PRODUCT_NAME} and ${FLAGSHIP_NAME} — not generic AI news.`,
      path: "/insights",
    }),
  component: Insights,
});

/** Source-linked mechanism explainers prepared from exemplars — unpublished until reviewed. */
const DRAFT_EXPLAINERS = EXEMPLAR_PATHWAYS.map((pathway) => {
  const report = reportExemplar(pathway);
  return {
    id: `draft-${pathway.id}`,
    title: pathway.title,
    purpose: pathway.purpose,
    maturity: report.maturity,
    maturityLabel: EXEMPLAR_MATURITY_LABEL[report.maturity],
    note: pathway.notes[0] ?? "",
    published: false as const,
  };
});

function Insights() {
  const snap = graphReleaseSnapshot();
  return (
    <div className="page marketing-page">
      <PageHead
        kicker="Science · Draft series"
        title="Insights"
        lede="Explainers, methods notes and release context tied to the live graph — every note should link back to a path, lesson or methods statement. Full editorial series will grow as reviewed content is ready; we do not publish unverified scientific claims here. This destination stays out of primary navigation until the series is ready."
      />

      <section className="section">
        <h2>Build note — current release</h2>
        <p>
          <b>{graphReleaseLabel(snap)}</b> · snapshot <code>{snap.snapshotAt}</code>. Core graph v{snap.coreVersion}:{" "}
          {snap.coreNodes} concepts / {snap.coreRelationships} links. Extensions {snap.extensionsVersion} add{" "}
          {snap.draftNodes} draft concepts / {snap.draftRelationships} draft links. Drafts stay labelled and are never
          counted as approved evidence.
        </p>
        {snap.versionNotes ? <p className="small muted">{snap.versionNotes}</p> : null}
        <p>
          Same counts appear on the homepage footer and <Link to="/methods">Methods &amp; trust</Link>. Explore the
          platform at <Link to="/overview">{FLAGSHIP_NAME} overview</Link>.
        </p>
      </section>

      <section className="section">
        <h2>Draft mechanism explainers (unpublished)</h2>
        <p>
          Three source-linked explainers prepared from maintained exemplar pathways. They remain{" "}
          <b>draft / unpublished</b> until editorial review — Insights stays secondary until useful reviewed content
          ships. Follow the graph links; do not treat these blurbs as finished articles.
        </p>
        <div className="insight-drafts">
          {DRAFT_EXPLAINERS.map((d) => (
            <article key={d.id} className="insight-draft">
              <span className="badge rs rs-draft">Draft · unpublished</span>
              <h3>{d.title}</h3>
              <p className="small muted">{d.purpose}</p>
              <p className="xs">
                Exemplar maturity: {d.maturityLabel}
                {d.note ? ` — ${d.note}` : ""}
              </p>
              <p className="xs" style={{ marginTop: 8 }}>
                <Link to="/overview">Platform exemplars</Link>
                {" · "}
                <Link to="/methods">Methods</Link>
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Methods notes worth reading first</h2>
        <ul>
          <li>
            <Link to="/methods">How the graph and evidence lifecycle work</Link> — provenance, review statuses and
            limitations.
          </li>
          <li>
            <Link to="/evidence">Evidence coverage</Link> — relationship-level support, not concept-level inflation.
          </li>
          <li>
            <Link to="/disclaimer">Educational disclaimer</Link> — teaching with references, not patient-specific
            advice.
          </li>
        </ul>
      </section>

      <section className="section">
        <h2>Implementation track status</h2>
        <p>
          Phases B–E from the maintained implementation list — partial means shipped interfaces with honest gaps, not
          finished science.
        </p>
        <ul>
          {IMPLEMENTATION_PHASES.map((p) => (
            <li key={p.id}>
              <b>
                Phase {p.id}: {p.title}
              </b>{" "}
              — <span className={`cap-badge status-${p.status}`}>{p.status.replace("_", " ")}</span>
              <br />
              <span className="small muted">{p.notes}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

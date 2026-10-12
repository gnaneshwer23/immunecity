import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHead } from "@/components/immune/ui";
import { IMPLEMENTATION_PHASES } from "@/data/implementation-phases";
import { graphReleaseLabel, graphReleaseSnapshot } from "@/lib/immune/graphRelease";
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

function Insights() {
  const snap = graphReleaseSnapshot();
  return (
    <div className="page marketing-page">
      <PageHead
        kicker="Science"
        title="Insights"
        lede="Explainers, methods notes and release context tied to the live graph — every note should link back to a path, lesson or methods statement. Full editorial series will grow as reviewed content is ready; we do not publish unverified scientific claims here."
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

      <section className="section">
        <h2>Content series (planned)</h2>
        <p>
          Mechanism explainers, evidence notes, research pathway walkthroughs and deeper build notes will appear here
          only when linked to reviewed graph relationships or explicit methods statements. Until then, use the live
          atlas layers and Methods page as the source of truth.
        </p>
      </section>
    </div>
  );
}

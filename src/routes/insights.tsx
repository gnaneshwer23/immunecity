import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { IMPLEMENTATION_PHASES } from "@/data/implementation-phases";
import { graphReleaseLabel, graphReleaseSnapshot } from "@/lib/immune/graphRelease";
import { approvedQuery } from "@/lib/citations.functions";
import {
  EXEMPLAR_MATURITY_LABEL,
  EXEMPLAR_PATHWAYS,
  reportExemplar,
} from "@/lib/immune/exemplarPathways";
import { pageTitle, FLAGSHIP_NAME, PRODUCT_NAME } from "@/lib/brand";
import { seoHead } from "@/lib/seo";
import { MarketingBody, MarketingHero, MarketingSection, StatusChip } from "@/components/immune/marketing";

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
  const { data: approvedCites = [], isPending, isError } = useQuery(approvedQuery);
  const draftExplainers = EXEMPLAR_PATHWAYS.map((pathway) => {
    const report = reportExemplar(pathway, approvedCites);
    return {
      id: `draft-${pathway.id}`,
      title: pathway.title,
      purpose: pathway.purpose,
      maturityLabel: isPending
        ? "Loading live review status…"
        : isError
          ? "Evidence service unavailable"
          : EXEMPLAR_MATURITY_LABEL[report.maturity],
      note: pathway.notes[0] ?? "",
    };
  });
  return (
    <div className="mkt-page">
      <MarketingHero
        eyebrow="Science · Draft series"
        title="Insights"
        lede="Explainers, methods notes and release context tied to the live graph. Full editorial series will grow as reviewed content is ready — this destination stays out of primary navigation until then."
        foot="Draft / unpublished · not primary navigation · no unverified scientific claims"
      />

      <MarketingBody>
        <MarketingSection
          id="release"
          eyebrow="01 / BUILD NOTE"
          title="Current release context."
        >
          <p className="mkt-prose">
            <b>{graphReleaseLabel(snap)}</b> · snapshot <code>{snap.snapshotAt}</code>. Core graph v{snap.coreVersion}:{" "}
            {snap.coreNodes} concepts / {snap.coreRelationships} links. Extensions {snap.extensionsVersion} add{" "}
            {snap.draftNodes} draft concepts / {snap.draftRelationships} draft links. Drafts stay labelled and are never
            counted as approved evidence.
          </p>
          {snap.versionNotes ? <p className="mkt-aside">{snap.versionNotes}</p> : null}
          <p className="mkt-aside">
            Same counts appear on the homepage footer and <Link to="/methods">Methods</Link>. Explore{" "}
            <Link to="/overview">{FLAGSHIP_NAME}</Link>.
          </p>
        </MarketingSection>

        <MarketingSection
          id="drafts"
          eyebrow="02 / DRAFT EXPLAINERS"
          title="Unpublished — not finished articles."
          lede="Prepared from maintained exemplar pathways. Remain draft until editorial review."
        >
          <div className="insight-drafts">
            {draftExplainers.map((d) => (
              <article key={d.id} className="insight-draft">
                <StatusChip label="Draft · unpublished" tone="warn" />
                <h3>{d.title}</h3>
                <p>{d.purpose}</p>
                <p className="mkt-aside">
                  Exemplar maturity: {d.maturityLabel}
                  {d.note && !isPending && !isError ? ` — ${d.note}` : ""}
                </p>
                <p className="mkt-aside">
                  <Link to="/overview">Platform exemplars</Link>
                  {" · "}
                  <Link to="/methods">Methods</Link>
                </p>
              </article>
            ))}
          </div>
        </MarketingSection>

        <MarketingSection id="read-first" eyebrow="03 / READ FIRST" title="Methods before headlines.">
          <ul className="mkt-principle-list">
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
        </MarketingSection>

        <MarketingSection
          id="phases"
          eyebrow="04 / IMPLEMENTATION"
          title="Phase status from the maintained list."
          lede="Partial means shipped interfaces with honest gaps — not finished science."
        >
          <ul className="mkt-phase-list">
            {IMPLEMENTATION_PHASES.map((p) => (
              <li key={p.id}>
                <span className={`cap-badge status-${p.status}`}>{p.status.replace("_", " ")}</span>
                <strong>
                  Phase {p.id}: {p.title}
                </strong>
                <span>{p.notes}</span>
              </li>
            ))}
          </ul>
        </MarketingSection>
      </MarketingBody>
    </div>
  );
}

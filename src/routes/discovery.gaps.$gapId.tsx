import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/immune/ui";
import { Section } from "@/components/immune/page";
import { PRODUCT_NAME } from "@/lib/brand";
import { detectDiscoveryCandidates } from "@/lib/discovery/detect";
import { getDiscoveryGap } from "@/lib/discovery/gaps.functions";
import { recommendGapsForProfile } from "@/lib/discovery/recommend";
import type { ResearchGapCandidate } from "@/lib/discovery/types";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/discovery/gaps/$gapId")({
  head: ({ params }) =>
    seoHead({
      title: `Gap ${params.gapId} | ${PRODUCT_NAME}`,
      description: "Research gap dossier with ISI search scope, Atlas/Ask/Workbench links. Educational/research — not CDS.",
      path: `/discovery/gaps/${params.gapId}`,
    }),
  component: DiscoveryGapDossierPage,
});

function DiscoveryGapDossierPage() {
  const { gapId } = Route.useParams();
  const load = useServerFn(getDiscoveryGap);
  const fallback = detectDiscoveryCandidates().find((g) => g.gapKey === gapId) ?? null;
  const [gap, setGap] = useState<ResearchGapCandidate | null>(fallback);
  const [persistedStatus, setPersistedStatus] = useState<string | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancel = false;
    load({ data: { gapKey: gapId } })
      .then((res) => {
        if (cancel) return;
        setGap(res.gap);
        setPersistedStatus(res.persistedStatus);
      })
      .catch((e) => {
        if (!cancel) setErr(e instanceof Error ? e.message : "Gap not found.");
      });
    return () => {
      cancel = true;
    };
  }, [gapId, load]);

  if (!gap && err) {
    return (
      <div className="page">
        <PageHead kicker="Investigate · Research Radar" title="Gap not found" lede={err} />
        <Link to="/discovery/gaps">Back to gaps</Link>
      </div>
    );
  }
  if (!gap) {
    return (
      <div className="page">
        <p className="muted">Loading gap dossier…</p>
      </div>
    );
  }

  const recommend = recommendGapsForProfile([gap], {
    displayLabel: null,
    focusDiseases: gap.diseaseId ? [gap.diseaseId] : ["D012"],
    focusDomains: ["checkpoint"],
    modalities: ["pd1"],
    interests: {},
  })[0];

  return (
    <div className="page">
      <PageHead
        kicker="Investigate · Research Radar"
        title={gap.title}
        lede={gap.summary}
      />
      <p className="small muted">
        Status: <code>{persistedStatus ?? gap.status}</code> · Detection: {gap.detectionSource} · Auto-reviewed:{" "}
        {String(gap.autoReviewed)}
      </p>

      <Section id="why" title="Why it matters" lede="Framed as ISI uncertainty — not clinical advice.">
        <p>{gap.whyItMatters}</p>
      </Section>

      <Section id="scope" title="Documented search scope" lede="Coverage honesty for this candidate.">
        <ul>
          <li>Corpus: {gap.searchScope.corpus}</li>
          <li>Method: {gap.searchScope.method}</li>
          <li>Date scope: {gap.searchScope.dateScope}</li>
          <li>{gap.searchScope.note}</li>
        </ul>
      </Section>

      <Section id="recommended" title="Recommended because…" lede="Stub ranking from profile-shaped interests — not a novelty score.">
        <ul>
          {(recommend?.because ?? []).map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </Section>

      <Section id="links" title="Continue investigating" lede="Reuse Ask, Atlas, Evidence, and Workbench — one knowledge graph.">
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {gap.subjectId ? (
            <Link className="btn sm" to="/atlas/$id" params={{ id: gap.subjectId }}>
              Atlas · subject
            </Link>
          ) : null}
          {gap.objectId ? (
            <Link className="btn sm" to="/atlas/$id" params={{ id: gap.objectId }}>
              Atlas · object
            </Link>
          ) : null}
          <Link className="btn sm" to="/ask">
            Ask Immune
          </Link>
          <Link className="btn sm" to="/evidence">
            Evidence explorer
          </Link>
          <Link className="btn sm" to="/research">
            Research library
          </Link>
          <Link className="btn sm" to="/discovery">
            Radar
          </Link>
        </div>
      </Section>
    </div>
  );
}

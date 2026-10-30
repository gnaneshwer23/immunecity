import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useEffect, useState } from "react";
import { z } from "zod";
import { PageHead } from "@/components/immune/ui";
import { PRODUCT_NAME } from "@/lib/brand";
import { detectDiscoveryCandidates } from "@/lib/discovery/detect";
import { listDiscoveryRadar } from "@/lib/discovery/gaps.functions";
import { shapeRadarFeed, type RadarFeedItem } from "@/lib/discovery/radar";
import { detectionSourceLabel } from "@/lib/uxLanguage";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/discovery/gaps/")({
  validateSearch: zodValidator(
    z.object({
      status: fallback(
        z.enum(["all", "candidate", "coverage_insufficient", "needs_context", "rejected", "reviewed_gap"]),
        "all",
      ).default("all"),
      pilot: fallback(z.enum(["all", "melanoma_a", "coverage_b"]), "all").default("all"),
      source: fallback(
        z.enum(["all", "melanoma_matrix", "evidence_gap", "conflict", "trial_signal"]),
        "all",
      ).default("all"),
    }),
  ),
  head: () =>
    seoHead({
      title: `Research gaps | ${PRODUCT_NAME}`,
      description: "ISI-detected research gap candidates with coverage honesty. Not worldwide literature absence.",
      path: "/discovery/gaps",
    }),
  component: DiscoveryGapsListPage,
});

function DiscoveryGapsListPage() {
  const search = Route.useSearch();
  const listFn = useServerFn(listDiscoveryRadar);
  const seed = shapeRadarFeed(detectDiscoveryCandidates(), {
    filters: { status: search.status, pilot: search.pilot, source: search.source, limit: 100 },
  });
  const [items, setItems] = useState<RadarFeedItem[]>(seed.items);
  const [note, setNote] = useState(seed.note);
  const [persistent, setPersistent] = useState(false);

  useEffect(() => {
    let cancel = false;
    listFn({
      data: {
        status: search.status,
        pilot: search.pilot,
        source: search.source,
        limit: 100,
      },
    })
      .then((res) => {
        if (cancel) return;
        setItems(res.items ?? res.gaps ?? []);
        setNote(res.note);
        setPersistent(Boolean(res.persistent));
      })
      .catch(() => {
        /* keep client seed */
      });
    return () => {
      cancel = true;
    };
  }, [listFn, search.status, search.pilot, search.source]);

  return (
    <div className="page">
      <PageHead
        kicker="Research · Research Radar"
        title="Research gaps"
        lede="Deterministic candidates from the melanoma validation matrix and evidence-gap labels. Zero fabricated papers. Human review required before a candidate becomes a reviewed research gap."
      />
      <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <Link className="btn sm" to="/discovery/gaps" search={{ status: "all", pilot: search.pilot, source: search.source }}>
          All statuses
        </Link>
        <Link
          className="btn sm"
          to="/discovery/gaps"
          search={{ status: "candidate", pilot: search.pilot, source: search.source }}
        >
          Candidate
        </Link>
        <Link
          className="btn sm"
          to="/discovery/gaps"
          search={{ status: "coverage_insufficient", pilot: search.pilot, source: search.source }}
        >
          Coverage insufficient
        </Link>
        <Link
          className="btn sm"
          to="/discovery/gaps"
          search={{ status: search.status, pilot: "melanoma_a", source: search.source }}
        >
          Pilot A
        </Link>
        <Link
          className="btn sm"
          to="/discovery/gaps"
          search={{ status: search.status, pilot: "coverage_b", source: search.source }}
        >
          Pilot B
        </Link>
        <Link
          className="btn sm"
          to="/discovery/gaps"
          search={{ status: search.status, pilot: search.pilot, source: "conflict" }}
        >
          Conflict source
        </Link>
        <Link className="btn sm" to="/discovery">
          Radar home
        </Link>
      </div>
      <p className="small muted">
        {note} · {persistent ? "Saved statuses included" : "New candidates — not yet saved to your workspace"}
      </p>
      <ul className="isi-library-list">
        {items.map((g) => (
          <li key={g.gapKey}>
            <div className="isi-radar-meta">
              <span className="isi-gap-badge" data-tone={g.badge.tone}>
                {g.badge.label}
              </span>
              <span className="small muted">{detectionSourceLabel(g.detectionSource)}</span>
            </div>
            <Link to="/discovery/gaps/$gapId" params={{ gapId: g.gapKey }}>
              <strong>{g.title}</strong>
            </Link>
            <p className="isi-radar-why">{g.whySnippet}</p>
            <details className="ask-research-trace" data-testid="expert-panel">
              <summary className="xs">Technical details</summary>
              <p className="xs mono muted">{g.gapKey}</p>
            </details>
          </li>
        ))}
      </ul>
      {!items.length ? <p className="muted">No gaps for this filter.</p> : null}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { PageHead } from "@/components/immune/ui";
import { PRODUCT_NAME } from "@/lib/brand";
import { detectDiscoveryCandidates } from "@/lib/discovery/detect";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/discovery/gaps")({
  validateSearch: zodValidator(
    z.object({
      status: fallback(z.enum(["all", "candidate", "coverage_insufficient"]), "all").default("all"),
      pilot: fallback(z.enum(["all", "melanoma_a", "coverage_b"]), "all").default("all"),
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
  const gaps = detectDiscoveryCandidates().filter((g) => {
    if (search.status !== "all" && g.status !== search.status) return false;
    if (search.pilot !== "all" && g.pilot !== search.pilot) return false;
    return true;
  });

  return (
    <div className="page">
      <PageHead
        kicker="Investigate · Research Radar"
        title="Research gaps"
        lede="Deterministic candidates from the melanoma validation matrix and evidence-gap labels. Zero fabricated papers. Human review required before reviewed_gap."
      />
      <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <Link className="btn sm" to="/discovery/gaps" search={{ status: "all", pilot: search.pilot }}>
          All statuses
        </Link>
        <Link className="btn sm" to="/discovery/gaps" search={{ status: "candidate", pilot: search.pilot }}>
          Candidate
        </Link>
        <Link
          className="btn sm"
          to="/discovery/gaps"
          search={{ status: "coverage_insufficient", pilot: search.pilot }}
        >
          Coverage insufficient
        </Link>
        <Link className="btn sm" to="/discovery/gaps" search={{ status: search.status, pilot: "melanoma_a" }}>
          Pilot A
        </Link>
        <Link className="btn sm" to="/discovery/gaps" search={{ status: search.status, pilot: "coverage_b" }}>
          Pilot B
        </Link>
      </div>
      <ul className="isi-library-list">
        {gaps.map((g) => (
          <li key={g.gapKey}>
            <Link to="/discovery/gaps/$gapId" params={{ gapId: g.gapKey }}>
              <strong>{g.title}</strong>
            </Link>
            <p className="small muted">
              {g.gapKey} · {g.status} · {g.detectionSource}
            </p>
          </li>
        ))}
      </ul>
      {!gaps.length ? <p className="muted">No gaps for this filter.</p> : null}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/immune/ui";
import { PageToc, Section } from "@/components/immune/page";
import { PRODUCT_NAME } from "@/lib/brand";
import { detectDiscoveryCandidates } from "@/lib/discovery/detect";
import { listDiscoveryRadar } from "@/lib/discovery/gaps.functions";
import type { ResearchGapCandidate } from "@/lib/discovery/types";
import { seoHead } from "@/lib/seo";

const TOC = [
  { id: "radar", label: "Radar" },
  { id: "honesty", label: "Coverage honesty" },
  { id: "next", label: "Get started" },
];

export const Route = createFileRoute("/discovery")({
  head: () =>
    seoHead({
      title: `Research Discovery Radar | ${PRODUCT_NAME}`,
      description:
        "Evidence-governed research unknowns from the ISI curated graph and melanoma pilot matrix. Missing ISI coverage is not worldwide literature absence. Human review required before reviewed gaps.",
      path: "/discovery",
    }),
  component: DiscoveryRadarPage,
});

function DiscoveryRadarPage() {
  const listFn = useServerFn(listDiscoveryRadar);
  const [gaps, setGaps] = useState<ResearchGapCandidate[]>(() => detectDiscoveryCandidates().slice(0, 25));
  const [note, setNote] = useState("Showing deterministic ISI detection (client).");
  const [filter, setFilter] = useState<"all" | "candidate" | "coverage_insufficient">("all");

  useEffect(() => {
    let cancel = false;
    listFn({ data: { limit: 25 } })
      .then((res) => {
        if (cancel) return;
        setGaps(res.gaps);
        setNote(res.note);
      })
      .catch(() => {
        /* keep client detection */
      });
    return () => {
      cancel = true;
    };
  }, [listFn]);

  const shown = gaps.filter((g) => (filter === "all" ? true : g.status === filter));

  return (
    <div className="page">
      <PageHead
        kicker="Investigate · Research Radar"
        title="See what remains unknown inside ISI — and why that uncertainty matters."
        lede="Research Discovery Radar surfaces evidence-governed candidates from the curated graph, melanoma pilot matrix, and coverage honesty labels. It does not invent papers, PMIDs, or novel discoveries, and it never auto-promotes a reviewed gap."
      />
      <PageToc items={TOC} />

      <Section
        id="radar"
        title="Current radar"
        lede="Pilot A (melanoma matrix) and Pilot B (evidence-gap labels) only. Status stays candidate or coverage_insufficient until a scientific reviewer decides."
      >
        <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {(
            [
              ["all", "All"],
              ["candidate", "Candidate"],
              ["coverage_insufficient", "Coverage insufficient"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`btn sm${filter === id ? " primary" : ""}`}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
          <Link className="btn sm" to="/discovery/gaps">
            Full gap list
          </Link>
          <Link className="btn sm" to="/discovery/onboarding">
            Set research focus
          </Link>
        </div>
        <p className="small muted">{note}</p>
        <ul className="isi-library-list" style={{ marginTop: 12 }}>
          {shown.map((g) => (
            <li key={g.gapKey}>
              <Link to="/discovery/gaps/$gapId" params={{ gapId: g.gapKey }}>
                <strong>{g.title}</strong>
              </Link>
              <p className="small muted" style={{ margin: "4px 0" }}>
                {g.status} · {g.detectionSource}
                {g.pilot ? ` · ${g.pilot}` : ""}
              </p>
              <p className="small">{g.summary.slice(0, 220)}{g.summary.length > 220 ? "…" : ""}</p>
            </li>
          ))}
        </ul>
        {!shown.length ? <p className="muted">No gaps match this filter.</p> : null}
      </Section>

      <Section
        id="honesty"
        title="Coverage honesty"
        lede="Missing ISI evidence is not evidence that biology is settled or that literature does not exist."
      >
        <p>
          Every candidate carries a documented search scope. Labels such as{" "}
          <em>coverage_insufficient</em> mean Gate C or product-search signals were incomplete — not that zero
          papers exist worldwide. Human review is mandatory before any row becomes a <code>reviewed_gap</code>.
        </p>
      </Section>

      <Section id="next" title="Get started" lede="Profiles stay ownership-scoped. Entitlements are stubs — billing is not activated.">
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Link className="btn primary" to="/discovery/onboarding">
            Onboarding
          </Link>
          <Link className="btn" to="/discovery/profile">
            Profile
          </Link>
          <Link className="btn" to="/research">
            Research library
          </Link>
          <Link className="btn" to="/ask">
            Ask Immune
          </Link>
        </div>
      </Section>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/immune/ui";
import { PageToc, Section } from "@/components/immune/page";
import { PRODUCT_NAME } from "@/lib/brand";
import { detectDiscoveryCandidates } from "@/lib/discovery/detect";
import { listDiscoveryRadar, listMyDiscoveryRadar, persistDetectedGapCandidates } from "@/lib/discovery/gaps.functions";
import { recommendedBecauseLine, type RecommendReason } from "@/lib/discovery/recommend";
import { shapeRadarFeed, type RadarFeedItem } from "@/lib/discovery/radar";
import { seoHead } from "@/lib/seo";

const TOC = [
  { id: "radar", label: "Radar feed" },
  { id: "emerging", label: "Emerging" },
  { id: "contradictions", label: "Contradictions" },
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

function GapRow({
  g,
  reason,
}: {
  g: RadarFeedItem;
  reason?: RecommendReason | null;
}) {
  const because = recommendedBecauseLine(reason ?? undefined);
  return (
    <li>
      <div className="isi-radar-meta">
        <span className="isi-gap-badge" data-tone={g.badge.tone}>
          {g.badge.label}
        </span>
        <span className="small muted">{g.detectionSource}{g.pilot ? ` · ${g.pilot}` : ""}</span>
        <span className="small muted">{g.reviewStatusLabel}</span>
      </div>
      <Link to="/discovery/gaps/$gapId" params={{ gapId: g.gapKey }}>
        <strong>{g.title}</strong>
      </Link>
      <p className="isi-radar-why">{g.whySnippet}</p>
      {because ? (
        <p className="small isi-recommend-because" style={{ marginTop: 4 }}>
          {because}
        </p>
      ) : null}
      <p className="small muted" style={{ marginTop: 4 }}>
        {g.summary.slice(0, 200)}
        {g.summary.length > 200 ? "…" : ""}
      </p>
    </li>
  );
}

function DiscoveryRadarPage() {
  const listPublic = useServerFn(listDiscoveryRadar);
  const listMine = useServerFn(listMyDiscoveryRadar);
  const persistFn = useServerFn(persistDetectedGapCandidates);
  const clientSeed = shapeRadarFeed(detectDiscoveryCandidates().slice(0, 25), { persistent: false });
  const [items, setItems] = useState<RadarFeedItem[]>(clientSeed.items);
  const [emerging, setEmerging] = useState<RadarFeedItem[]>(clientSeed.emerging);
  const [contradictions, setContradictions] = useState<RadarFeedItem[]>(clientSeed.contradictions);
  const [note, setNote] = useState(clientSeed.note);
  const [persistent, setPersistent] = useState(false);
  const [filter, setFilter] = useState<"all" | "candidate" | "coverage_insufficient">("all");
  const [persistMsg, setPersistMsg] = useState("");
  const [persisting, setPersisting] = useState(false);
  const [reasonByKey, setReasonByKey] = useState<Record<string, RecommendReason | null>>({});
  const [personalised, setPersonalised] = useState(false);
  const [rankingDisclaimer, setRankingDisclaimer] = useState("");

  useEffect(() => {
    let cancel = false;
    const status = filter === "all" ? "all" : filter;
    listMine({ data: { limit: 25, status } })
      .then((res) => {
        if (cancel) return;
        setItems(res.items ?? res.gaps ?? []);
        setEmerging(res.emerging ?? []);
        setContradictions(res.contradictions ?? []);
        setNote(res.note);
        setPersistent(Boolean(res.persistent));
        setReasonByKey((res.reasonByKey as Record<string, RecommendReason | null>) ?? {});
        setPersonalised(true);
        setRankingDisclaimer(res.rankingDisclaimer ?? "");
      })
      .catch(() => {
        // Public / signed-out fallback — detection order, no fabricated personalisation.
        listPublic({ data: { limit: 25, status } })
          .then((res) => {
            if (cancel) return;
            setItems(res.items ?? res.gaps ?? []);
            setEmerging(res.emerging ?? []);
            setContradictions(res.contradictions ?? []);
            setNote(res.note);
            setPersistent(Boolean(res.persistent));
            setReasonByKey({});
            setPersonalised(false);
            setRankingDisclaimer("");
          })
          .catch(() => {
            /* keep client detection */
          });
      });
    return () => {
      cancel = true;
    };
  }, [listMine, listPublic, filter]);

  async function onPersist() {
    setPersisting(true);
    setPersistMsg("");
    try {
      const res = await persistFn({ data: {} });
      setPersistMsg(`Persisted ${res.upserted} candidate(s). ${res.note}`);
      const refreshed = await listMine({ data: { limit: 25, status: filter === "all" ? "all" : filter } }).catch(
        () => listPublic({ data: { limit: 25, status: filter === "all" ? "all" : filter } }),
      );
      setItems(refreshed.items ?? refreshed.gaps ?? []);
      setEmerging(refreshed.emerging ?? []);
      setContradictions(refreshed.contradictions ?? []);
      setNote(refreshed.note);
      setPersistent(Boolean(refreshed.persistent));
      if ("reasonByKey" in refreshed && refreshed.reasonByKey) {
        setReasonByKey(refreshed.reasonByKey as Record<string, RecommendReason | null>);
        setPersonalised(true);
      }
    } catch (e) {
      setPersistMsg(e instanceof Error ? e.message : "Persist failed (sign in required).");
    } finally {
      setPersisting(false);
    }
  }

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
        title="Radar feed"
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
          <Link className="btn sm" to="/discovery/alerts">
            Alerts
          </Link>
          <Link className="btn sm" to="/discovery/onboarding">
            Set research focus
          </Link>
          <button type="button" className="btn sm" disabled={persisting} onClick={() => void onPersist()}>
            {persisting ? "Persisting…" : "Persist detection to Neon"}
          </button>
        </div>
        <p className="small muted">
          {note} · Source {persistent ? "Neon + detection" : "detection only"}
          {personalised ? " · Personalised ordering" : ""}
        </p>
        {rankingDisclaimer ? <p className="small muted">{rankingDisclaimer}</p> : null}
        {persistMsg ? <p className="small">{persistMsg}</p> : null}
        <ul className="isi-library-list" style={{ marginTop: 12 }}>
          {items.map((g) => (
            <GapRow key={g.gapKey} g={g} reason={reasonByKey[g.gapKey]} />
          ))}
        </ul>
        {!items.length ? <p className="muted">No gaps match this filter.</p> : null}
      </Section>

      <Section
        id="emerging"
        title="Emerging signals"
        lede="Only candidates labelled emerging from real ISI evidence-gap classifications — never invented novelty."
      >
        {emerging.length ? (
          <ul className="isi-library-list">
            {emerging.map((g) => (
              <GapRow key={g.gapKey} g={g} reason={reasonByKey[g.gapKey]} />
            ))}
          </ul>
        ) : (
          <p className="muted">No emerging-labelled candidates in the current detection set.</p>
        )}
      </Section>

      <Section
        id="contradictions"
        title="Contradiction / conflict"
        lede="Conflict-sourced candidates from ISI signals only."
      >
        {contradictions.length ? (
          <ul className="isi-library-list">
            {contradictions.map((g) => (
              <GapRow key={g.gapKey} g={g} reason={reasonByKey[g.gapKey]} />
            ))}
          </ul>
        ) : (
          <p className="muted">No conflict-sourced candidates in the current filter window.</p>
        )}
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

      <Section
        id="next"
        title="Get started"
        lede="Profiles stay ownership-scoped. Free / Researcher Pro / Team / Enterprise are server-checked stubs — Researcher Pro — billing not activated. Quotas are not UI-only."
      >
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Link className="btn primary" to="/discovery/onboarding">
            Onboarding
          </Link>
          <Link className="btn" to="/discovery/profile">
            Profile
          </Link>
          <Link className="btn" to="/discovery/alerts">
            Alerts
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

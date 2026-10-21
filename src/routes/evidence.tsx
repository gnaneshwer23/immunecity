import { ART } from "@/components/immune/explain";
import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CONTENT } from "@/data/content";
import { byId } from "@/lib/immune/engine";
import { PageHead, NodeChip } from "@/components/immune/ui";
import CoveragePanel from "@/components/immune/CoveragePanel";
import DomainCoveragePanel from "@/components/immune/DomainCoveragePanel";
import PhoneFold from "@/components/immune/PhoneFold";
import { PageToc, Section, Toolbar } from "@/components/immune/page";
import { evidenceCoverageQuery } from "@/lib/citations.functions";

const TOC = [
  { id: "live-neon", label: "Live Neon" },
  { id: "coverage", label: "Coverage" },
  { id: "timeline", label: "Timeline" },
  { id: "trials", label: "Landmark trials" },
];

function LiveNeonCoverage() {
  const { data, isError, isPending, isFetching, error } = useQuery(evidenceCoverageQuery);
  const loading = isPending || (isFetching && !data);
  if (isError) {
    return (
      <p className="callout" role="alert">
        Evidence database unavailable{error instanceof Error ? ` (${error.message})` : ""}.
        This is a service error — not a finding that coverage is zero.
      </p>
    );
  }
  return (
    <div className="card" aria-labelledby="live-neon-heading">
      <h3 id="live-neon-heading" style={{ fontSize: "1.05rem", marginBottom: 8 }}>Live Neon coverage</h3>
      <dl className="grid g3" style={{ marginBottom: 8 }}>
        <div><dt className="xs muted">Gate C distinct / links</dt><dd><b>{loading ? "…" : `${data?.distinctGateCRels ?? 0} / ${data?.runtimeRelationships ?? "…"}`}</b></dd></div>
        <div><dt className="xs muted">Contradicts / partial</dt><dd><b>{loading ? "…" : `${data?.contradicts ?? 0} / ${data?.partial ?? 0}`}</b></dd></div>
        <div><dt className="xs muted">Open P0 targets</dt><dd><b>{loading ? "…" : (data?.openP0Targets ?? 0)}</b></dd></div>
      </dl>
      {!loading && data ? (
        <ul className="small" style={{ paddingLeft: 18, margin: "8px 0" }}>
          {data.exemplar.map((e) => (
            <li key={e.pathwayId}>{e.title}: {e.approvedEdges}/{e.uniqueEdges} approved on-path · {e.maturity}</li>
          ))}
        </ul>
      ) : null}
      <p className="xs muted">
        {loading ? "Fetching…" : <>Fetched <code>{data?.fetchedAt}</code></>} · unreviewed rows {loading ? "…" : data?.unreviewed} · total evidence slots {loading ? "…" : data?.totalEvidenceRows}
      </p>
    </div>
  );
}

export const Route = createFileRoute("/evidence")({
  head: () => seoHead({ title: "Evidence: trials as experiments — Immune Super Intelligence", description: "Landmark immunology trials as hypothesis tests, plus honest claim-level evidence coverage. Educational beta — most runtime links are not yet claim-approved.", path: "/evidence" }),
  component: Evidence,
});

const LABEL = { positive: "positive", negative: "negative", safety: "safety signal" } as const;

function Evidence() {
  const [year, setYear] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const trials = useMemo(
    () => Object.entries(CONTENT.trialLessons).map(([id, t]) => ({ id, ...t })).sort((a, b) => b.year - a.year),
    [],
  );
  const years = useMemo(() => {
    const counts: Record<number, number> = {};
    trials.forEach((t) => { counts[t.year] = (counts[t.year] || 0) + 1; });
    return Object.entries(counts).map(([y, c]) => ({ y: Number(y), c })).sort((a, b) => a.y - b.y);
  }, [trials]);
  const resultCounts = useMemo(() => {
    const c: Record<string, number> = {};
    trials.forEach((t) => { c[t.result] = (c[t.result] || 0) + 1; });
    return c;
  }, [trials]);
  const shown = trials.filter((t) => (!year || t.year === year) && (!result || t.result === result));

  return (
    <div className="page">
      <PageHead art={ART.researchArt}
        kicker="Investigate · Evidence explorer"
        title="Trials as experiments"
        lede="Each trial is a test of a biological hypothesis in humans. The negative ones teach the most: a mechanism that is real in a dish can be irrelevant, redundant, or protective in a tissue."
        stats={[
          { v: trials.length, l: "TRIAL LESSONS" },
          { v: `${years[0]!.y}–${years[years.length - 1]!.y}`, l: "YEARS COVERED" },
          { v: "PMID", l: "VERIFIED IDENTIFIERS" },
        ]}
      />
      <PageToc items={TOC} />
      <Section id="live-neon" n={1} title="Live Neon Gate C dashboard"
        lede="Counts come from the production evidence database at fetch time. If the database is down, you will see an error — not a fake zero.">
        <LiveNeonCoverage />
      </Section>
      <Section id="coverage" n={2} title="How much of the graph is reviewed"
        lede="Claim-level approved support for graph links is still sparse. These panels are the honest source of truth for what has been reviewed."
        aside={
          <div className="isi-sec-action">
            <Link className="btn sm" to="/curation">Open citation curation</Link>
            <span className="xs muted">Signed-in readers can browse citations. Approved curators import references, check them against PubMed and Crossref, and review support for individual claims.</span>
          </div>
        }>
        <PhoneFold label="Show full coverage">
          <CoveragePanel />
          <DomainCoveragePanel />
        </PhoneFold>
      </Section>
      <Section id="timeline" n={3} title="When mechanisms were tested"
        lede="Bar height is the number of landmark trials in that year. Select a bar to filter the trial list below.">
        <div className="timeline-bar">
          {years.map(({ y, c }) => (
            <div className="tl-col" key={y}>
              <button
                title={`${y} · ${c} trial${c > 1 ? "s" : ""}`}
                aria-label={`${y}: ${c} landmark trial${c > 1 ? "s" : ""}`}
                aria-pressed={year === y}
                onClick={() => setYear(year === y ? null : y)}
                style={{ height: 20 + c * 26, background: year === y ? "var(--primary)" : "var(--primary-soft)" }}
              />
              <span className="yr">{y}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section id="trials" n={4} title={year ? `Trials in ${year}` : "Landmark trials"}
        lede="Each trial is written as hypothesis, outcome and lesson, so the result reads as evidence for or against a mechanism.">
        <Toolbar count={`${shown.length} of ${trials.length} trials`}>
          <div role="group" aria-label="Filter by result">
            <button className={`chip${result === null ? " on" : ""}`} aria-pressed={result === null} onClick={() => setResult(null)}>All results · {trials.length}</button>
            {(["positive", "negative", "safety"] as const).filter((r) => resultCounts[r]).map((r) => (
              <button key={r} className={`chip${result === r ? " on" : ""}`} aria-pressed={result === r} onClick={() => setResult(result === r ? null : r)}>
                {LABEL[r]} · {resultCounts[r]}
              </button>
            ))}
            {year ? <button className="chip on" onClick={() => setYear(null)}>Clear year {year} ×</button> : null}
          </div>
        </Toolbar>
        {!shown.length ? <p className="empty card">No trial matches this year and result. Clear a filter to see more.</p> : null}
        <PhoneFold label={`Show all ${shown.length} trials`} className="phone-fold-list">
          {shown.map((t) => {
            const node = byId[t.id];
            return (
              <article className="trial-row" key={t.id}>
                <div className="yr">{t.year}</div>
                <div>
                  <h3>
                    {node ? node.name : t.id}
                    <span className={`badge ${t.result === "positive" ? "res-positive" : t.result === "negative" ? "res-negative" : "res-safety"}`}>{LABEL[t.result as keyof typeof LABEL] ?? t.result}</span>
                  </h3>
                  <dl className="isi-lines">
                    <dt>Hypothesis</dt><dd>{t.hypothesis}</dd>
                    <dt>Outcome</dt><dd>{t.outcome}</dd>
                    <dt>Lesson</dt><dd>{t.lesson}</dd>
                  </dl>
                  {node ? <div style={{ marginTop: 10 }}><NodeChip id={t.id} label="Open trial node" /></div> : null}
                </div>
              </article>
            );
          })}
        </PhoneFold>
      </Section>
    </div>
  );
}

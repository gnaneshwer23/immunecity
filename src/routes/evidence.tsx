import { ART } from "@/components/immune/explain";
import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CONTENT } from "@/data/content";
import { byId } from "@/lib/immune/engine";
import { PageHead, NodeChip } from "@/components/immune/ui";
import CoveragePanel from "@/components/immune/CoveragePanel";
import DomainCoveragePanel from "@/components/immune/DomainCoveragePanel";
import PhoneFold from "@/components/immune/PhoneFold";

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
        kicker="Layer 09 · Evidence"
        title="Trials as experiments"
        lede="Each trial is a test of a biological hypothesis in humans. The negative ones teach the most: a mechanism that is real in a dish can be irrelevant, redundant, or protective in a tissue. Claim-level approved support for graph links is still sparse — coverage below is the honest source of truth."
        stats={[
          { v: Object.keys(CONTENT.trialLessons).length, l: "TRIAL LESSONS" },
          { v: "PMID", l: "VERIFIED IDENTIFIERS" },
        ]}
      />
      <div className="row" style={{ marginBottom: 24 }}>
        <Link className="btn" to="/curation">Citation curation</Link>
        <span className="xs muted">Signed-in readers can browse citations. Approved curators can import references, check them against PubMed and Crossref, and review support for individual claims.</span>
      </div>
      <nav className="page-jump" aria-label="On this page">
        <a href="#coverage">Coverage</a>
        <a href="#timeline">Timeline</a>
        <a href="#trials">Trials</a>
      </nav>
      <div id="coverage">
        <PhoneFold label="Show full coverage">
          <CoveragePanel />
          <DomainCoveragePanel />
        </PhoneFold>
      </div>
      <section className="section" id="timeline">
        <h2>When mechanisms were tested</h2>
        <p className="lede">Bar height is the number of landmark trials in that year. Click a bar to filter.</p>
        <div className="timeline-bar">
          {years.map(({ y, c }) => (
            <div className="tl-col" key={y}>
              <button
                title={`${y} · ${c} trial${c > 1 ? "s" : ""}`}
                aria-label={`${y}: ${c} landmark trial${c > 1 ? "s" : ""}`}
                onClick={() => setYear(year === y ? null : y)}
                style={{ height: 20 + c * 26, background: year === y ? "var(--primary)" : "var(--primary-soft)" }}
              />
              <span className="yr">{y}</span>
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <span className="xs mono muted">{years[0]!.y} → {years[years.length - 1]!.y}</span>
          {year ? <button className="chip on" onClick={() => setYear(null)}>Clear {year}</button> : null}
        </div>
      </section>
      <section className="section" id="trials">
        <h2>{year ? `Trials in ${year}` : "All landmark trials"}</h2>
        <div className="ev-filters">
          <button className={`chip${result === null ? " on" : ""}`} onClick={() => setResult(null)}>All results · {trials.length}</button>
          {(["positive", "negative", "safety"] as const).filter((r) => resultCounts[r]).map((r) => (
            <button key={r} className={`chip${result === r ? " on" : ""}`} onClick={() => setResult(result === r ? null : r)}>
              {LABEL[r]} · {resultCounts[r]}
            </button>
          ))}
        </div>
        <PhoneFold label={`Show all ${shown.length} trials`} className="phone-fold-list">
          {shown.map((t) => {
            const node = byId[t.id];
            return (
              <div className="trial-row" key={t.id}>
                <div className="yr">{t.year}</div>
                <div>
                  <h3>
                    {node ? node.name : t.id}
                    <span className={`badge ${t.result === "positive" ? "res-positive" : t.result === "negative" ? "res-negative" : "res-safety"}`}>{LABEL[t.result as keyof typeof LABEL] ?? t.result}</span>
                  </h3>
                  <p className="small" style={{ marginTop: 6 }}><span className="mono xs muted">HYPOTHESIS · </span>{t.hypothesis}</p>
                  <p className="small" style={{ marginTop: 4 }}><span className="mono xs muted">OUTCOME · </span>{t.outcome}</p>
                  <p className="small" style={{ marginTop: 4 }}><span className="mono xs muted">LESSON · </span>{t.lesson}</p>
                  {node ? <div style={{ marginTop: 8 }}><NodeChip id={t.id} label="Open trial node" /></div> : null}
                </div>
              </div>
            );
          })}
        </PhoneFold>
      </section>
    </div>
  );
}

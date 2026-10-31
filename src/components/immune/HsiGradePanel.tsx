/**
 * Methods panel: HSI discovery grades from hsi-core (not CDS).
 */
import { Link } from "@tanstack/react-router";
import {
  HSI_GRADE_INFO,
  HSI_GRADES,
  discoverySeedSummary,
  loadIsiHsiExportSnapshot,
} from "@/lib/hsi";

export function HsiGradePanel() {
  const summary = discoverySeedSummary();
  const snap = loadIsiHsiExportSnapshot();

  return (
    <div className="mkt-ev-panel" aria-labelledby="hsi-grades-heading">
      <h3 id="hsi-grades-heading">Human Systems Intelligence grades</h3>
      <p className="mkt-aside">
        Shared substrate with Aksh Health via <code>hsi-core</code>. ISI uses these bands for discovery
        honesty only — not clinic decision support.{" "}
        <code>teachingStatus</code> on a seed edge stays separate from <code>hsiGrade</code>.
      </p>
      <dl className="mkt-ev-metrics">
        {HSI_GRADES.map((g) => (
          <div key={g}>
            <dt title={HSI_GRADE_INFO[g].desc}>{HSI_GRADE_INFO[g].label}</dt>
            <dd>{summary.gradeCounts[g]}</dd>
          </div>
        ))}
        <div>
          <dt>Bridge candidates (P1)</dt>
          <dd>{summary.bridgeCandidates}</dd>
        </div>
        <div>
          <dt>CDS-surfacable (must stay 0 until Gate C)</dt>
          <dd>{summary.cdsSurfacableCount}</dd>
        </div>
      </dl>
      <p className="mkt-aside">
        Seed edges: {summary.edgeCount} · export <code>{snap.schemaVersion}</code> · generated{" "}
        <code>{snap.generatedAt}</code> · <code>notCds: true</code>. Map seeds into curation before any
        graph write.{" "}
        <Link to="/ask">Ask Immune</Link> may later cite graded discovery context — never auto-approve.
      </p>
    </div>
  );
}

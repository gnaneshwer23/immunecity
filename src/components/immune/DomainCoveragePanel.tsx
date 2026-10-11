import { useMemo, useState } from "react";
import { domainCoverageReport, type CoverageGapItem, type GapKind } from "@/lib/immune/domainCoverage";
import { inspect } from "@/lib/immune/inspector";
import { NodeLink } from "./ui";

const KIND_LABEL: Record<GapKind, string> = {
  isolated_node: "Isolated",
  untaught_concept: "Untaught",
  missing_lesson: "Missing lesson",
  missing_route: "Missing route",
  thin_domain: "Thin domain",
  draft_link_uncited: "Uncited draft link",
};

const SEV_ORDER = ["high", "medium", "low"] as const;

export default function DomainCoveragePanel() {
  const report = useMemo(() => domainCoverageReport(), []);
  const [sev, setSev] = useState<(typeof SEV_ORDER)[number] | "all">("all");
  const [openDomain, setOpenDomain] = useState<string | null>(null);

  const gaps = useMemo(() => {
    const list = report.gaps.filter((g) => sev === "all" || g.severity === sev);
    return list.slice(0, 36);
  }, [report.gaps, sev]);

  const openGap = (g: CoverageGapItem) => {
    if (g.relIds?.[0]) inspect({ kind: "relationship", id: g.relIds[0] });
    else if (g.conceptIds[0]) inspect({ kind: "concept", id: g.conceptIds[0] });
  };

  return (
    <section className="section">
      <h2>Domain coverage (Phase B)</h2>
      <p className="lede">
        Educational draft density by thin domain — microbiome, vaccines, transplant, PID, immunogenetics,
        infection↔autoimmunity, frontier. Gaps are a curator queue, not approved science. Extensions{" "}
        <span className="mono">{report.extensionsVersion}</span>.
      </p>
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <div className="card">
          <span className="xs mono muted">DRAFT CONCEPTS IN DOMAINS</span>
          <h3>{report.summary.draftNodesInDomains}</h3>
          <p className="xs muted">{report.summary.lessonsPresent}/{report.summary.domainCount} domains have lessons</p>
        </div>
        <div className="card">
          <span className="xs mono muted">UNTAUGHT DRAFT CONCEPTS</span>
          <h3>{report.summary.untaughtConcepts}</h3>
          <p className="xs muted">Present in graph but not on a lesson or route</p>
        </div>
        <div className="card">
          <span className="xs mono muted">THIN / ISOLATED</span>
          <h3>{report.summary.thinDomains} / {report.summary.isolatedConcepts}</h3>
          <p className="xs muted">Domains below expected min · isolated concepts</p>
        </div>
      </div>

      <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="card">
          <h3 style={{ fontSize: "1rem", marginBottom: 10 }}>Coverage by domain</h3>
          <table className="rs-table">
            <thead>
              <tr>
                <th scope="col">Domain</th>
                <th scope="col">Concepts</th>
                <th scope="col">Links</th>
                <th scope="col">Taught</th>
                <th scope="col">Routes</th>
              </tr>
            </thead>
            <tbody>
              {report.domains.map((row) => (
                <tr key={row.domain.id}>
                  <td>
                    <button
                      type="button"
                      className="nodelink small"
                      onClick={() => setOpenDomain(openDomain === row.domain.id ? null : row.domain.id)}
                    >
                      {row.domain.label}
                    </button>
                    {!row.lessonPresent ? <span className="badge ev-chk-missing" style={{ marginLeft: 6 }}>no lesson</span> : null}
                    {openDomain === row.domain.id ? (
                      <div className="xs muted" style={{ marginTop: 4 }}>
                        Bridges to core: {row.bridgeToCoreCount}. Untaught:{" "}
                        {row.untaughtNodeIds.length
                          ? row.untaughtNodeIds.slice(0, 8).map((id) => (
                              <span key={id} style={{ marginRight: 6 }}><NodeLink id={id} /></span>
                            ))
                          : "none"}
                      </div>
                    ) : null}
                  </td>
                  <td className="mono">{row.nodeCount}</td>
                  <td className="mono">{row.edgeCount}</td>
                  <td className="mono">{row.teachingCoveragePct}%</td>
                  <td className="mono">{row.routeCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="xs muted" style={{ marginTop: 10 }}>
            {report.provenanceLabel}. Uncited draft links in domains: {report.summary.uncitedDraftLinks} — literature workflow only; never auto-approve.
          </p>
        </div>

        <div className="card">
          <h3 style={{ fontSize: "1rem", marginBottom: 10 }}>Knowledge gap queue</h3>
          <p className="xs muted" style={{ marginBottom: 8 }}>
            Prioritised coverage work. Opening a row inspects the concept or draft link — it does not approve evidence.
          </p>
          <div className="row" style={{ marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
            <button type="button" className={`chip${sev === "all" ? " on" : ""}`} onClick={() => setSev("all")}>
              All · {report.gaps.length}
            </button>
            {SEV_ORDER.map((s) => {
              const n = report.gaps.filter((g) => g.severity === s).length;
              return (
                <button key={s} type="button" className={`chip${sev === s ? " on" : ""}`} onClick={() => setSev(s)}>
                  {s} · {n}
                </button>
              );
            })}
          </div>
          <ol className="small" style={{ paddingLeft: 18 }}>
            {gaps.map((g) => (
              <li key={g.id} style={{ marginBottom: 8 }}>
                <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <span>
                    <span className={`badge rs rs-${g.severity === "high" ? "rejected" : g.severity === "medium" ? "unreviewed" : "draft"}`}>
                      {KIND_LABEL[g.kind]}
                    </span>{" "}
                    {g.title}
                  </span>
                  <button type="button" className="si-open" onClick={() => openGap(g)}>details</button>
                </div>
                <p className="xs muted" style={{ marginTop: 2 }}>{g.detail}</p>
              </li>
            ))}
          </ol>
          {gaps.length === 0 ? <p className="empty">No gaps at this severity filter.</p> : null}
        </div>
      </div>
    </section>
  );
}

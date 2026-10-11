import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { KG, TYPES, byId, deg, human, relId } from "@/lib/immune/engine";
import { approvedQuery } from "@/lib/citations.functions";
import { relationshipStatus, STATUS_INFO, type ReviewStatus } from "@/lib/immune/evidenceStatus";
import { inspect } from "@/lib/immune/inspector";
import { NodeLink } from "./ui";

const ORDER: ReviewStatus[] = ["approved", "claim-assessed", "conflicting", "source-verified", "unreviewed", "draft", "rejected"];

/* Honest relationship-level coverage: a link counts as supported only when an approved
   source was mapped to that exact claim and assessed as supporting it. */
export default function CoveragePanel() {
  const { data: approved = [] } = useQuery(approvedQuery);
  const m = useMemo(() => {
    const counts: Record<string, number> = {};
    const by: Record<string, { n: number; c: number }> = {};
    let core = 0, coreSup = 0, draft = 0, draftSup = 0;
    const st = KG.relationships.map((r) => {
      const s = relationshipStatus(r, approved);
      counts[s] = (counts[s] || 0) + 1;
      const sup = s === "approved";
      const t = byId[r.subject_id]?.node_type ?? "DATA";
      const b = (by[t] ||= { n: 0, c: 0 });
      b.n++; if (sup) b.c++;
      if (r.draft) { draft++; if (sup) draftSup++; } else { core++; if (sup) coreSup++; }
      return { r, s };
    });
    const top = st.filter((x) => x.s !== "approved").map((x) => ({ ...x, score: deg(x.r.subject_id) + deg(x.r.object_id) }))
      .sort((a, b) => b.score - a.score).slice(0, 10);
    return { counts, rows: Object.entries(by).sort((a, b) => b[1].n - a[1].n), core, coreSup, draft, draftSup, top, total: KG.relationships.length };
  }, [approved]);
  const pct = (a: number, b: number) => (b ? ((a / b) * 100).toFixed(1) : "0.0");
  const supported = m.counts["approved"] || 0;

  return (
    <section className="section">
      <h2>Evidence coverage</h2>
      <p className="lede">{supported} of {m.total} causal links ({pct(supported, m.total)}%) are supported by an approved, claim-checked source. Concept-level citations and unassessed identifiers are reported separately and do not count as support.</p>
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <div className="card"><span className="xs mono muted">CORE GRAPH</span><h3>{pct(m.coreSup, m.core)}%</h3><p className="xs muted">{m.coreSup} of {m.core} curated links supported</p></div>
        <div className="card"><span className="xs mono muted">DRAFT EXTENSIONS</span><h3>{pct(m.draftSup, m.draft)}%</h3><p className="xs muted">{m.draftSup} of {m.draft} draft links supported</p></div>
        <div className="card"><span className="xs mono muted">SOURCE LINKED, NOT ASSESSED</span><h3>{m.counts["source-verified"] || 0}</h3><p className="xs muted">carry a PMID/DOI awaiting claim review</p></div>
      </div>
      <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="card">
          <h3 style={{ fontSize: "1rem", marginBottom: 10 }}>Review status of every link</h3>
          <table className="rs-table"><tbody>
            {ORDER.map((s) => (
              <tr key={s}><td><span className={`badge rs rs-${s}`}>{STATUS_INFO[s].label}</span></td><td className="mono">{m.counts[s] || 0}</td><td className="xs muted">{STATUS_INFO[s].desc}</td></tr>
            ))}
          </tbody></table>
          <h3 style={{ fontSize: "1rem", margin: "16px 0 10px" }}>Supported, by acting concept type</h3>
          {m.rows.map(([t, b]) => (
            <div key={t} style={{ marginBottom: 8 }}>
              <div className="row xs" style={{ justifyContent: "space-between" }}>
                <span>{TYPES[t as keyof typeof TYPES]?.label ?? t}</span>
                <span className="mono muted">{b.c}/{b.n}</span>
              </div>
              <div className="cov-bar"><span style={{ width: `${(b.c / b.n) * 100}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="card">
          <h3 style={{ fontSize: "1rem", marginBottom: 10 }}>Most-connected unsupported links</h3>
          <p className="xs muted" style={{ marginBottom: 8 }}>Reviewing these first covers the busiest parts of the graph.</p>
          <ol className="small" style={{ paddingLeft: 18 }}>
            {m.top.map(({ r }) => (
              <li key={relId(r)} style={{ marginBottom: 4 }}>
                <NodeLink id={r.subject_id} /> {human(r.relation)} <NodeLink id={r.object_id} />{" "}
                <button type="button" className="si-open" onClick={() => inspect({ kind: "relationship", id: relId(r) })}>details</button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

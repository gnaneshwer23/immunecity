/**
 * Curator checklist for melanoma PD-1 pilot — driven by ISI_MELANOMA_PILOT_VALIDATION_MATRIX.
 * Still unreviewed: no Gate C approvals, no remapped KEYNOTE PMIDs invented here.
 */
import { useMemo, useState } from "react";
import {
  ISI_MELANOMA_PILOT_VALIDATION_MATRIX,
  melanomaMatrixSummary,
  type MelanomaMatrixFlag,
} from "@/data/melanomaPilotValidationMatrix";
import { byId } from "@/lib/immune/engine";

const FLAG_FILTERS: { id: MelanomaMatrixFlag | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "TO_BE_CURATED", label: "TO_BE_CURATED" },
  { id: "REJECTED_PMID", label: "Rejected PMID" },
  { id: "S_P_O_MISMATCH", label: "S-P-O mismatch" },
  { id: "GATE_C_PROXY", label: "Gate C proxy" },
  { id: "DRAFT_ESTABLISHED", label: "Draft ESTABLISHED" },
];

export default function MelanomaPilotChecklist() {
  const [flag, setFlag] = useState<MelanomaMatrixFlag | "all">("all");
  const summary = useMemo(() => melanomaMatrixSummary(), []);
  const rows = useMemo(
    () =>
      flag === "all"
        ? [...ISI_MELANOMA_PILOT_VALIDATION_MATRIX]
        : ISI_MELANOMA_PILOT_VALIDATION_MATRIX.filter((r) => r.flags.includes(flag)),
    [flag],
  );

  return (
    <div className="card" style={{ marginBottom: 16 }} data-testid="melanoma-pilot-checklist">
      <h3 style={{ fontSize: "1.05rem", marginBottom: 8 }}>Melanoma PD-1 pilot checklist</h3>
      <p className="small muted" style={{ marginBottom: 10 }}>
        Engineering aid from the validation matrix.{" "}
        <strong>All {summary.total} rows remain unreviewed</strong> — no Gate C approvals and no automatic
        KEYNOTE PMID rematch. Filter PD-1 / trial / flagged relationships for human curation.
      </p>
      <p className="xs muted" style={{ marginBottom: 10 }}>
        Verdicts: {Object.entries(summary.byVerdict).map(([k, v]) => `${k}=${v}`).join(" · ")} · Flags:{" "}
        {Object.entries(summary.byFlag)
          .map(([k, v]) => `${k}=${v}`)
          .join(" · ")}
      </p>
      <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {FLAG_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`chip${flag === f.id ? " on" : ""}`}
            onClick={() => setFlag(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="table" style={{ width: "100%", fontSize: "0.85rem" }}>
          <thead>
            <tr>
              <th>#</th>
              <th>S-P-O</th>
              <th>Flags</th>
              <th>Verdict</th>
              <th>Neon / locators</th>
              <th>Curator action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.relId}>
                <td>{r.n}</td>
                <td>
                  <code style={{ fontSize: "0.75rem" }}>{r.relId}</code>
                  <div className="xs muted">
                    {byId[r.subjectId]?.name ?? r.subjectId} → <em>{r.predicate}</em> →{" "}
                    {byId[r.objectId]?.name ?? r.objectId}
                  </div>
                </td>
                <td>
                  {r.flags.map((f) => (
                    <span key={f} className="chip" style={{ marginRight: 4, marginBottom: 2 }}>
                      {f}
                    </span>
                  ))}
                </td>
                <td>
                  <strong>{r.verdict}</strong>
                  <div className="xs muted">reviewed=false</div>
                </td>
                <td className="xs">
                  <div>{r.locatorsNote}</div>
                  <div className="muted">{r.neonNote}</div>
                </td>
                <td className="xs">{r.curatorAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

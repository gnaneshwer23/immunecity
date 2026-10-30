/**
 * Curator checklist for melanoma PD-1 pilot — driven by ISI_MELANOMA_PILOT_VALIDATION_MATRIX.
 * Still unreviewed: no Gate C approvals, no remapped KEYNOTE PMIDs invented here.
 */
import { useMemo, useState } from "react";
import { Toolbar } from "@/components/immune/page";
import {
  ISI_MELANOMA_PILOT_VALIDATION_MATRIX,
  melanomaMatrixSummary,
  type MelanomaMatrixFlag,
} from "@/data/melanomaPilotValidationMatrix";
import { byId } from "@/lib/immune/engine";

const FLAG_FILTERS: { id: MelanomaMatrixFlag | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "TO_BE_CURATED", label: "To curate" },
  { id: "REJECTED_PMID", label: "Rejected PMID" },
  { id: "S_P_O_MISMATCH", label: "S-P-O mismatch" },
  { id: "GATE_C_PROXY", label: "Gate C proxy" },
  { id: "DRAFT_ESTABLISHED", label: "Draft established" },
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

  const verdictLine = Object.entries(summary.byVerdict)
    .map(([k, v]) => `${k} ${v}`)
    .join(" · ");

  return (
    <div className="isi-sme-matrix" data-testid="melanoma-pilot-checklist">
      <p className="isi-sme-lede-tight muted">
        Engineering aid from the validation matrix. All {summary.total} rows remain{" "}
        <strong>unreviewed</strong> — no Gate C approvals and no automatic KEYNOTE PMID rematch.
      </p>
      <p className="xs muted isi-sme-lede-tight">Verdicts: {verdictLine}</p>

      <Toolbar count={`${rows.length} of ${summary.total} rows`}>
        <label className="isi-sme-field isi-sme-field-inline">
          <span>Flag filter</span>
          <select
            className="input"
            value={flag}
            onChange={(e) => setFlag(e.target.value as MelanomaMatrixFlag | "all")}
            aria-label="Filter melanoma matrix by flag"
          >
            {FLAG_FILTERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      </Toolbar>

      <div className="isi-sme-table-wrap" tabIndex={0}>
        <table className="isi-ti-table isi-sme-matrix-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">S-P-O</th>
              <th scope="col">Flags</th>
              <th scope="col">Verdict</th>
              <th scope="col">Neon / locators</th>
              <th scope="col">Curator action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.relId}>
                <td>{r.n}</td>
                <td>
                  <code className="isi-sme-rel">{r.relId}</code>
                  <div className="xs muted">
                    {byId[r.subjectId]?.name ?? r.subjectId} → <em>{r.predicate}</em> →{" "}
                    {byId[r.objectId]?.name ?? r.objectId}
                  </div>
                </td>
                <td className="xs muted">{r.flags.join(" · ")}</td>
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

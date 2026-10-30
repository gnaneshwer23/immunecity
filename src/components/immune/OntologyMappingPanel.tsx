/**
 * Curator entry UI for ontology_mappings. Empty tables OK.
 * No fabricated seed rows — verification required on every draft insert.
 */
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listOntologyMappings,
  setOntologyMappingReview,
  upsertOntologyMappingDraft,
} from "@/lib/ontology.functions";
import { ONTOLOGY_SYSTEMS, type OntologySystem } from "@/data/ontologyMappings";

type Props = { canReview: boolean };

export default function OntologyMappingPanel({ canReview }: Props) {
  const listFn = useServerFn(listOntologyMappings);
  const upsertFn = useServerFn(upsertOntologyMappingDraft);
  const reviewFn = useServerFn(setOntologyMappingReview);
  const [rows, setRows] = useState<
    Array<{
      id: string;
      isiId: string;
      system: string;
      externalId: string;
      reviewStatus: string;
      verificationRequired: boolean;
    }>
  >([]);
  const [available, setAvailable] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [isiId, setIsiId] = useState("D012");
  const [system, setSystem] = useState<OntologySystem>("MeSH");
  const [externalId, setExternalId] = useState("");
  const [label, setLabel] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await listFn({ data: { limit: 100 } });
      setRows(r.mappings);
      setAvailable(r.available);
      setMsg(r.note);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to load mappings");
    }
    setBusy(false);
  }, [listFn]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="card" style={{ marginBottom: 16 }} data-testid="ontology-mapping-panel">
      <h3 style={{ fontSize: "1.05rem", marginBottom: 8 }}>Ontology mappings</h3>
      <p className="small muted" style={{ marginBottom: 10 }}>
        Crosswalks retain ISI ids. <strong>External ontology IDs must be curator-supplied</strong> — never
        invent MeSH / UBERON / Cell Ontology / other accessions. New rows stay <code>unreviewed</code> with
        verification required. An empty table is the expected honest default until a curator fills rows.
      </p>
      {!available ? (
        <p className="callout">ontology_mappings not available (apply migration 0017).</p>
      ) : null}
      {canReview ? (
        <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "end", marginBottom: 12 }}>
          <label className="field">
            ISI id
            <input value={isiId} onChange={(e) => setIsiId(e.target.value)} maxLength={40} />
          </label>
          <label className="field">
            System
            <select value={system} onChange={(e) => setSystem(e.target.value as OntologySystem)}>
              {ONTOLOGY_SYSTEMS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="field" style={{ minWidth: 160 }}>
            External id (curator-supplied)
            <input
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              placeholder="Never invent"
              maxLength={120}
            />
          </label>
          <label className="field" style={{ minWidth: 140 }}>
            Label (optional)
            <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={200} />
          </label>
          <button
            type="button"
            className="btn sm"
            disabled={busy || !available || !externalId.trim()}
            onClick={() => {
              setBusy(true);
              upsertFn({
                data: {
                  isiId: isiId.trim(),
                  system,
                  externalId: externalId.trim(),
                  label: label.trim() || null,
                },
              })
                .then(() => {
                  setExternalId("");
                  setLabel("");
                  return load();
                })
                .catch((e) => setMsg(e instanceof Error ? e.message : "Save failed"))
                .finally(() => setBusy(false));
            }}
          >
            Save draft mapping
          </button>
          <button type="button" className="btn sm" disabled={busy} onClick={() => void load()}>
            Refresh
          </button>
        </div>
      ) : (
        <p className="xs muted">Read-only — reviewers can enter draft mappings.</p>
      )}
      {msg ? (
        <p className="xs muted" role="status">
          {msg}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className="empty small">No ontology mappings yet (empty by design until curator entry).</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
          {rows.map((r) => (
            <li key={r.id} className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <code>
                {r.isiId} ↔ {r.system}:{r.externalId}
              </code>
              <span className="xs muted">
                {r.reviewStatus}
                {r.verificationRequired ? " · verification required" : ""}
              </span>
              {canReview && r.reviewStatus === "unreviewed" ? (
                <>
                  <button
                    type="button"
                    className="btn sm"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true);
                      reviewFn({ data: { id: r.id, reviewStatus: "approved" } })
                        .then(() => load())
                        .catch((e) => setMsg(e instanceof Error ? e.message : "Review failed"))
                        .finally(() => setBusy(false));
                    }}
                  >
                    Approve mapping
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true);
                      reviewFn({ data: { id: r.id, reviewStatus: "rejected" } })
                        .then(() => load())
                        .catch((e) => setMsg(e instanceof Error ? e.message : "Review failed"))
                        .finally(() => setBusy(false));
                    }}
                  >
                    Reject
                  </button>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

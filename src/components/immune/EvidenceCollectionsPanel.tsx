/**
 * Named evidence collections on /research — Neon-backed for signed-in members.
 * Never writes the knowledge graph.
 */
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useMember } from "@/components/immune/community/chrome";
import { NodeChip } from "@/components/immune/ui";
import { byId } from "@/lib/immune/engine";
import {
  createEvidenceCollection,
  deleteEvidenceCollection,
  listEvidenceCollections,
  updateEvidenceCollection,
} from "@/lib/research/collections.functions";
import {
  classifyEvidenceGap,
  EVIDENCE_GAP_PROVENANCE_NOTE,
  evidenceGapLabelDescription,
  evidenceGapLabelText,
} from "@/lib/research/evidenceGap";

function safeErr(err: unknown): string {
  return err instanceof Error ? err.message : "Request failed.";
}

export default function EvidenceCollectionsPanel() {
  const member = useMember();
  const listFn = useServerFn(listEvidenceCollections);
  const createFn = useServerFn(createEvidenceCollection);
  const updateFn = useServerFn(updateEvidenceCollection);
  const deleteFn = useServerFn(deleteEvidenceCollection);
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [conceptText, setConceptText] = useState("R001, P001");
  const [evidenceText, setEvidenceText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["evidence-collections", member?.id],
    queryFn: () => listFn(),
    enabled: Boolean(member?.id),
    staleTime: 30_000,
    retry: false,
  });

  function resetForm() {
    setEditingId(null);
    setName("");
    setConceptText("R001, P001");
    setEvidenceText("");
  }

  if (member === undefined) {
    return <p className="small muted">Checking sign-in…</p>;
  }

  if (member === null) {
    return (
      <p className="callout">
        <Link to="/auth" search={{ redirect: "/research" }}>
          Sign in
        </Link>{" "}
        as a member to save named evidence collections (graph concept ids + optional evidence record refs). Collections
        never write the knowledge graph.
      </p>
    );
  }

  const collections = q.data?.collections ?? [];
  const available = q.data?.available !== false;
  const isEditing = Boolean(editingId);

  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <p className="small">
        Save a named collection of existing atlas concept ids and optional Neon <code>evidence_id</code> refs.
        Collections sync across devices for your signed-in account (Neon). Workbench local drafts stay in this
        browser’s localStorage and do not sync. <strong>kgWrite=false</strong> — this does not approve claims or
        mutate the curated graph. Evidence refs must already exist in <code>evidence_records</code>.
      </p>
      <p className="xs muted">{EVIDENCE_GAP_PROVENANCE_NOTE}</p>
      {!available ? (
        <p className="callout" role="status">
          Evidence collections are not available on this database yet (migration 0016 pending).
        </p>
      ) : null}

      <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "end" }}>
        <label className="field" style={{ minWidth: 160, flex: 1 }}>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Melanoma PD-1 path" />
        </label>
        <label className="field" style={{ minWidth: 220, flex: 2 }}>
          Concept ids
          <input
            value={conceptText}
            onChange={(e) => setConceptText(e.target.value)}
            placeholder="R001, P001, TR003"
          />
        </label>
        <label className="field" style={{ minWidth: 160, flex: 1 }}>
          Evidence refs (optional)
          <input
            value={evidenceText}
            onChange={(e) => setEvidenceText(e.target.value)}
            placeholder="Existing evidence_id only"
          />
        </label>
        <button
          type="button"
          className="btn sm"
          disabled={busy || !available}
          onClick={() => {
            setBusy(true);
            setMsg(null);
            const conceptIds = conceptText.split(/[\s,;]+/).filter(Boolean);
            const evidenceRefs = evidenceText.split(/[\s,;]+/).filter(Boolean);
            const req = isEditing
              ? updateFn({ data: { id: editingId!, name, conceptIds, evidenceRefs } })
              : createFn({ data: { name, conceptIds, evidenceRefs } });
            req
              .then(() => {
                resetForm();
                setMsg(isEditing ? "Collection updated (kgWrite=false)." : "Collection saved (kgWrite=false).");
                return queryClient.invalidateQueries({ queryKey: ["evidence-collections", member.id] });
              })
              .catch((err) => setMsg(safeErr(err)))
              .finally(() => setBusy(false));
          }}
        >
          {isEditing ? "Update collection" : "Save collection"}
        </button>
        {isEditing ? (
          <button type="button" className="btn sm" disabled={busy} onClick={() => resetForm()}>
            Cancel edit
          </button>
        ) : null}
      </div>
      {msg ? (
        <p className="xs muted" role="status">
          {msg}
        </p>
      ) : null}

      {collections.length === 0 ? (
        <p className="empty small">No collections yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {collections.map((c) => (
            <li key={c.id} className="card" style={{ padding: 12 }}>
              <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <strong>{c.name}</strong>
                <div className="row" style={{ gap: 6 }}>
                  <button
                    type="button"
                    className="btn sm"
                    disabled={busy}
                    onClick={() => {
                      setEditingId(c.id);
                      setName(c.name);
                      setConceptText(c.conceptIds.join(", "));
                      setEvidenceText(c.evidenceRefs.join(", "));
                      setMsg(null);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true);
                      deleteFn({ data: { id: c.id } })
                        .then(() => {
                          if (editingId === c.id) resetForm();
                          return queryClient.invalidateQueries({ queryKey: ["evidence-collections", member.id] });
                        })
                        .catch((err) => setMsg(safeErr(err)))
                        .finally(() => setBusy(false));
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="xs muted" style={{ marginTop: 4 }}>
                Updated {new Date(c.updatedAt).toLocaleString()} · kgWrite={String(c.kgWrite)}
              </p>
              <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {c.conceptIds.map((id) => {
                  const gap = classifyEvidenceGap(id);
                  return (
                    <span key={id} className="row" style={{ gap: 4, alignItems: "center" }}>
                      {byId[id] ? <NodeChip id={id} /> : <code>{id}</code>}
                      {gap ? (
                        <span
                          className="chip"
                          title={`${evidenceGapLabelDescription(gap)} ${EVIDENCE_GAP_PROVENANCE_NOTE}`}
                        >
                          {evidenceGapLabelText(gap)}
                        </span>
                      ) : null}
                    </span>
                  );
                })}
              </div>
              {c.evidenceRefs.length ? (
                <p className="xs muted" style={{ marginTop: 6 }}>
                  Evidence refs: {c.evidenceRefs.join(", ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { seoHead } from "@/lib/seo";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { neonAuth } from "@/integrations/neon/auth-client";
import { PageHead } from "@/components/immune/ui";
import {
  getMyRole,
  importManifest,
  listEvidenceRecords,
  previewP0ExemplarDrafts,
  runChecks,
  seedP0ExemplarDrafts,
  suggestSources,
  updateRecord,
} from "@/lib/evidence.functions";
import HealthReport from "@/components/immune/HealthReport";
import manifest from "@/data/citation-manifest.json";
import relationshipQueue from "@/data/relationship-evidence-queue.json";
import { byId, human, inn, out, relId } from "@/lib/immune/engine";
import { Button } from "@/components/ui/button";
import { KG } from "@/lib/immune/engine";
import {
  EXEMPLAR_CURATOR_TARGETS,
  EXEMPLAR_MATURITY_LABEL,
  EXEMPLAR_PATHWAYS,
  exemplarQueueFocus,
} from "@/lib/immune/exemplarPathways";

export const Route = createFileRoute("/_authenticated/curation")({
  head: () => seoHead({ title: "Evidence curation — Immune Super Intelligence", description: "Import citation manifests, cross-check identifiers against PubMed and Crossref, and approve citations.", path: "/curation", noIndex: true }),
  component: Curation,
});

type Rec = {
  id: string; evidence_id: string; node_id: string; node_name: string; node_type: string; source_type: string | null;
  source_ref: string | null; pmid: string | null; doi: string | null; search_query: string | null; manifest_status: string;
  check_status: string; check_detail: any; curation: string; notes: string | null;
  relationship_id?: string | null; claim_support?: string; reviewed_by?: string | null; reviewed_at?: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Not checked", verified: "Identifier verified", matched: "One match found", ambiguous: "Several matches",
  not_found: "No match", research_required: "Research required", unavailable: "Source unreachable",
};
const STATUS_CLASS: Record<string, string> = {
  verified: "res-positive", matched: "res-positive", ambiguous: "res-safety", not_found: "res-negative",
  unavailable: "res-safety", research_required: "", pending: "",
};

function Curation() {
  const navigate = useNavigate();
  const roleFn = useServerFn(getMyRole);
  const listFn = useServerFn(listEvidenceRecords);
  const importFn = useServerFn(importManifest);
  const checkFn = useServerFn(runChecks);
  const updateFn = useServerFn(updateRecord);
  const suggestFn = useServerFn(suggestSources);
  const previewP0Fn = useServerFn(previewP0ExemplarDrafts);
  const seedP0Fn = useServerFn(seedP0ExemplarDrafts);

  const [role, setRole] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [rows, setRows] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [after, setAfter] = useState<string | undefined>();
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [pageHistory, setPageHistory] = useState<(string | undefined)[]>([]);
  const [msg, setMsg] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [filter, setFilter] = useState({ q: "", status: "all", type: "all", curation: "all" });
  const [p0Only, setP0Only] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const isAdmin = role === "admin";
  const p0RelIds = useMemo(() => new Set(EXEMPLAR_CURATOR_TARGETS.map((t) => t.relId)), []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await listFn({ data: { ...filter, after, limit: 50 } });
      setRows(data.items);
      setNextCursor(data.nextCursor);
    } catch (e) {
      setLoadError(true);
      setMsg(e instanceof Error ? e.message : "Failed to load evidence records");
    }
    setLoading(false);
  }, [listFn, filter, after]);

  useEffect(() => {
    roleFn().then((r) => { setRole(r.role); setEmail(r.email); }).catch(() => { setRole(null); setMsg("Your access level could not be loaded. Editing is unavailable."); });
  }, [roleFn]);
  useEffect(() => {
    load();
  }, [load]);
  const changeFilter = (next: typeof filter) => { setAfter(undefined); setPageHistory([]); setFilter(next); };

  const stats = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach((r) => { c[r.check_status] = (c[r.check_status] || 0) + 1; });
    return {
      total: rows.length,
      withSource: rows.filter((r) => r.source_ref || r.pmid || r.doi).length,
      verified: (c["verified"] || 0) + (c["matched"] || 0),
      review: (c["ambiguous"] || 0) + (c["not_found"] || 0) + (c["unavailable"] || 0),
      research: c["research_required"] || 0,
      approved: rows.filter((r) => r.curation === "approved").length,
      pending: c["pending"] || 0,
    };
  }, [rows]);

  const onFile = async (f: File) => {
    setMsg("");
    try {
      const json = JSON.parse(await f.text());
      const r = await importFn({ data: json });
      setMsg(`Imported ${r.received} citation slots (${r.added} new). Existing records kept their decisions.`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? `Import failed: ${e.message}` : "Import failed — is this a citation manifest?");
    }
  };

  const check = async (mode: "pending" | "retry") => {
    const targets = rows.filter((r) => (mode === "pending" ? r.check_status === "pending" : r.check_status === "unavailable")).map((r) => r.id);
    if (!targets.length) { setMsg("Nothing to check."); return; }
    setProgress({ done: 0, total: targets.length });
    for (let i = 0; i < targets.length; i += 4) {
      try { await checkFn({ data: { ids: targets.slice(i, i + 4) } }); }
      catch { setMsg("Some records could not be checked — the metadata sources were unreachable."); }
      setProgress({ done: Math.min(i + 4, targets.length), total: targets.length });
    }
    setProgress(null);
    await load();
  };

  const suggest = async () => {
    const targets = rows.filter((r) => r.check_status === "research_required" && !r.check_detail?.suggested).map((r) => r.id);
    if (!targets.length) { setMsg("Every research-required slot already has suggestions."); return; }
    setProgress({ done: 0, total: targets.length });
    let found = 0;
    let failed = 0;
    for (let i = 0; i < targets.length; i += 6) {
      try { found += (await suggestFn({ data: { ids: targets.slice(i, i + 6) } })).found; }
      catch { failed += targets.slice(i, i + 6).length; }
      setProgress({ done: Math.min(i + 6, targets.length), total: targets.length });
    }
    setProgress(null);
    setMsg(`Found candidate sources for ${found} of ${targets.length} slots on this page.${failed ? ` ${failed} lookups failed; their sources could not be checked.` : ""} Open Details to pick one; nothing is approved automatically.`);
    await load();
  };

  const patch = async (id: string, p: Partial<Pick<Rec, "curation" | "pmid" | "doi" | "notes" | "relationship_id" | "claim_support">>, recheck = false) => {
    try {
      await updateFn({ data: { id, ...p } });
      if (recheck) await checkFn({ data: { ids: [id] } });
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
      await load();
    }
  };

  const importBundled = async () => {
    setMsg("");
    try {
      const r = await importFn({ data: manifest as any });
      setMsg(`Imported ${r.received} citation slots (${r.added} new). Existing records kept their decisions.`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? `Import failed: ${e.message}` : "Import failed.");
    }
  };

  const importRelationshipQueue = async () => {
    setMsg("");
    try {
      const r = await importFn({ data: relationshipQueue as any });
      const n = (relationshipQueue as { meta?: { stats?: { relationshipsWithCite?: number } } }).meta?.stats?.relationshipsWithCite ?? "?";
      setMsg(
        `Imported ${r.received} relationship-mapped candidates (${r.added} new) covering ${n} cited links. All stay unreviewed with claim_support=unassessed — approve only after assessing each directional claim.`,
      );
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? `Import failed: ${e.message}` : "Import failed.");
    }
  };

  const previewP0 = async () => {
    setMsg("Querying PubMed for P0 exemplar gaps…");
    setProgress({ done: 0, total: EXEMPLAR_CURATOR_TARGETS.length });
    try {
      const r = await previewP0Fn();
      const seedable = r.rows.filter((row) => row.seedCandidate).length;
      const lines = r.rows.map((row) => {
        const hit = row.seedCandidate
          ? `seed PMID ${row.seedCandidate.pmid}`
          : row.hits[0]
            ? `top hit PMID ${row.hits[0].pmid} (not auto-seedable)`
            : "no hits";
        return `${row.relId}: ${row.skipReason ?? hit}`;
      });
      setMsg(
        `P0 PubMed preview (${r.fetchedAt}): ${seedable} title-heuristic seed candidate(s). ` +
          `Nothing inserted. ${lines.join(" · ")}`,
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "P0 PubMed preview failed");
    }
    setProgress(null);
  };

  const seedP0 = async () => {
    if (!window.confirm(
      "Insert unreviewed drafts only for P0 edges whose PubMed title passes a conservative heuristic? " +
        "Rows stay curation=unreviewed and claim_support=unassessed. Never invents PMIDs. Continue?",
    )) return;
    setMsg("Seeding P0 unreviewed drafts from PubMed…");
    try {
      const r = await seedP0Fn();
      setMsg(
        `P0 seed: added ${r.added} unreviewed draft(s) (${r.attempted} open targets). ` +
          `${r.notes.join(" · ")} — Check identifiers, assess claim_support, then Approve only if the paper supports the directional claim.`,
      );
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "P0 seed failed");
    }
  };

  const verifiedUnapproved = rows.filter((r) => (r.check_status === "verified" || r.check_status === "matched") && r.curation === "unreviewed");
  /** Server rejects approval without relationship_id + assessed claim_support. */
  const readyToApprove = verifiedUnapproved.filter(
    (r) => r.relationship_id && r.claim_support && r.claim_support !== "unassessed",
  );
  const claimMapped = rows.filter((r) => r.relationship_id && r.claim_support && r.claim_support !== "unassessed");
  const approvedClaimLinks = new Set(
    rows.filter((r) => r.curation === "approved" && r.relationship_id && r.claim_support === "supports").map((r) => r.relationship_id),
  ).size;
  const exemplarFocus = useMemo(() => exemplarQueueFocus(), []);
  const exemplarRelCount = exemplarFocus.relIds.length;
  const approveClaimAssessed = async () => {
    const ids = readyToApprove.map((r) => r.id);
    if (!ids.length) {
      setMsg(
        "No records ready: identifier verified + relationship mapped + claim_support assessed are all required. Identifier match alone cannot approve a claim.",
      );
      return;
    }
    setProgress({ done: 0, total: ids.length });
    let ok = 0;
    let failed = 0;
    for (let i = 0; i < ids.length; i++) {
      try {
        await updateFn({ data: { id: ids[i]!, curation: "approved" } });
        ok++;
      } catch {
        failed++;
      }
      setProgress({ done: i + 1, total: ids.length });
    }
    setProgress(null);
    setMsg(
      `Approved ${ok} claim-assessed record(s)${failed ? `; ${failed} rejected by server invariants` : ""}. Only approved + supports counts toward Gate C.`,
    );
    await load();
  };


  const shown = rows.filter((r) =>
    (filter.status === "all" || r.check_status === filter.status) &&
    (filter.type === "all" || r.node_type === filter.type) &&
    (filter.curation === "all" || r.curation === filter.curation) &&
    (!filter.q || `${r.node_name} ${r.evidence_id} ${r.source_ref ?? ""} ${r.relationship_id ?? ""}`.toLowerCase().includes(filter.q.toLowerCase())) &&
    (!p0Only || (!!r.relationship_id && p0RelIds.has(r.relationship_id))),
  );
  const types = [...new Set(KG.nodes.map((r) => r.node_type))];

  return (
    <div className="page">
      <PageHead
        kicker="Curation · Citation layer"
        title="Evidence curation"
        lede="Two separate gates: (1) identifier verification checks that a PMID/DOI resolves in PubMed or Crossref metadata; (2) claim approval maps that source to a directional relationship and assesses claim_support. Identifier verification alone never publishes a claim. Published cites support education — not treatment recommendations."
      />
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <span className="xs muted">Signed in as {email ?? "…"} · {isAdmin ? "admin" : "read-only"}</span>
        <button className="btn sm" onClick={async () => { await neonAuth.signOut(); navigate({ to: "/" }); }}>Sign out</button>
      </div>
      <p className="callout" style={{ marginBottom: 20 }} role="note">
        <strong>ID verify ≠ claim approve.</strong>{" "}
        “Identifier verified” / “One match found” means the bibliographic ID resolved — not that the paper supports the atlas claim.
        Gate C coverage counts only <code>curation=approved</code> + <code>claim_support=supports</code> on a mapped <code>relationship_id</code>.
      </p>
      <p className="callout" style={{ marginBottom: 20 }} role="note">
        <strong>Counterevidence path (not Gate C).</strong>{" "}
        Set <code>claim_support</code> to <strong>partial</strong> or <strong>contradicts</strong> when the paper only partly supports or opposes the directional claim.
        Those rows surface in Ask’s GroundingPanel counterevidence bucket — they never count as approved+supports.
        Do <strong>not</strong> invent a contradicts row to “populate” the UI; leave empty when polarity is unclear.
        Prod currently has Chemnitz as <code>partial</code> on <code>REL-R012-suppresses-C015</code> and <strong>0</strong> contradicts (honest empty).
      </p>
      {role && !isAdmin ? (
        <p className="callout" style={{ marginBottom: 20 }}>
          <strong>Read-only view.</strong> Importing manifests and approving records is limited to the atlas admin.
        </p>
      ) : null}

      {isAdmin ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: "1.05rem", marginBottom: 8 }}>Import citations</h3>
          <p className="small muted" style={{ marginBottom: 10 }}>
            Load the relationship evidence queue (KG bibliographic cites mapped to <code>relId</code>s, still unreviewed),
            the commercial-priority concept manifest (60 concepts), or upload another manifest JSON.
            New slots are added; existing ones keep their decisions. Nothing is auto-approved.
          </p>
            <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn primary" disabled={!!progress} onClick={importRelationshipQueue}>Load relationship queue</button>
            <button className="btn" disabled={!!progress} onClick={importBundled}>Load priority manifest</button>
            <button className="btn" disabled={!!progress} onClick={previewP0} title="PubMed E-utilities preview only — no writes">
              Preview P0 PubMed
            </button>
            <button
              className="btn"
              disabled={!!progress}
              onClick={seedP0}
              title="Insert unreviewed drafts only when PubMed title heuristic matches — never auto-approve"
            >
              Seed P0 unreviewed drafts
            </button>
            <input type="file" accept="application/json,.json" aria-label="Upload a manifest file" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
          </div>
          <ol className="small muted" style={{ marginTop: 12, paddingLeft: 18 }}>
            <li>Import relationship queue → 2. Check identifiers → 3. Assess claim_support per link → 4. Approve. Only approved + supports counts toward claim-level coverage.</li>
            <li>
              Demo priority (do not invent PMIDs): {EXEMPLAR_PATHWAYS.map((p) => p.title).join(" · ")}.
              Focus queue slots on these pathway edges first ({exemplarRelCount} exemplar relIds in graph).
            </li>
          </ol>
          <div style={{ marginTop: 14 }}>
            <p className="small" style={{ marginBottom: 8 }}>
              <strong>P0 exemplar Gate C gaps</strong> ({EXEMPLAR_CURATOR_TARGETS.length} targets) — PubMed queries are search starts; verify identifiers before approve.
              Do <strong>not</strong> invent PMIDs or auto-approve. Ordered human steps live in{" "}
              <code>docs/CURATOR_EVIDENCE_QUEUE.md</code>.
            </p>
            <p className="xs muted" style={{ marginBottom: 8 }}>
              Focus filter: paste a <code>relId</code> from the list below into Search (e.g.{" "}
              <code>REL-R012-suppresses-C015</code> Chemnitz reassessment, or IFN spine{" "}
              <code>REL-C005-produces-P004</code>). Check → claim_support → Approve only when the source truly supports that directional edge.
            </p>
            <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <button
                type="button"
                className={`chip${p0Only ? " on" : ""}`}
                onClick={() => setP0Only((v) => !v)}
                title="Show only rows on this page whose relationship_id is a P0 PD-1/IFN exemplar target"
              >
                {p0Only ? "P0 page filter on" : "P0 page filter off"}
              </button>
              {EXEMPLAR_CURATOR_TARGETS.slice(0, 8).map((t) => (
                <button
                  key={t.relId}
                  type="button"
                  className="chip"
                  title={t.pubmedQuery}
                  onClick={() => {
                    changeFilter({ ...filter, q: t.relId });
                    void navigator.clipboard?.writeText(t.pubmedQuery).then(
                      () => setMsg(`Filtered to ${t.relId}; PubMed query copied — verify before approve; never invent PMIDs.`),
                      () => setMsg(`Filtered to ${t.relId}.`),
                    );
                  }}
                >
                  Filter {t.relId.replace(/^REL-/, "").slice(0, 28)}
                </button>
              ))}
            </div>
            <ul className="xs muted" style={{ paddingLeft: 18, margin: 0 }}>
              {EXEMPLAR_PATHWAYS.map((p) => (
                <li key={p.id} style={{ marginBottom: 6 }}>
                  <b>{p.title}</b> — {EXEMPLAR_MATURITY_LABEL[p.maturity]}
                  <ul style={{ paddingLeft: 16, marginTop: 4 }}>
                    {EXEMPLAR_CURATOR_TARGETS.filter((t) => t.pathwayId === p.id).map((t) => (
                      <li key={t.relId}>
                        <code>{t.relId}</code>: {t.pubmedQuery}
                        {t.neonHint ? ` · ${t.neonHint}` : ""}
                      </li>
                    ))}
                    {!EXEMPLAR_CURATOR_TARGETS.some((t) => t.pathwayId === p.id) ? (
                      <li>No open P0 targets listed — on-path approved+supports complete (teaching caveats still apply).</li>
                    ) : null}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <p className="small muted">Statistics and batch actions apply to the current page of records.</p>
      <div className="ev-stats">
        <div className="ev-stat"><b>{stats.total}</b><span>citation slots</span></div>
        <div className="ev-stat"><b>{stats.withSource}</b><span>name a source</span></div>
        <div className="ev-stat"><b>{stats.verified}</b><span>IDs verified (metadata only)</span></div>
        <div className="ev-stat"><b>{claimMapped.length}</b><span>claim-assessed (not yet Gate C)</span></div>
        <div className="ev-stat"><b>{approvedClaimLinks}</b><span>approved + supports links</span></div>
        <div className="ev-stat"><b>{stats.approved}</b><span>approved rows</span></div>
      </div>

      {isAdmin ? (
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn primary" disabled={!!progress || !stats.pending} onClick={() => check("pending")}>Check {stats.pending} unchecked</button>
          <button className="btn" disabled={!!progress} onClick={() => check("retry")}>Retry unreachable</button>
          <button className="btn" disabled={!!progress || !stats.research} onClick={suggest}>Suggest sources</button>
          <button
            className="btn"
            disabled={!!progress || !readyToApprove.length}
            title={
              verifiedUnapproved.length && !readyToApprove.length
                ? `${verifiedUnapproved.length} identifier-verified but still need relationship + claim_support`
                : undefined
            }
            onClick={approveClaimAssessed}
          >
            Approve {readyToApprove.length} claim-assessed
          </button>
        </div>
      ) : null}
      {progress ? (
        <div style={{ marginTop: 10 }}>
          <span className="xs muted">Checked {progress.done} of {progress.total}</span>
          <div className="ev-progress"><span style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
        </div>
      ) : null}
      {msg ? <p className="callout" style={{ marginTop: 12 }}>{msg}</p> : null}

      {isAdmin ? <HealthReport /> : null}

      <div className="ev-filters">
        <input type="text" aria-label="Search evidence records" placeholder="Search concept, ID or source" value={filter.q} onChange={(e) => changeFilter({ ...filter, q: e.target.value })} />
        <select aria-label="Check result" value={filter.status} onChange={(e) => changeFilter({ ...filter, status: e.target.value })}>
          <option value="all">Any check result</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select aria-label="Concept type" value={filter.type} onChange={(e) => changeFilter({ ...filter, type: e.target.value })}>
          <option value="all">Any type</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select aria-label="Curation decision" value={filter.curation} onChange={(e) => changeFilter({ ...filter, curation: e.target.value })}>
          <option value="all">Any decision</option>
          <option value="unreviewed">Unreviewed</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <span className="xs muted">{shown.length} shown</span>
      </div>

      {loading ? <p className="empty">Loading records…</p> : loadError ? (
        <p className="callout" role="alert">Evidence records could not be loaded. This is not an empty collection. <Button variant="outline" onClick={load}>Retry</Button></p>
      ) : !rows.length ? (
        <p className="empty card">No records match this page or filter.{isAdmin ? " Import a manifest above to begin if the collection is empty." : ""}</p>
      ) : (
        <div className="table-wrap">
          <table className="ev-table">
            <thead><tr><th>Concept</th><th>Slot</th><th>Source</th><th>Check</th><th>Decision</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <Fragment key={r.id}>
                  <tr>
                    <td><strong>{r.node_name}</strong><div className="xs mono muted">{r.node_id} · {r.node_type}</div></td>
                    <td className="small">{r.source_type}<div className="xs mono muted">{r.evidence_id}</div></td>
                    <td className="ev-cite">
                      {r.source_ref ?? <span className="muted">—</span>}
                      {r.pmid ? <div className="xs mono"><a href={`https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`} target="_blank" rel="noreferrer">PMID {r.pmid}</a></div> : null}
                      {r.doi ? <div className="xs mono"><a href={`https://doi.org/${r.doi}`} target="_blank" rel="noreferrer">doi:{r.doi}</a></div> : null}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_CLASS[r.check_status] ?? ""}`}>{STATUS_LABEL[r.check_status] ?? r.check_status}</span>
                      <div><button className="nodelink xs" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? "Hide" : "Details"}</button></div>
                    </td>
                    <td>
                      {isAdmin ? (
                        <div className="row" style={{ gap: 4 }}>
                          <button className={`chip${r.curation === "approved" ? " on" : ""}`} onClick={() => patch(r.id, { curation: r.curation === "approved" ? "unreviewed" : "approved" })}>Approve</button>
                          <button className={`chip${r.curation === "rejected" ? " on" : ""}`} onClick={() => patch(r.id, { curation: r.curation === "rejected" ? "unreviewed" : "rejected" })}>Reject</button>
                        </div>
                      ) : <span className="small">{r.curation}</span>}
                    </td>
                  </tr>
                  {open === r.id ? (
                    <tr><td colSpan={5}><RecordDetail r={r} isAdmin={isAdmin} onSave={(p) => patch(r.id, p, true)} onClaim={(p) => patch(r.id, p)} /></td></tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="row" aria-label="Evidence pages">
        <Button variant="outline" disabled={loading || !pageHistory.length} onClick={() => { setAfter(pageHistory.at(-1)); setPageHistory((h) => h.slice(0, -1)); }}>Previous page</Button>
        <span className="small">Page {pageHistory.length + 1}</span>
        <Button variant="outline" disabled={loading || loadError || !nextCursor} onClick={() => { if (!nextCursor) return; setPageHistory((h) => [...h, after]); setAfter(nextCursor); }}>Next page</Button>
      </div>
    </div>
  );
}

function RecordDetail({ r, isAdmin, onSave, onClaim }: { r: Rec; isAdmin: boolean; onSave: (p: { pmid: string | null; doi: string | null }) => void; onClaim: (p: { relationship_id?: string | null; claim_support?: string }) => void }) {
  const links = [...(out[r.node_id] || []), ...(inn[r.node_id] || [])];
  const [pmid, setPmid] = useState(r.pmid ?? "");
  const [doi, setDoi] = useState(r.doi ?? "");
  const d = r.check_detail || {};
  const cands: any[] = d.candidates || (d.candidate ? [d.candidate] : []);
  return (
    <div className="ev-diff">
      <div className="ev-col">
        <h5>Manifest</h5>
        <dl>
          <dt>Status</dt><dd>{r.manifest_status}</dd>
          <dt>Reference</dt><dd>{r.source_ref ?? "—"}</dd>
          <dt>Search hint</dt><dd>{r.search_query ? <a href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(r.search_query)}`} target="_blank" rel="noreferrer">{r.search_query}</a> : "—"}</dd>
          {d.term ? <><dt>Query used</dt><dd className="mono">{d.term}</dd></> : null}
          {d.reason ? <><dt>Note</dt><dd>{d.reason}</dd></> : null}
        </dl>
      </div>
      {cands.map((c, i) => (
        <div className="ev-col" key={i}>
          <h5>{d.source ?? "Match"} {cands.length > 1 ? `candidate ${i + 1}${d.hits > cands.length ? ` of ${d.hits}` : ""}` : ""}</h5>
          <dl>
            <dt>Title</dt><dd>{c.title}</dd>
            <dt>Author</dt><dd>{c.first_author}</dd>
            <dt>Journal</dt><dd>{c.journal} {c.year}</dd>
            {c.pmid ? <><dt>PMID</dt><dd><a href={`https://pubmed.ncbi.nlm.nih.gov/${c.pmid}/`} target="_blank" rel="noreferrer">{c.pmid}</a></dd></> : null}
            {c.doi ? <><dt>DOI</dt><dd>{c.doi}</dd></> : null}
          </dl>
          {isAdmin && c.pmid && c.pmid !== r.pmid ? (
            <button className="btn sm" style={{ marginTop: 8 }} onClick={() => onSave({ pmid: c.pmid, doi: c.doi ?? null })}>Use this PMID</button>
          ) : null}
        </div>
      ))}
      <div className="ev-col">
        <h5>Claim mapping</h5>
        <p className="xs muted" style={{ marginBottom: 8 }}>A source only supports a link once it is mapped to that exact directional claim and its support is assessed.</p>
        <label className="field">Relationship
          <select value={r.relationship_id ?? ""} disabled={!isAdmin} onChange={(e) => onClaim({ relationship_id: e.target.value || null })}>
            <option value="">Concept-level only (no link claim)</option>
            {links.map((l) => <option key={relId(l)} value={relId(l)}>{byId[l.subject_id]?.name} {human(l.relation)} {byId[l.object_id]?.name}</option>)}
          </select>
        </label>
        <label className="field" style={{ marginTop: 8 }}>Claim support
          <select value={r.claim_support ?? "unassessed"} disabled={!isAdmin || !r.relationship_id} onChange={(e) => onClaim({ claim_support: e.target.value })}>
            <option value="unassessed">Not assessed</option>
            <option value="supports">Supports (Gate C eligible when approved)</option>
            <option value="partial">Partial — counterevidence path (not Gate C)</option>
            <option value="contradicts">Contradicts — counterevidence path (not Gate C)</option>
            <option value="unrelated">Does not address it</option>
          </select>
        </label>
        {(r.claim_support === "partial" || r.claim_support === "contradicts") && (
          <p className="xs muted" style={{ marginTop: 8 }} role="status">
            This assessment is counterevidence for Ask / Inspector — it will not raise Gate C coverage even if curation is later approved.
            Approve is blocked unless claim_support is supports.
          </p>
        )}
        {r.reviewed_at ? <p className="xs muted" style={{ marginTop: 8 }}>Reviewed {new Date(r.reviewed_at).toLocaleDateString()}{r.reviewed_by ? ` by ${r.reviewed_by}` : ""}</p> : null}
      </div>
      {isAdmin ? (
        <div className="ev-col">
          <h5>Set identifier</h5>
          <div className="stack" style={{ gap: 8 }}>
            <label className="field">PMID<input value={pmid} onChange={(e) => setPmid(e.target.value.replace(/\D/g, ""))} /></label>
            <label className="field">DOI<input value={doi} onChange={(e) => setDoi(e.target.value.trim())} /></label>
            <button className="btn sm" onClick={() => onSave({ pmid: pmid || null, doi: doi || null })}>Save and re-check</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

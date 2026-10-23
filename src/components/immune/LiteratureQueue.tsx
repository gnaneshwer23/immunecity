import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { byId } from "@/lib/immune/engine";
import { knowledgeGapQueue } from "@/lib/immune/domainCoverage";
import { GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION } from "@/lib/immune/graphRelease";
import {
  addCandidateClaim,
  advanceStep,
  canAcceptForCuration,
  canAdvance,
  canVisitLitStep,
  CLAIM_SUPPORT_LABEL,
  createLiteratureProject,
  exportCurationManifest,
  exportProjectJson,
  goToStep,
  handoffReadiness,
  litSteps,
  mapClaim,
  parseLiteratureProjectJson,
  reviewClaim,
  runMetadataValidation,
  searchMetadataComplete,
  seedFromCoverageGap,
  setClaimSupport,
  STEP_LABEL,
  stepIndex,
  suggestConceptMatches,
  suggestRelationshipMatches,
  updateSearch,
  queueStats,
  type ClaimSupport,
  type LiteratureProject,
} from "@/lib/research/literatureWorkflow";
import type { SearchMetadata } from "@/lib/research/literatureWorkflow";

function downloadJson(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type Props = {
  /** Hand project JSON to the Scientific Workbench on Research (candidates only). */
  onSendToWorkbench?: (projectJson: string) => void;
  /** Prefill source metadata (e.g. from the Research Library); remount with a new key to apply. */
  seed?: Partial<SearchMetadata>;
};

export default function LiteratureQueue({ onSendToWorkbench, seed }: Props) {
  const [project, setProject] = useState<LiteratureProject>(() =>
    createLiteratureProject(GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION, seed),
  );
  const [claimText, setClaimText] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [subjectHint, setSubjectHint] = useState("");
  const [objectHint, setObjectHint] = useState("");
  const [mapConcept, setMapConcept] = useState("");
  const [mapRel, setMapRel] = useState("");
  const [activeClaim, setActiveClaim] = useState<string | null>(null);
  const [restoreRaw, setRestoreRaw] = useState("");
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const gapSeeds = useMemo(() => knowledgeGapQueue(8), []);
  const stats = useMemo(() => queueStats(project), [project]);
  const searchOk = searchMetadataComplete(project.search).ok;
  const steps = litSteps();
  const gate = canAdvance(project);
  const handoff = useMemo(() => handoffReadiness(project), [project]);
  const active = project.claims.find((c) => c.claim_id === activeClaim) ?? null;
  const conceptSuggestions = useMemo(
    () => suggestConceptMatches(mapConcept.includes(",") ? mapConcept.split(",").pop() ?? "" : mapConcept),
    [mapConcept],
  );
  const relSuggestions = useMemo(() => {
    const ids = (active?.mappedConceptIds.length ? active.mappedConceptIds : mapConcept.split(",").map((s) => s.trim()).filter(Boolean));
    return suggestRelationshipMatches(ids);
  }, [active, mapConcept]);
  const manifest = useMemo(() => exportCurationManifest(project), [project]);
  const acceptedCount = stats.accepted;

  return (
    <div className="lit-queue">
      <p className="lede">
        Literature intelligence (PRD FR-036/037): identify a source, validate metadata locally, extract candidate claims,
        map to canonical graph IDs, flag conflicts, then prepare records for human curation.
        Identifiers are optional and never invented. Accepted items stay <b>candidates</b> — they do not approve graph claims.
        This is <b>not</b> live PubMed bulk ingest; server-side PubMed/Crossref checks run only after you import a manifest in Curation.
      </p>

      <ol className="row" style={{ listStyle: "none", padding: 0, gap: 8, flexWrap: "wrap" }} aria-label="Workflow steps">
        {steps.map((s) => {
          const visit = canVisitLitStep(project, s);
          return (
            <li key={s}>
              <button
                type="button"
                className={`chip ${project.step === s ? "on" : visit.ok ? "" : "muted"}`}
                aria-current={project.step === s ? "step" : undefined}
                disabled={!visit.ok}
                title={visit.ok ? STEP_LABEL[s] : visit.reason}
                onClick={() => setProject(goToStep(project, s))}
              >
                {STEP_LABEL[s]}
              </button>
            </li>
          );
        })}
      </ol>

      <p className="xs muted">
        Project <span suppressHydrationWarning>{project.project_id}</span> · graph v{project.graphVersion} · extensions {project.extensionsVersion} · status {project.status}
        {" · "}furthest {STEP_LABEL[project.furthestStep ?? project.step]}
        {project.seededFromGapId ? ` · seeded from ${project.seededFromGapId}` : ""}
        {" · "}queue {stats.queued} / accepted {stats.accepted} / rejected {stats.rejected}
        {" · "}conflicts {stats.conflicts.total}
        {stats.conflicts.blocking ? ` (${stats.conflicts.blocking} blocking)` : ""}
      </p>

      <section className="card" style={{ marginTop: 12, display: "grid", gap: 8 }}>
        <h3 style={{ fontSize: "1.05rem" }}>Seed from coverage gap (B → C)</h3>
        <p className="xs muted" style={{ margin: 0 }}>
          Starts a draft literature project from a Phase B gap. Maps known concept/rel IDs when present; never invents PMID/DOI.
        </p>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {gapSeeds.map((g) => (
            <button
              key={g.id}
              type="button"
              className="chip"
              title={g.detail}
              onClick={() => {
                const next = seedFromCoverageGap(g, GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION);
                setProject(next);
                setActiveClaim(next.claims[0]?.claim_id ?? null);
                setRestoreError(null);
              }}
            >
              {g.title}
            </button>
          ))}
        </div>
        <label className="field">Restore draft project JSON
          <textarea
            rows={2}
            value={restoreRaw}
            onChange={(e) => setRestoreRaw(e.target.value)}
            placeholder="Paste a literature project export (draft only)"
          />
        </label>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn sm"
            disabled={!restoreRaw.trim()}
            onClick={() => {
              const parsed = parseLiteratureProjectJson(restoreRaw);
              if (parsed.error || !parsed.project) {
                setRestoreError(parsed.error ?? "Could not restore project");
                return;
              }
              setProject(parsed.project);
              setActiveClaim(parsed.project.claims[0]?.claim_id ?? null);
              setRestoreError(null);
              setRestoreRaw("");
            }}
          >
            Restore project
          </button>
          {restoreError && <span className="xs muted" role="status">{restoreError}</span>}
        </div>
      </section>

      {(project.step === "source_identification" || project.step === "metadata_validation") && (
        <section className="card" style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <h3 style={{ fontSize: "1.05rem" }}>
            {project.step === "source_identification" ? "Source identification" : "Metadata validation"}
          </h3>
          <label className="field">Search query
            <input
              value={project.search.query}
              onChange={(e) => setProject(updateSearch(project, { query: e.target.value }))}
              placeholder="e.g. HLA-B27 ankylosing spondylitis mechanism"
            />
          </label>
          <label className="field">Title (or provide PMID/DOI below)
            <input
              value={project.search.title ?? ""}
              onChange={(e) => setProject(updateSearch(project, { title: e.target.value }))}
            />
          </label>
          <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
            <label className="field" style={{ flex: 1, minWidth: 140 }}>PMID (optional, user-supplied)
              <input
                value={project.search.pmid ?? ""}
                onChange={(e) => setProject(updateSearch(project, { pmid: e.target.value || undefined }))}
                placeholder="Leave blank if unknown — never invent"
              />
            </label>
            <label className="field" style={{ flex: 1, minWidth: 140 }}>DOI (optional)
              <input
                value={project.search.doi ?? ""}
                onChange={(e) => setProject(updateSearch(project, { doi: e.target.value || undefined }))}
              />
            </label>
            <label className="field" style={{ flex: 1, minWidth: 100 }}>Year
              <input
                value={project.search.year ?? ""}
                onChange={(e) => setProject(updateSearch(project, { year: e.target.value || undefined }))}
              />
            </label>
          </div>
          <label className="field">Journal
            <input
              value={project.search.journal ?? ""}
              onChange={(e) => setProject(updateSearch(project, { journal: e.target.value || undefined }))}
            />
          </label>
          {!searchOk && <p className="xs muted">Need a query plus title, PMID, or DOI before advancing.</p>}
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn sm" onClick={() => setProject(runMetadataValidation(project))}>
              Run local metadata validation
            </button>
            <span className="chip">check: {project.search.metadataCheck}</span>
          </div>
          {project.search.metadataNotes.length > 0 && (
            <ul className="small" style={{ margin: 0 }}>
              {project.search.metadataNotes.map((n) => <li key={n}>{n}</li>)}
            </ul>
          )}
          <p className="xs muted">
            Live PubMed/Crossref verification runs in{" "}
            <Link to="/curation">Citation curation</Link> after import. This page does not check identifiers itself.
          </p>
        </section>
      )}

      {(project.step === "candidate_claims" ||
        project.step === "map_concepts" ||
        project.step === "conflict_flags" ||
        project.step === "claim_approval" ||
        project.claims.length > 0) && (
        <section className="card" style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <h3 style={{ fontSize: "1.05rem" }}>Candidate claim</h3>
          <label className="field">Claim text
            <textarea
              rows={2}
              value={claimText}
              onChange={(e) => setClaimText(e.target.value)}
              placeholder="Candidate mechanistic claim — labelled draft until reviewed"
            />
          </label>
          <label className="field">Supporting excerpt (paste only what you are allowed to store)
            <textarea rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
          </label>
          <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
            <label className="field" style={{ flex: 1, minWidth: 140 }}>Subject hint
              <input value={subjectHint} onChange={(e) => setSubjectHint(e.target.value)} placeholder="e.g. HLA-B27" />
            </label>
            <label className="field" style={{ flex: 1, minWidth: 140 }}>Object hint
              <input value={objectHint} onChange={(e) => setObjectHint(e.target.value)} placeholder="e.g. axial spondyloarthritis" />
            </label>
          </div>
          <button
            type="button"
            className="btn sm"
            disabled={!claimText.trim()}
            onClick={() => {
              const next = addCandidateClaim(project, {
                text: claimText,
                excerpt,
                subjectHint,
                objectHint,
              });
              setProject(next);
              setActiveClaim(next.claims[next.claims.length - 1]?.claim_id ?? null);
              setClaimText("");
              setExcerpt("");
              setSubjectHint("");
              setObjectHint("");
            }}
          >
            Add candidate claim
          </button>
        </section>
      )}

      {project.claims.length > 0 && (
        <section className="card" style={{ marginTop: 16, display: "grid", gap: 12 }}>
          <h3 style={{ fontSize: "1.05rem" }}>Review queue</h3>
          {project.claims.map((c) => (
            <article key={c.claim_id} className="card" style={{ background: "transparent" }}>
              <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <span className="chip">candidate</span>
                <span className="xs muted">{c.reviewStatus} · support {c.claimSupport}</span>
              </div>
              <p className="small" style={{ marginTop: 8 }}>{c.text}</p>
              {c.excerpt ? <p className="xs muted" style={{ marginTop: 6 }}>Excerpt: {c.excerpt}</p> : null}
              <p className="xs muted" style={{ marginTop: 6 }}>
                Concepts:{" "}
                {c.mappedConceptIds.length
                  ? c.mappedConceptIds.map((id) => (byId[id] ? `${id} (${byId[id].name})` : `${id} ?`)).join(", ")
                  : "unmapped"}
                {" · "}Rels: {c.mappedRelationshipIds.join(", ") || "unmapped"}
              </p>
              {c.conflictFlags.length > 0 && (
                <ul className="xs" style={{ marginTop: 8 }}>
                  {c.conflictFlags.map((f) => (
                    <li key={f.flag_id} className={f.severity === "blocking" ? "" : "muted"}>
                      [{f.severity}] {f.message}
                    </li>
                  ))}
                </ul>
              )}
              <label className="field" style={{ marginTop: 8 }}>Proposed claim support
                <select
                  value={c.claimSupport}
                  onChange={(e) => setProject(setClaimSupport(project, c.claim_id, e.target.value as ClaimSupport))}
                >
                  {(Object.keys(CLAIM_SUPPORT_LABEL) as ClaimSupport[]).map((k) => (
                    <option key={k} value={k}>{CLAIM_SUPPORT_LABEL[k]}</option>
                  ))}
                </select>
              </label>
              <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                <button type="button" className="btn sm" onClick={() => setActiveClaim(c.claim_id)}>Map</button>
                {(() => {
                  const acceptGate = canAcceptForCuration(project, c.claim_id);
                  return (
                    <button
                      type="button"
                      className="btn sm"
                      disabled={!acceptGate.ok}
                      title={acceptGate.ok ? "Queue as unreviewed candidate" : acceptGate.reason}
                      onClick={() => setProject(reviewClaim(project, c.claim_id, "accepted_for_curation"))}
                    >
                      Accept for curation
                    </button>
                  );
                })()}
                <button type="button" className="btn sm" onClick={() => setProject(reviewClaim(project, c.claim_id, "needs_edit"))}>
                  Needs edit
                </button>
                <button type="button" className="btn sm" onClick={() => setProject(reviewClaim(project, c.claim_id, "rejected"))}>
                  Reject
                </button>
              </div>
            </article>
          ))}

          {activeClaim && active && (
            <div className="card" style={{ display: "grid", gap: 8 }}>
              <h4 className="small">Map claim {activeClaim}</h4>
              <label className="field">Concept IDs (comma-separated)
                <input
                  value={mapConcept}
                  onChange={(e) => setMapConcept(e.target.value)}
                  placeholder="e.g. EG01, EG10"
                />
              </label>
              {conceptSuggestions.length > 0 && (
                <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                  {conceptSuggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="chip"
                      onClick={() => {
                        const parts = mapConcept.split(",").map((x) => x.trim()).filter(Boolean);
                        const last = parts[parts.length - 1];
                        const base = last && !byId[last] ? parts.slice(0, -1) : parts;
                        if (!base.includes(s.id)) setMapConcept([...base, s.id].join(", "));
                      }}
                    >
                      {s.id} · {s.name}
                    </button>
                  ))}
                </div>
              )}
              <label className="field">Relationship IDs (relId)
                <input
                  value={mapRel}
                  onChange={(e) => setMapRel(e.target.value)}
                  placeholder="e.g. REL-EG01-associates_with-EG10"
                />
              </label>
              {relSuggestions.length > 0 && (
                <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                  {relSuggestions.map((s) => (
                    <button
                      key={s.relId}
                      type="button"
                      className="chip"
                      onClick={() => {
                        const parts = mapRel.split(",").map((x) => x.trim()).filter(Boolean);
                        if (!parts.includes(s.relId)) setMapRel([...parts, s.relId].join(", "));
                      }}
                    >
                      {s.relId}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="btn sm"
                onClick={() => {
                  setProject(mapClaim(
                    project,
                    activeClaim,
                    mapConcept.split(",").map((s) => s.trim()).filter(Boolean),
                    mapRel.split(",").map((s) => s.trim()).filter(Boolean),
                  ));
                }}
              >
                Save mapping
              </button>
            </div>
          )}
        </section>
      )}

      {(project.step === "conflict_flags" || project.step === "claim_approval" || stats.conflicts.total > 0) && (
        <section className="card" style={{ marginTop: 16, display: "grid", gap: 8 }}>
          <h3 style={{ fontSize: "1.05rem" }}>Conflict flags</h3>
          <p className="xs muted">
            Blocking flags (unknown IDs, unmapped acceptances) must be cleared before advancing past conflict review.
            Warnings (disagreements, contradicts-established) stay visible for the curator.
          </p>
          {stats.conflicts.total === 0 ? (
            <p className="small muted">No conflicts detected in the current queue.</p>
          ) : (
            <ul className="small">
              {project.claims.flatMap((c) =>
                c.conflictFlags.map((f) => (
                  <li key={f.flag_id}>
                    <span className="chip">{f.severity}</span> {c.claim_id}: {f.message}
                  </li>
                )),
              )}
            </ul>
          )}
        </section>
      )}

      {(acceptedCount > 0 || handoff.issues.length > 0) && (
        <section className="card" style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <h3 style={{ fontSize: "1.05rem" }}>Curation handoff</h3>
          <p className="small muted">
            {handoff.accepted} claim(s) accepted · {handoff.exportable} exportable row(s). Export a candidate manifest for{" "}
            <Link to="/curation">Citation curation</Link>. Import adds unreviewed rows only — scientific claim approval
            stays a separate human step. This UI never writes approved evidence.
          </p>
          <p className="xs muted">
            Manifest groups: {manifest.evidence_records.length} · meta.curation = {manifest.meta.curation}
            {" · "}ready={String(handoff.ready)}
          </p>
          {handoff.issues.length > 0 && (
            <ul className="xs" style={{ margin: 0 }}>
              {handoff.issues.map((n) => <li key={n}>{n}</li>)}
            </ul>
          )}
          {handoff.warnings.length > 0 && (
            <ul className="xs muted" style={{ margin: 0 }}>
              {handoff.warnings.map((n) => <li key={n}>{n}</li>)}
            </ul>
          )}
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn sm"
              disabled={!handoff.ready}
              title={handoff.ready ? "Download unreviewed candidate manifest" : handoff.issues[0]}
              onClick={() =>
                downloadJson(
                  `${project.project_id}-curation-candidates.json`,
                  JSON.stringify(manifest, null, 2),
                )
              }
            >
              Export curation candidate manifest
            </button>
            <Link className="btn sm" to="/curation">Open curation workspace</Link>
          </div>
        </section>
      )}

      <div className="row" style={{ marginTop: 16, gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          className="btn sm"
          disabled={stepIndex(project.step) >= steps.length - 1 || !gate.ok}
          onClick={() => setProject(advanceStep(project))}
          title={gate.ok ? "Advance" : gate.reason}
        >
          Advance workflow step
        </button>
        {!gate.ok && project.step !== "claim_approval" && (
          <span className="xs muted">{gate.reason}</span>
        )}
        <button
          type="button"
          className="btn sm"
          onClick={() => downloadJson(`${project.project_id}.json`, exportProjectJson(project))}
        >
          Export project JSON
        </button>
        {onSendToWorkbench && (
          <button
            type="button"
            className="btn sm"
            disabled={project.claims.filter((c) => c.text.trim()).length === 0}
            title="Import claims into the Scientific Workbench as candidate evidence notes"
            onClick={() => {
              onSendToWorkbench(exportProjectJson(project));
              const el = document.getElementById("workbench");
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            Send to workbench (candidates)
          </button>
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { byId } from "@/lib/immune/engine";
import { GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION } from "@/lib/immune/graphRelease";
import {
  addCandidateClaim,
  advanceStep,
  createLiteratureProject,
  litSteps,
  mapClaim,
  reviewClaim,
  searchMetadataComplete,
  stepIndex,
  queueStats,
  type LiteratureProject,
  type LitStep,
} from "@/lib/research/literatureWorkflow";

const STEP_LABEL: Record<LitStep, string> = {
  search_metadata: "1. Search metadata",
  candidate_claims: "2. Candidate claims",
  map_concepts: "3. Map to graph",
  human_review: "4. Human review",
};

export default function LiteratureQueue() {
  const [project, setProject] = useState<LiteratureProject>(() =>
    createLiteratureProject(GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION),
  );
  const [claimText, setClaimText] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [mapConcept, setMapConcept] = useState("");
  const [mapRel, setMapRel] = useState("");
  const [activeClaim, setActiveClaim] = useState<string | null>(null);
  const stats = useMemo(() => queueStats(project), [project]);
  const searchOk = searchMetadataComplete(project.search).ok;
  const steps = litSteps();

  return (
    <div className="lit-queue">
      <p className="lede">
        Scaffold for literature intelligence (PRD FR-036/037). Steps are separate; identifiers are optional and never invented.
        Accepted items stay <b>candidates for curation</b> — they do not write to the curated graph.
      </p>
      <ol className="row" style={{ listStyle: "none", padding: 0, gap: 8, flexWrap: "wrap" }}>
        {steps.map((s) => (
          <li key={s}>
            <span className={`chip ${project.step === s ? "" : "muted"}`} aria-current={project.step === s ? "step" : undefined}>
              {STEP_LABEL[s]}
            </span>
          </li>
        ))}
      </ol>
      <p className="xs muted">
        Project {project.project_id} · graph v{project.graphVersion} · extensions {project.extensionsVersion} · status {project.status}
        {" · "}queue {stats.queued} / accepted {stats.accepted} / rejected {stats.rejected}
      </p>

      <section className="card" style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <h3 style={{ fontSize: "1.05rem" }}>Search metadata</h3>
        <label className="field">Search query
          <input
            value={project.search.query}
            onChange={(e) => setProject({ ...project, search: { ...project.search, query: e.target.value }, updatedAt: new Date().toISOString() })}
            placeholder="e.g. HLA-B27 ankylosing spondylitis mechanism"
          />
        </label>
        <label className="field">Title (or provide PMID/DOI below)
          <input
            value={project.search.title ?? ""}
            onChange={(e) => setProject({ ...project, search: { ...project.search, title: e.target.value }, updatedAt: new Date().toISOString() })}
          />
        </label>
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <label className="field" style={{ flex: 1, minWidth: 140 }}>PMID (optional, user-supplied)
            <input
              value={project.search.pmid ?? ""}
              onChange={(e) => setProject({ ...project, search: { ...project.search, pmid: e.target.value || undefined }, updatedAt: new Date().toISOString() })}
              placeholder="Leave blank if unknown"
            />
          </label>
          <label className="field" style={{ flex: 1, minWidth: 140 }}>DOI (optional)
            <input
              value={project.search.doi ?? ""}
              onChange={(e) => setProject({ ...project, search: { ...project.search, doi: e.target.value || undefined }, updatedAt: new Date().toISOString() })}
            />
          </label>
        </div>
        {!searchOk && <p className="xs muted">Need a query plus title, PMID, or DOI before advancing.</p>}
      </section>

      <section className="card" style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <h3 style={{ fontSize: "1.05rem" }}>Candidate claim</h3>
        <label className="field">Claim text
          <textarea rows={2} value={claimText} onChange={(e) => setClaimText(e.target.value)} placeholder="Candidate mechanistic claim — labelled draft until reviewed" />
        </label>
        <label className="field">Supporting excerpt (paste only what you are allowed to store)
          <textarea rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        </label>
        <button
          type="button"
          className="btn sm"
          disabled={!claimText.trim()}
          onClick={() => {
            const next = addCandidateClaim(project, { text: claimText, excerpt });
            setProject(next);
            setActiveClaim(next.claims[next.claims.length - 1]?.claim_id ?? null);
            setClaimText("");
            setExcerpt("");
          }}
        >
          Add candidate claim
        </button>
      </section>

      {project.claims.length > 0 && (
        <section className="card" style={{ marginTop: 16, display: "grid", gap: 12 }}>
          <h3 style={{ fontSize: "1.05rem" }}>Review queue</h3>
          {project.claims.map((c) => (
            <article key={c.claim_id} className="card" style={{ background: "transparent" }}>
              <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <span className="chip">candidate</span>
                <span className="xs muted">{c.reviewStatus}</span>
              </div>
              <p className="small" style={{ marginTop: 8 }}>{c.text}</p>
              {c.excerpt ? <p className="xs muted" style={{ marginTop: 6 }}>Excerpt: {c.excerpt}</p> : null}
              <p className="xs muted" style={{ marginTop: 6 }}>
                Concepts: {c.mappedConceptIds.length ? c.mappedConceptIds.map((id) => (byId[id] ? `${id} (${byId[id].name})` : id)).join(", ") : "unmapped"}
                {" · "}Rels: {c.mappedRelationshipIds.join(", ") || "unmapped"}
              </p>
              <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                <button type="button" className="btn sm" onClick={() => setActiveClaim(c.claim_id)}>Map</button>
                <button type="button" className="btn sm" onClick={() => setProject(reviewClaim(project, c.claim_id, "accepted_for_curation"))}>Accept for curation</button>
                <button type="button" className="btn sm" onClick={() => setProject(reviewClaim(project, c.claim_id, "needs_edit"))}>Needs edit</button>
                <button type="button" className="btn sm" onClick={() => setProject(reviewClaim(project, c.claim_id, "rejected"))}>Reject</button>
              </div>
            </article>
          ))}
          {activeClaim && (
            <div className="card" style={{ display: "grid", gap: 8 }}>
              <h4 className="small">Map claim {activeClaim}</h4>
              <label className="field">Concept IDs (comma-separated)
                <input value={mapConcept} onChange={(e) => setMapConcept(e.target.value)} placeholder="e.g. EG01, EG10" />
              </label>
              <label className="field">Relationship IDs (comma-separated)
                <input value={mapRel} onChange={(e) => setMapRel(e.target.value)} placeholder="e.g. REL-EG01-associates_with-EG10" />
              </label>
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

      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        <button
          type="button"
          className="btn sm"
          disabled={stepIndex(project.step) >= steps.length - 1}
          onClick={() => setProject(advanceStep(project))}
        >
          Advance workflow step
        </button>
        <button
          type="button"
          className="btn sm"
          onClick={() => {
            const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${project.project_id}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export scaffold JSON
        </button>
      </div>
    </div>
  );
}

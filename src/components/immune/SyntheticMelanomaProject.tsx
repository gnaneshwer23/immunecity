import { useEffect, useState } from "react";
import rawDataset from "@/data/syntheticMelanomaProject.json";
import {
  DEMO_STORAGE_KEY, MAX_DEMO_BYTES, syntheticDatasetSchema, newSyntheticProject,
  parseSyntheticDataset, parseSyntheticProject, recordDemoDecision, syntheticConflicts,
  buildSyntheticBrief, syntheticBriefMarkdown,
  type SyntheticProject, type DemoDecision,
} from "@/lib/research/syntheticProject";

const dataset = syntheticDatasetSchema.parse(rawDataset);
function download(name: string, content: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function SyntheticMelanomaProject() {
  const [project, setProject] = useState(() => newSyntheticProject(dataset));
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState("all");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Record<string, { disposition: DemoDecision["disposition"]; note: string }>>({});
  useEffect(() => { setReady(true); }, []);
  const conflicts = syntheticConflicts(project.dataset);
  const rows = project.dataset.evidence.filter((e) => (direction === "all" || e.direction === direction) &&
    `${e.id} ${e.topic} ${e.assertion} ${e.studyContext}`.toLowerCase().includes(query.toLowerCase()));
  function attempt(action: () => void) {
    try { action(); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Operation failed."); setStatus(""); }
  }
  function change(next: SyntheticProject) { setProject(next); setStatus("Unsaved changes · save locally or export your project."); setError(""); }
  function workedExample() {
    const fresh = newSyntheticProject(dataset);
    change({ ...fresh, selectedEvidenceIds: ["SYN-EV-001", "SYN-EV-002"], decisions: [
      { evidenceId: "SYN-EV-001", disposition: "retain", note: "Worked example: retain the exploratory association for testing, not as a conclusion." },
      { evidenceId: "SYN-EV-002", disposition: "retain", note: "Worked example: retain the opposing replication result and examine protocol differences." },
    ], hypothesis: "In this synthetic scenario, specimen processing could explain the inconsistent CD8-state association.",
      prediction: "Under a single prespecified processing protocol, the between-series difference in the synthetic score would decrease.",
      experiment: "Use matched research aliquots processed under both protocols, blinded scoring, batch controls and a prespecified analysis. This is a proposal, not a validated laboratory protocol.",
      falsification: "The score difference persists under matched processing, weakening the processing explanation." });
    setPending({}); setQuery(""); setDirection("all");
  }
  async function importFile(file: File | undefined, kind: "dataset" | "project") {
    if (!file) return;
    try {
      if (file.size > MAX_DEMO_BYTES) throw new Error("File exceeds 500 KB.");
      const json = await file.text();
      const next = kind === "dataset" ? newSyntheticProject(parseSyntheticDataset(json)) : parseSyntheticProject(json);
      change(next); setPending({}); setQuery(""); setDirection("all");
      setStatus("Imported synthetic data into page memory. Save locally to keep it after reload.");
    } catch (e) { setError(e instanceof Error ? e.message : "Import failed."); setStatus(""); }
  }
  return <section aria-labelledby="synthetic-project-title" data-testid="synthetic-project" style={{ marginBottom: 32 }}>
    <h3 id="synthetic-project-title">Synthetic research project · functional sandbox</h3>
    <p className="callout"><strong>SYNTHETIC DATA ONLY.</strong> Invented sources, passages and cohort counts. This project demonstrates the research workflow; it cannot approve evidence, write the graph or support patient care.</p>
    <p>{project.dataset.description}</p>
    <p><strong>{project.dataset.datasetId} · v{project.dataset.version}</strong>{" · "}{project.dataset.evidence.length} findings · {project.dataset.cohorts.length} cohorts · {conflicts.length} conflicting claim groups</p>
    <div className="toolbar" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <button className="btn" disabled={!ready} onClick={workedExample}>Load worked example</button>
      <button className="btn" disabled={!ready} onClick={() => attempt(() => {
        const json = JSON.stringify(parseSyntheticProject(JSON.stringify(project)));
        if (new TextEncoder().encode(json).byteLength > MAX_DEMO_BYTES) throw new Error("Project exceeds 500 KB; export a smaller dataset.");
        localStorage.setItem(DEMO_STORAGE_KEY, json); setStatus("Saved on this browser only. Not account-synced.");
      })}>Save project locally</button>
      <button className="btn" disabled={!ready} onClick={() => attempt(() => {
        const json = localStorage.getItem(DEMO_STORAGE_KEY);
        if (!json) throw new Error("No locally saved synthetic project found.");
        const restored = parseSyntheticProject(json);
        setProject(restored); setPending({}); setQuery(""); setDirection("all"); setStatus("Restored the validated project from this browser.");
      })}>Restore saved project</button>
      <button className="btn" disabled={!ready} onClick={() => attempt(() => {
        localStorage.removeItem(DEMO_STORAGE_KEY); setProject(newSyntheticProject(dataset)); setPending({});
        setQuery(""); setDirection("all"); setStatus("Reset to the synthetic starter dataset and removed this demo’s local save.");
      })}>Reset synthetic project</button>
      <button className="btn" disabled={!ready} onClick={() => download("SYNTHETIC-project.json", JSON.stringify(project, null, 2))}>Export project backup</button>
      <button className="btn" disabled={!ready} onClick={() => download("SYNTHETIC-dataset.json", JSON.stringify(project.dataset, null, 2))}>Download dataset template</button>
    </div>
    <details><summary>Import synthetic dataset or project backup</summary>
      <p>JSON only, maximum 500 KB. Imports replace this page’s current demo state after validation. Real data and publication IDs are not accepted by this adapter.</p>
      <label>Import synthetic dataset<input type="file" accept=".json,application/json" disabled={!ready} onChange={(e) => { void importFile(e.target.files?.[0], "dataset"); e.target.value = ""; }} /></label>
      <label>Restore project file<input type="file" accept=".json,application/json" disabled={!ready} onChange={(e) => { void importFile(e.target.files?.[0], "project"); e.target.value = ""; }} /></label>
    </details>
    <p role="status" aria-live="polite">{status}</p>{error && <p role="alert">{error}</p>}
    <label style={{ display: "block" }}>Project research question<textarea maxLength={4000} value={project.question} rows={2} style={{ width: "100%", display: "block" }} onChange={(e) => change({ ...project, question: e.target.value })} /></label>
    <h4>1. Inspect and select synthetic findings</h4>
    <p>Search is local to this fixture. Support and contradiction labels describe the invented scenario, not scientific judgements. Each selection needs an analysis decision before brief export.</p>
    <label>Search synthetic findings<input value={query} maxLength={200} onChange={(e) => setQuery(e.target.value)} /></label>{" "}
    <label>Finding direction<select value={direction} onChange={(e) => setDirection(e.target.value)}>
      <option value="all">All directions</option><option value="supports">Supports</option><option value="contradicts">Contradicts</option><option value="background">Background</option>
    </select></label>
    <p>{rows.length} matching findings · {project.selectedEvidenceIds.length} selected · {project.decisions.length} analysis decisions recorded</p>
    {rows.length === 0 && <p>No fixture findings match this filter. This says nothing about the scientific literature.</p>}
    {rows.map((row) => {
      const saved = project.decisions.find((d) => d.evidenceId === row.id);
      const edit = pending[row.id] ?? { disposition: saved?.disposition ?? "context_only", note: saved?.note ?? "" };
      return <article className="card" key={row.id} style={{ marginBottom: 12 }}>
        <label><input type="checkbox" checked={project.selectedEvidenceIds.includes(row.id)} onChange={(e) => change({ ...project, selectedEvidenceIds: e.target.checked ? [...project.selectedEvidenceIds, row.id] : project.selectedEvidenceIds.filter((id) => id !== row.id) })} /> Select {row.id}</label>
        <h5>{row.topic} · {row.direction} · synthetic</h5><p>{row.assertion}</p>
        <blockquote>{row.passage}</blockquote>
        <p>Source: {project.dataset.sources.find((s) => s.id === row.sourceId)?.title} · {row.locator}</p>
        <p>Context: {row.studyContext}</p><p>Limitation: {row.limitation}</p>
        <label>Analysis disposition for {row.id}<select value={edit.disposition} onChange={(e) => setPending({ ...pending, [row.id]: { ...edit, disposition: e.target.value as DemoDecision["disposition"] } })}>
          <option value="retain">Retain for investigation</option><option value="context_only">Context only</option><option value="exclude">Exclude from interpretation</option>
        </select></label>
        <label style={{ display: "block" }}>Analysis note for {row.id}<textarea maxLength={4000} value={edit.note} rows={2} style={{ display: "block", width: "100%" }} onChange={(e) => setPending({ ...pending, [row.id]: { ...edit, note: e.target.value } })} /></label>
        <button disabled={!ready} className="btn" onClick={() => attempt(() => change(recordDemoDecision(project, { evidenceId: row.id, ...edit })))}>Record analysis for {row.id}</button>
        <p>{saved ? `Recorded: ${saved.disposition} — ${saved.note}` : "No analysis decision recorded."}</p>
      </article>;
    })}
    <h4>2. Resolve context before interpreting disagreement</h4>
    <p>Contrasting directions on the same scenario claim are retained together. No majority vote or automatic resolution.</p>
    {conflicts.map((c) => <details key={c.claimId}><summary>{c.claimId} · conflicting synthetic findings</summary>
      {[...c.supporting, ...c.opposing].map((e) => <p key={e.id}><strong>{e.id} · {e.direction}</strong>: {e.assertion} Context: {e.studyContext}</p>)}
    </details>)}
    <h4>3. Compare synthetic cohort observations</h4>
    <p>Fictional research arms only. Different assays, populations and follow-up windows prevent a causal ranking. Counts are calculated from the imported fixture.</p>
    <div role="region" aria-label="Synthetic cohort comparison" tabIndex={0} style={{ overflowX: "auto" }}>
      <table><caption>Synthetic cohort summaries · no real trial outcomes</caption><thead><tr><th scope="col">Cohort / intervention</th><th scope="col">Response count</th><th scope="col">Biomarker availability</th><th scope="col">Context</th></tr></thead>
        <tbody>{project.dataset.cohorts.map((c) => <tr key={c.id}>
          <th scope="row">{c.label}<br />{c.intervention}</th>
          <td>{c.responseCount}/{c.sampleSize} ({(100 * c.responseCount / c.sampleSize).toFixed(1)}%)<br /><meter min={0} max={c.sampleSize} value={c.responseCount} aria-label={`${c.label} synthetic responses`} /></td>
          <td>{c.biomarkerAvailable}/{c.sampleSize} measured; {c.sampleSize - c.biomarkerAvailable} missing</td>
          <td>{c.population}<br />{c.assay}<br />{c.analysisWindow}<br />{c.limitation}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <h4>4. Propose and export a falsifiable investigation</h4>
    <p>Complete the proposal and record decisions on selected findings. “Load worked example” supplies an editable demonstration. Proposal completeness does not establish validity.</p>
    {([
      ["hypothesis", "Synthetic project hypothesis"], ["prediction", "Synthetic project prediction"],
      ["experiment", "Synthetic project experiment"], ["falsification", "Synthetic project falsification criterion"],
    ] as const).map(([key, label]) => <label key={key} style={{ display: "block", marginBottom: 8 }}>{label}
      <textarea maxLength={4000} rows={2} style={{ display: "block", width: "100%" }} value={project[key]} onChange={(e) => change({ ...project, [key]: e.target.value })} />
    </label>)}
    <button className="btn primary" disabled={!ready} onClick={() => attempt(() => {
      const brief = buildSyntheticBrief(project, new Date().toISOString());
      download("SYNTHETIC-investigation-brief.json", JSON.stringify(brief, null, 2)); setStatus("Synthetic JSON brief prepared. Scientific review remains unperformed.");
    })}>Export synthetic brief JSON</button>{" "}
    <button className="btn" disabled={!ready} onClick={() => attempt(() => {
      const brief = buildSyntheticBrief(project, new Date().toISOString());
      download("SYNTHETIC-investigation-brief.md", syntheticBriefMarkdown(brief), "text/markdown"); setStatus("Synthetic Markdown brief prepared. Scientific review remains unperformed.");
    })}>Export synthetic brief Markdown</button>
    <p>Export includes the dataset version, source passages, analysis notes, cohort calculations and all conflicting fixture findings—even when the opposing record was not selected. No real evidence approval occurs.</p>
  </section>;
}

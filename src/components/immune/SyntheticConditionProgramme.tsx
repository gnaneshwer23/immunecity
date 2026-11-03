import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import CaseGraphExplorer from "@/components/immune/CaseGraphExplorer";
import { caseGraphContext } from "@/lib/research/caseGraph";
import {
  generateSyntheticProgramme, parseSyntheticProgramme, programmeDiscovery, programmeTrials, exportProgrammeCase, applyProgrammeScenario,
  type SyntheticProgramme,
} from "@/lib/research/syntheticProgramme";

const starter = generateSyntheticProgramme();
function download(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function SyntheticConditionProgramme({ initialData = starter }: { initialData?: SyntheticProgramme }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  const [data, setData] = useState<SyntheticProgramme>(initialData);
  const [conditionId, setConditionId] = useState(initialData.conditions[0]!.id);
  const [patientId, setPatientId] = useState(initialData.patients[0]!.id);
  const [domain, setDomain] = useState("all");
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [graphAnchor, setGraphAnchor] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ReturnType<typeof programmeDiscovery> | null>(null);
  const [screening, setScreening] = useState<ReturnType<typeof programmeTrials> | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editValue, setEditValue] = useState("10");
  const [editQuality, setEditQuality] = useState<"valid" | "missing" | "conflicting" | "stale">("valid");
  const [editSleep, setEditSleep] = useState("7");
  const [editReason, setEditReason] = useState("Synthetic what-if scenario; not a correction to real clinical data.");
  const condition = data.conditions.find((c) => c.id === conditionId)!;
  const patients = data.patients.filter((p) => p.conditionId === conditionId);
  const patient = patients.find((p) => p.id === patientId) ?? patients[0]!;
  const latest = patient.visits[patient.visits.length - 1]!;
  const conditions = data.conditions.filter((c) => (domain === "all" || c.domain === domain) && `${c.label} ${c.tissue} ${c.cells.join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  function clearRuns() { setAnalysis(null); setScreening(null); setNote(""); setGraphAnchor(null); setError(""); setMessage(""); }
  function choose(id: string) { setConditionId(id); setPatientId(data.patients.find((p) => p.conditionId === id)!.id); clearRuns(); }
  function attempt(action: () => void) { try { action(); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Operation failed"); } }
  async function importData(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error("Maximum dataset size is 5 MB.");
      const next = parseSyntheticProgramme(await file.text());
      setData(next); setConditionId(next.conditions[0]!.id); setPatientId(next.patients[0]!.id); setDomain("all"); setQuery(""); clearRuns();
      setMessage("Validated synthetic programme imported. Existing research and the real knowledge graph were not changed.");
    } catch (e) { setError(e instanceof Error ? e.message : "Import failed"); }
  }
  return <div data-testid="synthetic-programme" aria-busy={!ready}>
    <p className="callout"><strong>Synthetic research programme.</strong> 20 condition contexts · 120 fictional cases · 360 visits · 1,440 lab observations · 40 fictional protocols. No real patients, trial registry search or prescribing advice.</p>
    <p>Real disease, medication and cell names provide scenario context only. Their combinations and measurements are generated test fixtures, not scientific evidence. Not all listed conditions are autoimmune diseases.</p>
    <p>Generator v{data.generator.version} · seed {data.generator.seed} · {data.generator.intendedUse}. Data are not epidemiologically calibrated. Notes and imported data stay in page memory until downloaded.</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      <button className="btn" onClick={() => download("SYNTHETIC-20-condition-programme.json", data)}>Download full synthetic programme</button>
      <label>Import synthetic programme JSON<input type="file" accept=".json,application/json" onChange={(e) => { void importData(e.target.files?.[0]); e.target.value = ""; }} /></label>
    </div>
    <p role="status">{message}</p>{error && <p role="alert">{error}</p>}
    <nav className="programme-flow" aria-label="Investigation steps">
      <a href="#programme-context">1 · Context</a><a href="#programme-observations">2 · Observations</a><a href="#programme-exposures">3 · Exposures</a><a href="#programme-discovery">4 · Discovery</a><a href="#programme-trials">5 · Criteria</a><a href="#programme-export">6 · Dossier</a>
    </nav>
    <h3 id="programme-context">1. Choose a condition and synthetic case</h3>
    <label>Search condition, tissue or cell<input value={query} maxLength={200} onChange={(e) => setQuery(e.target.value)} /></label>{" "}
    <label>Programme domain<select value={domain} onChange={(e) => setDomain(e.target.value)}><option value="all">All domains</option>{[...new Set(data.conditions.map((c) => c.domain))].map((d) => <option key={d}>{d}</option>)}</select></label>
    <p>{conditions.length} condition contexts shown. Filtering changes the catalogue; the selected case remains below until you select another condition.</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} role="group" aria-label="Synthetic condition catalogue">
      {conditions.map((c) => <button className="btn" key={c.id} aria-pressed={conditionId === c.id} onClick={() => choose(c.id)}>{c.label}</button>)}
    </div>
    {conditions.length === 0 && <p>No synthetic condition context matches this filter.</p>}
    <h4>{condition.label} · {condition.domain}</h4><p>Tissue context: {condition.tissue}. Scenario cell tags: {condition.cells.join(", ")}. These tags are not reviewed mechanisms and are not added to the KG.</p>
    <label>Synthetic case<select value={patient.id} onChange={(e) => { setPatientId(e.target.value); clearRuns(); }}>
      {patients.map((p, i) => <option key={p.id} value={p.id}>{p.id} · age {p.ageYears} · {i === 1 ? "missing marker" : i === 2 ? "conflicting marker" : i === 3 ? "stale marker" : "complete marker"}</option>)}
    </select></label>
    <p><strong>{patient.id}</strong> · age {patient.ageYears} · Comorbid context: {patient.comorbidityIds.map((id) => data.conditions.find((c) => c.id === id)?.label).join(", ") || "None recorded in fixture"}</p>
    <p>{patient.familyHistory}. {patient.exposureNote}. Infection-screen record: {patient.infectionScreenNegative === null ? "unknown" : patient.infectionScreenNegative ? "synthetic negative" : "synthetic non-negative"}.</p>
    <CaseGraphExplorer key={conditionId} conditionId={conditionId} anchor={graphAnchor} onAnchor={setGraphAnchor} />
    <h3 id="programme-observations">2. Longitudinal laboratory and symptom reports</h3>
    <p>Visit days are relative to a fictional baseline. Values have units and specimen provenance, but no clinical reference ranges or diagnostic flags. The symptom index is an invented 0–100 research field, not a validated disease score.</p>
    <div role="region" aria-label="Synthetic laboratory timeline" tabIndex={0} style={{ overflowX: "auto" }}>
      <table><caption>{patient.id} · synthetic lab reports</caption><thead><tr><th scope="col">Visit / symptom index</th><th scope="col">Test / specimen</th><th scope="col">Value / units</th><th scope="col">Quality / provenance</th></tr></thead>
        <tbody>{patient.visits.flatMap((v) => v.labs.map((l) => <tr key={l.id}><td>Day {v.day}<br />Symptom index {v.symptomIndex}/100</td><th scope="row">{l.label}<br />{l.specimen}</th><td>{l.value === null ? "Not recorded" : l.value} {l.unit}{l.alternateValue !== null && <><br />Conflicting result: {l.alternateValue} {l.unit}</>}</td><td>{l.quality} · specimen day {l.specimenDay}<br />{l.id}<br />{l.source}</td></tr>))}</tbody>
      </table>
    </div>
    <h3 id="programme-exposures">3. Lifestyle, medication and immune-measurement context</h3>
    <div role="region" aria-label="Synthetic lifestyle timeline" tabIndex={0} style={{ overflowX: "auto" }}>
      <table><caption>Fictional lifestyle observations; no causal interpretation</caption><thead><tr><th scope="col">Day</th><th scope="col">Sleep / activity</th><th scope="col">Diet / smoking</th><th scope="col">Other context</th></tr></thead><tbody>{patient.visits.map((v) => <tr key={v.id}><th scope="row">{v.day}</th><td>{v.lifestyle.sleepHours} hours/night<br />{v.lifestyle.activityMinutesWeekly} minutes/week</td><td>{v.lifestyle.diet}<br />{v.lifestyle.smoking}</td><td>Stress index {v.lifestyle.stressIndex}/10<br />Antibiotics: {v.lifestyle.recentAntibiotics === null ? "unknown" : v.lifestyle.recentAntibiotics ? "recorded" : "not recorded as recent"}<br />Alcohol: {v.lifestyle.alcoholUnitsWeekly ?? "unknown"} units/week</td></tr>)}</tbody></table>
    </div>
    {patient.medications.map((m) => <article className="card" key={m.id}><h4>{m.name} · synthetic background exposure</h4><p>Start day {m.startDay}; end {m.endDay ?? "not recorded"}; adherence {m.adherencePercent === null ? "unknown" : `${m.adherencePercent}%`}.</p><p>{m.safetyNote} No dose or medication change is recommended.</p></article>)}
    <ul>{latest.immuneMeasurements.map((m) => <li key={m.cell}>{m.cell}: {m.percentOfParentGate === null ? "not measured" : `${m.percentOfParentGate}% of parent gate`} · {m.assay}</li>)}</ul>
    <h3 id="programme-discovery">4. AI-ready discovery planning demonstration</h3>
    <details><summary>Interactive what-if editor · synthetic records only</summary>
      <p>Change the latest marker and sleep observation, then rerun planning or screening. These are invented inputs, not biological predictions. Previous run results are cleared; the export retains an edit log.</p>
      <label>What-if marker value<input type="number" min={0} step="any" value={editValue} onChange={(e) => setEditValue(e.target.value)} /></label>{" "}
      <label>What-if marker quality<select value={editQuality} onChange={(e) => setEditQuality(e.target.value as typeof editQuality)}><option value="valid">valid</option><option value="missing">missing</option><option value="conflicting">conflicting</option><option value="stale">stale</option></select></label>{" "}
      <label>What-if sleep hours<input type="number" min={0} max={24} step="any" value={editSleep} onChange={(e) => setEditSleep(e.target.value)} /></label>
      <label style={{ display: "block" }}>Scenario edit reason<input style={{ maxWidth: "100%" }} value={editReason} maxLength={2000} onChange={(e) => setEditReason(e.target.value)} /></label>
      <button className="btn" onClick={() => attempt(() => {
        if (!editSleep.trim() || (editQuality !== "missing" && !editValue.trim())) throw new Error("Enter the scenario value and sleep hours.");
        const next = applyProgrammeScenario(data, patient.id, { value: editQuality === "missing" ? null : Number(editValue), quality: editQuality, sleepHours: Number(editSleep), reason: editReason }, new Date().toISOString());
        setData(next); setAnalysis(null); setScreening(null); setMessage("Synthetic what-if applied. Rerun planning and screening to assess the changed inputs.");
      })}>Apply synthetic what-if</button>
      <p>{data.scenarioEdits.filter((e) => e.patientId === patient.id).length} audited scenario edits for this case. Edits are not authenticated scientific reviews.</p>
    </details>
    <p>Run a deterministic research-planning demonstration. It inspects data quality and drafts a testable proposal; it does not run an AI model, search papers, discover a validated biomarker or infer medication efficacy.</p>
    <button className="btn primary" onClick={() => attempt(() => { setAnalysis(programmeDiscovery(data, patient, new Date().toISOString())); setMessage("Deterministic discovery plan generated. No AI inference or literature retrieval performed."); })}>Run discovery planning demo</button>
    {analysis && <article className="card" aria-label="Synthetic discovery plan">
      <p><strong>{analysis.status}</strong> · engine {analysis.audit.engine} · AI inference performed: false</p>
      <p>{analysis.question}</p><p>Unusable lab records: {analysis.observations.unusableLabs.length}; missing immune measurements: {analysis.observations.missingImmuneMeasurements}.</p>
      <h4>Unvalidated hypothesis</h4><p>{analysis.hypothesis}</p><p>Prediction: {analysis.prediction}</p><p>Experiment: {analysis.experiment}</p><p>Controls: {analysis.controls.join("; ")}</p><p>Confounders: {analysis.confounders.join("; ")}</p><p>Falsification: {analysis.falsification}</p>
      <h4>Planned retrieval · not executed</h4><ul>{analysis.retrievalPlan.map((p) => <li key={p}>{p}</li>)}</ul>
      <Link to="/ask" search={{ q: `What reviewed evidence and uncertainties concern immune mechanisms in ${condition.label}?` }}>Ask Immune about real evidence separately</Link>
      <p>This link sends only the general disease question; it does not submit the synthetic dossier.</p>
    </article>}
    <h3 id="programme-trials">5. Fictional clinical-trial criteria screening</h3>
    <p>Two fictional protocols per condition. No NCT identifiers, live recruitment or real eligibility criteria. Uses HSI’s five-state engine: satisfied, not_satisfied, unknown, ambiguous and requires_investigator_review. No match score or confirmed eligibility is produced.</p>
    <button className="btn" onClick={() => attempt(() => { setScreening(programmeTrials(data, patient, new Date().toISOString())); setMessage("Fictional criterion assessments generated; investigator review remains required."); })}>Screen fictional trial criteria</button>
    {screening?.map((trial) => <article key={trial.report.trialId} className="card"><h4>{trial.title}</h4><p>{trial.registryStatus} · protocol v{trial.protocolVersion} · {trial.report.overallLabel}</p>
      <div role="region" aria-label={`${trial.report.trialId} criteria`} tabIndex={0} style={{ overflowX: "auto" }}><table><thead><tr><th scope="col">Criterion</th><th scope="col">State</th><th scope="col">Fixture value / method</th></tr></thead><tbody>{trial.report.assessments.map((a) => <tr key={a.criterionId}><th scope="row">{a.criterionText}</th><td>{a.state}</td><td>{a.attributeValue === null ? "not available" : String(a.attributeValue)}<br />{a.method}</td></tr>)}</tbody></table></div>
      <p>Missing attributes: {trial.report.missingAttributes.join(", ") || "none among structured checks"}. Investigator review still required. Stale specimens are withheld; conflicting results stay ambiguous.</p>
    </article>)}
    <h3 id="programme-export">6. Export the synthetic investigation dossier</h3>
    <label style={{ display: "block" }}>Synthetic programme analyst note<textarea maxLength={4000} rows={3} value={note} onChange={(e) => setNote(e.target.value)} style={{ display: "block", width: "100%" }} /></label>
    <button className="btn" onClick={() => attempt(() => {
      download(`${patient.id}-research-dossier.json`, { ...exportProgrammeCase(data, patient, new Date().toISOString()), analystNote: note, graphContext: caseGraphContext(conditionId, graphAnchor) });
      setMessage("Synthetic dossier prepared with provenance, longitudinal records, discovery plan and fictional criteria. Analysis is recomputed at export and remains unvalidated.");
    })}>Export synthetic case dossier</button>
    <p>No data are written to the real graph, clinical systems or evidence curation. Real-data launch needs source-specific adapters, lawful data access, authenticated review, independent model validation and real protocol verification.</p>
  </div>;
}

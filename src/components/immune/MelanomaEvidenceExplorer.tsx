import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { buildMelanomaInvestigationPath } from "@/lib/immune/melanomaInvestigationPath";
import { MELANOMA_PILOT_TRIALS } from "@/data/trialIntelligence";
import { buildMelanomaExplorerBrief, type MelanomaHypothesisInput } from "@/lib/research/melanomaExplorer";
import SyntheticMelanomaProject from "@/components/immune/SyntheticMelanomaProject";

export default function MelanomaEvidenceExplorer() {
  const path = buildMelanomaInvestigationPath();
  const [draft, setDraft] = useState<MelanomaHypothesisInput>({
    question: "Why might melanoma fail to respond to PD-1 blockade?", hypothesis: "", prediction: "",
    experiment: "", falsification: "", contextTrialIds: [],
  });
  const [error, setError] = useState("");
  const [exported, setExported] = useState(false);
  if ("ok" in path) return <p role="alert">{path.reason}</p>;
  function download() {
    try {
      const brief = buildMelanomaExplorerBrief(draft, new Date().toISOString());
      const url = URL.createObjectURL(new Blob([JSON.stringify(brief, null, 2)], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "melanoma-investigation-unreviewed.json";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setError(""); setExported(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Export failed."); }
  }
  return <div>
    <SyntheticMelanomaProject />
    <h3>Published-trial reference context · separate from the synthetic project</h3>
    <p>Explore existing graph relationships and landmark trial context, then write a testable research hypothesis. Educational pilot · unreviewed · no treatment advice.</p>
    <details>
      <summary>Mechanism map · {path.typedRelations.length} relationships</summary>
      <ul>{path.typedRelations.map((r) => <li key={r.relId}>
        <Link to="/atlas/$id" params={{ id: r.subjectId }}>{r.subjectId}</Link>
        {" "}—{r.predicateLabel}→{" "}
        <Link to="/atlas/$id" params={{ id: r.objectId }}>{r.objectId}</Link>
        {" · "}<span className="mono">{r.relId}</span>
      </li>)}</ul>
      <p>Graph relationships are navigation context; their presence does not establish reviewed support.</p>
    </details>
    <h3>Trial context and source locators</h3>
    {MELANOMA_PILOT_TRIALS.map((trial) => <article className="card" key={trial.graphNodeId} style={{ marginBottom: 12 }}>
      <h4>{trial.acronym}</h4>
      <p>{trial.populationSummary}</p>
      <p>{trial.design} · Treatment line: {trial.treatmentLine ?? "Not curated"}</p>
      <p>{trial.arms.map((arm) => arm.label).join(" / ")}</p>
      <p><a href={`https://clinicaltrials.gov/study/${trial.nctId}`}>{trial.nctId}</a>{" · "}
        <a href={`https://pubmed.ncbi.nlm.nih.gov/${trial.primaryPmid}/`}>Primary publication · PMID {trial.primaryPmid}</a></p>
    </article>)}
    <p>These trials are shown side by side for context. Different populations, analyses and follow-up prevent a causal cross-trial ranking. Numeric outcome appraisal remains in the experimental Trial Intelligence workflow.</p>
    <details><summary>Biomarker context and research gaps</summary><ul>{path.unknowns.map((s) => <li key={s}>{s}</li>)}</ul>
      <p>PD-L1 is a graph biomarker here; assay thresholds are not curated. CD8 exhaustion and immune escape require scoped retrieval and review before a mechanistic hypothesis can be treated as supported.</p>
    </details>
    <h3>Hypothesis worksheet · researcher authored, unvalidated</h3>
    <p>Drafts stay in this page’s memory until exported. Do not enter patient information.</p>
    <form onSubmit={(e) => { e.preventDefault(); download(); }}>
      {([
        ["question", "Research question"], ["hypothesis", "Proposed explanation"],
        ["prediction", "Observable prediction"], ["experiment", "Experiment and comparison to test it"],
        ["falsification", "What result would weaken or falsify the hypothesis?"],
      ] as const).map(([key, label]) => <label key={key} style={{ display: "block", marginBottom: 12 }}>
        {label}<textarea required maxLength={4000} value={draft[key]} rows={2} style={{ display: "block", width: "100%" }}
          onChange={(e) => { setDraft({ ...draft, [key]: e.target.value }); setExported(false); }} />
      </label>)}
      <fieldset><legend>Select context publications · not evidence of hypothesis support</legend>
        {MELANOMA_PILOT_TRIALS.map((t) => <label key={t.graphNodeId} style={{ display: "block" }}>
          <input type="checkbox" checked={draft.contextTrialIds.includes(t.graphNodeId)} onChange={(e) => {
            setDraft({ ...draft, contextTrialIds: e.target.checked ? [...draft.contextTrialIds, t.graphNodeId] : draft.contextTrialIds.filter((id) => id !== t.graphNodeId) });
            setExported(false);
          }} /> {t.acronym}
        </label>)}
      </fieldset>
      <button type="submit" className="btn primary">Export unreviewed investigation JSON</button>
      {error && <p role="alert">{error}</p>}
      {exported && <p role="status">Export prepared with graph versions, source locators and limitations. Scientific review remains required.</p>}
    </form>
  </div>;
}

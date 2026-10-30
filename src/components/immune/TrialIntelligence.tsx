/* Feature-flagged arm-level trial outcomes for melanoma pilot nodes.
   Educational only — association ≠ causation; not clinical decision support. */
import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import {
  NON_CAUSAL_TRIAL_WARNING,
  TRIAL_INTELLIGENCE_PROVENANCE,
  doiUrl,
  formatEndpointValue,
  listMelanomaPilotTrials,
  pubmedUrl,
  trialIntelligenceByGraphNode,
  type ClinicalTrialRecord,
  type EndpointResultRecord,
} from "@/data/trialIntelligence";
import { ctgStudyUrl } from "@/data/trialRegistry";
import { isTrialIntelligenceEnabled } from "@/lib/trialIntelligenceFlag";
import { ExplainerSection } from "@/components/immune/explain";
import { byId } from "@/lib/immune/engine";

function EndpointRow({ ep }: { ep: EndpointResultRecord }) {
  const unverified = ep.verificationState === "unverified";
  return (
    <tr>
      <th scope="row">{ep.label}</th>
      <td>
        <span className={unverified ? "isi-ti-unverified" : undefined}>{formatEndpointValue(ep)}</span>
        {unverified ? <span className="xs muted"> · unverified</span> : null}
      </td>
      <td className="xs muted">{ep.analysisSet}</td>
      <td className="xs muted">{ep.followUp ?? ep.timepoint ?? "—"}</td>
      <td className="xs">
        {ep.sourcePmid ? (
          <a href={pubmedUrl(ep.sourcePmid)} target="_blank" rel="noopener noreferrer">
            PMID {ep.sourcePmid}
          </a>
        ) : (
          <span className="muted">—</span>
        )}
      </td>
    </tr>
  );
}

function TrialCard({ trial, showCompareHint }: { trial: ClinicalTrialRecord; showCompareHint?: boolean }) {
  return (
    <article className="isi-ti-card" aria-labelledby={`ti-${trial.trialId}-title`}>
      <header className="isi-ti-head">
        <h3 id={`ti-${trial.trialId}-title`}>{trial.acronym}</h3>
        <p className="small muted">{trial.title}</p>
        <p className="xs muted">
          <a className="isi-nct" href={ctgStudyUrl(trial.nctId)} target="_blank" rel="noopener noreferrer">
            {trial.nctId}
          </a>
          {" · "}
          {trial.phase} · {trial.design}
          {" · graph "}
          <Link to="/atlas/$id" params={{ id: trial.graphNodeId }}>
            {trial.graphNodeId}
          </Link>
        </p>
      </header>

      <p className="small">{trial.populationSummary}</p>
      <p className="xs muted" role="note">
        Analysis sets: {trial.analysisSetNote}
      </p>

      {showCompareHint ? (
        <p className="isi-ti-warn" role="note" data-testid="trial-noncausal-warning">
          {NON_CAUSAL_TRIAL_WARNING}
        </p>
      ) : null}

      {trial.arms.map((arm) => (
        <section key={arm.armId} className="isi-ti-arm" aria-labelledby={`ti-arm-${arm.armId}`}>
          <h4 id={`ti-arm-${arm.armId}`}>
            {arm.label}
            <span className="xs muted">
              {" "}
              · {arm.regimen}
              {arm.doseSchedule ? ` (${arm.doseSchedule})` : ""}
              {arm.enrolledN != null ? ` · n=${arm.enrolledN} randomised` : ""}
              {" · "}
              {arm.comparatorRole.replace(/_/g, " ")}
            </span>
          </h4>
          <div className="isi-ti-table-wrap">
            <table className="isi-ti-table">
              <caption className="sr-only">
                Endpoint results for {arm.label} in {trial.acronym}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Endpoint</th>
                  <th scope="col">Result</th>
                  <th scope="col">Analysis set</th>
                  <th scope="col">Follow-up / timepoint</th>
                  <th scope="col">Source</th>
                </tr>
              </thead>
              <tbody>
                {arm.endpoints.map((ep) => (
                  <EndpointRow key={ep.resultId} ep={ep} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <details className="isi-ti-sources">
        <summary>Primary publications</summary>
        <ul>
          {trial.sources.map((s) => (
            <li key={s.pmid}>
              {s.citation}{" "}
              <a href={pubmedUrl(s.pmid)} target="_blank" rel="noopener noreferrer">
                PubMed {s.pmid}
              </a>
              {" · "}
              <a href={doiUrl(s.doi)} target="_blank" rel="noopener noreferrer">
                doi:{s.doi} <ExternalLink size={11} aria-hidden />
              </a>
            </li>
          ))}
        </ul>
        <p className="xs muted">
          Verified {TRIAL_INTELLIGENCE_PROVENANCE.verifiedOn}. {TRIAL_INTELLIGENCE_PROVENANCE.method}{" "}
          {TRIAL_INTELLIGENCE_PROVENANCE.nctNote}
        </p>
      </details>
    </article>
  );
}

/** Arm-level outcomes on a TRIAL concept page when the feature flag is on. */
export function TrialIntelligencePanel({ graphNodeId }: { graphNodeId: string }) {
  if (!isTrialIntelligenceEnabled()) return null;
  const trial = trialIntelligenceByGraphNode(graphNodeId);
  if (!trial) return null;
  const peers = listMelanomaPilotTrials().filter((t) => t.graphNodeId !== graphNodeId);

  return (
    <ExplainerSection
      id="trial-intelligence"
      defaultOpen
      title="Trial Intelligence — arm-level outcomes"
      summary="Source-verified endpoints from the melanoma pilot. Educational — not treatment advice or comparative efficacy claims."
    >
      <p className="isi-ti-warn" role="note" data-testid="trial-noncausal-warning">
        {NON_CAUSAL_TRIAL_WARNING}
      </p>
      <TrialCard trial={trial} />
      {peers.length ? (
        <div className="isi-ti-peers">
          <h3>Related melanoma pilot trial</h3>
          <p className="xs muted">
            Open for within-trial arm detail only. Do not treat side-by-side figures as head-to-head efficacy.
          </p>
          <ul>
            {peers.map((p) => {
              const node = byId[p.graphNodeId];
              return (
                <li key={p.trialId}>
                  <Link to="/atlas/$id" params={{ id: p.graphNodeId }}>{node?.name ?? p.acronym}</Link>
                  <span className="xs muted"> · {p.nctId}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      <p className="xs muted">
        Methods: see <Link to="/methods" hash="trial-intelligence">Evidence & Methods — Trial Intelligence</Link>.
      </p>
    </ExplainerSection>
  );
}

/** Compact Methods/Evidence honesty block (always visible copy; detail still flag-gated elsewhere). */
export function TrialIntelligenceMethodsNote() {
  return (
    <div className="isi-ti-methods">
      <h3>Trial Intelligence (melanoma pilot)</h3>
      <p>
        Arm-level ORR, PFS, OS and safety fields for KEYNOTE-006 (<span className="mono">TR003</span>, NCT01866319)
        and CheckMate 067 (<span className="mono">TR020</span>, NCT01844505) are curated from primary publications.
        Numbers absent from the verified abstracts stay null and labelled unverified — they are never invented.
      </p>
      <p className="isi-ti-warn" role="note" data-testid="trial-noncausal-warning">
        {NON_CAUSAL_TRIAL_WARNING}
      </p>
      <p className="xs muted">
        UI is feature-flagged (<span className="mono">VITE_TRIAL_INTELLIGENCE=1</span>). Off by default so atlas and
        graph journeys stay unchanged. Educational resource — not clinical decision support.
      </p>
    </div>
  );
}

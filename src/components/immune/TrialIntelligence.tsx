/* Feature-flagged arm-level trial outcomes for melanoma pilot nodes.
   Educational only — association ≠ causation; not clinical decision support.
   When the flag is on, prefer validated Postgres reads; fixtures remain seed SOT. */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
import { trialIntelligenceQuery } from "@/lib/trialIntelligence.functions";
import { ExplainerSection } from "@/components/immune/explain";
import { EvidenceDimensionsStrip } from "@/components/immune/EvidenceDimensions";
import { byId } from "@/lib/immune/engine";
import { trialEndpointDimensions } from "@/lib/immune/evidenceDimensions";
import { endpointProvenanceView, VERIFICATION_LABEL } from "@/lib/immune/trialProvenance";
import { melanomaPilotComparability, type ComparabilityReport } from "@/lib/immune/trialComparability";
import {
  graphBiomarkersForTrial,
  trialBiomarkerStubs,
  trialIntelligenceNavFromConcept,
} from "@/lib/immune/trialGraphNav";

function EndpointRow({ ep }: { ep: EndpointResultRecord }) {
  const prov = endpointProvenanceView(ep);
  const unverified = ep.verificationState === "unverified";
  const verMeta = VERIFICATION_LABEL[ep.verificationState];
  const dims = trialEndpointDimensions(ep, prov);
  return (
    <tr data-testid={`ti-endpoint-${ep.resultId}`} data-exit-gate={prov.exitGateOk ? "ok" : "fail"}>
      <th scope="row">{ep.label}</th>
      <td>
        <span className={unverified ? "isi-ti-unverified" : undefined}>{formatEndpointValue(ep)}</span>
      </td>
      <td className="xs">
        <span className={`badge isi-ti-ver isi-ti-ver-${ep.verificationState}`} title={verMeta.desc}>
          {verMeta.short}
        </span>
      </td>
      <td className="xs muted">{ep.analysisSet || "—"}</td>
      <td className="xs muted">{ep.followUp ?? ep.timepoint ?? "—"}</td>
      <td className="xs isi-ti-provenance">
        {ep.sourcePmid ? (
          <a href={pubmedUrl(ep.sourcePmid)} target="_blank" rel="noopener noreferrer">
            PMID {ep.sourcePmid}
          </a>
        ) : (
          <span className="muted">no PMID</span>
        )}
        {ep.sourceDoi ? (
          <>
            {" · "}
            <a href={doiUrl(ep.sourceDoi)} target="_blank" rel="noopener noreferrer">
              doi:{ep.sourceDoi}
            </a>
          </>
        ) : null}
        <details className="isi-ti-ep-dims">
          <summary className="xs">Dimensions</summary>
          <EvidenceDimensionsStrip dims={dims} compact testId={`ti-dims-${ep.resultId}`} />
        </details>
      </td>
    </tr>
  );
}

function ComparabilityFold({ report }: { report: ComparabilityReport }) {
  return (
    <details className="isi-ti-compare" data-testid="ti-comparability">
      <summary>Comparability checks (ISI-A08 light)</summary>
      <p className="isi-ti-warn" role="note">
        {report.warning}
      </p>
      <p className="xs muted" role="note" data-testid="ti-no-superiority">
        These checks list context mismatches between {report.leftLabel} and {report.rightLabel}. They never declare
        treatment superiority or comparative efficacy.
      </p>
      {report.mismatches.length === 0 ? (
        <p className="small muted" data-testid="ti-compare-aligned">
          No structured mismatches on the checked facets — still do not infer head-to-head superiority.
        </p>
      ) : (
        <div className="isi-ti-table-wrap">
          <table className="isi-ti-table">
            <caption className="sr-only">
              Comparability mismatches between {report.leftLabel} and {report.rightLabel}
            </caption>
            <thead>
              <tr>
                <th scope="col">Facet</th>
                <th scope="col">{report.leftLabel}</th>
                <th scope="col">{report.rightLabel}</th>
                <th scope="col">Note</th>
              </tr>
            </thead>
            <tbody>
              {report.mismatches.map((m) => (
                <tr key={m.dimension + m.left} data-testid={`ti-mismatch-${m.dimension}`}>
                  <th scope="row">{m.label}</th>
                  <td className="xs">{m.left}</td>
                  <td className="xs">{m.right}</td>
                  <td className="xs muted">{m.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}

function BiomarkerContextBlock({ trial }: { trial: ClinicalTrialRecord }) {
  const stubs = trialBiomarkerStubs(trial);
  const graph = graphBiomarkersForTrial(trial.graphNodeId);
  const hasFixture = stubs.length > 0;
  const hasGraph = graph.length > 0;
  return (
    <section className="isi-ti-biomarker" aria-labelledby={`ti-bio-${trial.trialId}`} data-testid="ti-biomarker-context">
      <h4 id={`ti-bio-${trial.trialId}`}>Biomarker context</h4>
      {!hasFixture && !hasGraph ? (
        <p className="small muted" data-testid="ti-biomarker-empty">
          No curated biomarker assay rows for this pilot release. TPS/CPS and other assay cut-offs stay
          empty until a curator supplies them — engineering never invents thresholds.
        </p>
      ) : null}
      {hasFixture ? (
        <ul>
          {stubs.map((b, i) => (
            <li key={b.graphNodeId ?? `stub-${i}`}>
              {b.name ?? "Unlabelled biomarker"}
              {b.assayLabel ? <span className="xs muted"> · assay {b.assayLabel}</span> : (
                <span className="xs muted"> · assay unavailable</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {hasGraph ? (
        <ul>
          {graph.map((b) => (
            <li key={b.graphNodeId ?? b.name}>
              {b.graphNodeId ? (
                <Link to="/atlas/$id" params={{ id: b.graphNodeId }}>
                  {b.name}
                </Link>
              ) : (
                b.name
              )}
              <span className="xs muted"> · {b.notes}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function TrialCard({ trial }: { trial: ClinicalTrialRecord }) {
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
          <Link to="/atlas/$id" params={{ id: trial.graphNodeId }} hash="trial-intelligence">
            {trial.graphNodeId}
          </Link>
          {" · "}
          <span className={`badge isi-ti-ver isi-ti-ver-${trial.verificationState}`}>
            {VERIFICATION_LABEL[trial.verificationState].short}
          </span>
        </p>
      </header>

      <p className="small">{trial.populationSummary}</p>
      <p className="xs muted" role="note">
        Condition: {trial.conditionLabel}
      </p>
      <p className="xs muted" role="note">
        Analysis sets: {trial.analysisSetNote}
      </p>

      <BiomarkerContextBlock trial={trial} />

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
          {arm.endpoints.length === 0 ? (
            <p className="small muted" role="status">
              No endpoint rows curated for this arm.
            </p>
          ) : (
            <div className="isi-ti-table-wrap" tabIndex={0} role="region" aria-label={`Endpoint table for ${arm.label}`}>
              <table className="isi-ti-table">
                <caption className="sr-only">
                  Endpoint results for {arm.label} in {trial.acronym}. Columns: endpoint, result, verification, analysis
                  set, follow-up, provenance.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Endpoint</th>
                    <th scope="col">Result</th>
                    <th scope="col">Verification</th>
                    <th scope="col">Analysis set</th>
                    <th scope="col">Follow-up / timepoint</th>
                    <th scope="col">Provenance</th>
                  </tr>
                </thead>
                <tbody>
                  {arm.endpoints.map((ep) => (
                    <EndpointRow key={ep.resultId} ep={ep} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
          {TRIAL_INTELLIGENCE_PROVENANCE.nctNote} {TRIAL_INTELLIGENCE_PROVENANCE.spotCheckNote}
        </p>
      </details>
    </article>
  );
}

/** Arm-level outcomes on a TRIAL concept page when the feature flag is on. */
export function TrialIntelligencePanel({ graphNodeId }: { graphNodeId: string }) {
  if (!isTrialIntelligenceEnabled()) return null;

  const fixture = trialIntelligenceByGraphNode(graphNodeId);
  const q = useQuery({
    ...trialIntelligenceQuery(graphNodeId),
    enabled: Boolean(fixture),
  });

  if (!fixture) {
    return (
      <ExplainerSection
        id="trial-intelligence"
        defaultOpen
        title="Trial Intelligence"
        summary="No melanoma-pilot Trial Intelligence record is curated for this trial node."
      >
        <p className="small muted" role="status" data-testid="ti-unavailable">
          Arm-level outcomes are unavailable for this concept. Pilot coverage is KEYNOTE-006 (TR003) and CheckMate 067
          (TR020) only.
        </p>
      </ExplainerSection>
    );
  }

  const trial = q.data?.trial ?? fixture;
  if (!trial) {
    return (
      <ExplainerSection id="trial-intelligence" defaultOpen title="Trial Intelligence" summary="Record unavailable.">
        <p className="small muted" role="status" data-testid="ti-unavailable">
          Trial Intelligence could not be loaded.
        </p>
      </ExplainerSection>
    );
  }

  const peers = listMelanomaPilotTrials().filter((t) => t.graphNodeId !== graphNodeId);
  const readSource = q.data?.source ?? "fixture";
  const compareReports = peers.map((p) => melanomaPilotComparability(trial, p));

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
      <p className="xs muted" role="note">
        Provenance columns show PMID/DOI, verification label, and analysis set / follow-up when present. Curation,
        source identifiers and analysis context stay separate — not one confidence score.
      </p>
      {q.isPending ? (
        <p className="xs muted" role="status">
          Checking curated Postgres read…
        </p>
      ) : null}
      {q.data?.unavailable ? (
        <p className="small muted" role="status" data-testid="ti-db-fallback">
          Database unavailable — showing fixture seed fallback.
        </p>
      ) : null}
      <TrialCard trial={trial} />
      {peers.length ? (
        <div className="isi-ti-peers">
          <h3>Related melanoma pilot trial</h3>
          <p className="xs muted">
            Open for within-trial arm detail only. Do not treat side-by-side figures as head-to-head comparative
            efficacy — populations and follow-up differ.
          </p>
          <ul>
            {peers.map((p) => {
              const node = byId[p.graphNodeId];
              return (
                <li key={p.trialId}>
                  <Link to="/atlas/$id" params={{ id: p.graphNodeId }} hash="trial-intelligence">
                    {node?.name ?? p.acronym}
                  </Link>
                  <span className="xs muted"> · {p.nctId}</span>
                </li>
              );
            })}
          </ul>
          {compareReports.map((report) => (
            <ComparabilityFold key={report.rightId} report={report} />
          ))}
        </div>
      ) : null}
      <p className="xs muted">
        Read model: {readSource === "postgres" ? "validated Postgres (authoritative when seeded)" : "fixture seed"}
        {q.data?.unavailable ? " · database unavailable — showing fixture fallback" : ""}. Methods: see{" "}
        <Link to="/methods" hash="trial-intelligence">
          Evidence & Methods — Trial Intelligence
        </Link>
        .
      </p>
    </ExplainerSection>
  );
}

/**
 * Graph → trial deep links on melanoma / PD-1 neighbourhood concept pages (flag-gated).
 * Exit-gate path: mechanism → therapy/disease → TR003/TR020#trial-intelligence.
 */
export function TrialIntelligenceConceptNav({ conceptId }: { conceptId: string }) {
  if (!isTrialIntelligenceEnabled()) return null;
  const links = trialIntelligenceNavFromConcept(conceptId).filter((l) => l.graphNodeId !== conceptId);
  if (!links.length) return null;
  return (
    <div data-testid="ti-concept-nav">
      <ExplainerSection
        id="trial-intelligence-nav"
        defaultOpen
        title="Trial Intelligence — melanoma pilot"
        summary="Deep links to source-backed arm-level outcomes for KEYNOTE-006 and CheckMate 067."
      >
        <p className="isi-ti-warn" role="note" data-testid="trial-noncausal-warning">
          {NON_CAUSAL_TRIAL_WARNING}
        </p>
        <ul className="isi-ti-nav-list" data-testid="ti-concept-nav-list">
          {links.map((l) => (
            <li key={l.graphNodeId}>
              <Link to="/atlas/$id" params={{ id: l.graphNodeId }} hash={l.hash}>
                {l.acronym}
              </Link>
              <span className="xs muted">
                {" "}
                · {l.nctId} · {l.reason}
              </span>
            </li>
          ))}
        </ul>
        <p className="xs muted">
          Outcomes open on the trial Atlas panel. Educational — not enrolment or treatment advice.
        </p>
      </ExplainerSection>
    </div>
  );
}

/** Compact Methods/Evidence honesty block (always visible copy; detail still flag-gated elsewhere). */
export function TrialIntelligenceMethodsNote() {
  return (
    <div className="isi-ti-methods" id="trial-intelligence-methods">
      <h3>Trial Intelligence (melanoma pilot)</h3>
      <details className="isi-ti-methods-fold" data-testid="ti-methods-fold">
        <summary>How arm-level outcomes are shown</summary>
        <p>
          Arm-level ORR, PFS, OS and safety fields for KEYNOTE-006 (<span className="mono">TR003</span>, NCT01866319)
          and CheckMate 067 (<span className="mono">TR020</span>, NCT01844505) are curated from primary publications.
          Numbers absent from the verified abstracts stay null and labelled unverified — they are never invented.
          Each published endpoint shows source PMID/DOI, verification label, and analysis set / follow-up when present.
        </p>
        <p>
          Cross-trial views run light comparability checks (disease stage/line, endpoint definition, follow-up, analysis
          population). Mismatches are listed explicitly; the product never declares treatment superiority.
        </p>
        <p>
          Biomarker assay rows are schema stubs in this release unless curated. Graph biomarker nodes linked to
          therapies may appear without inventing assay cut-offs.
        </p>
      </details>
      <p className="isi-ti-warn" role="note" data-testid="trial-noncausal-warning">
        {NON_CAUSAL_TRIAL_WARNING}
      </p>
      <p className="xs muted">
        UI is feature-flagged (<span className="mono">VITE_TRIAL_INTELLIGENCE=1</span>). Off by default so atlas and
        graph journeys stay unchanged. Rollback: unset or set the flag to{" "}
        <span className="mono">0</span> in Vercel Production and redeploy — no route removal required. When enabled,
        curated reads prefer Postgres; fixtures remain the seed/import source of truth. Educational resource — not
        clinical decision support. Do not enable for general production until Phase 1–2 exit criteria and SME review.
      </p>
    </div>
  );
}

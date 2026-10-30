/* "From mechanism to clinic": curated graph rows (target → therapy → patient selection →
   landmark trial) plus a clearly separated, uncurated live view of active registry trials. */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { byId, human } from "@/lib/immune/engine";
import { registryQueryFor, translationalPath } from "@/lib/immune/translational";
import { isPipelineDisease } from "@/lib/immune/pipeline";
import { TRIAL_REGISTRY, ctgStudyUrl } from "@/data/trialRegistry";
import { getActiveTrials } from "@/lib/liveData.functions";
import { ExplainerSection } from "@/components/immune/explain";
import { isTrialIntelligenceEnabled } from "@/lib/trialIntelligenceFlag";
import { isMelanomaPilotTrialNode } from "@/lib/immune/trialGraphNav";

const statusText = (s: string) => s.replace(/_/g, " ").toLowerCase();

function LandmarkTrial({ id }: { id: string }) {
  const t = byId[id]!;
  const reg = TRIAL_REGISTRY[id];
  const tiDeep = isTrialIntelligenceEnabled() && isMelanomaPilotTrialNode(id);
  return (
    <li>
      <Link to="/atlas/$id" params={{ id }} hash={tiDeep ? "trial-intelligence" : undefined}>{t.name}</Link>
      {tiDeep ? <span className="xs muted"> · Trial Intelligence</span> : null}
      {reg?.studies.map((s) => (
        <a key={s.nctId} className="isi-nct" href={ctgStudyUrl(s.nctId)} target="_blank" rel="noopener noreferrer" title={`${s.label} on ClinicalTrials.gov`}>
          {s.nctId}
        </a>
      ))}
      {reg?.unregisteredReason ? <span className="xs muted" title={reg.unregisteredReason}> · pre-registry</span> : null}
    </li>
  );
}

function ActiveRegistryTrials({ condition, intervention }: { condition: string | null; intervention: string | null }) {
  const q = useQuery({
    queryKey: ["active-trials", condition, intervention],
    queryFn: () => getActiveTrials({ data: { condition, intervention } }),
    staleTime: 60 * 60 * 1000,
  });
  const params = new URLSearchParams({ ...(condition ? { cond: condition } : {}), ...(intervention ? { intr: intervention } : {}) });
  const subject = condition ?? intervention;
  return (
    <div className="isi-active-trials" aria-live="polite">
      <h3>Active in the registry now</h3>
      <p className="xs muted">
        Live ClinicalTrials.gov search: active phase 2–4 interventional studies whose registered {condition ? "condition" : "intervention"} is “{subject}”. Uncurated — listed for
        orientation, not reviewed, and not a recommendation to enrol.
      </p>
      {q.isPending ? <p className="small muted">Checking ClinicalTrials.gov…</p> : null}
      {q.isError || q.data?.unavailable ? <p className="small muted">The registry is unavailable right now. Curated trials above are unaffected.</p> : null}
      {q.data && !q.data.unavailable ? (
        <>
          <p className="small"><b>{q.data.total.toLocaleString("en-GB")}</b> active studies. Most relevant:</p>
          <ul className="isi-active-list">
            {q.data.studies.map((s) => (
              <li key={s.nctId}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>
                <span className="xs muted"> · {s.nctId} · {s.phase ? `phase ${s.phase} · ` : ""}{statusText(s.status)}{s.sponsor ? ` · ${s.sponsor}` : ""}</span>
              </li>
            ))}
          </ul>
          <a className="small" href={`https://clinicaltrials.gov/search?${params}`} target="_blank" rel="noopener noreferrer">
            Search all on ClinicalTrials.gov <ExternalLink size={12} aria-hidden />
          </a>
        </>
      ) : null}
    </div>
  );
}

export default function TranslationalPath({ id }: { id: string }) {
  const node = byId[id];
  if (!node) return null;
  const rows = translationalPath(id);
  const live = registryQueryFor(node);
  if (!rows.length && !live) return null;
  return (
    <ExplainerSection
      id="clinic"
      defaultOpen
      title="From mechanism to clinic"
      summary="How the curated graph connects this concept to treatments, patient selection and the trials that tested them. Educational — not treatment advice."
    >
      {rows.length ? (
        <div className="isi-tx-table" role="table" aria-label={`Therapies linked to ${node.name}`}>
          <div className="isi-tx-row isi-tx-head" role="row">
            <span role="columnheader">Mechanism</span>
            <span role="columnheader">Therapy</span>
            <span role="columnheader">Patient selection</span>
            <span role="columnheader">Landmark trials (any indication)</span>
          </div>
          {rows.map((r) => (
            <div className="isi-tx-row" role="row" key={r.therapy.id}>
              <span role="cell" data-label="Mechanism">
                {r.targets.length
                  ? r.targets.map((t) => (
                      <div key={t.node.id}><span className="xs muted">{human(t.edge.relation)} </span><Link to="/atlas/$id" params={{ id: t.node.id }}>{t.node.name}</Link></div>
                    ))
                  : <span className="xs muted">Not recorded</span>}
              </span>
              <span role="cell" data-label="Therapy">
                <Link to="/atlas/$id" params={{ id: r.therapy.id }}><b>{r.therapy.name}</b></Link>
                {r.viaClass ? <div className="xs muted">via <Link to="/atlas/$id" params={{ id: r.viaClass.id }}>{r.viaClass.name}</Link></div> : null}
                {r.outcome === "failed" ? <div className="xs isi-tx-failed">Failed or harmful here — kept as a teaching case</div> : null}
                {r.therapy.draft ? <div className="xs muted">Draft</div> : null}
              </span>
              <span role="cell" data-label="Patient selection">
                {r.selection.length
                  ? r.selection.map((b) => (
                      <div key={b.node.id}><Link to="/atlas/$id" params={{ id: b.node.id }}>{b.node.name}</Link><span className="xs muted"> · {human(b.edge.relation)} this therapy</span></div>
                    ))
                  : <span className="xs muted">No biomarker linked</span>}
              </span>
              <span role="cell" data-label="Landmark trials">
                {r.trials.length ? <ul className="isi-tx-trials">{r.trials.map((t) => <LandmarkTrial key={t.id} id={t.id} />)}</ul> : <span className="xs muted">None in graph</span>}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {live ? <ActiveRegistryTrials condition={live.condition} intervention={live.intervention} /> : null}
      {isPipelineDisease(id) ? (
        <p className="small isi-pipe-link">
          <Link to="/pipeline/$disease" params={{ disease: id }}>Open the full {node.name} pipeline — every mechanism and its active trials →</Link>
        </p>
      ) : null}
    </ExplainerSection>
  );
}

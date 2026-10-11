import { Link } from "@tanstack/react-router";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { byId, TYPES, human } from "@/lib/immune/engine";
import { inspect } from "@/lib/immune/inspector";
import type { AskGrounding, EvidenceTier } from "@/lib/askGrounding";
import EdgeReference from "./EdgeReference";
import { edgeByRel } from "@/lib/immune/engine";

const TIER_CLASS: Record<EvidenceTier, string> = {
  established: "tier-established",
  "evidence-supported": "tier-supported",
  emerging: "tier-emerging",
  hypothesis: "tier-hypothesis",
  draft: "tier-draft",
  "missing-support": "tier-missing",
};

const TIER_LABEL: Record<EvidenceTier, string> = {
  established: "Established",
  "evidence-supported": "Evidence-supported",
  emerging: "Emerging",
  hypothesis: "Hypothesis",
  draft: "Draft",
  "missing-support": "Missing support",
};

const CLASS_LABEL: Record<string, string> = {
  graph_explanation: "Graph explanation",
  source_lookup: "Source lookup",
  comparison: "Comparison",
  hypothesis_request: "Hypothesis (candidate)",
  omics_request: "Omics (not wired)",
  mechanism_perturbation: "Perturbation",
  unsupported: "Unsupported",
  clinical_personal: "Clinical (refused)",
};

export default function GroundingPanel({ grounding }: { grounding: AskGrounding }) {
  const classLabel = CLASS_LABEL[grounding.queryClass] ?? grounding.queryClass;
  if (!grounding.coverage.matched || grounding.trace.abstained) {
    return (
      <aside className="grounding-panel" aria-label="Graph grounding">
        <div className="grounding-head">
          <strong>Graph grounding</strong>
          <span className={`evidence-tier ${TIER_CLASS["missing-support"]}`}>
            {grounding.trace.abstained ? "Abstained" : "No match"}
          </span>
        </div>
        <p className="xs muted">
          {grounding.trace.abstained
            ? `Query class: ${classLabel}. No model synthesis was run for this request.`
            : "No Immune Super Intelligence concepts matched this question. The model must not invent graph evidence."}
        </p>
        <p className="xs muted">Trace · prompt {grounding.trace.promptVersion} · graph {grounding.trace.graphVersion}</p>
      </aside>
    );
  }

  const chain = grounding.chains[0];
  const topLinks = grounding.links.slice(0, 6);

  return (
    <aside className="grounding-panel" aria-label="Graph grounding used for this answer">
      <div className="grounding-head">
        <strong>Graph grounding</strong>
        <span className="xs muted">Retrieved before the AI answer · not model memory</span>
      </div>
      <div className="grounding-metrics" aria-label="Evidence coverage">
        <span><b>{classLabel}</b> class</span>
        <span><b>{grounding.coverage.establishedCount}</b> established</span>
        <span><b>{grounding.coverage.emergingCount}</b> emerging</span>
        <span><b>{grounding.coverage.draftCount}</b> draft</span>
        <span><b>{grounding.coverage.missingSupportCount}</b> missing support</span>
      </div>
      <p className="xs muted">Trace · prompt {grounding.trace.promptVersion} · graph {grounding.trace.graphVersion} · {grounding.trace.graphSnapshot}</p>

      <div className="grounding-label">Concepts</div>
      <ul className="grounding-concepts">
        {grounding.nodes.map((n) => (
          <li key={n.id}>
            <button type="button" className="ask-concept" onClick={() => inspect({ kind: "concept", id: n.id })}>
              <span className="dot" style={{ background: `var(${TYPES[n.node_type].c})` }} />
              {n.name}
            </button>
            {n.draft ? <span className={`evidence-tier ${TIER_CLASS.draft}`}>Draft</span> : null}
            <Link className="xs" to="/graph" search={{ focus: n.id }}>graph</Link>
          </li>
        ))}
      </ul>

      {chain ? (
        <>
          <div className="grounding-label">Causal chain used</div>
          <ol className="grounding-chain">
            <li>
              <button type="button" className="ask-concept" onClick={() => inspect({ kind: "concept", id: chain.fromId })}>
                {byId[chain.fromId]?.name ?? chain.fromId}
              </button>
            </li>
            {chain.hops.map((h) => (
              <li key={h.relId + h.toId}>
                <button
                  type="button"
                  className="ask-edge"
                  onClick={() => inspect({ kind: "relationship", id: h.relId })}
                  title={TIER_LABEL[h.tier]}
                >
                  {h.fwd ? h.relation : `← ${h.relation}`}
                </button>
                <span className={`evidence-tier ${TIER_CLASS[h.tier]}`}>{TIER_LABEL[h.tier]}</span>
                <ArrowRight size={12} aria-hidden />
                <button type="button" className="ask-concept" onClick={() => inspect({ kind: "concept", id: h.toId })}>
                  {byId[h.toId]?.name ?? h.toId}
                </button>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="xs muted"><AlertTriangle size={12} /> No shortest causal chain among the top matched concepts.</p>
      )}

      <div className="grounding-label">Key relationships</div>
      <ul className="grounding-links">
        {topLinks.map((l) => {
          const edge = edgeByRel[l.relId];
          const s = byId[l.subjectId];
          const o = byId[l.objectId];
          return (
            <li key={l.relId}>
              <button type="button" className="grounding-link-btn" onClick={() => inspect({ kind: "relationship", id: l.relId })}>
                <span>{s?.name}</span> <em>{human(l.relation)}</em> <span>{o?.name}</span>
              </button>
              <span className={`evidence-tier ${TIER_CLASS[l.tier]}`}>{TIER_LABEL[l.tier]}</span>
              {edge ? <EdgeReference edge={edge} /> : null}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

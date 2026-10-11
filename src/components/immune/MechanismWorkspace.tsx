import { Fragment, useMemo, useState } from "react";
import { KG, byId, human } from "@/lib/immune/engine";
import { inspect } from "@/lib/immune/inspector";
import { EduBanner, NodeChip } from "@/components/immune/ui";
import EdgeReference from "./EdgeReference";
import {
  hopPhrase,
  reasonMechanism,
  type PerturbMode,
} from "@/lib/immune/mechanismReasoning";

const SORTED = [...KG.nodes].sort((a, b) => a.name.localeCompare(b.name));

const TIER_CLASS: Record<string, string> = {
  draft: "tier-draft",
  unreviewed: "tier-missing",
  "source-verified": "tier-supported",
  "claim-assessed": "tier-supported",
  approved: "tier-established",
  rejected: "tier-missing",
  conflicting: "tier-hypothesis",
  superseded: "tier-missing",
};

export default function MechanismWorkspace({
  initialStart = "C003",
  initialPerturb = "I001",
  initialOutcome = "D001",
}: {
  initialStart?: string;
  initialPerturb?: string;
  initialOutcome?: string;
}) {
  const [start, setStart] = useState(byId[initialStart] ? initialStart : "C003");
  const [perturb, setPerturb] = useState(byId[initialPerturb] ? initialPerturb : "I001");
  const [outcome, setOutcome] = useState(byId[initialOutcome] ? initialOutcome : "D001");
  const [mode, setMode] = useState<PerturbMode>("inhibit");

  const result = useMemo(
    () => reasonMechanism(start, perturb, outcome, mode),
    [start, perturb, outcome, mode],
  );

  return (
    <div className="mechanism-workspace">
      <EduBanner>
        Rule-based path tracing and signed perturbation on the curated graph. Results are illustrative
        unless validated against independent experimental data.
      </EduBanner>

      <div className="card mech-controls">
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <label className="field" style={{ flex: 1, minWidth: 180 }}>
            Starting concept
            <select value={start} onChange={(e) => setStart(e.target.value)} aria-label="Starting concept">
              {SORTED.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </label>
          <label className="field" style={{ flex: 1, minWidth: 180 }}>
            Intervention / perturbation
            <select value={perturb} onChange={(e) => setPerturb(e.target.value)} aria-label="Perturbation">
              {SORTED.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </label>
          <label className="field" style={{ flex: 1, minWidth: 180 }}>
            Outcome of interest
            <select value={outcome} onChange={(e) => setOutcome(e.target.value)} aria-label="Outcome">
              {SORTED.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </label>
          <label className="field" style={{ minWidth: 140 }}>
            Perturbation mode
            <select value={mode} onChange={(e) => setMode(e.target.value as PerturbMode)} aria-label="Perturbation mode">
              <option value="inhibit">Inhibit / block</option>
              <option value="activate">Activate / boost</option>
            </select>
          </label>
        </div>
      </div>

      {!result ? (
        <p className="empty">Choose valid start, perturbation and outcome concepts.</p>
      ) : (
        <div className="mech-results">
          <section className="card">
            <h3>Path to outcome</h3>
            <p className="xs muted">Shortest undirected walk from start to outcome on the knowledge graph.</p>
            {result.pathToOutcome?.length ? (
              <div className="trace-chain">
                <div className="pn"><NodeChip id={result.startId} /></div>
                {result.pathToOutcome.map((h, i) => (
                  <Fragment key={h.relId + i}>
                    <div className="trace-hop" style={{ animationDelay: `${i * 80}ms` }}>
                      <div className="trace-arrow">
                        <button type="button" className="ask-edge" onClick={() => inspect({ kind: "relationship", id: h.relId })}>
                          {h.fwd ? human(h.edge.relation) : `← ${human(h.edge.relation)}`}
                        </button>
                        <span className={`evidence-tier ${TIER_CLASS[h.review] ?? "tier-missing"}`}>{h.reviewLabel}</span>
                        {h.edge.mechanism ? <span className="xs muted"> · {h.edge.mechanism}</span> : null}
                        <br />
                        <EdgeReference edge={h.edge} />
                      </div>
                      <div className="pn"><NodeChip id={h.toId} /></div>
                    </div>
                  </Fragment>
                ))}
              </div>
            ) : (
              <p className="empty">No path found — recorded as a coverage gap.</p>
            )}
          </section>

          <section className="card">
            <h3>Path via perturbation</h3>
            <p className="xs muted">Start → {byId[result.perturbId]?.name} → outcome (stitched shortest paths).</p>
            {result.pathViaPerturb?.length ? (
              <ul className="mech-hop-list">
                {result.pathViaPerturb.map((h, i) => (
                  <li key={h.relId + i}>
                    <button type="button" className="grounding-link-btn" onClick={() => inspect({ kind: "relationship", id: h.relId })}>
                      {hopPhrase(h)}
                    </button>
                    <span className={`evidence-tier ${TIER_CLASS[h.review] ?? "tier-missing"}`}>{h.reviewLabel}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">Could not stitch a path through the chosen perturbation.</p>
            )}
          </section>

          <section className="card">
            <h3>Signed perturbation effects</h3>
            <p className="xs muted">
              Illustrative decay model from {mode === "inhibit" ? "inhibiting" : "activating"}{" "}
              {byId[result.perturbId]?.name}. Not a kinetic or clinical prediction.
            </p>
            {result.outcomeEffect ? (
              <p>
                Effect on <NodeChip id={result.outcomeId} />:{" "}
                <strong className={result.outcomeEffect.v < 0 ? "fx-down" : "fx-up"}>
                  {result.outcomeEffect.v < 0 ? "decreased" : "increased"}
                </strong>{" "}
                <span className="xs muted">(score {result.outcomeEffect.v.toFixed(2)}, depth {result.outcomeEffect.depth})</span>
              </p>
            ) : (
              <p className="empty">Propagation does not reach the outcome within four hops.</p>
            )}
            <ul className="mech-effects">
              {result.effects.slice(0, 12).map((e) => (
                <li key={e.id}>
                  <NodeChip id={e.id} />
                  <span className={e.v < 0 ? "fx-down" : "fx-up"}>{e.v.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h3>Assumptions</h3>
            <ul className="mech-notes">{result.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
          </section>

          <section className="card">
            <h3>Known gaps</h3>
            {result.gaps.length ? (
              <ul className="mech-notes gaps">{result.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
            ) : (
              <p className="xs muted">No structural gaps flagged for this selection (evidence quality may still be limited).</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

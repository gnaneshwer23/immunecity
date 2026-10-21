import { Link } from "@tanstack/react-router";
import { ArrowRight, AlertTriangle, BookOpenCheck, BookMarked, CircleOff } from "lucide-react";
import { byId, TYPES, human } from "@/lib/immune/engine";
import { inspect } from "@/lib/immune/inspector";
import type { AskGrounding, EvidenceTier } from "@/lib/askGrounding";
import { provisionalLitLabel, shouldFetchProvisionalLit } from "@/lib/askGrounding";
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

export type GroundingPanelProps = {
  grounding: AskGrounding;
  /** Soft-fail note from /api/ask/prepare (provisional lit API down / skipped). */
  provisionalNote?: string | null;
};

export default function GroundingPanel({ grounding, provisionalNote }: GroundingPanelProps) {
  const classLabel = CLASS_LABEL[grounding.queryClass] ?? grounding.queryClass;
  if (!grounding.coverage.matched || grounding.trace.abstained) {
    return (
      <aside className="grounding-panel grounding-panel--gap" aria-label="Graph grounding">
        <div className="grounding-head">
          <strong>Graph grounding</strong>
          <span className={`evidence-tier ${TIER_CLASS["missing-support"]}`}>
            {grounding.trace.abstained ? "Abstained" : "No match"}
          </span>
        </div>
        <div className="grounding-callout grounding-callout--warn" role="status">
          <AlertTriangle size={14} aria-hidden />
          <p>
            {grounding.trace.abstained
              ? `Query class: ${classLabel}. No model synthesis was run — Ask Immune will not invent graph evidence or citations.`
              : "No Immune Super Intelligence concepts matched this question. Ask Immune must not invent pathways, concepts, or PMIDs."}
          </p>
        </div>
        <p className="xs muted">
          Try a named cell, cytokine, receptor, disease or therapy from the{" "}
          <Link to="/atlas">Knowledge Atlas</Link>, or read{" "}
          <Link to="/methods">Methods &amp; trust</Link> for what is curated.
        </p>
        <p className="xs muted">Trace · prompt {grounding.trace.promptVersion} · graph {grounding.trace.graphVersion}</p>
      </aside>
    );
  }

  const chain = grounding.chains[0];
  const topLinks = grounding.links.slice(0, 6);
  const provisional = grounding.provisionalLiterature ?? [];
  const counter = grounding.counterEvidence ?? [];
  const reviewed = grounding.coverage.reviewedEvidenceCount ?? 0;
  const counterCount = grounding.coverage.counterEvidenceCount ?? counter.length;
  const missing = grounding.coverage.missingSupportCount ?? 0;
  const wantProvisional = shouldFetchProvisionalLit(grounding, grounding.queryClass);
  const showProvisionalSoft =
    wantProvisional && provisional.length === 0 && (provisionalNote || reviewed === 0);

  return (
    <aside className="grounding-panel" aria-label="Graph grounding used for this answer">
      <div className="grounding-head">
        <strong>Graph grounding</strong>
        <span className="xs muted">Retrieved before the AI answer · not model memory</span>
      </div>

      <div className="grounding-buckets" aria-label="Evidence tiers — do not conflate">
        <div className="grounding-bucket grounding-bucket--reviewed">
          <BookOpenCheck size={14} aria-hidden />
          <div>
            <b>Reviewed (Gate C)</b>
            <span>{reviewed} approved+supports cite{reviewed === 1 ? "" : "s"}</span>
          </div>
        </div>
        <div className="grounding-bucket grounding-bucket--counter">
          <AlertTriangle size={14} aria-hidden />
          <div>
            <b>Counterevidence</b>
            <span>
              {counterCount > 0
                ? `${counterCount} contradicts/partial`
                : "none curated yet (honest empty)"}
            </span>
          </div>
        </div>
        <div className="grounding-bucket grounding-bucket--provisional">
          <BookMarked size={14} aria-hidden />
          <div>
            <b>Provisional lit</b>
            <span>
              {grounding.coverage.provisionalLiteratureCount ?? provisional.length} unreviewed PubMed/Europe PMC
            </span>
          </div>
        </div>
        <div className="grounding-bucket grounding-bucket--missing">
          <CircleOff size={14} aria-hidden />
          <div>
            <b>Missing graph support</b>
            <span>{missing} retrieved link{missing === 1 ? "" : "s"} without reviewed cites</span>
          </div>
        </div>
      </div>

      {missing > 0 || reviewed === 0 ? (
        <div className="grounding-callout grounding-callout--warn" role="status">
          <AlertTriangle size={14} aria-hidden />
          <p>
            {reviewed === 0
              ? "No Gate C reviewed cites on the retrieved links. Teaching uses graph structure only — do not treat this answer as fully evidence-grounded."
              : `${missing} retrieved relationship${missing === 1 ? "" : "s"} lack reviewed cites. Gaps are labelled below; Ask Immune will not invent PMIDs.`}
          </p>
        </div>
      ) : null}

      <div className="grounding-metrics" aria-label="Evidence coverage detail">
        <span><b>{classLabel}</b> class</span>
        <span><b>{grounding.coverage.establishedCount}</b> established</span>
        <span><b>{grounding.coverage.evidenceSupportedCount ?? 0}</b> evidence-supported</span>
        <span><b>{grounding.coverage.emergingCount}</b> emerging</span>
        <span><b>{grounding.coverage.draftCount}</b> draft</span>
      </div>
      <p className="xs muted">
        Reviewed = Gate C approved+supports with verified identifiers. Counterevidence = assessed contradicts/partial (separate path; empty when Neon has none).
        Provisional = unreviewed search hits — never auto-approved. Ask Immune is partial — not fully evidence-grounded AI.
      </p>
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
            <Link className="xs grounding-route" to="/atlas/$id" params={{ id: n.id }}>concept page</Link>
            <Link className="xs grounding-route" to="/graph" search={{ focus: n.id }}>graph</Link>
            <Link className="xs grounding-route" to="/research" search={{ lib: n.name }} hash="library">papers</Link>
          </li>
        ))}
      </ul>

      {chain ? (
        <>
          <div className="grounding-label">Causal chain used</div>
          <ol className="grounding-chain">
            <li>
              <Link className="ask-concept ask-concept-link" to="/atlas/$id" params={{ id: chain.fromId }}>
                {byId[chain.fromId]?.name ?? chain.fromId}
              </Link>
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
                <Link className="ask-concept ask-concept-link" to="/atlas/$id" params={{ id: h.toId }}>
                  {byId[h.toId]?.name ?? h.toId}
                </Link>
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
              {l.reviewedEvidenceCount > 0 ? (
                <span className={`evidence-tier ${TIER_CLASS.established}`}>{l.reviewedEvidenceCount} Gate C</span>
              ) : (
                <span className={`evidence-tier ${TIER_CLASS["missing-support"]}`}>No reviewed cite</span>
              )}
              {s ? <Link className="xs grounding-route" to="/atlas/$id" params={{ id: s.id }}>{s.name}</Link> : null}
              {o ? <Link className="xs grounding-route" to="/atlas/$id" params={{ id: o.id }}>{o.name}</Link> : null}
              {edge ? <EdgeReference edge={edge} /> : null}
            </li>
          );
        })}
      </ul>

      <div className="grounding-label">Counterevidence (contradicts / partial)</div>
      {counter.length > 0 ? (
        <ul className="grounding-links grounding-counter" aria-label="Counterevidence assessments">
          {counter.map((c) => (
            <li key={c.evidence_id}>
              <a href={c.url} target="_blank" rel="noreferrer">{c.label}</a>
              <span className={`evidence-tier ${TIER_CLASS.hypothesis}`}>{c.claim_support}</span>
              <span className="xs muted">not Gate C support · {c.relationship_id ?? "unmapped"}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="xs muted grounding-soft-fail" role="status">
          No curated contradicts/partial rows on these links yet — honest empty set, not a claim that the literature agrees.
        </p>
      )}

      {provisional.length > 0 ? (
        <>
          <div className="grounding-label">{provisionalLitLabel()}</div>
          <ul className="grounding-links grounding-provisional" aria-label="Provisional unreviewed literature">
            {provisional.map((p) => (
              <li key={p.pmid ?? p.doi ?? p.title}>
                <a href={p.url} target="_blank" rel="noreferrer">
                  {p.pmid ? `PMID ${p.pmid}` : p.doi ? `DOI ${p.doi}` : p.title.slice(0, 60)}
                </a>
                <span className={`evidence-tier ${TIER_CLASS.hypothesis}`}>Provisional</span>
                <span className="xs muted">{p.source}{p.year ? ` · ${p.year}` : ""} — not Gate C approved</span>
                <span className="xs muted">{p.title.slice(0, 120)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : showProvisionalSoft ? (
        <p className="xs muted grounding-soft-fail" role="status">
          {provisionalNote
            ?? "Provisional PubMed/Europe PMC lookup returned no hits or soft-failed — that is not Gate C coverage, and not a claim that no literature exists."}
        </p>
      ) : null}
    </aside>
  );
}

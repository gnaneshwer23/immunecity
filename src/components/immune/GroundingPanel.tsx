import { Link } from "@tanstack/react-router";
import { ArrowRight, AlertTriangle, BookOpenCheck, BookMarked } from "lucide-react";
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
  "missing-support": "No reviewed source",
};

const CLASS_LABEL: Record<string, string> = {
  graph_explanation: "Explanation",
  source_lookup: "Source request",
  comparison: "Comparison",
  hypothesis_request: "Hypothesis (candidate)",
  omics_request: "Omics data (not available yet)",
  mechanism_perturbation: "What-if question",
  unsupported: "Outside the graph",
  clinical_personal: "Personal medical question",
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
      <aside className="grounding-panel grounding-panel--gap" aria-label="Why there is no graph-based answer">
        <div className="grounding-head">
          <strong>{grounding.trace.abstained ? "Not answered from the graph" : "No matching concepts"}</strong>
        </div>
        <div className="grounding-callout grounding-callout--warn" role="status">
          <AlertTriangle size={14} aria-hidden />
          <p>
            {grounding.trace.abstained
              ? `This looks like a ${classLabel.toLowerCase()}, which Ask Immune does not answer from the graph — so nothing was generated and no sources were invented.`
              : "Nothing in the knowledge graph matched this question, so Ask Immune did not write an answer rather than guess."}
          </p>
        </div>
        <p className="xs muted">
          Try naming a cell, cytokine, receptor, disease or therapy — browse the{" "}
          <Link to="/atlas">Knowledge Atlas</Link> for ideas, or see <Link to="/methods">Methods</Link> for what is covered.
        </p>
        <details className="grounding-details">
          <summary>Technical trace</summary>
          <p className="xs muted">Prompt {grounding.trace.promptVersion} · graph {grounding.trace.graphVersion}</p>
        </details>
      </aside>
    );
  }

  const chain = grounding.chains[0];
  const topLinks = grounding.links.slice(0, 6);
  const provisional = grounding.provisionalLiterature ?? [];
  const counter = grounding.counterEvidence ?? [];
  const reviewed = grounding.coverage.reviewedEvidenceCount ?? 0;
  const counterCount = grounding.coverage.counterEvidenceCount ?? counter.length;
  const totalLinks = grounding.links.length;
  const reviewedLinks = grounding.links.filter((l) => l.reviewedEvidenceCount > 0).length;
  const provisionalCount = grounding.coverage.provisionalLiteratureCount ?? provisional.length;
  const wantProvisional = shouldFetchProvisionalLit(grounding, grounding.queryClass);
  const showProvisionalSoft =
    wantProvisional && provisional.length === 0 && (provisionalNote || reviewed === 0);

  return (
    <aside className="grounding-panel" aria-label="How well this answer is supported">
      <div className="grounding-head">
        <strong>How well supported is this answer?</strong>
      </div>
      <p className="grounding-summary">
        <b>{reviewedLinks} of {totalLinks}</b> graph link{totalLinks === 1 ? "" : "s"} used here {reviewedLinks === 1 ? "has" : "have"} an expert-reviewed source.
      </p>
      <div
        className="grounding-meter"
        role="meter"
        aria-label="Share of links with a reviewed source"
        aria-valuemin={0}
        aria-valuemax={totalLinks}
        aria-valuenow={reviewedLinks}
      >
        <span style={{ width: `${totalLinks ? Math.max((reviewedLinks / totalLinks) * 100, reviewedLinks ? 3 : 0) : 0}%` }} />
      </div>
      <ul className="grounding-chips" aria-label="Evidence counts">
        <li><BookOpenCheck size={13} aria-hidden /> {reviewed} reviewed source{reviewed === 1 ? "" : "s"}</li>
        <li><AlertTriangle size={13} aria-hidden /> {counterCount} conflicting finding{counterCount === 1 ? "" : "s"} on record</li>
        <li><BookMarked size={13} aria-hidden /> {provisionalCount} unreviewed paper{provisionalCount === 1 ? "" : "s"}</li>
      </ul>
      {reviewedLinks === 0 ? (
        <div className="grounding-callout grounding-callout--warn" role="status">
          <AlertTriangle size={14} aria-hidden />
          <p>None of these links has been checked against a source yet. Read this as a teaching explanation, not verified evidence.</p>
        </div>
      ) : reviewedLinks < totalLinks ? (
        <p className="xs muted">The rest are teaching links still awaiting expert review. No sources were invented for them.</p>
      ) : null}

      <div className="grounding-label">Concepts used</div>
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
          <div className="grounding-label">Causal chain</div>
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
        <p className="xs muted">No single causal chain links the main concepts in this answer.</p>
      )}

      <details className="grounding-details">
        <summary>Evidence details</summary>

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
                <span className={`evidence-tier ${TIER_CLASS.established}`}>{l.reviewedEvidenceCount} reviewed</span>
              ) : (
                <span className={`evidence-tier ${TIER_CLASS["missing-support"]}`}>No reviewed source</span>
              )}
              {s ? <Link className="xs grounding-route" to="/atlas/$id" params={{ id: s.id }}>{s.name}</Link> : null}
              {o ? <Link className="xs grounding-route" to="/atlas/$id" params={{ id: o.id }}>{o.name}</Link> : null}
              {edge ? <EdgeReference edge={edge} /> : null}
            </li>
          );
        })}
      </ul>

      <div className="grounding-label">Conflicting findings (reviewed)</div>
      {counter.length > 0 ? (
        <ul className="grounding-links grounding-counter" aria-label="Counterevidence assessments">
          {counter.map((c) => (
            <li key={c.evidence_id}>
              <a href={c.url} target="_blank" rel="noreferrer">{c.label}</a>
              <span className={`evidence-tier ${TIER_CLASS.hypothesis}`}>{c.claim_support}</span>
              <span className="xs muted">reviewed as {c.claim_support === "partial" ? "partly supporting" : "contradicting"} this link — not support · {c.relationship_id ?? "unmapped"}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="xs muted grounding-soft-fail" role="status">
          No conflicting findings have been reviewed for these links yet. That does not mean the literature agrees.
        </p>
      )}

      <div className="grounding-label">Possible conflicts (unreviewed search)</div>
      {(grounding.counterEvidenceHarvest ?? []).length > 0 ? (
        <ul className="grounding-links grounding-counter-harvest" aria-label="Unreviewed contradict-polarity harvest">
          {(grounding.counterEvidenceHarvest ?? []).map((p) => (
            <li key={`h-${p.pmid ?? p.doi ?? p.title}`}>
              <a href={p.url} target="_blank" rel="noreferrer">
                {p.pmid ? `PMID ${p.pmid}` : p.doi ? `DOI ${p.doi}` : p.title.slice(0, 60)}
              </a>
              <span className={`evidence-tier ${TIER_CLASS.hypothesis}`}>Unreviewed</span>
              <span className="xs muted">
                {p.source}{p.year ? ` · ${p.year}` : ""} — search hint only, not reviewed
              </span>
              <span className="xs muted">{p.title.slice(0, 120)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="xs muted grounding-soft-fail" role="status">
          No possible conflicts found by search (the search runs only when a link has a reviewed source). That is not proof of agreement.
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
                <span className={`evidence-tier ${TIER_CLASS.hypothesis}`}>Unreviewed</span>
                <span className="xs muted">{p.source}{p.year ? ` · ${p.year}` : ""} — not reviewed for this claim</span>
                <span className="xs muted">{p.title.slice(0, 120)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : showProvisionalSoft ? (
        <p className="xs muted grounding-soft-fail" role="status">
          {provisionalNote
            ?? "The literature search found nothing to show here. That is not a claim that no research exists."}
        </p>
      ) : null}

      <div className="grounding-label">Link status across this answer</div>
      <div className="grounding-metrics" aria-label="Link status counts">
        <span><b>{grounding.coverage.establishedCount}</b> established</span>
        <span><b>{grounding.coverage.evidenceSupportedCount ?? 0}</b> supported</span>
        <span><b>{grounding.coverage.emergingCount}</b> emerging</span>
        <span><b>{grounding.coverage.draftCount}</b> draft</span>
      </div>
      <dl className="grounding-glossary">
        <dt>Reviewed source</dt><dd>A paper an expert has checked supports this exact link, with a verified PubMed or DOI identifier.</dd>
        <dt>Conflicting finding</dt><dd>A reviewed paper that contradicts or only partly supports a link. Never counted as support.</dd>
        <dt>Unreviewed paper</dt><dd>A literature search result shown for further reading. Not checked and never treated as support.</dd>
      </dl>
      <p className="xs muted">
        Question type: {classLabel} · prompt {grounding.trace.promptVersion} · graph {grounding.trace.graphVersion} · {grounding.trace.graphSnapshot}
      </p>
      </details>
    </aside>
  );
}

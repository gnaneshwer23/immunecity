/**
 * Draft research brief generator on /research — AI/draft labelled, fail-closed citations.
 * Export JSON/markdown with timestamp + source list. Cannot approve into the KG.
 */
import { useMemo, useState } from "react";
import { byId } from "@/lib/immune/engine";
import {
  classifyEvidenceGap,
  evidenceGapLabelText,
  EVIDENCE_GAP_LABELS,
} from "@/lib/research/evidenceGap";
import {
  draftResearchBrief,
  exportResearchBriefJson,
  exportResearchBriefMarkdown,
  RESEARCH_BRIEF_SCHEMA_VERSION,
  type ResearchBriefDraft,
} from "@/lib/research/researchBrief";

function download(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type Props = {
  /** Prefill from workbench question / related concept ids. */
  seedQuestion?: string;
  seedConceptIds?: string[];
  seedEvidenceIds?: string[];
  seedTrialIds?: string[];
};

export default function ResearchBriefPanel({
  seedQuestion = "",
  seedConceptIds = [],
  seedEvidenceIds = [],
  seedTrialIds = [],
}: Props) {
  const [question, setQuestion] = useState(seedQuestion || "How does PD-1 blockade relate to melanoma response?");
  const [conceptText, setConceptText] = useState(
    seedConceptIds.length ? seedConceptIds.join(", ") : "D012, I001, TR003, B011",
  );
  const [evidenceText, setEvidenceText] = useState(seedEvidenceIds.join(", "));
  const [trialText, setTrialText] = useState(seedTrialIds.length ? seedTrialIds.join(", ") : "TR003");
  const [rationale, setRationale] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<ResearchBriefDraft | null>(null);

  const conceptIds = useMemo(
    () => conceptText.split(/[\s,;]+/).map((s) => s.trim()).filter((id) => byId[id]),
    [conceptText],
  );
  const gaps = useMemo(() => conceptIds.map((id) => ({ id, gap: classifyEvidenceGap(id) })), [conceptIds]);

  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <p className="small">
        <span className="chip">AI/draft · unreviewed</span> Generate a structured research brief from retrieved graph /
        trial / evidence ids only. Unsupported ids fail closed. Exports stay unreviewed and{" "}
        <strong>cannot approve into the knowledge graph</strong>. No clinical recommendations.
      </p>

      <label className="field">
        Research question
        <input value={question} onChange={(e) => setQuestion(e.target.value)} />
      </label>
      <label className="field">
        Retrieved concept ids
        <input value={conceptText} onChange={(e) => setConceptText(e.target.value)} />
      </label>
      <label className="field">
        Retrieved evidence ids (optional)
        <input value={evidenceText} onChange={(e) => setEvidenceText(e.target.value)} placeholder="Neon evidence_id values" />
      </label>
      <label className="field">
        Retrieved trial ids (optional)
        <input value={trialText} onChange={(e) => setTrialText(e.target.value)} />
      </label>
      <label className="field">
        Optional rationale (must not invent ids)
        <textarea rows={2} value={rationale} onChange={(e) => setRationale(e.target.value)} />
      </label>

      <div>
        <p className="xs muted" style={{ marginBottom: 6 }}>
          Evidence-gap labels (ISI curated coverage / search date-scope · never invents Gate C density · not a claim
          that no literature exists worldwide):
        </p>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {gaps.map(({ id, gap }) => (
            <span key={id} className="chip" title={id}>
              {id}: {gap ? evidenceGapLabelText(gap) : "no gap label"}
            </span>
          ))}
        </div>
        <p className="xs muted" style={{ marginTop: 6 }}>
          Vocabulary: {EVIDENCE_GAP_LABELS.map((l) => evidenceGapLabelText(l)).join(" · ")}
        </p>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn sm"
          onClick={() => {
            setError(null);
            const result = draftResearchBrief({
              question,
              rationale: rationale.trim() || undefined,
              sources: {
                conceptIds,
                evidenceIds: evidenceText.split(/[\s,;]+/).filter(Boolean),
                trialIds: trialText.split(/[\s,;]+/).filter(Boolean),
              },
            });
            if (!result.ok) {
              setBrief(null);
              setError(result.reason);
              return;
            }
            setBrief(result.brief);
          }}
        >
          Generate draft brief
        </button>
        {brief ? (
          <>
            <button
              type="button"
              className="btn sm"
              onClick={() =>
                download(
                  `research-brief.${RESEARCH_BRIEF_SCHEMA_VERSION}.${brief.exportedAt.replace(/[:.]/g, "-")}.json`,
                  exportResearchBriefJson(brief),
                  "application/json",
                )
              }
            >
              Export JSON
            </button>
            <button
              type="button"
              className="btn sm"
              onClick={() =>
                download(
                  `research-brief.${RESEARCH_BRIEF_SCHEMA_VERSION}.${brief.exportedAt.replace(/[:.]/g, "-")}.md`,
                  exportResearchBriefMarkdown(brief),
                  "text/markdown",
                )
              }
            >
              Export Markdown
            </button>
          </>
        ) : null}
      </div>

      {error ? (
        <p className="callout" role="alert">
          {error}
        </p>
      ) : null}

      {brief ? (
        <article style={{ display: "grid", gap: 10 }}>
          <p className="xs muted">
            {brief.label} · {brief.reviewStatus} · kgWrite={String(brief.kgWrite)} · canApproveIntoKg=
            {String(brief.canApproveIntoKg)} · exported {brief.exportedAt}
          </p>
          {brief.sections.map((s) => (
            <section key={s.id}>
              <h3 style={{ fontSize: "1rem" }}>{s.title}</h3>
              <pre className="small" style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                {s.body}
              </pre>
            </section>
          ))}
          <section>
            <h3 style={{ fontSize: "1rem" }}>Source list</h3>
            <ul className="small">
              {brief.sourceList.map((s) => (
                <li key={`${s.kind}-${s.id}`}>
                  [{s.kind}] {s.id} — {s.name}
                </li>
              ))}
            </ul>
          </section>
          <p className="xs muted">{brief.disclaimer}</p>
        </article>
      ) : null}
    </div>
  );
}

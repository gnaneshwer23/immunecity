/**
 * Inline M1 Biomedical Discovery Brief (Workflow B) — rendered from Ask grounding.
 * Available research capability only; hypotheses labelled unvalidated; Observed N/A.
 */
import { Link } from "@tanstack/react-router";
import {
  CLAIM_TYPE_LABEL,
  exportInvestigationBriefJson,
  exportInvestigationBriefMarkdown,
  INVESTIGATION_BRIEF_SCHEMA_VERSION,
  type InvestigationBrief,
} from "@/lib/research/investigationBrief";
import {
  ORGANISM_CLASS_LABEL,
  PRESENTATION_GROUP_LABEL,
} from "@/lib/research/humanEvidencePrioritisation";
import {
  groupResearchGapEntriesByPriority,
  type ResearchGapRegister,
} from "@/lib/research/researchGapRegister";

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
  brief: InvestigationBrief;
  onClear?: () => void;
};

function Cap11GapGroups({ register }: { register: ResearchGapRegister }) {
  const groups = groupResearchGapEntriesByPriority(register.entries);
  let shown = 0;
  const max = 12;
  return (
    <div className="small" style={{ display: "grid", gap: 10 }}>
      {groups.map((g) => {
        const remaining = max - shown;
        if (remaining <= 0) return null;
        const slice = g.entries.slice(0, remaining);
        shown += slice.length;
        return (
          <div key={g.priority}>
            <p className="xs muted" style={{ margin: "0 0 4px" }}>
              <span className="chip">{g.priority}</span>{" "}
              {register.priorityCounts[g.priority]} in band
            </p>
            <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
              {slice.map((e) => (
                <li key={e.id} style={{ marginBottom: 6 }}>
                  <span className="chip">{e.entryKind}</span> {e.title}
                  {e.conceptName ? ` — ${e.conceptName}` : ""}
                  {e.conceptId && e.atlasPath ? (
                    <>
                      {" "}
                      <Link to="/atlas/$id" params={{ id: e.conceptId }} className="xs">
                        Atlas
                      </Link>
                    </>
                  ) : null}
                  <div className="xs muted" style={{ marginTop: 2 }}>
                    {e.detail}
                  </div>
                  <div className="xs muted" style={{ marginTop: 2 }}>
                    Next: {e.suggestedNextStep}
                  </div>
                  {e.relatedContradictionIds.length ? (
                    <div className="xs muted" style={{ marginTop: 2 }}>
                      Cap 10: {e.relatedContradictionIds.join(", ")}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export default function InvestigationBriefView({ brief, onClear }: Props) {
  const stamp = brief.exportedAt.replace(/[:.]/g, "-");
  return (
    <article className="investigation-brief" aria-label="Biomedical discovery brief">
      <header className="investigation-brief-head">
        <p className="xs muted" style={{ margin: 0 }}>
          <span className="chip">{brief.capabilityLabel}</span>{" "}
          <span className="chip">{brief.label} · {brief.reviewStatus}</span>{" "}
          <span className="chip">{brief.product}</span>
        </p>
        <p className="xs muted" style={{ margin: "6px 0 0" }}>
          Workflow B · schema {brief.schemaVersion} · not clinical · not trials · kgWrite=false
        </p>
      </header>

      <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <button
          type="button"
          className="btn sm"
          onClick={() =>
            download(
              `m1-brief.${INVESTIGATION_BRIEF_SCHEMA_VERSION}.${stamp}.json`,
              exportInvestigationBriefJson(brief),
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
              `m1-brief.${INVESTIGATION_BRIEF_SCHEMA_VERSION}.${stamp}.md`,
              exportInvestigationBriefMarkdown(brief),
              "text/markdown",
            )
          }
        >
          Export Markdown
        </button>
        {onClear ? (
          <button type="button" className="btn sm" onClick={onClear}>
            Hide brief
          </button>
        ) : null}
      </div>

      {brief.sections.map((s) => (
        <section key={s.id} style={{ marginTop: 12 }}>
          <h3 style={{ fontSize: "1rem", margin: "0 0 4px" }}>{s.title}</h3>
          <pre className="small" style={{ whiteSpace: "pre-wrap", margin: 0 }}>
            {s.body}
          </pre>
        </section>
      ))}

      <section style={{ marginTop: 12 }}>
        <h3 style={{ fontSize: "1rem", margin: "0 0 4px" }}>Source inspection</h3>
        <ul className="small" style={{ margin: 0, paddingLeft: "1.2rem" }}>
          {brief.sourceLinks.map((s) => (
            <li key={`${s.kind}-${s.id}`}>
              [{s.kind}]{" "}
              {s.href?.startsWith("/") ? (
                s.href.startsWith("/atlas/") ? (
                  <Link to="/atlas/$id" params={{ id: s.id }}>
                    {s.name}
                  </Link>
                ) : (
                  <a href={s.href}>{s.name}</a>
                )
              ) : s.href ? (
                <a href={s.href} target="_blank" rel="noreferrer">
                  {s.name}
                </a>
              ) : (
                s.name
              )}
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 12 }}>
        <h3 style={{ fontSize: "1rem", margin: "0 0 4px" }}>Claim category chips</h3>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {brief.claimStatements
            .filter((c) => c.claimType === "observed_patient_fact" || c.applicable)
            .slice(0, 10)
            .map((c, i) => (
              <span
                key={`${c.claimType}-${c.relId ?? "na"}-${i}`}
                className="chip"
                title={c.assertion}
              >
                {CLAIM_TYPE_LABEL[c.claimType]}
                {c.unvalidated ? " · unvalidated" : !c.applicable ? " · N/A" : ""}
              </span>
            ))}
        </div>
      </section>

      <section style={{ marginTop: 14 }} aria-label="Cap 6 human evidence prioritisation">
        <h3 style={{ fontSize: "1rem", margin: "0 0 4px" }}>
          Cap 6 · Human evidence comparison
        </h3>
        <p className="xs muted" style={{ margin: "0 0 6px" }}>
          Navigation groups only — human cues are not automatically ranked above preclinical findings.
          Graph has no species field.
        </p>
        {brief.humanEvidence.rows.length ? (
          <ul className="small" style={{ margin: 0, paddingLeft: "1.2rem" }}>
            {brief.humanEvidence.rows.slice(0, 12).map((r) => (
              <li key={r.relId}>
                <strong>{r.assertion}</strong> — {ORGANISM_CLASS_LABEL[r.organismClass]};{" "}
                {PRESENTATION_GROUP_LABEL[r.presentationGroup]}; Gate C{" "}
                {r.gateCSupport ? `yes (n=${r.reviewedEvidenceCount})` : "no"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="small muted">Honest empty — no retrieved relationships.</p>
        )}
      </section>

      <section style={{ marginTop: 14 }} aria-label="Cap 10 scientific contradictions">
        <h3 style={{ fontSize: "1rem", margin: "0 0 4px" }}>
          Cap 10 · Contradictions (unresolved)
        </h3>
        <p className="xs muted" style={{ margin: "0 0 6px" }}>
          majorityVote=false · silentMerge=false · first-class CONTRADICTS indexed · both sides retained.
        </p>
        {brief.contradictions.honestEmpty ? (
          <p className="small muted">
            Honest empty — none retrieved in this neighbourhood (not a claim that literature agrees).
          </p>
        ) : (
          <ul className="small" style={{ margin: 0, paddingLeft: "1.2rem" }}>
            {brief.contradictions.items.slice(0, 12).map((it) => (
              <li key={it.id} style={{ marginBottom: 6 }}>
                <span className="chip">{it.kind}</span> {it.summary}
                {it.sideA && it.sideB ? (
                  <ul style={{ margin: "4px 0 0", paddingLeft: "1.1rem" }}>
                    <li>
                      Side A: {it.sideA.statement}
                      {it.sideA.tissue ? ` · tissue ${it.sideA.tissue}` : ""}
                      {it.sideA.sourceRefs?.length
                        ? ` · ${it.sideA.sourceRefs.join("; ")}`
                        : ""}
                    </li>
                    <li>
                      Side B: {it.sideB.statement}
                      {it.sideB.tissue ? ` · tissue ${it.sideB.tissue}` : ""}
                      {it.sideB.sourceRefs?.length
                        ? ` · ${it.sideB.sourceRefs.join("; ")}`
                        : ""}
                    </li>
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 14 }} aria-label="Cap 11 research gap register">
        <h3 style={{ fontSize: "1rem", margin: "0 0 4px" }}>
          Cap 11 · Research gap register
        </h3>
        <p className="xs muted" style={{ margin: "0 0 6px" }}>
          {brief.researchGaps.scopeHonestyNote}
        </p>
        <p className="xs muted" style={{ margin: "0 0 6px" }}>
          Scope: {brief.researchGaps.searchScope.corpus} · {brief.researchGaps.searchScope.dateScope} ·
          schema {brief.researchGaps.schemaVersion} · notWorldwideAbsence on every row.
        </p>
        {brief.researchGaps.honestEmpty ? (
          <p className="small muted">
            Honest empty — no gap rows for this retrieval (not “fully explored in literature”).
          </p>
        ) : (
          <Cap11GapGroups register={brief.researchGaps} />
        )}
      </section>

      <p className="xs muted" style={{ marginTop: 12 }}>
        {brief.disclaimer}
      </p>
    </article>
  );
}

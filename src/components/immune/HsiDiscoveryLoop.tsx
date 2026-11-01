/**
 * Product Discovery loop: ASK → MAP → REVIEW (+ optional VALIDATE / TRANSLATE).
 * Research / HITL only — not CDS. Gate C stays pending.
 */
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { ConsumeLoadResult } from "@/lib/hsi/discoveryConsume";
import { HsiGateCQueuePanel } from "@/components/immune/HsiGateCQueuePanel";
import {
  DISCOVERY_LOOP_TABS,
  entitySliceFromPack,
  evidenceToGraphEdges,
  expertShortlist,
  gateCPendingCount,
  gradeCounts,
  partnerDisease,
  partnerHonestyLines,
  partnerLabel,
  partnerQuestion,
  partnerScopedEvidenceRows,
  raCompetingExplanations,
  r2HypothesisCards,
  translationCandidates,
  type DiscoveryLoopTab,
  type EvidenceRowView,
} from "@/lib/hsi/discoveryLoopView";

function GradeChip({ grade }: { grade: string }) {
  const g = grade.toLowerCase();
  return (
    <span className={`isi-hsi-grade isi-hsi-grade-${g}`} data-grade={g}>
      {g}
    </span>
  );
}

function EvidenceTable({ rows }: { rows: EvidenceRowView[] }) {
  if (!rows.length) {
    return <p className="small muted">No partner-scoped evidence rows in this pin.</p>;
  }
  return (
    <div className="isi-hsi-table-wrap">
      <table className="isi-hsi-table">
        <thead>
          <tr>
            <th>Grade</th>
            <th>Claim</th>
            <th>S–P–O</th>
            <th>Source</th>
            <th>Marker</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.claimId}>
              <td>
                <GradeChip grade={r.evidenceGrade} />
              </td>
              <td>
                <div>{r.claimText}</div>
                <code className="small muted">{r.claimId}</code>
              </td>
              <td className="isi-hsi-spo">
                <span>{r.subject}</span>
                <em>{r.relationship}</em>
                <span>{r.object}</span>
              </td>
              <td>
                {r.pmid ? (
                  <a
                    href={r.sourceUrl ?? `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    PMID {r.pmid}
                  </a>
                ) : (
                  <span className="muted">—</span>
                )}
                {r.citationLabel ? <div className="small muted">{r.citationLabel}</div> : null}
              </td>
              <td>
                {r.loinc ? (
                  <>
                    <div>{r.markerName ?? "marker"}</div>
                    <code className="small muted">LOINC {r.loinc}</code>
                  </>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EvidenceMapGraph({ rows }: { rows: EvidenceRowView[] }) {
  const edges = useMemo(() => evidenceToGraphEdges(rows).slice(0, 24), [rows]);
  const nodes = useMemo(() => {
    const set = new Map<string, { id: string; kind: "subject" | "object" }>();
    for (const e of edges) {
      if (!set.has(e.subject)) set.set(e.subject, { id: e.subject, kind: "subject" });
      if (!set.has(e.object)) set.set(e.object, { id: e.object, kind: "object" });
    }
    return [...set.values()];
  }, [edges]);

  if (!edges.length) return null;

  return (
    <div className="isi-hsi-map-graph" aria-label="Structured evidence map">
      <div className="isi-hsi-map-nodes">
        {nodes.map((n) => (
          <span key={n.id} className="isi-hsi-node" data-kind={n.kind}>
            {n.id}
          </span>
        ))}
      </div>
      <ul className="isi-hsi-map-edges">
        {edges.map((e) => (
          <li key={e.id}>
            <strong>{e.subject}</strong>
            <span className="muted"> {e.relationship} </span>
            <strong>{e.object}</strong>
            <GradeChip grade={e.grade} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HsiDiscoveryLoop({ result }: { result: ConsumeLoadResult }) {
  const [tab, setTab] = useState<DiscoveryLoopTab>("ask");
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  const pack = result.pilotPack as Record<string, unknown>;
  const lock = result.partnerLock;
  const scoped = useMemo(
    () => partnerScopedEvidenceRows(pack.evidenceMap, lock, pack.partnerLock),
    [pack, lock],
  );
  const counts = useMemo(() => gradeCounts(scoped), [scoped]);
  const filtered = useMemo(() => {
    if (gradeFilter === "all") return scoped;
    return scoped.filter((r) => r.evidenceGrade === gradeFilter);
  }, [scoped, gradeFilter]);
  const entity = useMemo(() => entitySliceFromPack(pack), [pack]);
  const explanations = useMemo(
    () => raCompetingExplanations(pack.competingExplanations),
    [pack],
  );
  const experts = useMemo(() => expertShortlist(pack.expertShortlist), [pack]);
  const r2Cards = useMemo(() => r2HypothesisCards(result.r2), [result.r2]);
  const translateRows = useMemo(
    () => translationCandidates(result.translation),
    [result.translation],
  );
  const pending = gateCPendingCount(result.gateC);
  const disease = partnerDisease(lock, pack);
  const question = partnerQuestion(lock, pack);
  const honesty = partnerHonestyLines(lock);

  const availableTabs = DISCOVERY_LOOP_TABS.filter((t) => {
    if (t.id === "validate") return Boolean(result.r2) || r2Cards.length > 0;
    if (t.id === "translate") return Boolean(result.translation) || translateRows.length > 0;
    return true;
  });

  return (
    <div className="isi-hsi-loop">
      <div className="isi-hsi-banners" role="status">
        <p className="callout">
          Not diagnostic · not for clinical use · research intelligence only (notCds=
          {String(result.honesty.notCds)})
        </p>
        <p className="small muted">
          Gate C never auto-approves into the product KG · autoApproveIntoKg=
          {String(result.honesty.autoApproveIntoKg)} · partner production lock=
          {String(result.honesty.partnerSignedProduction)} ({partnerLabel(lock)})
        </p>
      </div>

      <div className="isi-hsi-scope">
        <div className="isi-hsi-pills">
          <span className="chip">scopeLocked={String(lock.scopeLocked ?? false)}</span>
          <span className="chip">lockedPilot={String(lock.lockedPilot ?? false)}</span>
          <span className="chip">activeScope={String(lock.activeScope ?? "ra-tnf")}</span>
          <span className="chip">source={result.source}</span>
        </div>
        <p className="isi-hsi-disease">{disease}</p>
        <p className="isi-hsi-question">{question}</p>
      </div>

      <div className="isi-hsi-tabs" role="tablist" aria-label="Discovery loop">
        {availableTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? "active" : undefined}
            onClick={() => setTab(t.id)}
          >
            <span className="isi-hsi-tab-n">
              {t.n} / {t.label}
            </span>
            <strong>{t.blurb}</strong>
          </button>
        ))}
      </div>

      {tab === "ask" ? (
        <div className="isi-hsi-panel" role="tabpanel">
          <h2 className="h3">ASK — locked RA / anti-TNF question</h2>
          <p className="muted">
            Dual-track SSc / gut / neuro packs must not replace this ASK. Partner lock from{" "}
            <code>hsi-partner-lock.json</code>.
          </p>
          <dl className="grid g2 small" style={{ marginTop: 12 }}>
            <div>
              <dt className="muted">Partner</dt>
              <dd>
                <b>{partnerLabel(lock)}</b>
                {lock.partner?.type ? ` · ${lock.partner.type}` : ""}
              </dd>
            </div>
            <div>
              <dt className="muted">Pathway</dt>
              <dd>{lock.seedPathway?.label ?? "—"}</dd>
            </div>
            <div>
              <dt className="muted">Agreement</dt>
              <dd>
                <code>{String(lock.agreementKind ?? "unset")}</code>
              </dd>
            </div>
            <div>
              <dt className="muted">ASK stays RA</dt>
              <dd>{String(result.askStaysRa)}</dd>
            </div>
          </dl>
          {honesty.length ? (
            <ul className="small" style={{ paddingLeft: 18, marginTop: 12 }}>
              {honesty.slice(0, 6).map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          ) : null}
          {lock.seedPathway?.primaryPmids?.length ? (
            <p className="small muted" style={{ marginTop: 12 }}>
              Seed PMIDs: {lock.seedPathway.primaryPmids.slice(0, 8).join(", ")}
              {lock.seedPathway.primaryPmids.length > 8 ? "…" : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "map" ? (
        <div className="isi-hsi-panel" role="tabpanel">
          <h2 className="h3">MAP — partner-scoped evidence</h2>
          <p className="muted">
            Grades are orthogonal honesty labels (established / uncertain / unexplored) — not Gate C
            and not a confidence %.
          </p>
          <div className="isi-hsi-pills" style={{ marginTop: 10 }}>
            <button
              type="button"
              className={`chip${gradeFilter === "all" ? " primary" : ""}`}
              onClick={() => setGradeFilter("all")}
            >
              all · {scoped.length}
            </button>
            {(["established", "uncertain", "unexplored"] as const).map((g) => (
              <button
                key={g}
                type="button"
                className={`chip${gradeFilter === g ? " primary" : ""}`}
                onClick={() => setGradeFilter(g)}
              >
                {g} · {counts[g] ?? 0}
              </button>
            ))}
          </div>
          <EvidenceMapGraph rows={filtered} />
          <div style={{ marginTop: 16 }}>
            <h3 className="h4">Entity neighbourhood</h3>
            <div className="isi-hsi-entity-grid">
              {(
                [
                  ["Diseases", entity.diseases],
                  ["Cells", entity.cells],
                  ["Pathways", entity.pathwaysOrMechanisms],
                  ["Biomarkers", entity.biomarkers],
                  ["Treatments", entity.treatments],
                ] as const
              ).map(([label, items]) =>
                items.length ? (
                  <div key={label}>
                    <h4 className="small muted">{label}</h4>
                    <div className="isi-hsi-pills">
                      {items.slice(0, 12).map((item) => (
                        <span key={item} className="chip">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null,
              )}
            </div>
            {entity.note ? <p className="small muted">{entity.note}</p> : null}
          </div>
          <div style={{ marginTop: 16 }}>
            <EvidenceTable rows={filtered} />
          </div>
        </div>
      ) : null}

      {tab === "review" ? (
        <div className="isi-hsi-panel" role="tabpanel">
          <h2 className="h3">REVIEW — competing explanations & Gate C</h2>
          <p className="muted">
            Expert challenge stays human. Checklist rows remain <strong>pending</strong>
            {pending ? ` (~${pending} in published JSON)` : ""}. Approve+supports target ISI Neon
            autumn-snow only — never auto-merge.
          </p>
          <div className="isi-hsi-explain-grid" style={{ marginTop: 12 }}>
            {explanations.map((e) => (
              <article key={e.id} className="isi-hsi-card">
                <span className="chip">{e.status}</span>
                <h3 className="h4">{e.label}</h3>
                <p className="small">{e.note}</p>
                <p className="small muted">
                  {e.relatedClaimIds.slice(0, 4).join(" · ")}
                  {e.relatedClaimIds.length > 4 ? "…" : ""}
                </p>
              </article>
            ))}
          </div>
          <h3 className="h4" style={{ marginTop: 20 }}>
            Expert shortlist
          </h3>
          <ul className="small" style={{ paddingLeft: 18 }}>
            {experts.slice(0, 12).map((item) => (
              <li key={item.id}>
                <strong>{item.kind}</strong> — {item.text}{" "}
                <span className="muted">autoApproved={String(item.autoApproved)}</span>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 20 }}>
            <HsiGateCQueuePanel consume={result} />
          </div>
          <p className="small muted" style={{ marginTop: 12 }}>
            Curators: <Link to="/curation">/curation</Link> · diagnostics{" "}
            <Link to="/hsi-consume">/hsi-consume</Link>
          </p>
        </div>
      ) : null}

      {tab === "validate" ? (
        <div className="isi-hsi-panel" role="tabpanel">
          <h2 className="h3">VALIDATE — hypotheses & gaps</h2>
          <p className="muted">
            Optional R2 pack. Cards stay non-auto-approved and must not flip <code>hsiGrade</code>.
          </p>
          {r2Cards.length ? (
            <div className="isi-hsi-explain-grid" style={{ marginTop: 12 }}>
              {r2Cards.map((c) => (
                <article key={c.id} className="isi-hsi-card">
                  <span className="chip">{c.validationStatus}</span>
                  <span className="chip">autoApproved={String(c.autoApproved)}</span>
                  <h3 className="h4">{c.label}</h3>
                  <p className="small">{c.statusRationale}</p>
                  <p className="small muted">
                    {c.groundingPmids.slice(0, 4).map((pmid) => (
                      <a
                        key={pmid}
                        href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ marginRight: 8 }}
                      >
                        PMID {pmid}
                      </a>
                    ))}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="small muted">R2 validation pack not present in this pin.</p>
          )}
        </div>
      ) : null}

      {tab === "translate" ? (
        <div className="isi-hsi-panel" role="tabpanel">
          <h2 className="h3">TRANSLATE — HITL handoff (not CDS)</h2>
          <p className="callout" role="status">
            clinicalActive must stay false. Candidates require human review — never live clinical
            decision support.
          </p>
          {translateRows.length ? (
            <ul className="isi-hsi-translate-list">
              {translateRows.slice(0, 16).map((c) => (
                <li key={c.id}>
                  <div className="isi-hsi-pills">
                    <span className="chip">{c.status}</span>
                    <GradeChip grade={c.hsiGrade} />
                    <span className="chip">{c.clinicalUse}</span>
                    <span className="chip">cds={String(c.cdsSurfacable)}</span>
                  </div>
                  <strong>{c.clinicLabel ?? "Unmapped clinic concept"}</strong>
                  <p className="small muted">{c.assertion}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="small muted">Translation handoff pack not present in this pin.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

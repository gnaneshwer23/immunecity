/**
 * Curation panel: hsi-core bridge candidates ↔ suggested ISI REL-* ids.
 * Discovery / Gate C handoff only. Never auto-approves. Not CDS.
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  NEON_GATE_C_CURATOR_WARNINGS,
  buildHsiBridgeCurationQueue,
  listNeonGateCReadyItems,
} from "@/lib/hsi/bridgeCurationQueue";

export default function HsiBridgeCurationPanel() {
  const queue = buildHsiBridgeCurationQueue();
  const neonReady = listNeonGateCReadyItems(queue);
  const [readyOnly, setReadyOnly] = useState(true);

  return (
    <div className="isi-auth-panel" data-testid="hsi-bridge-curation-queue">
      <p className="isi-auth-lede">
        Bridge-candidate seeds from <code>hsi-core</code> with suggested Immune City{" "}
        <code>REL-*</code> matches. HSI <code>curated</code> + PMID ≠ Neon Gate C pass.
        Human path only: <strong>Check → claim_support=supports → Approve</strong> on the mapped REL.
        <strong> autoApprove stays false.</strong> Not clinical decision support.
      </p>

      <div className="isi-auth-panel" data-testid="hsi-neon-gate-c-path">
        <p className="isi-auth-lede">
          Human Neon Gate C path for curated / PMID-linked RELs ({queue.summary.neonGateCReady}{" "}
          ready — evidence-linked · Gate C pending · has PMID · mapped REL-*):
        </p>
        <ol className="mkt-aside">
          {queue.neonGateCPath.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <ul className="mkt-aside" data-testid="hsi-neon-gate-c-warnings">
          {NEON_GATE_C_CURATOR_WARNINGS.map((w) => (
            <li key={w}>
              <strong>Warning:</strong> {w}
            </li>
          ))}
        </ul>
        <p className="isi-auth-links">
          <a href="#import">Open evidence import · filter by REL</a>
          {neonReady[0]?.neonGateCHref ? (
            <a href={neonReady[0].neonGateCHref}>
              Focus first ready REL ({neonReady[0].suggestedIsiRelationshipId})
            </a>
          ) : null}
        </p>
      </div>

      <section
        className="isi-auth-panel"
        data-testid="hsi-neon-gate-c-ready"
        aria-labelledby="hsi-gate-c-ready-heading"
      >
        <h3 id="hsi-gate-c-ready-heading" className="isi-auth-lede">
          Gate C–ready curated RELs ({neonReady.length})
        </h3>
        <p className="mkt-aside">
          Filter: evidence-linked + Gate C pending + PMID + mapped <code>REL-*</code> in live KG.
          Per row: re-read S-P-O, open PMID, then Check → claim_support=supports → Approve. Never
          auto-approve into the live KG.
        </p>
        <div className="isi-auth-btn-row">
          <button
            type="button"
            className={`btn sm${readyOnly ? " primary" : ""}`}
            data-testid="hsi-gate-c-ready-filter"
            onClick={() => setReadyOnly(true)}
            title="Show only Gate C–ready curated REL maps"
          >
            Gate C ready only
          </button>
          <button
            type="button"
            className={`btn sm${!readyOnly ? " primary" : ""}`}
            onClick={() => setReadyOnly(false)}
            title="Show full HSI bridge suggestion queue"
          >
            All bridge maps
          </button>
        </div>
        {neonReady.length === 0 ? (
          <p className="mkt-aside">No Gate C–ready rows right now.</p>
        ) : (
          <div className="isi-auth-table-wrap">
            <table className="isi-auth-table">
              <thead>
                <tr>
                  <th scope="col">REL id</th>
                  <th scope="col">S-P-O (re-read)</th>
                  <th scope="col">PMID / DOI</th>
                  <th scope="col">Human steps</th>
                  <th scope="col">HSI seed / axes</th>
                </tr>
              </thead>
              <tbody>
                {neonReady.map((row) => (
                  <tr
                    key={`ready-${row.edgeId}`}
                    data-neon-ready="true"
                    data-rel-id={row.suggestedIsiRelationshipId ?? undefined}
                    className="res-positive"
                  >
                    <td>
                      <code>{row.suggestedIsiRelationshipId}</code>
                      <div className="mkt-aside">
                        <code>{row.matchKind}</code>
                        {row.suggestionStatus === "curated" ? (
                          <span className="isi-auth-pill"> curated</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      {row.spo ? (
                        <>
                          <div>
                            <b>S</b> {row.spo.subjectId} · {row.spo.subjectName}
                          </div>
                          <div>
                            <b>P</b> {row.spo.predicate}
                          </div>
                          <div>
                            <b>O</b> {row.spo.objectId} · {row.spo.objectName}
                          </div>
                          <div className="mkt-aside">{row.spo.label}</div>
                        </>
                      ) : (
                        <span className="mkt-aside">S-P-O unavailable</span>
                      )}
                    </td>
                    <td>
                      {row.pmid ? (
                        <a
                          href={`https://pubmed.ncbi.nlm.nih.gov/${row.pmid}/`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          PMID {row.pmid}
                        </a>
                      ) : (
                        <span className="mkt-aside">No PMID</span>
                      )}
                      {row.doi ? (
                        <div className="mkt-aside">
                          <a
                            href={`https://doi.org/${row.doi}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            DOI {row.doi}
                          </a>
                        </div>
                      ) : null}
                      <div className="mkt-aside">{row.evidenceHandoffLabel}</div>
                    </td>
                    <td>
                      <ol className="mkt-aside">
                        <li>
                          Check identifiers (paste PMID {row.pmid ?? "—"})
                        </li>
                        <li>
                          Set <code>relationship_id</code> ={" "}
                          <code>{row.suggestedIsiRelationshipId}</code>
                        </li>
                        <li>
                          Set <code>claim_support=supports</code> only if S-P-O matches the paper
                        </li>
                        <li>Approve — only then Neon Gate C counts</li>
                      </ol>
                      {row.neonGateCHref ? (
                        <a href={row.neonGateCHref}>Open in evidence queue</a>
                      ) : null}
                    </td>
                    <td>
                      <code>{row.edgeId}</code>
                      <div className="mkt-aside">
                        review: <code>{row.curationReview}</code> ≠ Neon approved
                      </div>
                      <div className="mkt-aside">
                        hsiGrade: <code>{row.hsiGrade}</code> · teaching:{" "}
                        <code>{row.teachingStatus}</code>
                      </div>
                      <div className="mkt-aside">autoApprove: false · CDS: no</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mkt-aside">{queue.axesNote}</p>
      <dl className="mkt-ev-metrics">
        <div>
          <dt>Queue rows</dt>
          <dd>{queue.summary.items}</dd>
        </div>
        <div>
          <dt>Bridge candidates</dt>
          <dd>{queue.summary.bridgeCandidates}</dd>
        </div>
        <div>
          <dt>Suggested REL (validated)</dt>
          <dd>
            {queue.summary.withSuggestedRel} / {queue.summary.relValidatedInGraph}
          </dd>
        </div>
        <div>
          <dt>Curated (HSI-side)</dt>
          <dd>{queue.summary.curated}</dd>
        </div>
        <div>
          <dt>Exact / related / unmapped</dt>
          <dd>
            {queue.summary.exactConceptPair} / {queue.summary.relatedAxis} / {queue.summary.unmapped}
          </dd>
        </div>
        <div>
          <dt>Neon Gate C ready (human)</dt>
          <dd>{queue.summary.neonGateCReady}</dd>
        </div>
        <div>
          <dt>Evidence-linked / Gate C pending</dt>
          <dd>
            {queue.summary.evidenceLinked} / {queue.summary.gateCPending}
          </dd>
        </div>
        <div>
          <dt>CDS-surfacable</dt>
          <dd>0</dd>
        </div>
      </dl>

      {!readyOnly ? (
        <div className="isi-auth-table-wrap" data-testid="hsi-bridge-full-queue">
          <table className="isi-auth-table">
            <thead>
              <tr>
                <th scope="col">HSI seed</th>
                <th scope="col">Grade / teaching</th>
                <th scope="col">Evidence / Gate C</th>
                <th scope="col">Suggested REL-*</th>
                <th scope="col">Human Neon action</th>
                <th scope="col">Match</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody>
              {queue.items.map((row) => (
                <tr
                  key={row.edgeId}
                  data-neon-ready={row.neonGateCReady ? "true" : "false"}
                  className={row.neonGateCReady ? "res-positive" : undefined}
                >
                  <td>
                    <div>
                      <code>{row.edgeId}</code>
                      {row.bridgeCandidate ? (
                        <span className="isi-auth-pill"> bridge</span>
                      ) : null}
                      {row.suggestionStatus === "curated" ? (
                        <span className="isi-auth-pill"> curated</span>
                      ) : null}
                    </div>
                    <div className="mkt-aside">
                      {row.subjectLabel} → {row.objectLabel}
                    </div>
                    <div className="mkt-aside">{row.assertion}</div>
                  </td>
                  <td>
                    <div>
                      <code>{row.hsiGrade}</code>
                    </div>
                    <div className="mkt-aside">
                      teaching: <code>{row.teachingStatus}</code>
                    </div>
                    <div className="mkt-aside">
                      review: <code>{row.curationReview}</code>
                    </div>
                    <div className="mkt-aside">
                      map: <code>{row.suggestionStatus}</code>
                    </div>
                  </td>
                  <td>
                    <div
                      className={
                        row.evidenceLink === "evidence_linked" ? "mkt-aside res-positive" : "mkt-aside"
                      }
                    >
                      {row.evidenceHandoffLabel}
                    </div>
                    {row.pmid ? (
                      <div className="mkt-aside">
                        <a
                          href={`https://pubmed.ncbi.nlm.nih.gov/${row.pmid}/`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          PMID {row.pmid}
                        </a>
                      </div>
                    ) : (
                      <div className="mkt-aside">No PMID yet</div>
                    )}
                    {row.doi ? <div className="mkt-aside">DOI {row.doi}</div> : null}
                  </td>
                  <td>
                    {row.suggestedIsiRelationshipId ? (
                      <>
                        <code>{row.suggestedIsiRelationshipId}</code>
                        {row.relExistsInGraph ? (
                          <div className="mkt-aside res-positive">In graph</div>
                        ) : (
                          <div className="mkt-aside res-negative">Not in live KG</div>
                        )}
                        {row.relLabel ? <div className="mkt-aside">{row.relLabel}</div> : null}
                      </>
                    ) : (
                      <span className="mkt-aside">No ISI analogue yet</span>
                    )}
                  </td>
                  <td>
                    {row.neonGateCReady && row.neonGateCHref ? (
                      <>
                        <div className="mkt-aside res-positive">
                          Ready — Check → supports → Approve
                        </div>
                        <a href={row.neonGateCHref} className="mkt-aside">
                          Open in evidence queue
                        </a>
                        <div className="mkt-aside">
                          Paste PMID {row.pmid}; set <code>relationship_id</code> ={" "}
                          <code>{row.suggestedIsiRelationshipId}</code>
                        </div>
                      </>
                    ) : row.suggestedIsiRelationshipId ? (
                      <div className="mkt-aside">
                        Mapped but not Neon-ready yet (need curated + PMID + in-graph)
                      </div>
                    ) : (
                      <div className="mkt-aside">Unmapped — leave honest; do not invent REL</div>
                    )}
                  </td>
                  <td>
                    <code>{row.matchKind}</code>
                  </td>
                  <td>
                    <div className="mkt-aside">{row.rationale}</div>
                    {row.isiNodeLabels.length > 0 ? (
                      <div className="mkt-aside">{row.isiNodeLabels.join("; ")}</div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="isi-auth-links">
        <Link to="/methods">Methods · HSI grades</Link>
        <Link to="/ask">Ask Immune</Link>
        <a href="#import">Evidence import (human Gate C)</a>
      </p>
    </div>
  );
}

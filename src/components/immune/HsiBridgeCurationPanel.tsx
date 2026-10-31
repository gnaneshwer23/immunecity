/**
 * Curation panel: hsi-core bridge candidates ↔ suggested ISI REL-* ids.
 * Discovery / Gate C handoff only. Never auto-approves. Not CDS.
 */
import { Link } from "@tanstack/react-router";
import { buildHsiBridgeCurationQueue } from "@/lib/hsi/bridgeCurationQueue";

export default function HsiBridgeCurationPanel() {
  const queue = buildHsiBridgeCurationQueue();

  return (
    <div className="isi-auth-panel" data-testid="hsi-bridge-curation-queue">
      <p className="isi-auth-lede">
        Bridge-candidate seeds from <code>hsi-core</code> with suggested Immune City{" "}
        <code>REL-*</code> matches. Use this as a Gate C handoff list — inspect the relationship, then
        curate evidence separately. <strong>No automatic approval.</strong> Not clinical decision support.
      </p>
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
          <dt>Exact / related / unmapped</dt>
          <dd>
            {queue.summary.exactConceptPair} / {queue.summary.relatedAxis} / {queue.summary.unmapped}
          </dd>
        </div>
        <div>
          <dt>CDS-surfacable</dt>
          <dd>0</dd>
        </div>
      </dl>

      <div className="isi-auth-table-wrap">
        <table className="isi-auth-table">
          <thead>
            <tr>
              <th scope="col">HSI seed</th>
              <th scope="col">Grade / teaching</th>
              <th scope="col">Suggested REL-*</th>
              <th scope="col">Match</th>
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            {queue.items.map((row) => (
              <tr key={row.edgeId}>
                <td>
                  <div>
                    <code>{row.edgeId}</code>
                    {row.bridgeCandidate ? (
                      <span className="isi-auth-pill"> bridge</span>
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

      <p className="isi-auth-links">
        <Link to="/methods">Methods · HSI grades</Link>
        <Link to="/ask">Ask Immune</Link>
      </p>
    </div>
  );
}

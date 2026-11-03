import { useEffect, useState } from "react";
import type { StoredInvestigation } from "@/lib/hsi/vendor/investigationService";
import type { InvestigationCommand, InvestigationCursor, InvestigationRelease } from "@/lib/hsi/vendor/investigationBackend";
import styles from "./InvestigationPanel.module.css";
import { neonAuth } from "@/integrations/neon/auth-client";
import { inspect } from "@/lib/immune/inspector";

function requestErrorMessage(status: number, code?: string) {
  if (status === 422 && code === "evidence_not_ready") {
    return "This evidence corpus is not ready: source identities or passage licences are still pending verification. It is not an empty search result. Keep using another registered corpus, or wait for a rights-verified RA release.";
  }
  if (status === 409) return "This investigation changed. Refresh and reopen it before continuing.";
  if (status === 429) return "Request limit reached. Wait before trying again.";
  if (status === 403 || status === 401) return "Your account does not have access to this research action.";
  return "Research request failed. Check the product database configuration and migration.";
}

async function requestInvestigation(command: InvestigationCommand): Promise<unknown> {
  const token = (await neonAuth.token()).data?.token;
  if (!token) throw new Error("Sign in to use internal research.");
  const response = await fetch("/api/internal/investigations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(command),
    cache: "no-store",
    credentials: "same-origin",
  });
  const result = await response.json() as { error?: string };
  if (!response.ok) throw new Error(requestErrorMessage(response.status, result.error));
  return result;
}

type Row = { key: string; revision: number; state: string; dataClass: string; question: string; updatedAt: string };
type Listing = { items: Row[]; nextCursor: InvestigationCursor | null; releases: InvestigationRelease[]; role: string };

function PassageReview({ snapshot }: { snapshot: StoredInvestigation }) {
  const retrieved = new Set(snapshot.payloads.retrieval?.passageIds ?? []);
  const sources = snapshot.bundle.sources;
  if (!sources.length) {
    return (
      <article className={styles.card}>
        <h3>Passage review</h3>
        <p className={styles.empty}>No rights-verified source cards are present in this investigation. Bibliographic KG pointers are not shown as licensed quotations.</p>
      </article>
    );
  }
  return (
    <section aria-labelledby="passage-review-heading">
      <h3 id="passage-review-heading">Passage review</h3>
      <p className={styles.status}>
        Exact retrieved passages with authors/title, article and licence links, and source versions.
        Claims stay unassessed unless a separately authorised human scientific-review action establishes support.
        Serology-response frames remain distinct from anti-TNF efficacy relationships.
      </p>
      <ul className={styles.list}>
        {sources.map((source) => {
          const passages = snapshot.bundle.passages.filter((passage) => passage.sourceId === source.id);
          const shown = passages.filter((passage) => retrieved.size === 0 || retrieved.has(passage.id));
          return (
            <li key={source.id} className={styles.card}>
              <h4>{source.title}</h4>
              <p className={styles.status}>
                {source.id}
                {source.pmid ? ` · PMID ${source.pmid}` : ""}
                {source.doi ? ` · DOI ${source.doi}` : ""}
                {" · "}
                version {source.provenance.version}
              </p>
              <p className={styles.actions}>
                {source.url ? <a href={source.url} target="_blank" rel="noreferrer">Article</a> : <span>Article link not supplied</span>}
                {source.licence.identifier ? (
                  <a href={source.licence.identifier} target="_blank" rel="noreferrer">Licence {source.licence.identifier}</a>
                ) : (
                  <span>Licence URI not supplied</span>
                )}
              </p>
              <p className={styles.status}>
                Licence status: {source.licence.status}
                {source.licence.passageUsePermitted ? " · passage use permitted" : " · passage use not permitted"}
              </p>
              {shown.length ? (
                <ul className={styles.list}>
                  {shown.map((passage) => (
                    <li key={passage.id}>
                      <p><code>{passage.id}</code> · {passage.locator}</p>
                      <pre>{passage.text}</pre>
                      <small>sha256 {passage.sha256 ?? "not supplied"} · sourceVersion {passage.sourceVersion}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.empty}>No retrieved passages for this source in the current run.</p>
              )}
            </li>
          );
        })}
      </ul>
      {snapshot.payloads.hypothesis?.limitations?.length ? (
        <p className={styles.status}>Limitations: {snapshot.payloads.hypothesis.limitations.join(" ")}</p>
      ) : null}
    </section>
  );
}

export default function InvestigationPanel() {
  const [listing, setListing] = useState<Listing | null>(null);
  const [selected, setSelected] = useState<{ key: string; snapshot: StoredInvestigation } | null>(null);
  const [releaseId, setReleaseId] = useState("");
  const [concept, setConcept] = useState("");
  const [rationale, setRationale] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function list(cursor: InvestigationCursor | null = null) {
    const next = await requestInvestigation({ action: "list", cursor }) as Listing;
    setListing((current) => (cursor && current ? { ...next, items: [...current.items, ...next.items] } : next));
    setReleaseId((current) => current || next.releases[0]?.id || "");
  }
  useEffect(() => {
    setBusy(true);
    list().catch(() => setError("Research storage is unavailable or your account does not have access.")).finally(() => setBusy(false));
  }, []);
  async function act(command: InvestigationCommand) {
    setBusy(true);
    setError("");
    try {
      const result = await requestInvestigation(command);
      if (command.action === "export") {
        const exported = result as { key: string; format: string; content: string };
        const blob = new Blob([exported.content], { type: command.format === "json" ? "application/json" : "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${exported.key}.${command.format === "json" ? "json" : "md"}`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        setSelected(result as { key: string; snapshot: StoredInvestigation });
        await list();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research request failed. Refresh before trying again.");
    } finally {
      setBusy(false);
    }
  }
  const snapshot = selected?.snapshot;
  const run = snapshot?.bundle.runs[0];
  const last = run?.history.at(-1);
  const waiting = last?.stage === "hypothesis" && last.status === "completed";
  const canReview = listing?.role === "reviewer" || listing?.role === "admin";
  const activeRelease = listing?.releases.find((release) => release.id === releaseId);
  const corpusReady = activeRelease?.readiness ? activeRelease.readiness.available : true;
  return (
    <section className={styles.panel} aria-labelledby="investigation-heading">
      <h2 id="investigation-heading">Research investigations</h2>
      <p>Run a private investigation against a registered research corpus. Review the graph, evidence coverage and recorded stages before exporting a dossier.</p>
      <p className={styles.status}>Research only. Your records stay in this product. Workflow review does not approve scientific claims. Do not enter patient details.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {busy && <p role="status">Working…</p>}
      <div className={styles.grid}>
        <aside>
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              void act({ action: "start", releaseId, conceptId: concept.trim() || null });
            }}
          >
            <label>
              Research corpus
              <select value={releaseId} onChange={(e) => setReleaseId(e.target.value)} disabled={busy || !listing}>
                {listing?.releases.map((release) => (
                  <option key={release.id} value={release.id}>
                    {release.title}
                    {release.readiness && !release.readiness.available ? " (not ready)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <p className={styles.status}>{activeRelease?.description}</p>
            {activeRelease?.readiness && (
              <p className={styles.status} role="status">
                Readiness: {activeRelease.readiness.available ? "available" : "pending"}
                {` · ${activeRelease.readiness.sources} sources · ${activeRelease.readiness.passages} passages`}
                {activeRelease.readiness.version ? ` · version ${activeRelease.readiness.version}` : ""}
                {activeRelease.readiness.reason ? ` · ${activeRelease.readiness.reason}` : ""}
              </p>
            )}
            {releaseId === "ra-anti-tnf-research" && (
              <p className={styles.empty} role="note">
                Research working set — scientific claim support remains unreviewed. Workflow acceptance is not Gate C approval and does not clear real PMIDs.
              </p>
            )}
            <label>
              Existing concept ID (optional)
              <input maxLength={128} value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Use the corpus default" />
            </label>
            <button disabled={busy || !listing || !releaseId || !corpusReady} type="submit">
              Start investigation
            </button>
            {!corpusReady && (
              <p className={styles.empty}>Selected corpus is registered but evidence is not ready. Starting would return evidence_not_ready rather than an empty successful search.</p>
            )}
          </form>
          <h3>Your investigations</h3>
          <ul className={styles.list}>
            {listing?.items.map((item) => (
              <li key={item.key}>
                <button type="button" disabled={busy} onClick={() => void act({ action: "get", key: item.key })} aria-pressed={selected?.key === item.key}>
                  {item.question}
                  <small>
                    {item.state.replaceAll("_", " ")} · {new Date(item.updatedAt).toLocaleString()}
                  </small>
                </button>
              </li>
            ))}
          </ul>
          {listing && !listing.items.length && <p className={styles.empty}>No investigations saved yet.</p>}
          <div className={styles.actions}>
            <button
              disabled={busy}
              onClick={() => {
                setBusy(true);
                list().catch(() => setError("Unable to refresh investigations.")).finally(() => setBusy(false));
              }}
            >
              Refresh
            </button>
            {listing?.nextCursor && (
              <button
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  list(listing.nextCursor).catch(() => setError("Unable to load more investigations.")).finally(() => setBusy(false));
                }}
              >
                Load more
              </button>
            )}
          </div>
        </aside>
        <div>
          {snapshot && selected && run ? (
            <>
              <article className={styles.card}>
                <h3>{snapshot.bundle.context.question}</h3>
                <p className={styles.status}>
                  {selected.key} · revision {snapshot.revision} · {snapshot.bundle.context.dataClass.replaceAll("_", " ")}
                </p>
                <p>{snapshot.payloads.retrieval?.scope ?? "Retrieval has not completed."}</p>
                <p>
                  {snapshot.payloads.graph?.relationshipIds.length ?? 0} graph relationships · {snapshot.payloads.retrieval?.passageIds.length ?? 0} retrieved passages
                </p>
                {!snapshot.payloads.retrieval?.passageIds.length && (
                  <p className={styles.empty}>No exact source passages were supplied by this release. Add a rights-verified evidence release before assessing scientific support.</p>
                )}
                {last?.status === "failed" && <p role="status">Run failed: {last.reason}. Start a new investigation after resolving the cause.</p>}
                {!waiting && last?.status === "completed" && !snapshot.payloads.dossier && (
                  <button disabled={busy} onClick={() => void act({ action: "resume", key: selected.key, revision: snapshot.revision })}>
                    Continue from saved checkpoint
                  </button>
                )}
              </article>
              <PassageReview snapshot={snapshot} />
              <details>
                <summary>Graph relationships and provenance</summary>
                {snapshot.bundle.relationships.length ? (
                  <ul className={styles.list}>
                    {snapshot.bundle.relationships.map((relation) => (
                      <li key={relation.id} className={styles.card}>
                        <button onClick={() => inspect({ kind: "relationship", id: relation.id })}>{relation.id}</button>
                        <p>
                          {relation.subjectId} → {relation.predicate} → {relation.objectId}
                        </p>
                        <small>
                          {relation.provenance.datasetId} · {relation.provenance.version}
                        </small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No subject/predicate/object relationships are supplied by this release.</p>
                )}
              </details>
              <details>
                <summary>Executed stages</summary>
                <ol className={styles.timeline}>
                  {run.history.map((event) => (
                    <li key={event.id}>
                      {event.stage} — {event.status} · {event.execution} · {new Date(event.at).toLocaleString()}
                      {event.reason ? ` · ${event.reason}` : ""}
                    </li>
                  ))}
                </ol>
              </details>
              {snapshot.payloads.hypothesis && (
                <article className={styles.card}>
                  <h3>Research questions · unvalidated</h3>
                  {snapshot.payloads.hypothesis.candidates.length ? (
                    <ul>
                      {snapshot.payloads.hypothesis.candidates.map((candidate, i) => (
                        <li key={i}>
                          {candidate.question}
                          <small>
                            {" "}
                            {candidate.relationshipId} · {candidate.passageIds.join(", ")}
                          </small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No source-grounded questions could be drafted from this release.</p>
                  )}
                  <p className={styles.status}>{snapshot.payloads.hypothesis.limitations.join(" ")}</p>
                </article>
              )}
              {waiting && (
                <div className={styles.card}>
                  <h3>Human review required</h3>
                  {canReview ? (
                    <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
                      <label>
                        Review rationale
                        <textarea maxLength={2000} value={rationale} onChange={(e) => setRationale(e.target.value)} />
                      </label>
                      <div className={styles.actions}>
                        <button disabled={busy || !rationale.trim()} onClick={() => void act({ action: "review", key: selected.key, revision: snapshot.revision, decision: "request_revision", rationale })}>
                          Request revision
                        </button>
                        <button disabled={busy || !rationale.trim()} onClick={() => void act({ action: "review", key: selected.key, revision: snapshot.revision, decision: "accept_for_research", rationale })}>
                          Accept research dossier
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p>A provisioned reviewer must review this investigation. No evidence approval is written.</p>
                  )}
                </div>
              )}
              {snapshot.payloads.review && (
                <p className={styles.card}>
                  Recorded decision: <strong>{snapshot.payloads.review.decision.replaceAll("_", " ")}</strong>
                  <br />
                  {snapshot.payloads.review.rationale}
                </p>
              )}
              {snapshot.payloads.dossier && (
                <div className={styles.actions}>
                  <button disabled={busy} onClick={() => void act({ action: "export", key: selected.key, format: "json" })}>
                    Download JSON dossier
                  </button>
                  <button disabled={busy} onClick={() => void act({ action: "export", key: selected.key, format: "markdown" })}>
                    Download Markdown dossier
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className={styles.empty}>Select an investigation or start one from an available corpus.</p>
          )}
        </div>
      </div>
    </section>
  );
}

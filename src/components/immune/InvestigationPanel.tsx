import { useEffect, useState } from "react";
import type { StoredInvestigation } from "@/lib/hsi/vendor/investigationService";
import type { InvestigationCommand, InvestigationCursor, InvestigationRelease } from "@/lib/hsi/vendor/investigationBackend";
import styles from "./InvestigationPanel.module.css";
import { neonAuth } from "@/integrations/neon/auth-client";
import { inspect } from "@/lib/immune/inspector";
async function requestInvestigation(command: InvestigationCommand): Promise<unknown> {
  const token = (await neonAuth.token()).data?.token; if (!token) throw new Error("Sign in to use internal research.");
  const response = await fetch("/api/internal/investigations", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(command), cache: "no-store", credentials: "same-origin" });
  const result = await response.json() as { error?: string };
  if (!response.ok) throw new Error(response.status === 409 ? "This investigation changed. Refresh and reopen it before continuing." : response.status === 429 ? "Request limit reached. Wait before trying again." : response.status === 403 || response.status === 401 ? "Your account does not have access to this research action." : "Research request failed. Check the product database configuration and migration.");
  return result;
}
type Row = { key: string; revision: number; state: string; dataClass: string; question: string; updatedAt: string };
type Listing = { items: Row[]; nextCursor: InvestigationCursor | null; releases: InvestigationRelease[]; role: string };
export default function InvestigationPanel() {
  const [listing, setListing] = useState<Listing | null>(null);
  const [selected, setSelected] = useState<{ key: string; snapshot: StoredInvestigation } | null>(null);
  const [releaseId, setReleaseId] = useState(""); const [concept, setConcept] = useState("");
  const [rationale, setRationale] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function list(cursor: InvestigationCursor | null = null) {
    const next = await requestInvestigation({ action: "list", cursor }) as Listing;
    setListing((current) => cursor && current ? { ...next, items: [...current.items, ...next.items] } : next);
    setReleaseId((current) => current || next.releases[0]?.id || "");
  }
  useEffect(() => { setBusy(true); list().catch(() => setError("Research storage is unavailable or your account does not have access.")).finally(() => setBusy(false)); }, []);
  async function act(command: InvestigationCommand) {
    setBusy(true); setError("");
    try {
      const result = await requestInvestigation(command);
      if (command.action === "export") {
        const exported = result as { key: string; format: string; content: string };
        const blob = new Blob([exported.content], { type: command.format === "json" ? "application/json" : "text/markdown" });
        const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${exported.key}.${command.format === "json" ? "json" : "md"}`; a.click(); URL.revokeObjectURL(url);
      } else { setSelected(result as { key: string; snapshot: StoredInvestigation }); await list(); }
    } catch (err) { setError(err instanceof Error ? err.message : "Research request failed. Refresh before trying again."); }
    finally { setBusy(false); }
  }
  const snapshot = selected?.snapshot; const run = snapshot?.bundle.runs[0];
  const last = run?.history.at(-1); const waiting = last?.stage === "hypothesis" && last.status === "completed";
  const canReview = listing?.role === "reviewer" || listing?.role === "admin";
  return <section className={styles.panel} aria-labelledby="investigation-heading">
    <h2 id="investigation-heading">Research investigations</h2>
    <p>Run a private investigation against a registered research corpus. Review the graph, evidence coverage and recorded stages before exporting a dossier.</p>
    <p className={styles.status}>Research only. Your records stay in this product. Workflow review does not approve scientific claims. Do not enter patient details.</p>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {busy && <p role="status">Working…</p>}
    <div className={styles.grid}>
      <aside>
        <form className={styles.form} onSubmit={(e) => { e.preventDefault(); void act({ action: "start", releaseId, conceptId: concept.trim() || null }); }}>
          <label>Research corpus<select value={releaseId} onChange={(e) => setReleaseId(e.target.value)} disabled={busy || !listing}>{listing?.releases.map((release) => <option key={release.id} value={release.id}>{release.title}</option>)}</select></label>
          <p className={styles.status}>{listing?.releases.find((r) => r.id === releaseId)?.description}</p>
          <label>Existing concept ID (optional)<input maxLength={128} value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Use the corpus default" /></label>
          <button disabled={busy || !listing || !releaseId} type="submit">Start investigation</button>
        </form>
        <h3>Your investigations</h3>
        <ul className={styles.list}>{listing?.items.map((item) => <li key={item.key}><button type="button" disabled={busy} onClick={() => void act({ action: "get", key: item.key })} aria-pressed={selected?.key === item.key}>{item.question}<small>{item.state.replaceAll("_", " ")} · {new Date(item.updatedAt).toLocaleString()}</small></button></li>)}</ul>
        {listing && !listing.items.length && <p className={styles.empty}>No investigations saved yet.</p>}
        <div className={styles.actions}><button disabled={busy} onClick={() => { setBusy(true); list().catch(() => setError("Unable to refresh investigations.")).finally(() => setBusy(false)); }}>Refresh</button>
        {listing?.nextCursor && <button disabled={busy} onClick={() => { setBusy(true); list(listing.nextCursor).catch(() => setError("Unable to load more investigations.")).finally(() => setBusy(false)); }}>Load more</button>}</div>
      </aside>
      <div>{snapshot && selected && run ? <>
        <article className={styles.card}><h3>{snapshot.bundle.context.question}</h3><p className={styles.status}>{selected.key} · revision {snapshot.revision} · {snapshot.bundle.context.dataClass.replaceAll("_", " ")}</p>
          <p>{snapshot.payloads.retrieval?.scope ?? "Retrieval has not completed."}</p>
          <p>{snapshot.payloads.graph?.relationshipIds.length ?? 0} graph relationships · {snapshot.payloads.retrieval?.passageIds.length ?? 0} retrieved passages</p>
          {!snapshot.payloads.retrieval?.passageIds.length && <p className={styles.empty}>No exact source passages were supplied by this release. Add a rights-verified evidence release before assessing scientific support.</p>}
          {last?.status === "failed" && <p role="status">Run failed: {last.reason}. Start a new investigation after resolving the cause.</p>}
          {!waiting && last?.status === "completed" && !snapshot.payloads.dossier && <button disabled={busy} onClick={() => void act({ action: "resume", key: selected.key, revision: snapshot.revision })}>Continue from saved checkpoint</button>}
        </article>
        <details><summary>Graph relationships and provenance</summary>{snapshot.bundle.relationships.length ? <ul className={styles.list}>{snapshot.bundle.relationships.map((relation) => <li key={relation.id} className={styles.card}><button onClick={() => inspect({ kind: "relationship", id: relation.id })}>{relation.id}</button><p>{relation.subjectId} → {relation.predicate} → {relation.objectId}</p><small>{relation.provenance.datasetId} · {relation.provenance.version}</small></li>)}</ul> : <p>No subject/predicate/object relationships are supplied by this release.</p>}</details>
        <details><summary>Executed stages</summary><ol className={styles.timeline}>{run.history.map((event) => <li key={event.id}>{event.stage} — {event.status} · {event.execution} · {new Date(event.at).toLocaleString()}{event.reason ? ` · ${event.reason}` : ""}</li>)}</ol></details>
        {snapshot.payloads.hypothesis && <article className={styles.card}><h3>Research questions · unvalidated</h3>{snapshot.payloads.hypothesis.candidates.length ? <ul>{snapshot.payloads.hypothesis.candidates.map((candidate, i) => <li key={i}>{candidate.question}<small> {candidate.relationshipId} · {candidate.passageIds.join(", ")}</small></li>)}</ul> : <p>No source-grounded questions could be drafted from this release.</p>}<p className={styles.status}>{snapshot.payloads.hypothesis.limitations.join(" ")}</p></article>}
        {waiting && <div className={styles.card}><h3>Human review required</h3>{canReview ? <form className={styles.form} onSubmit={(e) => e.preventDefault()}><label>Review rationale<textarea maxLength={2000} value={rationale} onChange={(e) => setRationale(e.target.value)} /></label><div className={styles.actions}><button disabled={busy || !rationale.trim()} onClick={() => void act({ action: "review", key: selected.key, revision: snapshot.revision, decision: "request_revision", rationale })}>Request revision</button><button disabled={busy || !rationale.trim()} onClick={() => void act({ action: "review", key: selected.key, revision: snapshot.revision, decision: "accept_for_research", rationale })}>Accept research dossier</button></div></form> : <p>A provisioned reviewer must review this investigation. No evidence approval is written.</p>}</div>}
        {snapshot.payloads.review && <p className={styles.card}>Recorded decision: <strong>{snapshot.payloads.review.decision.replaceAll("_", " ")}</strong><br />{snapshot.payloads.review.rationale}</p>}
        {snapshot.payloads.dossier && <div className={styles.actions}><button disabled={busy} onClick={() => void act({ action: "export", key: selected.key, format: "json" })}>Download JSON dossier</button><button disabled={busy} onClick={() => void act({ action: "export", key: selected.key, format: "markdown" })}>Download Markdown dossier</button></div>}
      </> : <p className={styles.empty}>Select an investigation or start one from an available corpus.</p>}</div>
    </div>
  </section>;
}

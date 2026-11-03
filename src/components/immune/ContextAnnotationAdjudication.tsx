import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { AdjudicationRecord, ContextTagSet, SettingTag, SpeciesTag } from "@/lib/hsi/contextAnnotationClient";
import {
  buildPracticeAdjudicationQueue,
  finalizeAdjudicationRecord,
  REQUIRED_CONTEXT_TAGS,
} from "@/lib/hsi/contextAnnotationClient";
import {
  downloadJson,
  loadAcceptedPracticePacket,
  loadAdjudicationBundle,
  saveAdjudicationBundle,
} from "@/lib/hsi/annotationPracticeStorage";
import styles from "./ContextAnnotationPractice.module.css";

const SPECIES: SpeciesTag[] = ["human", "mouse", "other", "missing", "mixed"];
const SETTINGS: SettingTag[] = [
  "clinical_observational",
  "clinical_trial",
  "meta_analysis",
  "in_vitro",
  "in_vivo",
  "in_silico",
  "missing",
  "mixed",
  "other",
];

function blankFinal(record: AdjudicationRecord): ContextTagSet {
  if (record.disagreeOn.length === 0) {
    return { ...record.annotatorATags };
  }
  return {
    species: null,
    tissue_or_sample: null,
    setting_or_model: null,
    intervention: null,
    outcome: null,
    timepoint: null,
  };
}

type Props = {
  onComplete?: () => void;
};

export default function ContextAnnotationAdjudication({ onComplete }: Props) {
  const packetA = useMemo(() => loadAcceptedPracticePacket("annotator_a"), []);
  const packetB = useMemo(() => loadAcceptedPracticePacket("annotator_b"), []);
  const [queue, setQueue] = useState<AdjudicationRecord[]>([]);
  const [finals, setFinals] = useState<Record<string, ContextTagSet>>({});
  const [activeRow, setActiveRow] = useState("");
  const [adjudicatorId, setAdjudicatorId] = useState("");
  const [rationale, setRationale] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadAdjudicationBundle();
    if (saved?.records.length) {
      setQueue(saved.records);
      setFinals(
        Object.fromEntries(
          saved.records.map((record) => [record.rowId, record.finalTags ?? blankFinal(record)]),
        ),
      );
      setActiveRow(saved.records[0]?.rowId ?? "");
      setStatus("Restored adjudication draft.");
      return;
    }
    if (!packetA || !packetB) {
      setError("Submit both Annotator A and Annotator B practice packets before adjudication.");
      return;
    }
    try {
      const opened = buildPracticeAdjudicationQueue(packetA, packetB);
      setQueue(opened);
      setFinals(Object.fromEntries(opened.map((record) => [record.rowId, blankFinal(record)])));
      setActiveRow(opened[0]?.rowId ?? "");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open adjudication queue");
    }
  }, [packetA, packetB]);

  const current = queue.find((record) => record.rowId === activeRow) ?? queue[0];
  const finalized = queue.filter((record) => record.finalTags !== null).length;

  function updateFinal(rowId: string, key: keyof ContextTagSet, value: string) {
    setFinals((prev) => ({
      ...prev,
      [rowId]: { ...prev[rowId]!, [key]: value || null },
    }));
  }

  function takeSide(rowId: string, side: "a" | "b") {
    const record = queue.find((item) => item.rowId === rowId);
    if (!record) return;
    setFinals((prev) => ({
      ...prev,
      [rowId]: side === "a" ? { ...record.annotatorATags } : { ...record.annotatorBTags },
    }));
  }

  function finalizeCurrent(event: FormEvent) {
    event.preventDefault();
    if (!current) return;
    setError(null);
    setStatus(null);
    try {
      const closed = finalizeAdjudicationRecord(current, {
        finalTags: finals[current.rowId]!,
        adjudicatorId: adjudicatorId.trim(),
        rationale: rationale.trim(),
        adjudicatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      });
      const next = queue.map((record) => (record.rowId === closed.rowId ? closed : record));
      setQueue(next);
      saveAdjudicationBundle(next);
      setRationale("");
      setStatus(`Finalized ${closed.rowId}. Practice adjudication only — not evaluation_frozen.`);
      const remaining = next.find((record) => record.finalTags === null);
      if (remaining) setActiveRow(remaining.rowId);
      else onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adjudication failed");
    }
  }

  function exportBundle() {
    if (!queue.length || queue.some((record) => record.finalTags === null)) {
      setError("Finalize every passage before export.");
      return;
    }
    downloadJson("practice-adjudication-bundle.json", {
      partition: "practice_not_evaluation",
      notForEvaluation: true,
      fabricatedLabelsPermitted: false,
      records: queue,
      exportedAt: new Date().toISOString(),
    });
    setStatus("Downloaded practice adjudication bundle.");
    onComplete?.();
  }

  if (!packetA || !packetB) {
    return (
      <section className={styles.panel} aria-labelledby="adjudication-heading">
        <h2 id="adjudication-heading">Adjudication</h2>
        <p className={styles.lede}>
          Double-blind practice labels from Annotator A and Annotator B must both be validated and saved in this browser
          before disagreements can be resolved.
        </p>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  if (!current) return null;

  const finalTags = finals[current.rowId]!;

  return (
    <section className={styles.panel} aria-labelledby="adjudication-heading">
      <h2 id="adjudication-heading">Adjudication</h2>
      <p className={styles.lede}>
        Compare A/B tags side by side. Prefer agreement; where they disagree, choose a final tag with an explicit
        rationale. This never writes Gate C approval or evaluation_frozen rows.
      </p>
      <p className={styles.meta} role="status">
        {finalized}/{queue.length} finalized · disagreements highlighted
      </p>

      <div className={styles.stepper} role="tablist" aria-label="Adjudication passages">
        {queue.map((record, index) => (
          <button
            key={record.rowId}
            type="button"
            role="tab"
            aria-selected={record.rowId === current.rowId}
            className={record.finalTags ? styles.stepDone : undefined}
            onClick={() => setActiveRow(record.rowId)}
          >
            {index + 1}
            {record.disagreeOn.length ? "*" : ""}
          </button>
        ))}
      </div>

      <form className={styles.form} onSubmit={finalizeCurrent}>
        <label>
          Adjudicator ID
          <input value={adjudicatorId} onChange={(event) => setAdjudicatorId(event.target.value)} required autoComplete="username" />
        </label>

        <article className={styles.card}>
          <header>
            <h3>
              <code>{current.rowId}</code>
            </h3>
            <p>
              Disagree on: {current.disagreeOn.length ? current.disagreeOn.join(", ") : "none — tags already match"}
            </p>
          </header>

          <div className={styles.grid}>
            {REQUIRED_CONTEXT_TAGS.map((tag) => {
              const disagree = current.disagreeOn.includes(tag);
              return (
                <div key={tag}>
                  <p className={styles.meta}>
                    <strong>{tag}</strong>
                    {disagree ? " · disagree" : " · agree"}
                  </p>
                  <p className={styles.meta}>A: {String(current.annotatorATags[tag] ?? "—")}</p>
                  <p className={styles.meta}>B: {String(current.annotatorBTags[tag] ?? "—")}</p>
                </div>
              );
            })}
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={() => takeSide(current.rowId, "a")}>
              Prefer A
            </button>
            <button type="button" className={styles.secondary} onClick={() => takeSide(current.rowId, "b")}>
              Prefer B
            </button>
          </div>

          <div className={styles.grid}>
            <label>
              Final species
              <select
                value={finalTags.species ?? ""}
                onChange={(event) => updateFinal(current.rowId, "species", event.target.value)}
                required
                disabled={!!current.finalTags}
              >
                <option value="" disabled>
                  Select…
                </option>
                {SPECIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Final setting
              <select
                value={finalTags.setting_or_model ?? ""}
                onChange={(event) => updateFinal(current.rowId, "setting_or_model", event.target.value)}
                required
                disabled={!!current.finalTags}
              >
                <option value="" disabled>
                  Select…
                </option>
                {SETTINGS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Final tissue / sample
              <input
                value={finalTags.tissue_or_sample ?? ""}
                onChange={(event) => updateFinal(current.rowId, "tissue_or_sample", event.target.value)}
                required
                disabled={!!current.finalTags}
              />
            </label>
            <label>
              Final intervention
              <input
                value={finalTags.intervention ?? ""}
                onChange={(event) => updateFinal(current.rowId, "intervention", event.target.value)}
                required
                disabled={!!current.finalTags}
              />
            </label>
            <label>
              Final outcome
              <input
                value={finalTags.outcome ?? ""}
                onChange={(event) => updateFinal(current.rowId, "outcome", event.target.value)}
                required
                disabled={!!current.finalTags}
              />
            </label>
            <label>
              Final timepoint
              <input
                value={finalTags.timepoint ?? ""}
                onChange={(event) => updateFinal(current.rowId, "timepoint", event.target.value)}
                required
                disabled={!!current.finalTags}
              />
            </label>
          </div>

          <label>
            Rationale
            <input
              value={rationale}
              onChange={(event) => setRationale(event.target.value)}
              required={!current.finalTags}
              disabled={!!current.finalTags}
              placeholder="Why these final tags?"
            />
          </label>
        </article>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        {status ? (
          <p className={styles.ok} role="status">
            {status}
          </p>
        ) : null}

        <div className={styles.actions}>
          <button type="submit" disabled={!!current.finalTags || !adjudicatorId.trim() || !rationale.trim()}>
            Finalize this passage
          </button>
          <button type="button" className={styles.secondary} onClick={exportBundle} disabled={finalized < queue.length}>
            Export adjudication bundle
          </button>
        </div>
      </form>
    </section>
  );
}

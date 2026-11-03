import { useMemo, useState, type FormEvent } from "react";
import type {
  AnnotationWorksheetRow,
  ContextTagSet,
  IndependentLabelPacket,
  PracticeLabelSubmission,
  SettingTag,
  SpeciesTag,
} from "@/lib/hsi/vendor/contextAnnotationBenchmark";
import { acceptPracticeLabelSubmission } from "@/lib/hsi/vendor/contextAnnotationBenchmark";
import packetA from "@/data/hsi/ra-anti-tnf/annotation-kit/practice-packet-annotator-a.json";
import packetB from "@/data/hsi/ra-anti-tnf/annotation-kit/practice-packet-annotator-b.json";
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

type DraftRow = {
  groundingSpan: string;
  tags: ContextTagSet;
};

function blankDraft(rows: AnnotationWorksheetRow[]): Record<string, DraftRow> {
  return Object.fromEntries(
    rows.map((row) => [
      row.rowId,
      {
        groundingSpan: "",
        tags: {
          species: null,
          tissue_or_sample: null,
          setting_or_model: null,
          intervention: null,
          outcome: null,
          timepoint: null,
        },
      },
    ]),
  );
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ContextAnnotationPractice() {
  const [slot, setSlot] = useState<"annotator_a" | "annotator_b">("annotator_a");
  const packet = useMemo(
    () => (slot === "annotator_a" ? (packetA as IndependentLabelPacket) : (packetB as IndependentLabelPacket)),
    [slot],
  );
  const [annotatorId, setAnnotatorId] = useState("");
  const [drafts, setDrafts] = useState(() => blankDraft(packet.rows));
  const [error, setError] = useState<string | null>(null);
  const [acceptedName, setAcceptedName] = useState<string | null>(null);

  function switchSlot(next: "annotator_a" | "annotator_b") {
    setSlot(next);
    const nextPacket = next === "annotator_a" ? (packetA as IndependentLabelPacket) : (packetB as IndependentLabelPacket);
    setDrafts(blankDraft(nextPacket.rows));
    setError(null);
    setAcceptedName(null);
  }

  function updateRow(rowId: string, patch: Partial<DraftRow>) {
    setDrafts((prev) => ({ ...prev, [rowId]: { ...prev[rowId]!, ...patch } }));
  }

  function updateTag(rowId: string, key: keyof ContextTagSet, value: string) {
    setDrafts((prev) => ({
      ...prev,
      [rowId]: {
        ...prev[rowId]!,
        tags: { ...prev[rowId]!.tags, [key]: value || null },
      },
    }));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setAcceptedName(null);
    const submission: PracticeLabelSubmission = {
      packetId: packet.packetId,
      annotatorSlot: packet.annotatorSlot,
      annotatorId: annotatorId.trim(),
      labelledAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      rows: packet.rows.map((row) => ({
        rowId: row.rowId,
        groundingSpan: drafts[row.rowId]?.groundingSpan ?? "",
        tags: drafts[row.rowId]?.tags ?? {
          species: null,
          tissue_or_sample: null,
          setting_or_model: null,
          intervention: null,
          outcome: null,
          timepoint: null,
        },
      })),
    };
    try {
      const accepted = acceptPracticeLabelSubmission(packet, submission);
      const filename = `${accepted.annotatorSlot}-${accepted.annotatorId}.json`;
      downloadJson(filename, accepted);
      setAcceptedName(filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Label validation failed");
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="context-annotation-practice-heading">
      <h2 id="context-annotation-practice-heading">Context annotation practice</h2>
      <p className={styles.lede}>
        Double-blind practice packets for RA / anti-TNF context tags. Practice labels calibrate annotators only —
        they do not enter frozen evaluation, approve science, or write the knowledge graph.
      </p>

      <div className={styles.toolbar}>
        <label>
          Annotator packet
          <select
            value={slot}
            onChange={(event) => switchSlot(event.target.value as "annotator_a" | "annotator_b")}
          >
            <option value="annotator_a">Annotator A</option>
            <option value="annotator_b">Annotator B</option>
          </select>
        </label>
        <p className={styles.meta}>
          Packet <code>{packet.packetId}</code> · {packet.rows.length} passages · practice partition
        </p>
      </div>

      <form className={styles.form} onSubmit={onSubmit}>
        <label>
          Annotator ID
          <input
            value={annotatorId}
            onChange={(event) => setAnnotatorId(event.target.value)}
            placeholder="e.g. sme-initials"
            required
            autoComplete="off"
          />
        </label>

        {packet.rows.map((row) => {
          const draft = drafts[row.rowId]!;
          return (
            <article key={row.rowId} className={styles.card}>
              <header>
                <h3>{row.articleTitle}</h3>
                <p>
                  <code>{row.rowId}</code> · {row.passageLocator}
                </p>
              </header>
              <pre className={styles.passage}>{row.passageText}</pre>

              <label>
                Grounding span (exact substring of the passage)
                <input
                  value={draft.groundingSpan}
                  onChange={(event) => updateRow(row.rowId, { groundingSpan: event.target.value })}
                  required
                />
              </label>

              <div className={styles.grid}>
                <label>
                  Species
                  <select
                    value={draft.tags.species ?? ""}
                    onChange={(event) => updateTag(row.rowId, "species", event.target.value)}
                    required
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
                  Setting / model
                  <select
                    value={draft.tags.setting_or_model ?? ""}
                    onChange={(event) => updateTag(row.rowId, "setting_or_model", event.target.value)}
                    required
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
                  Tissue / sample
                  <input
                    value={draft.tags.tissue_or_sample ?? ""}
                    onChange={(event) => updateTag(row.rowId, "tissue_or_sample", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Intervention
                  <input
                    value={draft.tags.intervention ?? ""}
                    onChange={(event) => updateTag(row.rowId, "intervention", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Outcome
                  <input
                    value={draft.tags.outcome ?? ""}
                    onChange={(event) => updateTag(row.rowId, "outcome", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Timepoint
                  <input
                    value={draft.tags.timepoint ?? ""}
                    onChange={(event) => updateTag(row.rowId, "timepoint", event.target.value)}
                    required
                  />
                </label>
              </div>
            </article>
          );
        })}

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        {acceptedName ? (
          <p className={styles.ok} role="status">
            Practice submission validated and downloaded as <code>{acceptedName}</code>. Not for evaluation.
          </p>
        ) : null}

        <button type="submit">Validate and download practice labels</button>
      </form>
    </section>
  );
}

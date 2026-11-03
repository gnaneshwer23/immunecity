import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  AnnotationWorksheetRow,
  ContextTagSet,
  IndependentLabelPacket,
  PracticeLabelSubmission,
  SettingTag,
  SpeciesTag,
} from "@/lib/hsi/contextAnnotationClient";
import { acceptPracticeLabelSubmission } from "@/lib/hsi/contextAnnotationClient";
import packetA from "@/data/hsi/ra-anti-tnf/annotation-kit/practice-packet-annotator-a.json";
import packetB from "@/data/hsi/ra-anti-tnf/annotation-kit/practice-packet-annotator-b.json";
import {
  clearAnnotationDraft,
  downloadJson,
  loadAnnotationDraft,
  saveAcceptedPracticePacket,
  saveAnnotationDraft,
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

type DraftRow = { groundingSpan: string; tags: ContextTagSet };

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

function rowComplete(draft: DraftRow | undefined) {
  if (!draft?.groundingSpan.trim()) return false;
  const tags = draft.tags;
  return Boolean(
    tags.species &&
      tags.setting_or_model &&
      tags.tissue_or_sample?.trim() &&
      tags.intervention?.trim() &&
      tags.outcome?.trim() &&
      tags.timepoint?.trim(),
  );
}

type Props = {
  fixedSlot?: "annotator_a" | "annotator_b";
  onSubmitted?: (slot: "annotator_a" | "annotator_b") => void;
};

export default function ContextAnnotationPractice({ fixedSlot, onSubmitted }: Props) {
  const [slot, setSlot] = useState<"annotator_a" | "annotator_b">(fixedSlot ?? "annotator_a");
  const packet = useMemo(
    () => (slot === "annotator_a" ? (packetA as IndependentLabelPacket) : (packetB as IndependentLabelPacket)),
    [slot],
  );
  const [annotatorId, setAnnotatorId] = useState("");
  const [drafts, setDrafts] = useState(() => blankDraft(packet.rows));
  const [activeRow, setActiveRow] = useState(packet.rows[0]?.rowId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadAnnotationDraft(slot);
    const base = blankDraft(packet.rows);
    if (saved) {
      setAnnotatorId(saved.annotatorId);
      for (const [rowId, draft] of Object.entries(saved.drafts)) {
        if (base[rowId]) {
          base[rowId] = {
            groundingSpan: draft.groundingSpan,
            tags: {
              species: (draft.tags.species as SpeciesTag | null) ?? null,
              tissue_or_sample: draft.tags.tissue_or_sample ?? null,
              setting_or_model: (draft.tags.setting_or_model as SettingTag | null) ?? null,
              intervention: draft.tags.intervention ?? null,
              outcome: draft.tags.outcome ?? null,
              timepoint: draft.tags.timepoint ?? null,
            },
          };
        }
      }
    }
    setDrafts(base);
    setActiveRow(packet.rows[0]?.rowId ?? "");
    setError(null);
    setStatus(saved ? "Restored local draft." : null);
  }, [slot, packet]);

  useEffect(() => {
    saveAnnotationDraft(slot, {
      annotatorId,
      drafts: Object.fromEntries(
        Object.entries(drafts).map(([rowId, draft]) => [
          rowId,
          { groundingSpan: draft.groundingSpan, tags: draft.tags },
        ]),
      ),
      updatedAt: new Date().toISOString(),
    });
  }, [slot, annotatorId, drafts]);

  const completed = packet.rows.filter((row) => rowComplete(drafts[row.rowId])).length;
  const current = packet.rows.find((row) => row.rowId === activeRow) ?? packet.rows[0];

  function switchSlot(next: "annotator_a" | "annotator_b") {
    if (fixedSlot) return;
    setSlot(next);
  }

  function captureSelection(rowId: string, passageText: string) {
    const selected = window.getSelection()?.toString().trim() ?? "";
    if (!selected) {
      setStatus("Select text inside the passage, then click “Use selection as grounding”.");
      return;
    }
    if (!passageText.includes(selected)) {
      setError("Selected text must be an exact substring of the passage.");
      return;
    }
    setDrafts((prev) => ({ ...prev, [rowId]: { ...prev[rowId]!, groundingSpan: selected } }));
    setError(null);
    setStatus("Grounding span set from selection.");
  }

  function updateTag(rowId: string, key: keyof ContextTagSet, value: string) {
    setDrafts((prev) => ({
      ...prev,
      [rowId]: { ...prev[rowId]!, tags: { ...prev[rowId]!.tags, [key]: value || null } },
    }));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    const submission: PracticeLabelSubmission = {
      packetId: packet.packetId,
      annotatorSlot: packet.annotatorSlot,
      annotatorId: annotatorId.trim(),
      labelledAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      rows: packet.rows.map((row) => ({
        rowId: row.rowId,
        groundingSpan: drafts[row.rowId]?.groundingSpan ?? "",
        tags: drafts[row.rowId]?.tags ?? blankDraft(packet.rows)[row.rowId]!.tags,
      })),
    };
    try {
      const accepted = acceptPracticeLabelSubmission(packet, submission);
      saveAcceptedPracticePacket(accepted);
      clearAnnotationDraft(slot);
      const filename = `${accepted.annotatorSlot}-${accepted.annotatorId}.json`;
      downloadJson(filename, accepted);
      setStatus(`Validated and saved locally as ${filename}. Practice only — not evaluation.`);
      onSubmitted?.(slot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Label validation failed");
    }
  }

  if (!current) return null;

  const draft = drafts[current.rowId]!;

  return (
    <section className={styles.panel} aria-labelledby="context-annotation-practice-heading">
      <h2 id="context-annotation-practice-heading">Context annotation practice</h2>
      <p className={styles.lede}>
        Label each passage for species, sample, setting, intervention, outcome and timepoint. Drafts autosave in this
        browser. Practice labels never enter frozen evaluation or Gate C.
      </p>

      <div className={styles.toolbar}>
        {!fixedSlot && (
          <label>
            Annotator packet
            <select value={slot} onChange={(event) => switchSlot(event.target.value as "annotator_a" | "annotator_b")}>
              <option value="annotator_a">Annotator A</option>
              <option value="annotator_b">Annotator B</option>
            </select>
          </label>
        )}
        <p className={styles.meta} role="status">
          {completed}/{packet.rows.length} passages complete · <code>{packet.packetId}</code>
        </p>
        <div className={styles.progress} aria-hidden="true">
          <span style={{ width: `${(completed / Math.max(packet.rows.length, 1)) * 100}%` }} />
        </div>
      </div>

      <form className={styles.form} onSubmit={onSubmit}>
        <label>
          Annotator ID
          <input
            value={annotatorId}
            onChange={(event) => setAnnotatorId(event.target.value)}
            placeholder="e.g. sme-initials"
            required
            autoComplete="username"
          />
        </label>

        <div className={styles.stepper} role="tablist" aria-label="Passages">
          {packet.rows.map((row, index) => (
            <button
              key={row.rowId}
              type="button"
              role="tab"
              aria-selected={row.rowId === current.rowId}
              className={rowComplete(drafts[row.rowId]) ? styles.stepDone : undefined}
              onClick={() => setActiveRow(row.rowId)}
            >
              {index + 1}
            </button>
          ))}
        </div>

        <article className={styles.card}>
          <header>
            <h3>{current.articleTitle}</h3>
            <p>
              <code>{current.rowId}</code> · {current.passageLocator}
            </p>
          </header>
          <pre className={styles.passage} tabIndex={0}>
            {current.passageText}
          </pre>
          <button type="button" className={styles.secondary} onClick={() => captureSelection(current.rowId, current.passageText)}>
            Use selection as grounding
          </button>

          <label>
            Grounding span (exact substring)
            <input
              value={draft.groundingSpan}
              onChange={(event) =>
                setDrafts((prev) => ({ ...prev, [current.rowId]: { ...prev[current.rowId]!, groundingSpan: event.target.value } }))
              }
              required
            />
          </label>

          <div className={styles.grid}>
            <label>
              Species
              <select value={draft.tags.species ?? ""} onChange={(event) => updateTag(current.rowId, "species", event.target.value)} required>
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
                onChange={(event) => updateTag(current.rowId, "setting_or_model", event.target.value)}
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
                onChange={(event) => updateTag(current.rowId, "tissue_or_sample", event.target.value)}
                required
              />
            </label>
            <label>
              Intervention
              <input
                value={draft.tags.intervention ?? ""}
                onChange={(event) => updateTag(current.rowId, "intervention", event.target.value)}
                required
              />
            </label>
            <label>
              Outcome
              <input value={draft.tags.outcome ?? ""} onChange={(event) => updateTag(current.rowId, "outcome", event.target.value)} required />
            </label>
            <label>
              Timepoint
              <input
                value={draft.tags.timepoint ?? ""}
                onChange={(event) => updateTag(current.rowId, "timepoint", event.target.value)}
                required
              />
            </label>
          </div>
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
          <button
            type="button"
            className={styles.secondary}
            disabled={packet.rows.findIndex((row) => row.rowId === current.rowId) === 0}
            onClick={() => {
              const index = packet.rows.findIndex((row) => row.rowId === current.rowId);
              if (index > 0) setActiveRow(packet.rows[index - 1]!.rowId);
            }}
          >
            Previous passage
          </button>
          <button
            type="button"
            className={styles.secondary}
            disabled={packet.rows.findIndex((row) => row.rowId === current.rowId) >= packet.rows.length - 1}
            onClick={() => {
              const index = packet.rows.findIndex((row) => row.rowId === current.rowId);
              if (index < packet.rows.length - 1) setActiveRow(packet.rows[index + 1]!.rowId);
            }}
          >
            Next passage
          </button>
          <button type="submit" disabled={completed < packet.rows.length || !annotatorId.trim()}>
            Validate, save and download
          </button>
        </div>
      </form>
    </section>
  );
}

import type { AcceptedPracticePacket, AdjudicationRecord } from "@/lib/hsi/contextAnnotationClient";

const DRAFT_PREFIX = "isi.ra.annotation.draft.v1.";
const SUBMISSION_PREFIX = "isi.ra.annotation.submission.v1.";
const ADJUDICATION_KEY = "isi.ra.annotation.adjudication.v1";

export type AnnotationDraftStore = {
  annotatorId: string;
  drafts: Record<string, { groundingSpan: string; tags: Record<string, string | null> }>;
  updatedAt: string;
};

export function loadAnnotationDraft(slot: string): AnnotationDraftStore | null {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + slot);
    return raw ? (JSON.parse(raw) as AnnotationDraftStore) : null;
  } catch {
    return null;
  }
}

export function saveAnnotationDraft(slot: string, value: AnnotationDraftStore) {
  localStorage.setItem(DRAFT_PREFIX + slot, JSON.stringify(value));
}

export function clearAnnotationDraft(slot: string) {
  localStorage.removeItem(DRAFT_PREFIX + slot);
}

export function saveAcceptedPracticePacket(packet: AcceptedPracticePacket) {
  localStorage.setItem(SUBMISSION_PREFIX + packet.annotatorSlot, JSON.stringify(packet));
}

export function loadAcceptedPracticePacket(slot: "annotator_a" | "annotator_b"): AcceptedPracticePacket | null {
  try {
    const raw = localStorage.getItem(SUBMISSION_PREFIX + slot);
    return raw ? (JSON.parse(raw) as AcceptedPracticePacket) : null;
  } catch {
    return null;
  }
}

export function saveAdjudicationBundle(records: AdjudicationRecord[]) {
  localStorage.setItem(ADJUDICATION_KEY, JSON.stringify({ updatedAt: new Date().toISOString(), records }));
}

export function loadAdjudicationBundle(): { updatedAt: string; records: AdjudicationRecord[] } | null {
  try {
    const raw = localStorage.getItem(ADJUDICATION_KEY);
    return raw ? (JSON.parse(raw) as { updatedAt: string; records: AdjudicationRecord[] }) : null;
  } catch {
    return null;
  }
}

export function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

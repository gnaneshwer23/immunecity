/**
 * Browser-safe practice labelling + adjudication helpers.
 * No node:crypto and no evidence-release parsers — safe for client components.
 */

export const REQUIRED_CONTEXT_TAGS = [
  "species",
  "tissue_or_sample",
  "setting_or_model",
  "intervention",
  "outcome",
  "timepoint",
] as const;

export type ContextTagName = (typeof REQUIRED_CONTEXT_TAGS)[number];

export type SpeciesTag = "human" | "mouse" | "other" | "missing" | "mixed";
export type SettingTag =
  | "clinical_observational"
  | "clinical_trial"
  | "meta_analysis"
  | "in_vitro"
  | "in_vivo"
  | "in_silico"
  | "missing"
  | "mixed"
  | "other";

export type ContextTagSet = {
  species: SpeciesTag | null;
  tissue_or_sample: string | null;
  setting_or_model: SettingTag | null;
  intervention: string | null;
  outcome: string | null;
  timepoint: string | null;
};

export type AnnotationWorksheetRow = {
  rowId: string;
  partition: "practice_not_evaluation" | "evaluation_frozen" | "training_candidate";
  sourceId: string;
  passageId: string;
  passageSha256: string;
  passageLocator: string;
  sourceVersion: string;
  pmid: string | null;
  pmcid: string | null;
  doi: string | null;
  licenceIdentifier: string | null;
  authors: string[];
  articleTitle: string;
  passageText: string;
  groundingSpan: string | null;
  tags: ContextTagSet;
  annotatorId: string | null;
  labelledAt: string | null;
  scientificReview: "unreviewed";
  containsPhi: false;
  clinicalAdvice: false;
  kgWrite: false;
};

export type IndependentLabelPacket = {
  schemaVersion: string;
  packetId: string;
  annotatorSlot: "annotator_a" | "annotator_b";
  doubleBlind: true;
  guidelineVersion: string;
  rows: AnnotationWorksheetRow[];
};

export type AdjudicationRecord = {
  rowId: string;
  annotatorATags: ContextTagSet;
  annotatorBTags: ContextTagSet;
  disagreeOn: ContextTagName[];
  finalTags: ContextTagSet | null;
  adjudicatorId: string | null;
  rationale: string | null;
  adjudicatedAt: string | null;
  fabricatedLabelsPermitted: false;
};

export type PracticeLabelSubmission = {
  packetId: string;
  annotatorSlot: "annotator_a" | "annotator_b";
  annotatorId: string;
  labelledAt: string;
  rows: Array<{
    rowId: string;
    groundingSpan: string;
    tags: ContextTagSet;
  }>;
};

export type AcceptedPracticePacket = IndependentLabelPacket & {
  partition: "practice_not_evaluation";
  notForEvaluation: true;
  submittedAt: string;
  annotatorId: string;
};

export class ContextAnnotationClientError extends Error {
  constructor(message: string) {
    super(message);
  }
}

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

function assertFilledTags(tags: ContextTagSet, path: string) {
  if (!tags.species || !SPECIES.includes(tags.species)) throw new ContextAnnotationClientError(`${path}.species`);
  if (!tags.setting_or_model || !SETTINGS.includes(tags.setting_or_model)) {
    throw new ContextAnnotationClientError(`${path}.setting_or_model`);
  }
  for (const key of ["tissue_or_sample", "intervention", "outcome", "timepoint"] as const) {
    const value = tags[key];
    if (typeof value !== "string" || !value.trim() || value.length > 500) {
      throw new ContextAnnotationClientError(`${path}.${key}`);
    }
  }
}

export function openAdjudicationRecord(rowId: string, a: ContextTagSet, b: ContextTagSet): AdjudicationRecord {
  const disagreeOn = REQUIRED_CONTEXT_TAGS.filter((tag) => a[tag] !== b[tag]);
  return {
    rowId,
    annotatorATags: structuredClone(a),
    annotatorBTags: structuredClone(b),
    disagreeOn: [...disagreeOn],
    finalTags: null,
    adjudicatorId: null,
    rationale: null,
    adjudicatedAt: null,
    fabricatedLabelsPermitted: false,
  };
}

export function finalizeAdjudicationRecord(
  open: AdjudicationRecord,
  input: { finalTags: ContextTagSet; adjudicatorId: string; rationale: string; adjudicatedAt: string },
): AdjudicationRecord {
  if (open.finalTags !== null) throw new ContextAnnotationClientError("already_finalized");
  if (!input.adjudicatorId.trim()) throw new ContextAnnotationClientError("adjudicatorId");
  if (!input.rationale.trim() || input.rationale.length > 4000) throw new ContextAnnotationClientError("rationale");
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/.test(input.adjudicatedAt)) {
    throw new ContextAnnotationClientError("adjudicatedAt");
  }
  assertFilledTags(input.finalTags, "finalTags");
  return {
    ...open,
    finalTags: {
      species: input.finalTags.species,
      tissue_or_sample: input.finalTags.tissue_or_sample!.trim(),
      setting_or_model: input.finalTags.setting_or_model,
      intervention: input.finalTags.intervention!.trim(),
      outcome: input.finalTags.outcome!.trim(),
      timepoint: input.finalTags.timepoint!.trim(),
    },
    adjudicatorId: input.adjudicatorId.trim(),
    rationale: input.rationale.trim(),
    adjudicatedAt: input.adjudicatedAt,
    fabricatedLabelsPermitted: false,
  };
}

export function buildPracticeAdjudicationQueue(
  packetA: AcceptedPracticePacket,
  packetB: AcceptedPracticePacket,
): AdjudicationRecord[] {
  if (packetA.partition !== "practice_not_evaluation" || packetB.partition !== "practice_not_evaluation") {
    throw new ContextAnnotationClientError("practice_only");
  }
  if (packetA.rows.length !== packetB.rows.length) throw new ContextAnnotationClientError("row_count_mismatch");
  const byB = new Map(packetB.rows.map((row) => [row.rowId, row]));
  return packetA.rows.map((rowA) => {
    const rowB = byB.get(rowA.rowId);
    if (!rowB || !rowA.tags.species || !rowB.tags.species) throw new ContextAnnotationClientError("unlabelled_row");
    return openAdjudicationRecord(rowA.rowId, rowA.tags, rowB.tags);
  });
}

export function acceptPracticeLabelSubmission(
  blankPacket: IndependentLabelPacket,
  submission: PracticeLabelSubmission,
): AcceptedPracticePacket {
  if (submission.packetId !== blankPacket.packetId) throw new ContextAnnotationClientError("packetId_mismatch");
  if (submission.annotatorSlot !== blankPacket.annotatorSlot) throw new ContextAnnotationClientError("annotatorSlot_mismatch");
  if (!submission.annotatorId.trim()) throw new ContextAnnotationClientError("annotatorId_required");
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/.test(submission.labelledAt)) {
    throw new ContextAnnotationClientError("labelledAt_invalid");
  }
  if (submission.rows.length !== blankPacket.rows.length) throw new ContextAnnotationClientError("row_count_mismatch");

  const byId = new Map(submission.rows.map((row) => [row.rowId, row]));
  const filled: AnnotationWorksheetRow[] = blankPacket.rows.map((scaffold) => {
    const answer = byId.get(scaffold.rowId);
    if (!answer) throw new ContextAnnotationClientError(`missing_row:${scaffold.rowId}`);
    if (scaffold.partition !== "practice_not_evaluation") {
      throw new ContextAnnotationClientError("only_practice_accepted_here");
    }
    const tags = answer.tags;
    assertFilledTags(tags, answer.rowId);
    const span = answer.groundingSpan.trim();
    if (!span || span.length > 2000) throw new ContextAnnotationClientError("groundingSpan_required");
    if (!scaffold.passageText.includes(span)) throw new ContextAnnotationClientError("groundingSpan_not_in_passage");
    return {
      ...scaffold,
      groundingSpan: span,
      tags: {
        species: tags.species,
        tissue_or_sample: tags.tissue_or_sample!.trim(),
        setting_or_model: tags.setting_or_model,
        intervention: tags.intervention!.trim(),
        outcome: tags.outcome!.trim(),
        timepoint: tags.timepoint!.trim(),
      },
      annotatorId: submission.annotatorId.trim(),
      labelledAt: submission.labelledAt,
    };
  });

  return {
    ...blankPacket,
    rows: filled,
    partition: "practice_not_evaluation",
    notForEvaluation: true,
    submittedAt: submission.labelledAt,
    annotatorId: submission.annotatorId.trim(),
  };
}

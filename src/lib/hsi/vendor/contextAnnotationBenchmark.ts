/**
 * RA context-annotation benchmark kit (Phase 6).
 * Empty label stores and validation only — never fabricates SME labels or accuracy claims.
 */
import { createHash } from "node:crypto";
import { parseRaEvidenceRelease, type RaEvidenceRelease } from "./raEvidenceRelease";
import { parseRaResearchEvidenceRelease, type RaResearchEvidenceRelease } from "./raResearchEvidenceRelease";

export const CONTEXT_ANNOTATION_BENCHMARK_VERSION = "hsi-ra-context-annotation-benchmark-1" as const;
export const CONTEXT_ANNOTATION_GUIDELINE_VERSION = "hsi-ra-context-annotation-guideline-1" as const;
export const CONTEXT_ANNOTATION_WORKSHEET_VERSION = "hsi-ra-context-annotation-worksheet-1" as const;

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

export type BenchmarkPartition = "evaluation_frozen" | "training_candidate" | "practice_not_evaluation";

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
  partition: BenchmarkPartition;
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
  /** Exact passage text for labelling; must match passageSha256. */
  passageText: string;
  /** Grounding quote must come from the passage; left empty until an annotator fills it. */
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
  schemaVersion: typeof CONTEXT_ANNOTATION_BENCHMARK_VERSION;
  packetId: string;
  annotatorSlot: "annotator_a" | "annotator_b";
  /** Blind: packets omit peer labels. */
  doubleBlind: true;
  guidelineVersion: typeof CONTEXT_ANNOTATION_GUIDELINE_VERSION;
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

export type BenchmarkSplitPolicy = {
  schemaVersion: typeof CONTEXT_ANNOTATION_BENCHMARK_VERSION;
  evaluationShare: number;
  trainingShare: number;
  holdoutShare: number;
  /** Rights-verified release required before evaluation_frozen rows may be minted. */
  evaluationRequiresRightsVerifiedRelease: true;
  practiceRowsCannotEnterEvaluation: true;
  proposedAbstractTarget: 200;
  proposedAccuracyTargetNote: "Proposed milestone only — not a measured result.";
  proposedTimeSavingTargetNote: "Proposed milestone only — not a measured result.";
};

export type ContextAnnotationBenchmarkKit = {
  schemaVersion: typeof CONTEXT_ANNOTATION_BENCHMARK_VERSION;
  guidelineVersion: typeof CONTEXT_ANNOTATION_GUIDELINE_VERSION;
  worksheetSchemaVersion: typeof CONTEXT_ANNOTATION_WORKSHEET_VERSION;
  status: "ready_for_sme_kickoff" | "awaiting_rights_verified_passages";
  containsPhi: false;
  clinicalAdvice: false;
  kgWrite: false;
  scientificReview: "unreviewed";
  fabricatedLabelsPermitted: false;
  splitPolicy: BenchmarkSplitPolicy;
  emptyLabelStore: {
    evaluation_frozen: AnnotationWorksheetRow[];
    training_candidate: AnnotationWorksheetRow[];
    practice_not_evaluation: AnnotationWorksheetRow[];
  };
  adjudicationLog: AdjudicationRecord[];
  notes: string[];
};

export class ContextAnnotationBenchmarkError extends Error {
  constructor(message: string) {
    super(message);
  }
}

const emptyTags = (): ContextTagSet => ({
  species: null,
  tissue_or_sample: null,
  setting_or_model: null,
  intervention: null,
  outcome: null,
  timepoint: null,
});

const digest = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 16);

export function defaultBenchmarkSplitPolicy(): BenchmarkSplitPolicy {
  return {
    schemaVersion: CONTEXT_ANNOTATION_BENCHMARK_VERSION,
    evaluationShare: 0.4,
    trainingShare: 0.4,
    holdoutShare: 0.2,
    evaluationRequiresRightsVerifiedRelease: true,
    practiceRowsCannotEnterEvaluation: true,
    proposedAbstractTarget: 200,
    proposedAccuracyTargetNote: "Proposed milestone only — not a measured result.",
    proposedTimeSavingTargetNote: "Proposed milestone only — not a measured result.",
  };
}

export function emptyContextAnnotationBenchmarkKit(
  status: ContextAnnotationBenchmarkKit["status"] = "awaiting_rights_verified_passages",
): ContextAnnotationBenchmarkKit {
  return {
    schemaVersion: CONTEXT_ANNOTATION_BENCHMARK_VERSION,
    guidelineVersion: CONTEXT_ANNOTATION_GUIDELINE_VERSION,
    worksheetSchemaVersion: CONTEXT_ANNOTATION_WORKSHEET_VERSION,
    status,
    containsPhi: false,
    clinicalAdvice: false,
    kgWrite: false,
    scientificReview: "unreviewed",
    fabricatedLabelsPermitted: false,
    splitPolicy: defaultBenchmarkSplitPolicy(),
    emptyLabelStore: {
      evaluation_frozen: [],
      training_candidate: [],
      practice_not_evaluation: [],
    },
    adjudicationLog: [],
    notes: [
      "SME labels are absent until independent annotators fill worksheet rows.",
      "Do not invent passage text, licence URIs, inter-annotator scores, or accuracy claims.",
      "Frozen evaluation rows require a rights-verified RA evidence release.",
      "Practice rows from the research working set must stay in practice_not_evaluation.",
    ],
  };
}

function assertEmptyTags(tags: ContextTagSet, path: string) {
  for (const key of REQUIRED_CONTEXT_TAGS) {
    if (tags[key] !== null) throw new ContextAnnotationBenchmarkError(`${path}.${key}_must_be_null_until_sme`);
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

export function assertAnnotationRowScaffold(row: AnnotationWorksheetRow): void {
  if (!row.rowId || !row.passageId || !row.sourceId) throw new ContextAnnotationBenchmarkError("row_identity");
  if (row.scientificReview !== "unreviewed") throw new ContextAnnotationBenchmarkError("scientificReview");
  if (row.containsPhi || row.clinicalAdvice || row.kgWrite) throw new ContextAnnotationBenchmarkError("boundary");
  if (!row.passageText?.trim()) throw new ContextAnnotationBenchmarkError("passageText_required");
  const expectedHash = createHash("sha256").update(row.passageText).digest("hex");
  if (row.passageSha256 !== expectedHash) throw new ContextAnnotationBenchmarkError("passageText_hash_mismatch");
  assertEmptyTags(row.tags, row.rowId);
  if (row.annotatorId !== null || row.labelledAt !== null || row.groundingSpan !== null) {
    throw new ContextAnnotationBenchmarkError("scaffold_must_be_unlabelled");
  }
  if (row.partition === "evaluation_frozen" && (!row.pmid || !row.licenceIdentifier)) {
    throw new ContextAnnotationBenchmarkError("evaluation_requires_pmid_and_licence");
  }
  if (row.partition === "practice_not_evaluation" && row.pmid !== null) {
    throw new ContextAnnotationBenchmarkError("practice_must_not_claim_real_pmid");
  }
}

export function assertBenchmarkKitHonesty(kit: ContextAnnotationBenchmarkKit): void {
  if (kit.fabricatedLabelsPermitted) throw new ContextAnnotationBenchmarkError("fabricated_forbidden");
  if (kit.containsPhi || kit.clinicalAdvice || kit.kgWrite) throw new ContextAnnotationBenchmarkError("boundary");
  if (kit.scientificReview !== "unreviewed") throw new ContextAnnotationBenchmarkError("scientificReview");
  for (const partition of ["evaluation_frozen", "training_candidate", "practice_not_evaluation"] as const) {
    for (const row of kit.emptyLabelStore[partition]) {
      if (row.partition !== partition) throw new ContextAnnotationBenchmarkError("partition_mismatch");
      assertAnnotationRowScaffold(row);
    }
  }
  for (const record of kit.adjudicationLog) {
    if (record.fabricatedLabelsPermitted) throw new ContextAnnotationBenchmarkError("adjudication_fabricated");
    if (record.finalTags !== null) throw new ContextAnnotationBenchmarkError("adjudication_must_start_empty");
  }
}

/** Mint unlabelled rows from a rights-verified release for future SME evaluation/training assignment. */
export function scaffoldRowsFromVerifiedRelease(
  releaseInput: unknown,
  partition: "evaluation_frozen" | "training_candidate",
): AnnotationWorksheetRow[] {
  const release: RaEvidenceRelease = parseRaEvidenceRelease(releaseInput);
  const rows: AnnotationWorksheetRow[] = [];
  for (const passage of release.passages) {
    const source = release.sources.find((s) => s.id === passage.sourceId);
    const receipt = release.receipts.find((r) => r.sourceId === passage.sourceId);
    if (!source || !receipt) throw new ContextAnnotationBenchmarkError("source_or_receipt_missing");
    if (!source.licence.identifier) throw new ContextAnnotationBenchmarkError("licence_required");
    const passageSha256 = passage.sha256 ?? createHash("sha256").update(passage.text).digest("hex");
    const row: AnnotationWorksheetRow = {
      rowId: `ROW-${digest(`${partition}:${passage.id}:${passageSha256}`)}`,
      partition,
      sourceId: source.id,
      passageId: passage.id,
      passageSha256,
      passageLocator: passage.locator,
      sourceVersion: passage.sourceVersion,
      pmid: source.pmid,
      pmcid: receipt.pmcid,
      doi: source.doi,
      licenceIdentifier: source.licence.identifier,
      authors: [...receipt.authors],
      articleTitle: receipt.articleTitle,
      passageText: passage.text,
      groundingSpan: null,
      tags: emptyTags(),
      annotatorId: null,
      labelledAt: null,
      scientificReview: "unreviewed",
      containsPhi: false,
      clinicalAdvice: false,
      kgWrite: false,
    };
    assertAnnotationRowScaffold(row);
    rows.push(row);
  }
  return rows;
}

/** Practice scaffolds from the research working set — never evaluation_frozen. */
export function scaffoldPracticeRowsFromResearchRelease(releaseInput: unknown): AnnotationWorksheetRow[] {
  const release: RaResearchEvidenceRelease = parseRaResearchEvidenceRelease(releaseInput);
  const rows: AnnotationWorksheetRow[] = [];
  for (const passage of release.passages) {
    const source = release.sources.find((s) => s.id === passage.sourceId);
    if (!source) throw new ContextAnnotationBenchmarkError("research_source_missing");
    const passageSha256 = passage.sha256 ?? createHash("sha256").update(passage.text).digest("hex");
    const row: AnnotationWorksheetRow = {
      rowId: `PRACTICE-${digest(`${passage.id}:${passageSha256}`)}`,
      partition: "practice_not_evaluation",
      sourceId: source.id,
      passageId: passage.id,
      passageSha256,
      passageLocator: passage.locator,
      sourceVersion: passage.sourceVersion,
      pmid: null,
      pmcid: null,
      doi: null,
      licenceIdentifier: source.licence.identifier,
      authors: [],
      articleTitle: source.title,
      passageText: passage.text,
      groundingSpan: null,
      tags: emptyTags(),
      annotatorId: null,
      labelledAt: null,
      scientificReview: "unreviewed",
      containsPhi: false,
      clinicalAdvice: false,
      kgWrite: false,
    };
    assertAnnotationRowScaffold(row);
    rows.push(row);
  }
  return rows;
}

/** Double-blind packets: identical unlabelled rows, separate annotator slots, no peer visibility. */
export function buildDoubleBlindLabelPackets(rows: AnnotationWorksheetRow[]): [IndependentLabelPacket, IndependentLabelPacket] {
  for (const row of rows) assertAnnotationRowScaffold(row);
  const base = rows.map((row) => structuredClone(row));
  const packetId = `PKT-${digest(base.map((r) => r.rowId).join("|"))}`;
  const a: IndependentLabelPacket = {
    schemaVersion: CONTEXT_ANNOTATION_BENCHMARK_VERSION,
    packetId: `${packetId}-A`,
    annotatorSlot: "annotator_a",
    doubleBlind: true,
    guidelineVersion: CONTEXT_ANNOTATION_GUIDELINE_VERSION,
    rows: structuredClone(base),
  };
  const b: IndependentLabelPacket = {
    schemaVersion: CONTEXT_ANNOTATION_BENCHMARK_VERSION,
    packetId: `${packetId}-B`,
    annotatorSlot: "annotator_b",
    doubleBlind: true,
    guidelineVersion: CONTEXT_ANNOTATION_GUIDELINE_VERSION,
    rows: structuredClone(base),
  };
  return [a, b];
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

function assertFilledTags(tags: ContextTagSet, path: string) {
  if (!tags.species || !SPECIES.includes(tags.species)) throw new ContextAnnotationBenchmarkError(`${path}.species`);
  if (!tags.setting_or_model || !SETTINGS.includes(tags.setting_or_model)) {
    throw new ContextAnnotationBenchmarkError(`${path}.setting_or_model`);
  }
  for (const key of ["tissue_or_sample", "intervention", "outcome", "timepoint"] as const) {
    const value = tags[key];
    if (typeof value !== "string" || !value.trim() || value.length > 500) {
      throw new ContextAnnotationBenchmarkError(`${path}.${key}`);
    }
  }
}

/** Close an adjudication record with human final tags. Practice-only unless caller partitions separately. */
export function finalizeAdjudicationRecord(
  open: AdjudicationRecord,
  input: { finalTags: ContextTagSet; adjudicatorId: string; rationale: string; adjudicatedAt: string },
): AdjudicationRecord {
  if (open.finalTags !== null) throw new ContextAnnotationBenchmarkError("already_finalized");
  if (!input.adjudicatorId.trim()) throw new ContextAnnotationBenchmarkError("adjudicatorId");
  if (!input.rationale.trim() || input.rationale.length > 4000) throw new ContextAnnotationBenchmarkError("rationale");
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/.test(input.adjudicatedAt)) {
    throw new ContextAnnotationBenchmarkError("adjudicatedAt");
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

/** Build open adjudication records from two accepted practice packets (same row set). */
export function buildPracticeAdjudicationQueue(
  packetA: AcceptedPracticePacket,
  packetB: AcceptedPracticePacket,
): AdjudicationRecord[] {
  if (packetA.partition !== "practice_not_evaluation" || packetB.partition !== "practice_not_evaluation") {
    throw new ContextAnnotationBenchmarkError("practice_only");
  }
  if (packetA.rows.length !== packetB.rows.length) throw new ContextAnnotationBenchmarkError("row_count_mismatch");
  const byB = new Map(packetB.rows.map((row) => [row.rowId, row]));
  return packetA.rows.map((rowA) => {
    const rowB = byB.get(rowA.rowId);
    if (!rowB || !rowA.tags.species || !rowB.tags.species) throw new ContextAnnotationBenchmarkError("unlabelled_row");
    return openAdjudicationRecord(rowA.rowId, rowA.tags, rowB.tags);
  });
}

/** Assign scaffold rows to partitions by stable hash — does not invent labels. */
export function assignPartitionsByPolicy(
  rows: AnnotationWorksheetRow[],
  policy: BenchmarkSplitPolicy = defaultBenchmarkSplitPolicy(),
): Record<"evaluation_frozen" | "training_candidate" | "holdout_candidate", AnnotationWorksheetRow[]> {
  if (!policy.evaluationRequiresRightsVerifiedRelease) {
    throw new ContextAnnotationBenchmarkError("policy_must_require_rights");
  }
  const evaluation_frozen: AnnotationWorksheetRow[] = [];
  const training_candidate: AnnotationWorksheetRow[] = [];
  const holdout_candidate: AnnotationWorksheetRow[] = [];
  for (const row of rows) {
    if (row.partition === "practice_not_evaluation") {
      throw new ContextAnnotationBenchmarkError("practice_cannot_enter_split");
    }
    const bucket = Number.parseInt(digest(row.rowId).slice(0, 2), 16) / 256;
    if (bucket < policy.evaluationShare) evaluation_frozen.push({ ...row, partition: "evaluation_frozen" });
    else if (bucket < policy.evaluationShare + policy.trainingShare) {
      training_candidate.push({ ...row, partition: "training_candidate" });
    } else holdout_candidate.push({ ...row, partition: "training_candidate" });
  }
  return { evaluation_frozen, training_candidate, holdout_candidate };
}

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

/** Accept a filled practice packet. Never promotes rows into evaluation_frozen. */
export function acceptPracticeLabelSubmission(
  blankPacket: IndependentLabelPacket,
  submission: PracticeLabelSubmission,
): AcceptedPracticePacket {
  if (submission.packetId !== blankPacket.packetId) throw new ContextAnnotationBenchmarkError("packetId_mismatch");
  if (submission.annotatorSlot !== blankPacket.annotatorSlot) throw new ContextAnnotationBenchmarkError("annotatorSlot_mismatch");
  if (!submission.annotatorId.trim()) throw new ContextAnnotationBenchmarkError("annotatorId_required");
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/.test(submission.labelledAt)) {
    throw new ContextAnnotationBenchmarkError("labelledAt_invalid");
  }
  if (submission.rows.length !== blankPacket.rows.length) throw new ContextAnnotationBenchmarkError("row_count_mismatch");

  const byId = new Map(submission.rows.map((row) => [row.rowId, row]));
  const filled: AnnotationWorksheetRow[] = blankPacket.rows.map((scaffold) => {
    const answer = byId.get(scaffold.rowId);
    if (!answer) throw new ContextAnnotationBenchmarkError(`missing_row:${scaffold.rowId}`);
    if (scaffold.partition !== "practice_not_evaluation") {
      throw new ContextAnnotationBenchmarkError("only_practice_accepted_here");
    }
    const tags = answer.tags;
    if (!tags.species || !SPECIES.includes(tags.species)) throw new ContextAnnotationBenchmarkError("species_invalid");
    if (!tags.setting_or_model || !SETTINGS.includes(tags.setting_or_model)) {
      throw new ContextAnnotationBenchmarkError("setting_invalid");
    }
    for (const key of ["tissue_or_sample", "intervention", "outcome", "timepoint"] as const) {
      const value = tags[key];
      if (typeof value !== "string" || !value.trim() || value.length > 500) {
        throw new ContextAnnotationBenchmarkError(`${key}_required`);
      }
    }
    const span = answer.groundingSpan.trim();
    if (!span || span.length > 2000) throw new ContextAnnotationBenchmarkError("groundingSpan_required");
    if (!scaffold.passageText.includes(span)) throw new ContextAnnotationBenchmarkError("groundingSpan_not_in_passage");
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

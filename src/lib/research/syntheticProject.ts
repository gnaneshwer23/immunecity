import { z } from "zod";

const text = z.string().trim().min(1).max(4000);
const id = z.string().regex(/^SYN-[A-Z0-9-]+$/).max(80);
const claimIds = ["SYN-CLAIM-CD8", "SYN-CLAIM-PDL1", "SYN-CLAIM-ESCAPE"] as const;
export const syntheticDatasetSchema = z.object({
  schemaVersion: z.literal("synthetic-melanoma-1"),
  dataClass: z.literal("synthetic"),
  datasetId: id,
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  title: text,
  description: text,
  sources: z.array(z.object({
    id, title: text, provenance: z.literal("invented_demo_source_not_a_publication"),
  }).strict()).min(1).max(100),
  evidence: z.array(z.object({
    id, sourceId: id, claimId: z.enum(claimIds),
    topic: z.enum(["CD8 context", "PD-L1 context", "Immune escape"]),
    assertion: text, passage: text, locator: text,
    direction: z.enum(["supports", "contradicts", "background"]),
    studyContext: text, limitation: text,
  }).strict()).min(1).max(200),
  cohorts: z.array(z.object({
    id, label: text, intervention: text,
    population: text, assay: text, analysisWindow: text,
    sampleSize: z.number().int().min(1).max(100000),
    responseCount: z.number().int().min(0).max(100000),
    biomarkerAvailable: z.number().int().min(0).max(100000),
    limitation: text,
  }).strict()).min(1).max(30),
}).strict().superRefine((d, ctx) => {
  for (const [name, rows] of [["sources", d.sources], ["evidence", d.evidence], ["cohorts", d.cohorts]] as const) {
    if (new Set(rows.map((r) => r.id)).size !== rows.length) ctx.addIssue({ code: "custom", message: `Duplicate ${name} IDs` });
  }
  for (const row of d.evidence) {
    if (!d.sources.some((s) => s.id === row.sourceId)) ctx.addIssue({ code: "custom", message: `Unknown source ${row.sourceId}` });
  }
  for (const c of d.cohorts) {
    if (c.responseCount > c.sampleSize || c.biomarkerAvailable > c.sampleSize) ctx.addIssue({ code: "custom", message: `Counts exceed cohort size: ${c.id}` });
  }
});
export type SyntheticDataset = z.infer<typeof syntheticDatasetSchema>;
export const DEMO_STORAGE_KEY = "isi:synthetic-melanoma-project:v1";
export const MAX_DEMO_BYTES = 500_000;
const decisionSchema = z.object({
  evidenceId: id, disposition: z.enum(["retain", "context_only", "exclude"]), note: text,
}).strict();
export const syntheticProjectSchema = z.object({
  schemaVersion: z.literal("synthetic-project-1"),
  dataset: syntheticDatasetSchema,
  question: text,
  selectedEvidenceIds: z.array(id).max(200),
  decisions: z.array(decisionSchema).max(200),
  hypothesis: z.string().max(4000),
  prediction: z.string().max(4000),
  experiment: z.string().max(4000),
  falsification: z.string().max(4000),
}).strict().superRefine((p, ctx) => {
  const ids = new Set(p.dataset.evidence.map((e) => e.id));
  if (p.selectedEvidenceIds.some((i) => !ids.has(i)) || p.decisions.some((d) => !ids.has(d.evidenceId))) {
    ctx.addIssue({ code: "custom", message: "Project references unknown evidence" });
  }
  if (new Set(p.selectedEvidenceIds).size !== p.selectedEvidenceIds.length || new Set(p.decisions.map((d) => d.evidenceId)).size !== p.decisions.length) {
    ctx.addIssue({ code: "custom", message: "Duplicate project evidence references" });
  }
});
export type SyntheticProject = z.infer<typeof syntheticProjectSchema>;
export type DemoDecision = z.infer<typeof decisionSchema>;

function parseBounded(json: string): unknown {
  if (new TextEncoder().encode(json).byteLength > MAX_DEMO_BYTES) throw new Error("Demo file exceeds 500 KB.");
  return JSON.parse(json);
}
export function parseSyntheticDataset(json: string): SyntheticDataset { return syntheticDatasetSchema.parse(parseBounded(json)); }
export function parseSyntheticProject(json: string): SyntheticProject { return syntheticProjectSchema.parse(parseBounded(json)); }
export function newSyntheticProject(dataset: SyntheticDataset): SyntheticProject {
  return syntheticProjectSchema.parse({
    schemaVersion: "synthetic-project-1", dataset,
    question: "Which synthetic findings could explain PD-1 nonresponse, and what should our team test next?",
    selectedEvidenceIds: [], decisions: [], hypothesis: "", prediction: "", experiment: "", falsification: "",
  });
}

/** Contrasting directions on the SAME scenario claim; contexts remain visible, no vote or truth judgement. */
export function syntheticConflicts(dataset: SyntheticDataset) {
  return claimIds.flatMap((claimId) => {
    const rows = dataset.evidence.filter((e) => e.claimId === claimId);
    const supporting = rows.filter((e) => e.direction === "supports");
    const opposing = rows.filter((e) => e.direction === "contradicts");
    return supporting.length && opposing.length ? [{ claimId, supporting, opposing }] : [];
  });
}

export function recordDemoDecision(project: SyntheticProject, decision: DemoDecision): SyntheticProject {
  return syntheticProjectSchema.parse({ ...project, decisions: [...project.decisions.filter((d) => d.evidenceId !== decision.evidenceId), decision] });
}

export function buildSyntheticBrief(project: SyntheticProject, exportedAt: string) {
  const p = syntheticProjectSchema.parse(project);
  if (!Number.isFinite(Date.parse(exportedAt))) throw new Error("Invalid export time.");
  if (!p.selectedEvidenceIds.length) throw new Error("Select at least one synthetic finding.");
  for (const key of ["hypothesis", "prediction", "experiment", "falsification"] as const) {
    if (!p[key].trim()) throw new Error(`Complete ${key} before exporting a brief.`);
  }
  const selected = p.dataset.evidence.filter((e) => p.selectedEvidenceIds.includes(e.id));
  if (selected.some((e) => !p.decisions.some((d) => d.evidenceId === e.id))) throw new Error("Record an analysis decision for every selected finding.");
  if (!selected.some((e) => p.decisions.some((d) => d.evidenceId === e.id && d.disposition === "retain"))) throw new Error("Retain at least one selected finding for this investigation.");
  return {
    schemaVersion: "synthetic-brief-1", dataClass: "synthetic", watermark: "SYNTHETIC DEMONSTRATION — NOT SCIENTIFIC EVIDENCE",
    exportedAt, datasetId: p.dataset.datasetId, datasetVersion: p.dataset.version,
    scientificReviewStatus: "unreviewed", hypothesisStatus: "unvalidated", productionEligible: false,
    clinicalAdvice: false, kgWrite: false, reviewSimulation: true,
    question: p.question, hypothesis: p.hypothesis, prediction: p.prediction, experiment: p.experiment, falsification: p.falsification,
    evidence: selected.map((e) => ({ ...e, source: p.dataset.sources.find((s) => s.id === e.sourceId)!, decision: p.decisions.find((d) => d.evidenceId === e.id)! })),
    // Retain every conflict, including an opposing finding the analyst did not select.
    conflicts: syntheticConflicts(p.dataset),
    cohorts: p.dataset.cohorts.map((c) => ({ ...c, responsePercent: 100 * c.responseCount / c.sampleSize, biomarkerMissing: c.sampleSize - c.biomarkerAvailable })),
    limitations: ["All sources, passages, cohort counts and findings in this project are invented test data.",
      "Analysis decisions are local workflow simulation, not authenticated scientific approval.",
      "No causal comparison, treatment recommendation or real-world performance metric can be inferred.",
      "Unselected opposing findings remain in the conflict register. Gaps describe this fixture only."],
  };
}

export function syntheticBriefMarkdown(brief: ReturnType<typeof buildSyntheticBrief>): string {
  return [
    `# ${brief.watermark}`, `Dataset: ${brief.datasetId} v${brief.datasetVersion} · ${brief.exportedAt}`,
    `Scientific status: ${brief.scientificReviewStatus}; hypothesis: ${brief.hypothesisStatus}; productionEligible=false`,
    `## Question\n${brief.question}`, `## Hypothesis\n${brief.hypothesis}`, `## Prediction\n${brief.prediction}`,
    `## Experiment\n${brief.experiment}`, `## Falsification\n${brief.falsification}`,
    "## Selected synthetic findings", ...brief.evidence.map((e) => `${e.id} · ${e.source.title} · ${e.locator}\n${e.assertion}\nInvented passage: ${e.passage}\nContext: ${e.studyContext}\nLimitation: ${e.limitation}\nAnalysis: ${e.decision.disposition} — ${e.decision.note}`),
    "## Conflicting synthetic findings (all dataset records)", ...brief.conflicts.map((c) => `${c.claimId}\n${[...c.supporting, ...c.opposing].map((e) => `${e.id}: ${e.direction} · ${e.assertion} · ${e.studyContext}`).join("\n")}`),
    "## Synthetic cohort observations", ...brief.cohorts.map((c) => `${c.label}: ${c.responseCount}/${c.sampleSize} (${c.responsePercent.toFixed(1)}%); biomarker missing=${c.biomarkerMissing}; ${c.assay}; ${c.analysisWindow}; ${c.limitation}`),
    "## Limitations", ...brief.limitations.map((l) => `- ${l}`),
  ].join("\n\n");
}

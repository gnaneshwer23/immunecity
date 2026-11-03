import { z } from "zod";
import { SYNTHETIC_CONDITION_CATALOGUE } from "@/data/syntheticConditions";
import { assessTrialCriteria, type TrialCriterion } from "@/lib/hsi/vendor/trials/trialsCriteriaMvp";

const sid = z.string().regex(/^SYN-[A-Z0-9-]+$/);
const tag = { data_class: z.literal("synthetic") };
const txt = z.string().min(1).max(2000);
const labQuality = z.enum(["valid", "missing", "conflicting", "stale"]);
const labSchema = z.object({ ...tag, id: sid, label: txt, unit: txt, value: z.number().finite().nonnegative().nullable(),
  alternateValue: z.number().finite().nonnegative().nullable(), quality: labQuality,
  specimen: txt, specimenDay: z.number().int(), source: z.enum(["synthetic_generator", "synthetic_scenario_edit"]),
}).strict().superRefine((l, ctx) => {
  if ((l.quality === "missing" && l.value !== null) || (l.quality !== "missing" && l.value === null) ||
      (l.quality === "conflicting" && l.alternateValue === null) || (l.quality !== "conflicting" && l.alternateValue !== null)) {
    ctx.addIssue({ code: "custom", message: "Invalid lab quality/value combination" });
  }
});
const visitSchema = z.object({ ...tag, id: sid, day: z.number().int().nonnegative(),
  symptomIndex: z.number().min(0).max(100), labs: z.array(labSchema).length(4),
  immuneMeasurements: z.array(z.object({ ...tag, cell: txt, percentOfParentGate: z.number().min(0).max(100).nullable(), assay: txt }).strict()).min(1).max(6),
  lifestyle: z.object({ ...tag, sleepHours: z.number().min(0).max(24), activityMinutesWeekly: z.number().min(0).max(5000),
    smoking: z.enum(["never", "former", "current", "unknown"]), diet: txt, stressIndex: z.number().min(0).max(10),
    recentAntibiotics: z.boolean().nullable(), alcoholUnitsWeekly: z.number().nonnegative().nullable(),
  }).strict(),
}).strict();
const patientSchema = z.object({ ...tag, id: sid, conditionId: sid, ageYears: z.number().int().min(0).max(110),
  comorbidityIds: z.array(sid).max(5), familyHistory: txt, exposureNote: txt, infectionScreenNegative: z.boolean().nullable(),
  investigatorNote: z.string().max(2000).nullable(),
  medications: z.array(z.object({ ...tag, id: sid, name: txt, startDay: z.number().int(), endDay: z.number().int().nullable(),
    adherencePercent: z.number().min(0).max(100).nullable(), safetyNote: txt,
  }).strict()).min(1).max(5),
  visits: z.array(visitSchema).length(3),
}).strict();
export const syntheticProgrammeSchema = z.object({ ...tag,
  schemaVersion: z.literal("synthetic-programme-1"), datasetId: sid,
  generator: z.object({ name: z.literal("isi-programme-generator"), version: z.literal("1.0.0"), seed: z.number().int().min(0).max(4294967295),
    createdAt: z.string().datetime(), intendedUse: z.literal("workflow_testing_only"),
    rules: z.literal("20 conditions; 6 fixtures each; days 0/30/90; planted missing/conflicting/stale results; not epidemiologically calibrated"),
  }).strict(),
  conditions: z.array(z.object({ ...tag, id: sid, label: txt, domain: txt, tissue: txt, cells: z.array(txt).min(1).max(6),
    marker: txt, unit: txt, contextStatus: z.literal("scenario_tags_not_reviewed_claims"),
  }).strict()).length(20),
  patients: z.array(patientSchema).length(120),
  scenarioEdits: z.array(z.object({ ...tag, id: sid, patientId: sid, visitId: sid, editedAt: z.string().datetime(),
    reason: txt, before: z.object({ value: z.number().nullable(), quality: labQuality, sleepHours: z.number() }).strict(),
    after: z.object({ value: z.number().nullable(), quality: labQuality, sleepHours: z.number() }).strict(),
  }).strict()).max(100),
}).strict().superRefine((d, ctx) => {
  const allIds = [d.datasetId, ...d.conditions.map((c) => c.id)];
  const conditions = new Set(d.conditions.map((c) => c.id));
  for (const p of d.patients) {
    allIds.push(p.id, ...p.medications.map((m) => m.id));
    if (!conditions.has(p.conditionId) || p.comorbidityIds.some((id) => !conditions.has(id) || id === p.conditionId)) ctx.addIssue({ code: "custom", message: "Unknown or self comorbidity condition" });
    if (p.medications.some((m) => m.endDay !== null && m.endDay < m.startDay)) ctx.addIssue({ code: "custom", message: "Medication interval reversed" });
    for (let i = 0; i < p.visits.length; i++) {
      const v = p.visits[i]!; allIds.push(v.id, ...v.labs.map((l) => l.id));
      if (i > 0 && v.day <= p.visits[i - 1]!.day) ctx.addIssue({ code: "custom", message: "Visit days must increase" });
      if (v.labs.some((l) => l.specimenDay > v.day)) ctx.addIssue({ code: "custom", message: "Lab specimen cannot postdate its visit" });
    }
  }
  if (new Set(allIds).size !== allIds.length) ctx.addIssue({ code: "custom", message: "Duplicate programme record IDs" });
  if (d.conditions.some((c) => d.patients.filter((p) => p.conditionId === c.id).length !== 6)) ctx.addIssue({ code: "custom", message: "Each condition needs six fixture cases" });
  for (const e of d.scenarioEdits) {
    allIds.push(e.id);
    if (!d.patients.some((p) => p.id === e.patientId && p.visits.some((v) => v.id === e.visitId))) ctx.addIssue({ code: "custom", message: "Orphan scenario edit" });
  }
  if (new Set(allIds).size !== allIds.length) ctx.addIssue({ code: "custom", message: "Duplicate audit IDs" });
});
export type SyntheticProgramme = z.infer<typeof syntheticProgrammeSchema>;
export type ProgrammePatient = SyntheticProgramme["patients"][number];

/** Seeded deterministic generator, deliberately NOT a disease or treatment-response model. */
export function generateSyntheticProgramme(seed = 20261103): SyntheticProgramme {
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const round = (x: number) => Math.round(x * 100) / 100;
  const conditions = SYNTHETIC_CONDITION_CATALOGUE.map((c) => ({ data_class: "synthetic" as const, id: `SYN-COND-${c.key}`, label: c.label,
    domain: c.domain, tissue: c.tissue, cells: [...c.cells], marker: c.marker, unit: c.unit, contextStatus: "scenario_tags_not_reviewed_claims" as const }));
  const patients = SYNTHETIC_CONDITION_CATALOGUE.flatMap((c, ci) => Array.from({ length: 6 }, (_, pi) => {
    const id = `SYN-P-${c.key}-${String(pi + 1).padStart(3, "0")}`;
    const scale = c.unit === "g/L" ? 1 : c.unit === "mIU/L" ? 3 : c.unit === "10^9/L" ? 0.4 : c.unit === "µg/g" ? 180 : 35;
    const ageYears = (["ALZ", "PARK"].includes(c.key) ? [48, 58, 67, 75, 82, 53] : [17, 29, 43, 61, 72, 36])[pi]!;
    const visits = [0, 30, 90].map((day, vi) => {
      const quality = (["valid", "missing", "conflicting", "stale", "valid", "valid"] as const)[pi]!;
      const value = round(scale * (0.5 + random() * 2));
      const specimen = c.unit === "µg/g" ? "Synthetic stool" : c.key === "ENCEPH" ? "Synthetic CSF" : "Synthetic blood";
      return { data_class: "synthetic" as const, id: `${id}-V${vi + 1}`, day, symptomIndex: Math.round(15 + random() * 70),
        labs: [
          { data_class: "synthetic" as const, id: `${id}-V${vi + 1}-L1`, label: c.marker, unit: c.unit, value: quality === "missing" ? null : value,
            alternateValue: quality === "conflicting" ? round(value * 1.8 + 0.1) : null, quality, specimen,
            specimenDay: quality === "stale" ? day - 180 : day, source: "synthetic_generator" as const },
          ...[["Haemoglobin", "g/L", 110 + random() * 45], ["White-cell count", "10^9/L", 3 + random() * 10], ["Creatinine", "µmol/L", 45 + random() * 65]].map(([label, unit, n], li) => ({
            data_class: "synthetic" as const, id: `${id}-V${vi + 1}-L${li + 2}`, label: String(label), unit: String(unit), value: round(Number(n)),
            alternateValue: null, quality: "valid" as const, specimen: "Synthetic blood", specimenDay: day, source: "synthetic_generator" as const,
          })),
        ],
        immuneMeasurements: c.cells.map((cell, j) => ({ data_class: "synthetic" as const, cell, percentOfParentGate: pi === 1 && j === 0 ? null : round(random() * 60), assay: "Fictional flow panel; each subset has its own parent gate; not a clinical reference" })),
        lifestyle: { data_class: "synthetic" as const, sleepHours: round(4.5 + random() * 4), activityMinutesWeekly: Math.round(random() * 300),
          smoking: (["never", "former", "current", "unknown"] as const)[pi % 4]!, diet: ["Mixed fictional diet", "Plant-forward fictional diet", "Unrecorded diet"][pi % 3]!,
          stressIndex: Math.round(random() * 10), recentAntibiotics: pi === 1 ? null : pi % 3 === 0, alcoholUnitsWeekly: pi === 1 ? null : Math.round(random() * 12) },
      };
    });
    return { data_class: "synthetic" as const, id, conditionId: `SYN-COND-${c.key}`, ageYears,
      comorbidityIds: pi % 2 === 0 ? [conditions[(ci + 5) % conditions.length]!.id] : [],
      familyHistory: pi === 1 ? "Not recorded in fixture" : "Fictional family-history context; not genetic evidence",
      exposureNote: pi % 2 ? "Fictional shift-work exposure" : "Fictional recent travel; no inferred infection",
      infectionScreenNegative: pi === 1 ? null : pi !== 4,
      investigatorNote: pi === 2 ? null : "Synthetic narrative: prior exposure and protocol suitability need investigator review.",
      medications: [{ data_class: "synthetic" as const, id: `${id}-MED1`, name: c.medications[pi % c.medications.length]!, startDay: -30, endDay: null,
        adherencePercent: pi === 1 ? null : Math.round(60 + random() * 40), safetyNote: "Illustrative exposure only; not a recommended regimen. Adverse-event attribution and contraindications are not assessed." }], visits,
    };
  }));
  return syntheticProgrammeSchema.parse({ data_class: "synthetic", schemaVersion: "synthetic-programme-1", datasetId: "SYN-PROGRAMME-20",
    generator: { name: "isi-programme-generator", version: "1.0.0", seed, createdAt: "2026-11-03T00:00:00Z", intendedUse: "workflow_testing_only",
      rules: "20 conditions; 6 fixtures each; days 0/30/90; planted missing/conflicting/stale results; not epidemiologically calibrated" }, conditions, patients, scenarioEdits: [] });
}

export function applyProgrammeScenario(data: SyntheticProgramme, patientId: string, input: {
  value: number | null; quality: "valid" | "missing" | "conflicting" | "stale"; sleepHours: number; reason: string;
}, editedAt: string): SyntheticProgramme {
  const patient = data.patients.find((p) => p.id === patientId);
  if (!patient) throw new Error("Unknown synthetic case.");
  const last = patient.visits[patient.visits.length - 1]!;
  const marker = last.labs[0]!;
  const value = input.quality === "missing" ? null : input.value;
  const changed = { ...last, lifestyle: { ...last.lifestyle, sleepHours: input.sleepHours }, labs: [
    { ...marker, value, quality: input.quality, alternateValue: input.quality === "conflicting" && value !== null ? Math.round((value * 1.8 + 0.1) * 100) / 100 : null,
      specimenDay: input.quality === "stale" ? last.day - 180 : last.day, source: "synthetic_scenario_edit" as const }, ...last.labs.slice(1),
  ] };
  return syntheticProgrammeSchema.parse({ ...data,
    patients: data.patients.map((p) => p.id === patientId ? { ...p, visits: [...p.visits.slice(0, -1), changed] } : p),
    scenarioEdits: [...data.scenarioEdits, { data_class: "synthetic", id: `SYN-EDIT-${String(data.scenarioEdits.length + 1).padStart(4, "0")}`,
      patientId, visitId: last.id, editedAt, reason: input.reason,
      before: { value: marker.value, quality: marker.quality, sleepHours: last.lifestyle.sleepHours },
      after: { value, quality: input.quality, sleepHours: input.sleepHours },
    }],
  });
}

export function parseSyntheticProgramme(json: string): SyntheticProgramme {
  if (new TextEncoder().encode(json).byteLength > 5_000_000) throw new Error("Programme exceeds 5 MB.");
  return syntheticProgrammeSchema.parse(JSON.parse(json));
}
function conditionFor(data: SyntheticProgramme, patient: ProgrammePatient) {
  const condition = data.conditions.find((c) => c.id === patient.conditionId);
  if (!condition || !data.patients.some((p) => p.id === patient.id && p.conditionId === patient.conditionId)) throw new Error("Unknown synthetic patient/condition.");
  return condition;
}

/** Two fictional protocols per disease. Numeric rules are arbitrary workflow fixtures, not clinical criteria. */
export function programmeTrials(data: SyntheticProgramme, patient: ProgrammePatient, now: string) {
  const condition = conditionFor(data, patient);
  const visit = patient.visits[patient.visits.length - 1]!;
  const main = visit.labs[0]!;
  const attrs = {
    condition_id: patient.conditionId, age_years: patient.ageYears, symptom_index: visit.symptomIndex,
    marker_value: main.quality === "missing" || main.quality === "stale" ? undefined : main.quality === "conflicting" ? "conflicting_results" : main.value ?? undefined,
    infection_screen_negative: patient.infectionScreenNegative ?? undefined,
    investigator_note: patient.investigatorNote ?? undefined,
  };
  return ["A", "B"].map((arm) => {
    const trialId = `${condition.id.replace("SYN-COND-", "SYN-TRIAL-")}-${arm}`;
    const criteria: TrialCriterion[] = [
      { id: `${trialId}-C1`, text: "Fictional protocol: matching scenario condition", attributeKey: "condition_id", operator: "eq", expected: condition.id },
      { id: `${trialId}-C2`, text: "Fictional protocol: age at least 18", attributeKey: "age_years", operator: "gte", expected: 18 },
      { id: `${trialId}-C3`, text: `Fictional protocol: age at most ${arm === "A" ? 65 : 80}`, attributeKey: "age_years", operator: "lte", expected: arm === "A" ? 65 : 80 },
      { id: `${trialId}-C4`, text: `Fictional protocol: synthetic symptom index at least ${arm === "A" ? 30 : 50}`, attributeKey: "symptom_index", operator: "gte", expected: arm === "A" ? 30 : 50 },
      { id: `${trialId}-C5`, text: "Fictional protocol: nonnegative marker with usable specimen; stale/missing values withheld", attributeKey: "marker_value", operator: "gte", expected: 0 },
      { id: `${trialId}-C6`, text: "Fictional protocol: negative infection screen recorded", attributeKey: "infection_screen_negative", operator: "eq", expected: true },
      { id: `${trialId}-C7`, text: "Investigator judgement of prior medications, safety, consent and protocol suitability", attributeKey: "investigator_note", operator: "present", unstructured: true },
    ];
    return { data_class: "synthetic" as const, title: `Fictional ${condition.label} protocol ${arm}`, registryStatus: "not_a_registered_trial" as const,
      recruitmentStatus: "not_applicable_synthetic" as const, protocolVersion: "1.0.0", source: "synthetic_generator" as const,
      report: assessTrialCriteria({ trialId, criteria, patient: { fixtureId: patient.id, syntheticOnly: true, containsPhi: false, attrs }, now: new Date(now) }) };
  });
}

/** Deterministic planning demonstration: NO model inference, scientific discovery or causal estimation. */
export function programmeDiscovery(data: SyntheticProgramme, patient: ProgrammePatient, now: string) {
  const condition = conditionFor(data, patient);
  if (!Number.isFinite(Date.parse(now))) throw new Error("Invalid analysis timestamp.");
  const unusable = patient.visits.flatMap((v) => v.labs.filter((l) => l.quality !== "valid").map((l) => ({ recordId: l.id, quality: l.quality })));
  const missingImmune = patient.visits.flatMap((v) => v.immuneMeasurements.filter((m) => m.percentOfParentGate === null));
  return { data_class: "synthetic" as const, status: "unvalidated_research_plan" as const,
    audit: { runAt: now, engine: "deterministic_scenario_planner", engineVersion: "1.0.0", model: null, provider: null, aiInferencePerformed: false,
      literatureRetrievalPerformed: false, kgWrite: false, datasetId: data.datasetId, generatorVersion: data.generator.version, seed: data.generator.seed, patientId: patient.id },
    question: `In ${condition.label}, could specimen timing, immune measurements and exposure context explain an apparent longitudinal pattern?`,
    observations: { visitCount: patient.visits.length, unusableLabs: unusable, missingImmuneMeasurements: missingImmune.length,
      medicationExposures: patient.medications.map((m) => m.id), note: "Randomly generated records; not evidence of disease biology, lifestyle effects or treatment response." },
    retrievalPlan: [`Find source-linked human studies for ${condition.label} and ${condition.cells[0]}; capture tissue, assay and timing.`,
      "Seek opposing results and confounders; distinguish unsearched from absent evidence."],
    hypothesis: unusable.length ? "The apparent pattern could be a specimen-quality or missingness artefact in this synthetic scenario." : "The apparent pattern could reflect timing or batch effects rather than a biological mechanism in this synthetic scenario.",
    prediction: "The apparent difference weakens after prespecified harmonisation of sampling and assay processing.",
    experiment: "Compare matched research specimens across processing batches with blinded scoring; preregister the comparison and missingness handling.",
    controls: ["Matched collection windows", "Assay/batch controls", "Document medication exposure", "Retain opposing observations"],
    confounders: ["Medication timing and adherence", "Comorbidities", "Sleep, activity and smoking", "Sampling and assay changes", "Selection bias and missing data"],
    falsification: "The prespecified difference persists after matched timing and processing, weakening this explanation.",
    limitations: ["No model inference or live literature retrieval was run.", "Immune-cell labels are scenario tags, not established disease mechanisms.", "Synthetic cohort associations cannot establish causation or clinical benefit."],
  };
}

export function exportProgrammeCase(data: SyntheticProgramme, patient: ProgrammePatient, now: string) {
  conditionFor(data, patient);
  return { schemaVersion: "synthetic-programme-case-1", data_class: "synthetic", watermark: "SYNTHETIC RESEARCH DEMONSTRATION — NOT CLINICAL ADVICE",
    exportedAt: now, generator: data.generator, scenarioEdits: data.scenarioEdits.filter((e) => e.patientId === patient.id), patient, condition: conditionFor(data, patient),
    discovery: programmeDiscovery(data, patient, now), trials: programmeTrials(data, patient, now),
    clinicalAdvice: false, productionEligible: false, confirmedEligible: false, kgWrite: false };
}

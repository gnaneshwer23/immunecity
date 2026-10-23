/**
 * Educational compartment sketches. Hand-set teaching assumptions.
 * Not fitted, not cited, and not a patient prediction.
 */

export const NOT_A_PATIENT_PREDICTION = "This is not a patient prediction.";

export interface TeachingParam {
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  origin: "Teaching assumption";
}

export interface TeachingModel {
  id: "antigen-presentation" | "t-cell-activation" | "cytokine-signalling" | "vaccination" | "tumour-immunity";
  title: string;
  disclaimer: typeof NOT_A_PATIENT_PREDICTION;
  assumptions: string[];
  limits: string[];
  parameters: TeachingParam[];
  /** Parameter scaled by the sensitivity control. */
  sensitivityParamId: string;
}

export interface TeachingTrace {
  modelId: TeachingModel["id"];
  points: { step: number; value: number }[];
  readout: string;
  unit: string;
  disclaimer: typeof NOT_A_PATIENT_PREDICTION;
}

const ORIGIN = "Teaching assumption" as const;

function param(
  id: string,
  label: string,
  unit: string,
  min: number,
  max: number,
  step: number,
  value: number,
): TeachingParam {
  return { id, label, unit, min, max, step, value, origin: ORIGIN };
}

export const TEACHING_MODELS: TeachingModel[] = [
  {
    id: "antigen-presentation",
    title: "Antigen presentation",
    disclaimer: NOT_A_PATIENT_PREDICTION,
    assumptions: [
      "A linear teaching map from antigen availability to a presented fraction.",
      "Values are hand-set for the classroom. They are not taken from a paper.",
    ],
    limits: [
      "No cell counts, haplotypes, or patient readout.",
      "Does not choose a vaccine, adjuvant, or dose.",
    ],
    sensitivityParamId: "processing",
    parameters: [
      param("antigen", "Antigen availability", "normalised fraction", 0, 1, 0.05, 0.4),
      param("mhc", "MHC availability", "normalised fraction", 0, 1, 0.05, 0.6),
      param("processing", "Processing rate", "per teaching step", 0, 1, 0.05, 0.5),
    ],
  },
  {
    id: "t-cell-activation",
    title: "T-cell activation",
    disclaimer: NOT_A_PATIENT_PREDICTION,
    assumptions: [
      "Teaching sketch of two signals: TCR input and a costimulation fraction.",
      "If costimulation is zero, the sketch stays at zero. That is a classroom rule, not a measured threshold.",
    ],
    limits: [
      "No patient activation score and no treatment advice.",
      "Does not represent a drug dose or a receptor occupancy from a trial.",
    ],
    sensitivityParamId: "costimulation",
    parameters: [
      param("tcr", "TCR signal", "normalised fraction", 0, 1, 0.05, 0.7),
      param("costimulation", "Costimulation", "normalised fraction", 0, 1, 0.05, 0.5),
      param("threshold", "Activation offset", "normalised fraction", 0, 1, 0.05, 0.15),
    ],
  },
  {
    id: "cytokine-signalling",
    title: "Cytokine signalling",
    disclaimer: NOT_A_PATIENT_PREDICTION,
    assumptions: [
      "A saturating teaching curve: response rises with ligand and then levels off.",
      "Gain is a hand-set multiplier, not a measured EC50.",
    ],
    limits: [
      "Units are normalised. They are not concentrations in pg/mL or mg.",
      "No dosing advice and no patient cytokine panel.",
    ],
    sensitivityParamId: "gain",
    parameters: [
      param("ligand", "Ligand", "normalised fraction", 0, 1, 0.05, 0.4),
      param("receptor", "Receptor availability", "normalised fraction", 0, 1, 0.05, 0.7),
      param("gain", "Response gain", "teaching multiplier", 0, 2, 0.1, 1),
    ],
  },
  {
    id: "vaccination",
    title: "Vaccination",
    disclaimer: NOT_A_PATIENT_PREDICTION,
    assumptions: [
      "Prime and boost are normalised teaching exposures, not milligram doses or schedules.",
      "Memory is a retained fraction of those exposures. Retention is hand-set.",
    ],
    limits: [
      "Not a product, interval, or dose recommendation.",
      "Does not predict protection for any person.",
    ],
    sensitivityParamId: "retention",
    parameters: [
      param("prime", "Prime exposure", "normalised teaching units", 0, 1, 0.05, 0.4),
      param("boost", "Boost exposure", "normalised teaching units", 0, 1, 0.05, 0.3),
      param("retention", "Memory retention", "fraction retained", 0, 1, 0.05, 0.6),
    ],
  },
  {
    id: "tumour-immunity",
    title: "Tumour immunity",
    disclaimer: NOT_A_PATIENT_PREDICTION,
    assumptions: [
      "A balance sketch: effector activity over tumour burden and suppression.",
      "Every coefficient is a teaching assumption, not a fitted hazard.",
    ],
    limits: [
      "Not a prognosis, staging tool, or treatment recommendation.",
      "No survival, response rate, or patient-level output.",
    ],
    sensitivityParamId: "suppression",
    parameters: [
      param("tumour", "Tumour burden", "normalised fraction", 0, 1, 0.05, 0.5),
      param("effector", "Effector activity", "normalised fraction", 0, 1, 0.05, 0.6),
      param("suppression", "Suppression", "normalised fraction", 0, 1, 0.05, 0.4),
    ],
  },
];

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function valueOf(model: TeachingModel, values: Record<string, number>, id: string): number {
  const spec = model.parameters.find((item) => item.id === id);
  const raw = values[id];
  const n = typeof raw === "number" && Number.isFinite(raw) ? raw : spec?.value ?? 0;
  if (!spec) return n;
  return Math.min(spec.max, Math.max(spec.min, n));
}

/** Sensitivity is a unitless teaching scale on one named parameter. 1 leaves the value unchanged. */
export function runTeachingModel(
  model: TeachingModel,
  values: Record<string, number>,
  sensitivity = 1,
): TeachingTrace {
  const scale = Math.min(2, Math.max(0.25, Number.isFinite(sensitivity) ? sensitivity : 1));
  const scaled = (id: string) => {
    const base = valueOf(model, values, id);
    return id === model.sensitivityParamId ? base * scale : base;
  };
  let series: number[] = [];
  let readout = "Normalised teaching trace";
  if (model.id === "antigen-presentation") {
    const presented = clamp01(scaled("antigen") * valueOf(model, values, "mhc") * scaled("processing"));
    series = [0, presented * 0.5, presented];
    readout = "Presented fraction";
  } else if (model.id === "t-cell-activation") {
    const costim = scaled("costimulation");
    const activated = costim <= 0 ? 0 : clamp01(valueOf(model, values, "tcr") * costim - valueOf(model, values, "threshold"));
    series = [0, activated * 0.5, activated];
    readout = "Activation fraction";
  } else if (model.id === "cytokine-signalling") {
    const ligand = valueOf(model, values, "ligand");
    const response = clamp01((scaled("gain") * ligand * valueOf(model, values, "receptor")) / (1 + ligand));
    series = [0, response * 0.5, response];
    readout = "Response fraction";
  } else if (model.id === "vaccination") {
    const memory = clamp01(scaled("retention") * (valueOf(model, values, "prime") + valueOf(model, values, "boost")));
    series = [0, memory * 0.5, memory];
    readout = "Memory fraction";
  } else {
    const control = clamp01(valueOf(model, values, "effector") / (1 + valueOf(model, values, "tumour") * scaled("suppression")));
    series = [0, control * 0.5, control];
    readout = "Control index";
  }
  return {
    modelId: model.id,
    points: series.map((value, step) => ({ step, value })),
    readout,
    unit: "normalised teaching units",
    disclaimer: NOT_A_PATIENT_PREDICTION,
  };
}

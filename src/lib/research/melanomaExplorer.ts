import { buildMelanomaInvestigationPath } from "@/lib/immune/melanomaInvestigationPath";
import { MELANOMA_PILOT_TRIALS } from "@/data/trialIntelligence";
import { GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION } from "@/lib/immune/graphRelease";

export interface MelanomaHypothesisInput {
  question: string;
  hypothesis: string;
  prediction: string;
  experiment: string;
  falsification: string;
  contextTrialIds: string[];
}

/** Trial locators provide context, never automatic support for an authored hypothesis. */
export function buildMelanomaExplorerBrief(input: MelanomaHypothesisInput, exportedAt: string) {
  for (const key of ["question", "hypothesis", "prediction", "experiment", "falsification"] as const) {
    if (!input[key].trim() || input[key].length > 4000) throw new Error(`${key} must contain 1–4000 characters.`);
  }
  if (!Number.isFinite(Date.parse(exportedAt))) throw new Error("A valid export timestamp is required.");
  const ids = [...new Set(input.contextTrialIds)];
  if (!ids.length || ids.some((id) => !MELANOMA_PILOT_TRIALS.some((t) => t.graphNodeId === id))) {
    throw new Error("Select at least one existing melanoma pilot trial for context.");
  }
  const path = buildMelanomaInvestigationPath({ question: input.question.trim() });
  if ("ok" in path) throw new Error(path.reason);
  return {
    schemaVersion: "melanoma-explorer-1" as const,
    exportedAt,
    graphVersion: { core: GRAPH_CORE_VERSION, extensions: GRAPH_EXTENSIONS_VERSION },
    reviewStatus: "unreviewed" as const,
    hypothesisStatus: "researcher_authored_unvalidated" as const,
    claimSupport: "not_assessed" as const,
    clinicalAdvice: false as const,
    kgWrite: false as const,
    question: input.question.trim(),
    hypothesis: input.hypothesis.trim(),
    prediction: input.prediction.trim(),
    experiment: input.experiment.trim(),
    falsification: input.falsification.trim(),
    contextSources: MELANOMA_PILOT_TRIALS.filter((t) => ids.includes(t.graphNodeId)).map((t) => ({
      graphNodeId: t.graphNodeId, acronym: t.acronym, nctId: t.nctId,
      pmid: t.primaryPmid, url: `https://pubmed.ncbi.nlm.nih.gov/${t.primaryPmid}/`,
      role: "trial_context_only" as const,
    })),
    path,
    limitations: [
      "Selected trial publications are context locators, not verified support for this hypothesis.",
      "No live literature search or independent passage appraisal was performed by this worksheet.",
      "Human scientific review is required; no treatment recommendations or cross-trial superiority claims.",
      ...path.unknowns,
    ],
  };
}

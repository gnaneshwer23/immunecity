/* Advanced AI integration registry.
   Entries describe FUTURE modular interfaces. Nothing listed here is wired
   into production inference unless status === "implemented" AND tests pass.
   Do not market these as live capabilities. Never invent scientific scores. */

export type ModelStatus = "planned" | "interface-only" | "implemented";

export type ModelCategory = "omics" | "structure" | "epitope" | "genomics" | "agent";

/** Per-family request contracts — illustrative shapes only until a runtime ships. */
export type OmicsRequest = {
  family: "omics";
  expressionMatrixRef: string;
  spatialCoordinates?: Array<{ x: number; y: number; barcode: string }>;
  targetConceptIds?: string[];
};

export type StructureRequest = {
  family: "structure";
  sequenceOrStructureId: string;
  partnerId?: string;
  mode?: "fold" | "dock" | "antibody_antigen";
};

export type EpitopeRequest = {
  family: "epitope";
  peptides: string[];
  alleles: string[];
  assayHint?: "binding" | "presentation" | "immunogenicity";
};

export type GenomicsRequest = {
  family: "genomics";
  variantsRef: string;
  geneOrHlaContext?: string[];
};

export type AgentRequest = {
  family: "agent";
  question: string;
  allowedTools: string[];
  graphVersion: string;
};

export type ModelRequest =
  | OmicsRequest
  | StructureRequest
  | EpitopeRequest
  | GenomicsRequest
  | AgentRequest;

/** Typed refusal — never a fabricated prediction payload. */
export type ModelUnavailableResult = {
  ok: false;
  kind: "not_available";
  modelId: string;
  status: ModelStatus;
  reason: string;
  scientificClaimAllowed: false;
};

export type ModelInvokeResult = ModelUnavailableResult;

export interface ModelFieldSpec {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface ModelInterfaceSpec {
  id: string;
  name: string;
  category: ModelCategory;
  status: ModelStatus;
  /** Runtime / contract version. Null until a real adapter ships. */
  version: string | null;
  /** Human-readable input summary (UI). */
  inputs: string[];
  /** Human-readable output summary (UI). */
  outputs: string[];
  /** Structured request-field contract for dry-run / future adapters. */
  requestFields: ModelFieldSpec[];
  /** Structured output-field contract (documented, not produced). */
  outputFields: ModelFieldSpec[];
  /** Example request JSON for UI preview — never executed as science. */
  exampleRequest: ModelRequest;
  intendedUse: string;
  limitations: string[];
}

const NOT_IMPLEMENTED = "Not implemented";

export const MODEL_REGISTRY: ModelInterfaceSpec[] = [
  {
    id: "sc-spatial-omics",
    name: "Single-cell & spatial omics analysis",
    category: "omics",
    status: "interface-only",
    version: null,
    inputs: ["Expression matrix / AnnData-like payload", "Optional spatial coordinates"],
    outputs: ["Cell-type scores", "Pathway enrichment linked to KG concept IDs"],
    requestFields: [
      { name: "expressionMatrixRef", type: "string", required: true, description: "Client-side handle or URI to a matrix payload (not uploaded by default)." },
      { name: "spatialCoordinates", type: "SpatialPoint[]", required: false, description: "Optional barcode → (x,y) table." },
      { name: "targetConceptIds", type: "string[]", required: false, description: "Optional Immune City concept IDs to bias enrichment mapping." },
    ],
    outputFields: [
      { name: "cellTypeScores", type: "ScoreRow[]", required: true, description: "Would list candidate cell-type scores — not produced in this build." },
      { name: "pathwayHits", type: "ConceptLink[]", required: true, description: "Would map enrichments to KG concept IDs — not produced in this build." },
    ],
    exampleRequest: {
      family: "omics",
      expressionMatrixRef: "local://example-anndata",
      targetConceptIds: ["C003", "M001"],
    },
    intendedUse: "Map experimental profiles onto Immune City concepts for hypothesis generation.",
    limitations: [
      NOT_IMPLEMENTED,
      "No batch correction or QC pipeline shipped",
      "UI documents the contract only",
      "Never treat interface previews as omics results",
    ],
  },
  {
    id: "protein-abag",
    name: "Protein structure & antibody–antigen models",
    category: "structure",
    status: "interface-only",
    version: null,
    inputs: ["Sequence or structure identifiers"],
    outputs: ["Predicted interfaces", "Optional epitope suggestions"],
    requestFields: [
      { name: "sequenceOrStructureId", type: "string", required: true, description: "Sequence, PDB/AF id, or local structure handle." },
      { name: "partnerId", type: "string", required: false, description: "Optional binder / antigen partner identifier." },
      { name: "mode", type: "'fold'|'dock'|'antibody_antigen'", required: false, description: "Intended analysis mode when a runtime exists." },
    ],
    outputFields: [
      { name: "interfaces", type: "InterfaceHit[]", required: true, description: "Would list predicted contact patches — not produced in this build." },
      { name: "epitopeSuggestions", type: "string[]", required: false, description: "Optional structural epitope hints — never validated epitopes." },
    ],
    exampleRequest: {
      family: "structure",
      sequenceOrStructureId: "example:UNIPROT-DEMO",
      mode: "antibody_antigen",
    },
    intendedUse: "Structural context for receptor–ligand and therapeutic antibody questions.",
    limitations: [
      NOT_IMPLEMENTED,
      "No structure prediction runtime in this app",
      "UI documents the contract only",
      "Never treat interface previews as fold/dock results",
    ],
  },
  {
    id: "peptide-mhc",
    name: "Peptide–MHC / epitope predictors",
    category: "epitope",
    status: "interface-only",
    version: null,
    inputs: ["Peptide sequences", "HLA / MHC alleles"],
    outputs: ["Binding ranks", "Candidate epitope list"],
    requestFields: [
      { name: "peptides", type: "string[]", required: true, description: "Peptide sequences (no auto-generation of sequences)." },
      { name: "alleles", type: "string[]", required: true, description: "HLA/MHC allele labels supplied by the caller." },
      { name: "assayHint", type: "'binding'|'presentation'|'immunogenicity'", required: false, description: "Which prediction family is intended." },
    ],
    outputFields: [
      { name: "bindingRanks", type: "RankRow[]", required: true, description: "Would list ranks — not produced in this build." },
      { name: "candidates", type: "EpitopeCandidate[]", required: true, description: "Candidate list only; never validated epitopes without lab confirmation." },
    ],
    exampleRequest: {
      family: "epitope",
      peptides: ["GILGFVFTL"],
      alleles: ["HLA-A*02:01"],
      assayHint: "binding",
    },
    intendedUse: "Support vaccination and T-cell recognition exploration.",
    limitations: [
      NOT_IMPLEMENTED,
      "Predictor outputs must never be labelled as validated epitopes without lab confirmation",
      "UI documents the contract only",
      "Never treat interface previews as binding ranks",
    ],
  },
  {
    id: "genomic-variants",
    name: "Genomic variant analysis",
    category: "genomics",
    status: "interface-only",
    version: null,
    inputs: ["Variant calls (VCF-like)", "Gene / HLA context"],
    outputs: ["Mapped immunogenetic concepts", "Uncertainty flags"],
    requestFields: [
      { name: "variantsRef", type: "string", required: true, description: "Handle to a VCF-like variant table (not clinical-grade)." },
      { name: "geneOrHlaContext", type: "string[]", required: false, description: "Optional gene / HLA loci of interest." },
    ],
    outputFields: [
      { name: "mappedConcepts", type: "ConceptLink[]", required: true, description: "Would map variants to graph concepts — not produced in this build." },
      { name: "uncertaintyFlags", type: "string[]", required: true, description: "Would list interpretation caveats." },
    ],
    exampleRequest: {
      family: "genomics",
      variantsRef: "local://example.vcf",
      geneOrHlaContext: ["NOD2", "HLA-DRB1"],
    },
    intendedUse: "Link coding variants to PID / HLA / pathway concepts in the graph.",
    limitations: [
      NOT_IMPLEMENTED,
      "No clinical interpretation pathway",
      "UI documents the contract only",
      "Never treat interface previews as clinical variant calls",
    ],
  },
  {
    id: "scientific-agents",
    name: "Specialised scientific agents",
    category: "agent",
    status: "interface-only",
    version: null,
    inputs: ["Scoped research question", "Allowed tool list"],
    outputs: ["Candidate hypotheses", "Experiment proposals marked as candidates"],
    requestFields: [
      { name: "question", type: "string", required: true, description: "Scoped research question under human review." },
      { name: "allowedTools", type: "string[]", required: true, description: "Explicit allow-list; empty means no tools." },
      { name: "graphVersion", type: "string", required: true, description: "Graph core version the agent may cite." },
    ],
    outputFields: [
      { name: "hypotheses", type: "HypothesisDraft[]", required: true, description: "Candidate drafts only — never established findings." },
      { name: "experimentProposals", type: "ExperimentProposal[]", required: false, description: "Draft proposals labelled non-executable." },
    ],
    exampleRequest: {
      family: "agent",
      question: "How might butyrate expand colonic Tregs in IBD?",
      allowedTools: ["graph_lookup", "literature_queue"],
      graphVersion: "0.3",
    },
    intendedUse: "Orchestrate retrieval → mechanism → hypothesis drafts under human review.",
    limitations: [
      NOT_IMPLEMENTED,
      "Candidates are never established findings",
      "UI documents the contract only",
      "Never treat interface previews as agent conclusions",
    ],
  },
];

export const CATEGORY_LABEL: Record<ModelCategory, string> = {
  omics: "Omics",
  structure: "Structure",
  epitope: "pMHC / epitope",
  genomics: "Genomics",
  agent: "Agents",
};

export const STATUS_LABEL: Record<ModelStatus, string> = {
  planned: "Planned",
  "interface-only": "Not implemented",
  implemented: "Implemented",
};

export function getModel(id: string): ModelInterfaceSpec | undefined {
  return MODEL_REGISTRY.find((m) => m.id === id);
}

export function modelsByCategory(category: ModelCategory): ModelInterfaceSpec[] {
  return MODEL_REGISTRY.filter((m) => m.category === category);
}

export const implementedModels = () => MODEL_REGISTRY.filter((m) => m.status === "implemented");

export function isRunnable(model: ModelInterfaceSpec): boolean {
  return model.status === "implemented" && model.version != null;
}

/** Pretty-printed request shape for UI — documentation only. */
export function requestShapePreview(model: ModelInterfaceSpec): string {
  return JSON.stringify(model.exampleRequest, null, 2);
}

/**
 * Dry-run / stub invoke. Always refuses non-implemented adapters with a typed
 * not_available result. Never returns fabricated scientific scores or ranks.
 */
export function invokeModelStub(
  modelId: string,
  _request?: ModelRequest,
): ModelInvokeResult {
  const model = getModel(modelId);
  if (!model) {
    return {
      ok: false,
      kind: "not_available",
      modelId,
      status: "planned",
      reason: `Unknown model id "${modelId}". No adapter is registered.`,
      scientificClaimAllowed: false,
    };
  }
  if (!isRunnable(model)) {
    return {
      ok: false,
      kind: "not_available",
      modelId: model.id,
      status: model.status,
      reason:
        `${model.name} is ${STATUS_LABEL[model.status].toLowerCase()} ` +
        `(contract only; version=${model.version ?? "null"}). ` +
        "No scientific prediction is returned.",
      scientificClaimAllowed: false,
    };
  }
  // A future implemented adapter would run here. Until then this branch is
  // unreachable while implementedModels() stays empty — keep the refusal.
  return {
    ok: false,
    kind: "not_available",
    modelId: model.id,
    status: model.status,
    reason: "Adapter marked implemented but no runtime handler is wired yet.",
    scientificClaimAllowed: false,
  };
}

/** Convenience: invoke every registered model with its example request (all refuse today). */
export function dryRunAllStubs(): ModelInvokeResult[] {
  return MODEL_REGISTRY.map((m) => invokeModelStub(m.id, m.exampleRequest));
}

export function registryHonestySummary() {
  return {
    total: MODEL_REGISTRY.length,
    implemented: implementedModels().length,
    interfaceOnly: MODEL_REGISTRY.filter((m) => m.status === "interface-only").length,
    planned: MODEL_REGISTRY.filter((m) => m.status === "planned").length,
    categories: (["omics", "structure", "epitope", "genomics", "agent"] as ModelCategory[]).map((c) => ({
      category: c,
      count: modelsByCategory(c).length,
    })),
  };
}

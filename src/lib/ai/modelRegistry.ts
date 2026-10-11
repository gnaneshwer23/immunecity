/* Advanced AI integration registry.
   Entries describe FUTURE modular interfaces. Nothing listed here is wired
   into production inference unless status === "implemented" AND tests pass.
   Do not market these as live capabilities. */

export type ModelStatus = "planned" | "interface-only" | "implemented";

export interface ModelInterfaceSpec {
  id: string;
  name: string;
  category: "omics" | "structure" | "epitope" | "genomics" | "agent";
  status: ModelStatus;
  version: string | null;
  inputs: string[];
  outputs: string[];
  intendedUse: string;
  limitations: string[];
}

export const MODEL_REGISTRY: ModelInterfaceSpec[] = [
  {
    id: "sc-spatial-omics",
    name: "Single-cell & spatial omics analysis",
    category: "omics",
    status: "interface-only",
    version: null,
    inputs: ["Expression matrix / AnnData-like payload", "Optional spatial coordinates"],
    outputs: ["Cell-type scores", "Pathway enrichment linked to KG concept IDs"],
    intendedUse: "Map experimental profiles onto Immune City concepts for hypothesis generation.",
    limitations: ["Not implemented", "No batch correction or QC pipeline shipped", "UI documents the contract only"],
  },
  {
    id: "protein-abag",
    name: "Protein structure & antibody–antigen models",
    category: "structure",
    status: "interface-only",
    version: null,
    inputs: ["Sequence or structure identifiers"],
    outputs: ["Predicted interfaces", "Optional epitope suggestions"],
    intendedUse: "Structural context for receptor–ligand and therapeutic antibody questions.",
    limitations: ["Not implemented", "No structure prediction runtime in this app", "UI documents the contract only"],
  },
  {
    id: "peptide-mhc",
    name: "Peptide–MHC / epitope predictors",
    category: "epitope",
    status: "interface-only",
    version: null,
    inputs: ["Peptide sequences", "HLA / MHC alleles"],
    outputs: ["Binding ranks", "Candidate epitope list"],
    intendedUse: "Support vaccination and T-cell recognition exploration.",
    limitations: ["Not implemented", "Predictor outputs must never be labelled as validated epitopes without lab confirmation", "UI documents the contract only"],
  },
  {
    id: "genomic-variants",
    name: "Genomic variant analysis",
    category: "genomics",
    status: "interface-only",
    version: null,
    inputs: ["Variant calls (VCF-like)", "Gene / HLA context"],
    outputs: ["Mapped immunogenetic concepts", "Uncertainty flags"],
    intendedUse: "Link coding variants to PID / HLA / pathway concepts in the graph.",
    limitations: ["Not implemented", "No clinical interpretation pathway", "UI documents the contract only"],
  },
  {
    id: "scientific-agents",
    name: "Specialised scientific agents",
    category: "agent",
    status: "interface-only",
    version: null,
    inputs: ["Scoped research question", "Allowed tool list"],
    outputs: ["Candidate hypotheses", "Experiment proposals marked as candidates"],
    intendedUse: "Orchestrate retrieval → mechanism → hypothesis drafts under human review.",
    limitations: ["Not implemented", "Candidates are never established findings", "UI documents the contract only"],
  },
];

export const implementedModels = () => MODEL_REGISTRY.filter((m) => m.status === "implemented");

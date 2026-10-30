/* PRD-aligned implementation phases B–E for the AI-native platform track.
   Status reflects what is shipped AND testable in this codebase — not aspirational claims. */

export type PhaseStatus = "done" | "partial" | "not_started";

export interface ImplementationPhase {
  id: "B" | "C" | "D" | "E";
  title: string;
  prdRefs: string[];
  goals: string[];
  acceptance: string[];
  status: PhaseStatus;
  notes: string;
}

export const IMPLEMENTATION_PHASES: ImplementationPhase[] = [
  {
    id: "B",
    title: "Knowledge-layer gap fills",
    prdRefs: ["FR-001", "FR-002", "FR-004", "Epic A"],
    goals: [
      "Add high-value draft concepts and edges for thin domains: microbiome, vaccines, transplant, PID, immunogenetics.",
      "Every addition has a stable ID, evidence_status, context (tissue/location where known), and draft classification.",
      "Prefer draft extensions over silent kg.json edits.",
    ],
    acceptance: [
      "New records live in extensions with draft:true at merge time.",
      "Immunogenetics lesson + route appear in curriculum merges.",
      "Graph release snapshot separates core vs draft counts; extensions version bumps.",
      "Domain coverage report + knowledge gap queue surface thin domains without inventing PMIDs.",
      "Smoke/tests confirm new IDs resolve and remain draft.",
    ],
    status: "partial",
    notes: "draft-ext-5 adds approved-indication therapy→disease links, landmark-trial disease context and HLA pharmacogenetics bridges (owner-reviewed drafts). draft-ext-4 added IVIG, pharmacogenetic HLA screen, herd-protection and post-infectious flare teaching drafts; domain coverage panel + gap queue on Evidence. Exemplar claim-review: TNF→RA on-path done; PD-1 partial; IFN→SLE still scaffold-ish — curator work, not silent graph completion.",
  },
  {
    id: "C",
    title: "Scientific literature intelligence",
    prdRefs: ["FR-036", "FR-037", "FR-013", "Epic F"],
    goals: [
      "Step machine: source identification → metadata validation → candidate claims → map to concepts/relIds → conflict flags → claim approval.",
      "Align proposed claim_support with evidence vocabulary; flag unknown IDs and intra-project disagreements.",
      "Export accepted items as curation-candidate manifests (unreviewed only); no fabricated PMIDs/DOIs.",
    ],
    acceptance: [
      "Browser-safe workflow module creates versioned candidate artefacts with conflict flags.",
      "Review queue UI maps to graph IDs, sets claim_support, accept/reject/edit with candidate labelling.",
      "Curation handoff export matches importManifest shape without auto-approving claims.",
      "Smoke checks cover step gates, identifier hygiene, conflict detection, and export meta.curation=unreviewed.",
    ],
    status: "partial",
    notes:
      "NOT LIVE bulk ingest. Local workflow + Research UI + curation-candidate export only. PubMed/Crossref identifier verification remains the existing server-side curation path after human import — this scaffold never invents PMIDs or pretends bulk retrieval is wired.",
  },
  {
    id: "D",
    title: "Advanced model registry interfaces",
    prdRefs: ["FR-041", "FR-043", "Epic G"],
    goals: [
      "Expose omics, structure, pMHC/epitope, genomics, and agent adapters as modular contracts on Research/Methods.",
      "Document typed request/output fields, version, limitations, and status per family.",
      "Provide dry-run stub invoke that returns typed not_available — never fake scientific outputs.",
      "Never claim implemented unless status===implemented, version set, and tests pass.",
    ],
    acceptance: [
      "MODEL_REGISTRY rendered with status badges, request-shape previews, inputs/outputs, limitations.",
      "invokeModelStub / dryRunAllStubs refuse all current adapters with scientificClaimAllowed=false.",
      "implementedModels() remains empty until a real adapter ships.",
      "Methods and Research both surface the registry with honest not-implemented / planned copy.",
    ],
    status: "partial",
    notes:
      "NOT LIVE predictors. Contracts + stub dry-run + request-shape validation + promotion gate + planned molecular stubs on Research/Methods. UI labels planned/interface-only; implementedModels() stays [].",
  },
  {
    id: "E",
    title: "Scientific Workbench steps",
    prdRefs: ["FR-038", "FR-039", "FR-040", "Epic F / Phase 4"],
    goals: [
      "Guided research flow: question → evidence → mechanism → hypothesis → experiment proposal → review.",
      "Step gating with furthest-step unlock; optional import of Ask IDs, literature claims, mechanism summaries as candidates.",
      "All AI/user drafts labelled candidate; versioned JSON export; never auto-promote to curated KG or experimentally_supported.",
      "Human-gated curation-queue handoff stub (download + /curation link) — not silent KG mutation.",
    ],
    acceptance: [
      "Workbench UI first-class on Research layer (not a 13th nav item).",
      "Hypothesis and experiment proposal artefacts stay candidate/draft_proposal.",
      "Export includes schema + graph/extensions version identifiers and candidateFlags.",
      "Smoke/tests cover step machine, candidate flags, and import helpers (no fake PMIDs/model results).",
      "Curation handoff packages declare wired=false / kgWrite=false / autoPromote=false.",
    ],
    status: "partial",
    notes:
      "NOT WIRED to KG write-back. Six-step machine with Ask/lit/mechanism imports, local draft save, versioned export (wb-1), human-gated curation-queue handoff, evidence collections (Neon), gap labels, and AI/draft research brief export (rb-1). No lab execution or auto-promotion.",
  },
];

export function phaseById(id: ImplementationPhase["id"]) {
  return IMPLEMENTATION_PHASES.find((p) => p.id === id)!;
}

export function phaseStatusSummary(): Record<ImplementationPhase["id"], PhaseStatus> {
  return Object.fromEntries(IMPLEMENTATION_PHASES.map((p) => [p.id, p.status])) as Record<
    ImplementationPhase["id"],
    PhaseStatus
  >;
}

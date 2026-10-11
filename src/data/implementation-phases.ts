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
      "Smoke/tests confirm new IDs resolve and remain draft.",
    ],
    status: "partial",
    notes: "draft-ext-3 deepens microbiome, vaccines, transplant, PID, immunogenetics, and infection↔autoimmunity drafts with lessons/routes. Expert claim-review of exemplar pathways (TNF→RA, PD-1, IFN→SLE) remains open — that is curator work, not silent graph completion.",
  },
  {
    id: "C",
    title: "Literature intelligence workflow scaffold",
    prdRefs: ["FR-036", "FR-037", "FR-013", "Epic F"],
    goals: [
      "Separate steps: search metadata → candidate claims → map to concepts/relationships → human-review queue.",
      "No fabricated PMIDs; identifiers optional and user-supplied only.",
      "Candidates never auto-publish into the curated graph.",
    ],
    acceptance: [
      "Browser-safe workflow module creates versioned candidate artefacts.",
      "Review queue UI can accept/reject/edit candidates with explicit candidate labelling.",
      "Smoke checks cover step transitions and forbid empty fake identifiers.",
    ],
    status: "partial",
    notes: "Local scaffold + curation-adjacent UI. Live PubMed search connectors remain the existing server-side curation checks — not a new auto-ingest pipeline.",
  },
  {
    id: "D",
    title: "Advanced model registry interfaces",
    prdRefs: ["FR-041", "FR-043", "Epic G"],
    goals: [
      "Expose omics, structure, pMHC, variants, and agent adapters as planned interfaces on Research/Methods.",
      "Never claim implemented unless status===implemented and tests pass.",
    ],
    acceptance: [
      "MODEL_REGISTRY rendered with status, inputs/outputs, limitations.",
      "implementedModels() remains empty until a real adapter ships.",
      "Methods page links to the registry panel.",
    ],
    status: "partial",
    notes: "Registry data existed; UI surface and honesty copy are the D deliverable. No external model runtimes.",
  },
  {
    id: "E",
    title: "Scientific Workbench steps",
    prdRefs: ["FR-038", "FR-039", "FR-040", "Epic F / Phase 4"],
    goals: [
      "Guided research flow: question → evidence → mechanism → hypothesis → experiment proposal → review.",
      "All AI/user drafts labelled candidate; exportable with graph version.",
    ],
    acceptance: [
      "Workbench UI on Research layer (not a 13th nav item).",
      "Hypothesis and experiment proposal artefacts stay candidate/draft.",
      "Export includes graph/extensions version identifiers.",
    ],
    status: "partial",
    notes: "Hypothesis template existed; E adds the multi-step workbench shell and experiment-proposal artefact. No autonomous lab execution.",
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

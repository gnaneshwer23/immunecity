/** Single source of truth for public capability labels.
 *  Status must match shipped, testable behaviour — not roadmap aspiration. */

export type CapabilityStatus = "beta" | "partial" | "in_development" | "planned";

export const CAPABILITY_STATUS_LABEL: Record<CapabilityStatus, string> = {
  beta: "Available in beta",
  partial: "Partial",
  in_development: "In development",
  planned: "Planned",
};

export interface CapabilityFeature {
  id: string;
  name: string;
  page: string;
  description: string;
  status: CapabilityStatus;
  statusAsOf: string;
  relatedAppRoute: string;
  sourceOfTruth: string;
}

export const CAPABILITY_FEATURES: readonly CapabilityFeature[] = [
  {
    id: "knowledge-graph",
    name: "Knowledge graph",
    page: "platform",
    description: "Navigate typed immune concepts and directional causal links with inspectable detail.",
    status: "beta",
    statusAsOf: "2026-04",
    relatedAppRoute: "/graph",
    sourceOfTruth: "src/data/kg.json + extensions merge",
  },
  {
    id: "cell-atlas",
    name: "Cell atlas",
    page: "platform",
    description: "Browse immune-cell profiles and teaching metaphors with linked graph concepts.",
    status: "beta",
    statusAsOf: "2026-04",
    relatedAppRoute: "/learn",
    sourceOfTruth: "src/routes/learn.tsx",
  },
  {
    id: "mechanism-lessons",
    name: "Mechanism lessons",
    page: "academy",
    description: "Walk illustrative cascades. Academy foundation is open to read. Intermediate is still being written.",
    status: "partial",
    statusAsOf: "2026-10",
    relatedAppRoute: "/academy",
    sourceOfTruth: "src/data/academyCurriculum.ts",
  },
  {
    id: "system-simulator",
    name: "System simulator",
    page: "platform",
    description: "Run simplified infection, host-state and treatment dynamics for teaching.",
    status: "beta",
    statusAsOf: "2026-04",
    relatedAppRoute: "/simulator",
    sourceOfTruth: "src/routes/simulator.tsx",
  },
  {
    id: "evidence-curation",
    name: "Evidence curation",
    page: "evidence",
    description: "Relationship-level citation review with claim_support; coverage still sparse.",
    status: "partial",
    statusAsOf: "2026-04",
    relatedAppRoute: "/evidence",
    sourceOfTruth: "src/lib/immune/evidenceStatus.ts",
  },
  {
    id: "ask-atlas",
    name: "Ask Immune (graph-retrieved teaching)",
    page: "scientific-ai",
    description:
      "Ask Immune retrieves graph context and reviewed supporting cites when present. Citation checks reject invented IDs, overclaims of reviewed support, and unlabelled provisional literature. Not fully evidence-grounded AI.",
    status: "partial",
    statusAsOf: "2026-10",
    relatedAppRoute: "/ask",
    sourceOfTruth: "src/lib/askGrounding.ts + provisionalLit.server.ts",
  },
  {
    id: "m1-investigation-brief",
    name: "M1 Biomedical Discovery Brief (Workflow B)",
    page: "scientific-ai",
    description:
      "Available research capability: structured investigation brief from Ask graph retrieval — entities, mechanisms, evidence, contradictions/gaps, claim categories (Observed N/A; hypotheses unvalidated). Includes Cap 6/10/11 companions (m1-2). Not clinical claims; not HSI Trials.",
    status: "partial",
    statusAsOf: "2026-11",
    relatedAppRoute: "/ask",
    sourceOfTruth: "src/lib/research/investigationBrief.ts + AskAtlas",
  },
  {
    id: "cap6-human-evidence",
    name: "Cap 6 Human evidence prioritisation",
    page: "scientific-ai",
    description:
      "Comparison table from Ask retrieval: organism/design cues from available text only; Gate C orthogonal to species cues; no automatic human>preclinical rank. Available research capability.",
    status: "partial",
    statusAsOf: "2026-11",
    relatedAppRoute: "/ask",
    sourceOfTruth: "src/lib/research/humanEvidencePrioritisation.ts",
  },
  {
    id: "cap10-contradictions",
    name: "Cap 10 Scientific contradictions",
    page: "scientific-ai",
    description:
      "Unresolved contradiction report with first-class CONTRADICTS gold pairs (both sides retained), opposite-sign edges, counterevidence cites, optional discovery conflicts. No majority vote; no silent merge.",
    status: "partial",
    statusAsOf: "2026-11",
    relatedAppRoute: "/ask",
    sourceOfTruth: "src/lib/research/contradictionReport.ts",
  },
  {
    id: "cap11-research-gaps",
    name: "Cap 11 Research gaps (scope honesty)",
    page: "scientific-ai",
    description:
      "Prioritised underexplored-mechanism / gap register (cap11-2): search-scope honesty, priority bands, Cap 10 cross-links, suggested next steps, atlas paths. Not in KG ≠ not in literature. Available research capability.",
    status: "partial",
    statusAsOf: "2026-11",
    relatedAppRoute: "/ask",
    sourceOfTruth: "src/lib/research/researchGapRegister.ts",
  },
  {
    id: "research-planner",
    name: "Bounded research planner",
    page: "research",
    description:
      "Typed plan steps and a run trace for hypothesis and comparison questions. Not a multi-agent system. Most tool stages remain planned.",
    status: "partial",
    statusAsOf: "2026-10",
    relatedAppRoute: "/ask",
    sourceOfTruth: "src/lib/research/researchPlanner.ts",
  },
  {
    id: "research-workbench",
    name: "Scientific research workbench",
    page: "research",
    description:
      "Guided question, evidence, mechanism, hypothesis, experiment and review. Candidates only. The investigate plan on Ask is partial and is not a multi-agent system. Nothing is written into the knowledge graph.",
    status: "partial",
    statusAsOf: "2026-10",
    relatedAppRoute: "/research",
    sourceOfTruth: "src/lib/research/workbench.ts + researchPlanner.ts",
  },
  {
    id: "literature-intelligence",
    name: "Literature intelligence",
    page: "scientific-ai",
    description:
      "Local candidate claim workflow + curation export. Ask Immune may fetch provisional PubMed/Europe PMC hits for empty-approved or source-lookup queries; they never auto-upgrade to approved/supports.",
    status: "partial",
    statusAsOf: "2026-10",
    relatedAppRoute: "/research",
    sourceOfTruth: "src/data/implementation-phases.ts phase C + provisionalLit.server.ts",
  },
  {
    id: "omics-adapters",
    name: "Omics / molecular AI adapters",
    page: "scientific-ai",
    description:
      "Planned only. No molecular model is connected, and the product never invents a score.",
    status: "planned",
    statusAsOf: "2026-10",
    relatedAppRoute: "/research",
    sourceOfTruth: "src/lib/ai/modelRegistry.ts",
  },
  {
    id: "academy-curriculum",
    name: "Immunology Academy curriculum",
    page: "academy",
    description:
      "Foundation is open to read. Intermediate is still being written. Advanced has no modules yet. Not a certificate.",
    status: "in_development",
    statusAsOf: "2026-10",
    relatedAppRoute: "/academy",
    sourceOfTruth: "src/data/academyCurriculum.ts",
  },
] as const;

export function featuresByStatus(status: CapabilityStatus) {
  return CAPABILITY_FEATURES.filter((f) => f.status === status);
}

export function featuresForPage(page: string) {
  return CAPABILITY_FEATURES.filter((f) => f.page === page);
}

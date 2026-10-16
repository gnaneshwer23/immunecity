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
    description: "Walk illustrative cascades; Academy foundation is navigable, intermediate is an honest scaffold.",
    status: "partial",
    statusAsOf: "2026-10",
    relatedAppRoute: "/mechanism",
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
    name: "Ask (graph-retrieved teaching)",
    page: "scientific-ai",
    description: "Ask retrieves graph context and reviewed relationship cites when present — not fully evidence-grounded AI.",
    status: "partial",
    statusAsOf: "2026-04",
    relatedAppRoute: "/reasoning",
    sourceOfTruth: "src/lib/askGrounding.ts",
  },
  {
    id: "research-workbench",
    name: "Scientific research workbench",
    page: "research",
    description: "Guided question → evidence → mechanism → hypothesis → experiment → review; candidates only.",
    status: "partial",
    statusAsOf: "2026-04",
    relatedAppRoute: "/research",
    sourceOfTruth: "src/data/implementation-phases.ts phase E",
  },
  {
    id: "literature-intelligence",
    name: "Literature intelligence",
    page: "scientific-ai",
    description: "Local candidate claim workflow and curation export; no automated bulk literature ingest.",
    status: "partial",
    statusAsOf: "2026-04",
    relatedAppRoute: "/research",
    sourceOfTruth: "src/data/implementation-phases.ts phase C",
  },
  {
    id: "omics-adapters",
    name: "Omics / molecular AI adapters",
    page: "scientific-ai",
    description: "Interface stubs return not_available until a real tested adapter ships.",
    status: "planned",
    statusAsOf: "2026-04",
    relatedAppRoute: "/research",
    sourceOfTruth: "src/lib/ai/modelRegistry.ts",
  },
  {
    id: "academy-curriculum",
    name: "Immunology Academy curriculum",
    page: "academy",
    description:
      "Foundation navigable + intermediate scaffold over existing lessons — still in development; not certification.",
    status: "in_development",
    statusAsOf: "2026-10",
    relatedAppRoute: "/mechanism",
    sourceOfTruth: "src/data/academyCurriculum.ts",
  },
] as const;

export function featuresByStatus(status: CapabilityStatus) {
  return CAPABILITY_FEATURES.filter((f) => f.status === status);
}

export function featuresForPage(page: string) {
  return CAPABILITY_FEATURES.filter((f) => f.page === page);
}

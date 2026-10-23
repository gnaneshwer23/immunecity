/**
 * Draft specialist stubs. A person must review them before any of this runs.
 * They do not publish, write the knowledge graph, or give medical advice.
 */

export type SpecialistDraft = {
  id: string;
  name: string;
  summary: string;
  status: "draft_pending_review";
};

export const SPECIALIST_DRAFTS: readonly SpecialistDraft[] = [
  {
    id: "immune-tutor",
    name: "Immune Tutor",
    summary: "Would explain an atlas concept in teaching language, using only retrieved graph text.",
    status: "draft_pending_review",
  },
  {
    id: "mechanism-explorer",
    name: "Mechanism Explorer",
    summary: "Would walk causal links that are already in the graph, with review status left visible.",
    status: "draft_pending_review",
  },
  {
    id: "evidence-analyst",
    name: "Evidence Analyst",
    summary: "Would describe the review status already stored on a relationship. It would not approve evidence.",
    status: "draft_pending_review",
  },
  {
    id: "community-safety-assistant",
    name: "Community Safety Assistant",
    summary: "Would flag a community post for a person to review. It would not hide, publish, or promote that post.",
    status: "draft_pending_review",
  },
];

/** No autonomous run. Every id refuses. */
export function runSpecialistDraft(_id: string): {
  ok: false;
  status: "draft_pending_review";
  publishes: false;
  writesGraph: false;
  medicalAdvice: false;
} {
  return {
    ok: false,
    status: "draft_pending_review",
    publishes: false,
    writesGraph: false,
    medicalAdvice: false,
  };
}

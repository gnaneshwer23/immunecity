/* Literature intelligence scaffold (PRD FR-036/037).
   Steps are local and explicit. No PubMed IDs are invented — only user-supplied
   metadata is stored. Candidates never write to the curated graph. */

export type LitStep = "search_metadata" | "candidate_claims" | "map_concepts" | "human_review";
export type ClaimReviewStatus = "queued" | "accepted_for_curation" | "rejected" | "needs_edit";

export interface SearchMetadata {
  query: string;
  retrievedAt: string;
  source: "manual_entry" | "paste_metadata";
  /** Optional user-supplied identifier — never auto-generated. */
  pmid?: string;
  doi?: string;
  title?: string;
  journal?: string;
  year?: string;
  notes?: string;
}

export interface CandidateClaim {
  claim_id: string;
  text: string;
  excerpt: string;
  subjectHint: string;
  predicateHint: string;
  objectHint: string;
  context: string;
  mappedConceptIds: string[];
  mappedRelationshipIds: string[];
  reviewStatus: ClaimReviewStatus;
  reviewNotes: string;
}

export interface LiteratureProject {
  project_id: string;
  step: LitStep;
  search: SearchMetadata;
  claims: CandidateClaim[];
  graphVersion: string;
  extensionsVersion: string;
  createdAt: string;
  updatedAt: string;
  status: "draft_scaffold";
}

const STEPS: LitStep[] = ["search_metadata", "candidate_claims", "map_concepts", "human_review"];

export function createLiteratureProject(
  graphVersion: string,
  extensionsVersion: string,
  partial?: Partial<SearchMetadata>,
): LiteratureProject {
  const now = new Date().toISOString();
  return {
    project_id: `LIT-DRAFT-${Date.now().toString(36)}`,
    step: "search_metadata",
    search: {
      query: partial?.query ?? "",
      retrievedAt: now,
      source: partial?.source ?? "manual_entry",
      pmid: normaliseOptionalId(partial?.pmid),
      doi: normaliseOptionalId(partial?.doi),
      title: partial?.title?.trim() || undefined,
      journal: partial?.journal?.trim() || undefined,
      year: partial?.year?.trim() || undefined,
      notes: partial?.notes?.trim() || undefined,
    },
    claims: [],
    graphVersion,
    extensionsVersion,
    createdAt: now,
    updatedAt: now,
    status: "draft_scaffold",
  };
}

/** Reject placeholder / fabricated-looking empty IDs; allow real user input only. */
export function normaliseOptionalId(raw?: string): string | undefined {
  const v = (raw ?? "").trim();
  if (!v) return undefined;
  if (/^(tbd|n\/?a|none|null|fake|placeholder|xxx+)$/i.test(v)) return undefined;
  return v;
}

export function searchMetadataComplete(s: SearchMetadata): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!s.query.trim()) missing.push("query");
  if (!s.title?.trim() && !s.pmid && !s.doi) missing.push("title|pmid|doi");
  return { ok: missing.length === 0, missing };
}

export function addCandidateClaim(
  project: LiteratureProject,
  partial: Pick<CandidateClaim, "text"> & Partial<CandidateClaim>,
): LiteratureProject {
  const claim: CandidateClaim = {
    claim_id: `CLAIM-CAND-${Date.now().toString(36)}-${project.claims.length + 1}`,
    text: partial.text.trim(),
    excerpt: (partial.excerpt ?? "").trim(),
    subjectHint: (partial.subjectHint ?? "").trim(),
    predicateHint: (partial.predicateHint ?? "").trim(),
    objectHint: (partial.objectHint ?? "").trim(),
    context: (partial.context ?? "").trim(),
    mappedConceptIds: partial.mappedConceptIds ?? [],
    mappedRelationshipIds: partial.mappedRelationshipIds ?? [],
    reviewStatus: "queued",
    reviewNotes: "",
  };
  return touch({ ...project, claims: [...project.claims, claim], step: "candidate_claims" });
}

export function mapClaim(
  project: LiteratureProject,
  claimId: string,
  conceptIds: string[],
  relationshipIds: string[],
): LiteratureProject {
  const claims = project.claims.map((c) =>
    c.claim_id === claimId
      ? {
          ...c,
          mappedConceptIds: conceptIds.map((x) => x.trim()).filter(Boolean),
          mappedRelationshipIds: relationshipIds.map((x) => x.trim()).filter(Boolean),
        }
      : c,
  );
  return touch({ ...project, claims, step: "map_concepts" });
}

export function reviewClaim(
  project: LiteratureProject,
  claimId: string,
  reviewStatus: ClaimReviewStatus,
  reviewNotes = "",
): LiteratureProject {
  const claims = project.claims.map((c) =>
    c.claim_id === claimId ? { ...c, reviewStatus, reviewNotes: reviewNotes.trim() } : c,
  );
  return touch({ ...project, claims, step: "human_review" });
}

export function advanceStep(project: LiteratureProject): LiteratureProject {
  const i = STEPS.indexOf(project.step);
  if (i < 0 || i >= STEPS.length - 1) return project;
  if (project.step === "search_metadata" && !searchMetadataComplete(project.search).ok) return project;
  if (project.step === "candidate_claims" && project.claims.length === 0) return project;
  return touch({ ...project, step: STEPS[i + 1]! });
}

export function stepIndex(step: LitStep): number {
  return STEPS.indexOf(step);
}

export function litSteps(): readonly LitStep[] {
  return STEPS;
}

export function queueStats(project: LiteratureProject) {
  const queued = project.claims.filter((c) => c.reviewStatus === "queued").length;
  const accepted = project.claims.filter((c) => c.reviewStatus === "accepted_for_curation").length;
  const rejected = project.claims.filter((c) => c.reviewStatus === "rejected").length;
  const needsEdit = project.claims.filter((c) => c.reviewStatus === "needs_edit").length;
  return { total: project.claims.length, queued, accepted, rejected, needsEdit };
}

function touch(p: LiteratureProject): LiteratureProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

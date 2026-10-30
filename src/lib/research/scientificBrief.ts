/**
 * Phase E — Structured scientific brief + human review handoff.
 * Reuses draftResearchBrief (fail-closed) and Phase C claim/review queue helpers.
 * Unreviewed claims never auto-approve. No community→KG write.
 */
import {
  assertNoSilentApproval,
  claimRequiresHumanReview,
  toSourceBackedClaim,
  type SourceBackedClaim,
} from "@/lib/immune/claimRecords";
import {
  buildScientificReviewQueue,
  type ReviewQueueRowInput,
  type ReviewQueueSnapshot,
} from "@/lib/immune/scientificReviewQueue";
import { melanomaInvestigationConceptIds } from "@/lib/immune/melanomaInvestigationPath";
import type { CitationLike } from "@/lib/immune/evidenceStatus";
import {
  draftResearchBrief,
  exportResearchBriefMarkdown,
  type ResearchBriefDraft,
  type RetrievedBriefSources,
} from "./researchBrief";
import { buildExportProvenanceTrail, type ExportProvenanceTrail } from "./exportProvenance";

export const SCIENTIFIC_BRIEF_HANDOFF_KIND = "scientific_brief_review_handoff" as const;
export const SCIENTIFIC_BRIEF_SCHEMA = "sb-1" as const;

export type ScientificBriefPackage = {
  kind: "scientific_brief_package";
  schemaVersion: typeof SCIENTIFIC_BRIEF_SCHEMA;
  label: "AI/draft";
  reviewStatus: "unreviewed";
  kgWrite: false;
  canApproveIntoKg: false;
  clinicalAdvice: false;
  clinicalConclusion: false;
  brief: ResearchBriefDraft;
  provenance: ExportProvenanceTrail;
  /** Claim candidates derived from retrieved evidence ids — still unreviewed. */
  claimCandidates: SourceBackedClaim[];
  reviewQueue: ReviewQueueSnapshot | null;
  handoff: ScientificBriefReviewHandoff;
};

export type ScientificBriefReviewHandoff = {
  kind: typeof SCIENTIFIC_BRIEF_HANDOFF_KIND;
  wired: false;
  kgWrite: false;
  autoPromote: false;
  openRoute: "/curation";
  note: string;
  claimCount: number;
  requiresHumanReview: true;
  blockedSilentApprovals: number;
  exportedAt: string;
};

function citeFromEvidenceId(evidenceId: string): CitationLike {
  return {
    evidence_id: evidenceId,
    relationship_id: null,
    claim_support: "unassessed",
    curation: "unreviewed",
    label: evidenceId,
    url: "",
    pmid: undefined,
    doi: undefined,
    claim_text: `Candidate claim linked to brief export (${evidenceId})`,
    passage_span: undefined,
    reviewed_at: null,
  };
}

/**
 * Draft a structured scientific brief for the melanoma path (or custom sources)
 * and attach an unreviewed human-review handoff. Never approves into the KG.
 */
export function buildScientificBriefPackage(input: {
  question?: string;
  sources?: RetrievedBriefSources;
  /** Optional Neon-shaped rows for review-queue snapshot (never auto-approved). */
  reviewRows?: readonly ReviewQueueRowInput[];
  now?: Date;
}): { ok: true; package: ScientificBriefPackage } | { ok: false; reason: string } {
  const defaultConcepts = melanomaInvestigationConceptIds();
  const sources: RetrievedBriefSources = input.sources ?? {
    conceptIds: defaultConcepts,
    trialIds: ["TR003", "TR020"],
    evidenceIds: [],
    relIds: [],
  };

  const briefResult = draftResearchBrief({
    question:
      input.question?.trim() ||
      "Melanoma PD-1 immunotherapy: mechanisms, biomarkers, trials, and unknowns (educational draft).",
    sources,
    now: input.now,
  });
  if (!briefResult.ok) return briefResult;

  const brief = briefResult.brief;
  const candidateCites = brief.evidenceIds.map(citeFromEvidenceId);
  const claimCandidates = candidateCites.map((c) => toSourceBackedClaim(c));

  for (const cite of candidateCites) {
    if (!claimRequiresHumanReview(cite) && cite.curation === "approved") {
      return { ok: false, reason: "Refuse approved claims inside draft brief package." };
    }
  }

  const reviewRows: ReviewQueueRowInput[] =
    input.reviewRows && input.reviewRows.length
      ? [...input.reviewRows]
      : candidateCites.map((c) => ({
          evidence_id: c.evidence_id,
          node_id: brief.graphConceptIds[0] ?? null,
          relationship_id: c.relationship_id,
          claim_support: c.claim_support,
          curation: c.curation ?? "unreviewed",
          check_status: "unchecked",
          pmid: c.pmid,
          doi: c.doi,
          claim_text: c.claim_text,
        }));

  const reviewQueue = reviewRows.length ? buildScientificReviewQueue(reviewRows) : null;

  let blockedSilentApprovals = reviewQueue?.blockedSilentApprovals ?? 0;
  // Demonstrate Gate C guard: attempting silent approve of unassessed is blocked.
  for (const c of candidateCites) {
    const probe = assertNoSilentApproval({
      ...c,
      curation: "approved",
      claim_support: "unassessed",
    });
    if (!probe.ok) blockedSilentApprovals += 1;
  }

  const provenance = buildExportProvenanceTrail({
    conceptIds: brief.graphConceptIds,
    relIds: brief.relIds,
    trialIds: brief.trialIds,
    evidenceIds: brief.evidenceIds,
    now: input.now,
  });

  const handoff: ScientificBriefReviewHandoff = {
    kind: SCIENTIFIC_BRIEF_HANDOFF_KIND,
    wired: false,
    kgWrite: false,
    autoPromote: false,
    openRoute: "/curation",
    note: "Download / paste into Curation for human review. Unreviewed stays unapproved. Not a KG write.",
    claimCount: claimCandidates.length,
    requiresHumanReview: true,
    blockedSilentApprovals,
    exportedAt: brief.exportedAt,
  };

  return {
    ok: true,
    package: {
      kind: "scientific_brief_package",
      schemaVersion: SCIENTIFIC_BRIEF_SCHEMA,
      label: "AI/draft",
      reviewStatus: "unreviewed",
      kgWrite: false,
      canApproveIntoKg: false,
      clinicalAdvice: false,
      clinicalConclusion: false,
      brief,
      provenance,
      claimCandidates,
      reviewQueue,
      handoff,
    },
  };
}

export function exportScientificBriefPackageJson(pkg: ScientificBriefPackage): string {
  return JSON.stringify(pkg, null, 2);
}

export function exportScientificBriefPackageMarkdown(pkg: ScientificBriefPackage): string {
  const briefMd = exportResearchBriefMarkdown(pkg.brief);
  return [
    briefMd,
    ``,
    `## Provenance trail`,
    `- Graph core: ${pkg.provenance.graphCoreVersion}`,
    `- Extensions: ${pkg.provenance.graphExtensionsVersion}`,
    `- Concepts: ${pkg.provenance.concepts.map((c) => c.isiId).join(", ") || "(none)"}`,
    `- Trials: ${pkg.provenance.trials.map((t) => t.graphNodeId).join(", ") || "(none)"}`,
    `- kgWrite: ${pkg.provenance.kgWrite}`,
    ``,
    `## Human review handoff`,
    `- Route: ${pkg.handoff.openRoute}`,
    `- Claims: ${pkg.handoff.claimCount}`,
    `- Requires human review: ${pkg.handoff.requiresHumanReview}`,
    `- Blocked silent approvals: ${pkg.handoff.blockedSilentApprovals}`,
    `- autoPromote: ${pkg.handoff.autoPromote}`,
    `- Note: ${pkg.handoff.note}`,
  ].join("\n");
}

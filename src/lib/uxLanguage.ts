/**
 * Researcher-facing UX language for ISI surfaces.
 * Engineering identifiers stay available in expert/debug panels only.
 * Never invents science — only relabels product chrome.
 */

import type { OpportunityStatus } from "@/lib/discovery/gapClass";
import type { ResearchGapStatus } from "@/lib/discovery/types";
import type { SmeWorkItem, SmeWorkItemKind, SmeWorkItemStatus } from "@/lib/sme/workQueue";

/**
 * User-visible phrases that must not appear in primary SME / dossier / collections copy.
 * (Code identifiers like gapKey props are fine; expert panels may still show eng terms.)
 */
export const UX_PRIMARY_FORBIDDEN_PHRASES = [
  "Persisted in Neon",
  "Detection only",
  "Persist candidate",
  "Persist detection to Neon",
  "Auto-approve: false",
  "profile interest stub",
  "kgWrite=false",
  "kgWrite=",
  "Researcher Pro — billing not activated",
  "Paste evidence_records.id",
  "R001, P001, TR003",
  "No gapKey filter",
  "Focusing gap",
] as const;

export function detectionSourceLabel(source: string): string {
  switch (source) {
    case "melanoma_matrix":
      return "Identified from melanoma evidence analysis";
    case "evidence_gap":
      return "Identified from evidence-coverage analysis";
    case "conflict":
      return "Identified from conflicting evidence signals";
    case "trial_signal":
      return "Identified from trial-linkage signals";
    default:
      return "Identified from ISI research signals";
  }
}

export function pilotLabel(pilot: string | null | undefined): string | null {
  if (!pilot) return null;
  if (pilot === "melanoma_a") return "Melanoma pilot";
  if (pilot === "coverage_b") return "Coverage pilot";
  return null;
}

export function opportunityStatusLabel(status: OpportunityStatus | string | null | undefined): string | null {
  if (!status || status === "none") return null;
  switch (status) {
    case "assessed":
      return "Evidence assessment completed";
    case "draft":
      return "Opportunity draft";
    case "reviewed_opportunity":
      return "Reviewed research opportunity";
    case "rejected":
      return "Opportunity rejected";
    default:
      return null;
  }
}

export function persistenceLabel(persisted: boolean): string {
  return persisted ? "Saved to your research workspace" : "New research candidate";
}

export function reviewStatusUxLabel(
  persistedStatus: ResearchGapStatus | null,
): string {
  if (!persistedStatus) return "New research candidate · not yet saved";
  switch (persistedStatus) {
    case "candidate":
      return "Saved · awaiting scientific review";
    case "coverage_insufficient":
      return "Saved · coverage insufficient";
    case "needs_context":
      return "Saved · needs more context";
    case "reviewed_gap":
      return "Saved · reviewed research gap";
    case "rejected":
      return "Saved · rejected";
    case "superseded":
      return "Saved · superseded";
    default:
      return "Saved to your research workspace";
  }
}

/** Soft availability — not raw “billing not activated” product chrome. */
export function paidPlanAvailabilityCopy(): string {
  return "Paid Discovery plans are not available yet";
}

export function smeStatusLabel(status: SmeWorkItemStatus): string {
  switch (status) {
    case "pending_sme":
      return "Awaiting review";
    case "changes_requested":
      return "Changes requested";
    case "resolved_by_sme":
      return "Resolved";
    default:
      return "Awaiting review";
  }
}

export function smeKindLabel(kind: SmeWorkItemKind): string {
  switch (kind) {
    case "keynote_rematch":
      return "Citation rematch";
    case "r011_spo_rewrite":
      return "Relationship rewrite";
    case "discovery_gap":
      return "Research candidate";
    case "melanoma_matrix":
      return "Melanoma evidence item";
    default:
      return "Review item";
  }
}

/** Prefer scientific SPO / human titles over raw SME-… ids in primary UI. */
export function smeWorkItemTitle(item: Pick<SmeWorkItem, "kind" | "spo" | "id">): string {
  if (item.kind === "keynote_rematch") return "KEYNOTE-006 citation rematch";
  if (item.kind === "r011_spo_rewrite") return "Immune exhaustion relationship rewrite";
  const spo = item.spo.trim();
  if (spo.length > 0) return spo.length > 110 ? `${spo.slice(0, 109)}…` : spo;
  return item.id;
}

export function goldLabelDisplay(label: string | null | undefined): string {
  if (!label) return "Not labelled yet";
  return label.replace(/_/g, " ");
}

/* Relationship-level review status. A link is only "approved" when an approved
   source has been mapped to that exact directional claim and assessed as supporting it.
   Concept-level citations never count as support for a link. */
import { edgeRef, relId, type KGEdge } from "./engine";

export interface CitationLike {
  relationship_id: string | null;
  claim_support: string;
  label: string;
  url: string;
  evidence_id: string;
  reviewed_at: string | null;
  /** When present, only `approved` rows count toward claim support. */
  curation?: string;
  pmid?: string | null;
  doi?: string | null;
  /** Optional curated assertion / notes for passage-window checks (never invent). */
  claim_text?: string | null;
  /** Exact supporting span when curator recorded one (Layer B ledger). */
  passage_span?: string | null;
  notes?: string | null;
}

export type ReviewStatus = "draft" | "unreviewed" | "source-verified" | "claim-assessed" | "approved" | "rejected" | "conflicting" | "superseded";

export const STATUS_INFO: Record<ReviewStatus, { label: string; desc: string }> = {
  draft: { label: "Draft", desc: "Added to close a coverage gap; not yet reviewed by an expert." },
  unreviewed: { label: "Unreviewed", desc: "No source has been mapped to this claim yet." },
  "source-verified": { label: "Source linked", desc: "Carries a PubMed ID or DOI, but nobody has yet checked the source supports this exact claim." },
  "claim-assessed": { label: "Partially supported", desc: "A reviewed source supports part of this claim." },
  approved: { label: "Supported", desc: "An approved source was checked and supports this directional claim." },
  rejected: { label: "Rejected", desc: "Reviewed sources do not address this claim." },
  conflicting: { label: "Conflicting", desc: "Reviewed sources disagree about this claim." },
  superseded: { label: "Superseded", desc: "Replaced by a newer claim." },
};

export function citationsFor(edge: KGEdge, cites: CitationLike[]) {
  const id = relId(edge);
  return cites.filter((c) => {
    if (c.relationship_id !== id) return false;
    // Callers that omit curation are treated as already-filtered (e.g. unit tests).
    if (c.curation !== undefined && c.curation !== "approved") return false;
    return true;
  });
}

/** Gate C support cites only (approved + supports). Counterevidence uses counterCitationsFor. */
export function supportingCitationsFor(edge: KGEdge, cites: CitationLike[]) {
  return citationsFor(edge, cites).filter((c) => c.claim_support === "supports");
}

/**
 * Counterevidence on an edge: contradicts / partial.
 * Unlike citationsFor, allows non-approved curation (write path forbids approving non-supports).
 */
export function counterCitationsFor(edge: KGEdge, cites: CitationLike[]) {
  const id = relId(edge);
  return cites.filter((c) => {
    if (c.relationship_id !== id) return false;
    if (c.curation === "rejected") return false;
    return c.claim_support === "contradicts" || c.claim_support === "partial";
  });
}

/** A relationship is Supported only when mapped, assessed as supporting, and approved. */
export function relationshipStatus(edge: KGEdge, cites: CitationLike[]): ReviewStatus {
  const supporting = supportingCitationsFor(edge, cites);
  const counter = counterCitationsFor(edge, cites);
  const approvedMine = citationsFor(edge, cites);
  const sup = supporting.some((c) => c.claim_support === "supports");
  const part = counter.some((c) => c.claim_support === "partial");
  const contra = counter.some((c) => c.claim_support === "contradicts");
  if (contra && (sup || part)) return "conflicting";
  if (contra) return "conflicting";
  if (sup) return "approved";
  if (part) return "claim-assessed";
  if (approvedMine.length && approvedMine.every((c) => c.claim_support === "unrelated")) return "rejected";
  const ref = edgeRef(edge);
  if (ref && ref.kind !== "citation") return "source-verified";
  return edge.draft ? "draft" : "unreviewed";
}

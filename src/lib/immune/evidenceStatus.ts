/* Relationship-level review status. A link is only "approved" when an approved
   source has been mapped to that exact directional claim and assessed as supporting it.
   Concept-level citations never count as support for a link. */
import { edgeRef, REF_PLACEHOLDER, relId, type KGEdge } from "./engine";

/**
 * Melanoma pilot honesty overrides (post–A–F audit).
 * Demote display/status without inventing PMIDs or auto-approving Gate C.
 * Keys are REL-* ids; values are honest teaching labels from kg evidence_statuses.
 */
const HONEST_STATUS_OVERRIDES: Readonly<Record<string, string>> = {
  // Neon partial + S-P-O mismatch (Dong 2002 is PD-L1/B7-H1 apoptosis, not PD-1→exhaustion causal).
  "REL-R011-drives_immune_exhaustion_in-D012": "HYPOTHESIS",
  // Wrong PMID previously mapped and rejected; no approved KEYNOTE-006 rematch yet.
  "REL-I008-demonstrates_in-TR003": "EVIDENCE-SUPPORTED",
};

/** Known rejected PMIDs that must never appear as supporting evidence. */
export const REJECTED_SUPPORT_PMIDS: ReadonlySet<string> = new Set([
  "31166680", // dabrafenib+trametinib — wrongly mapped to KEYNOTE-006 demonstrates_in
]);

/** Curator-facing honesty note when graph S-P-O / Gate C diverge (never invents science). */
export function relationshipHonestyNote(edgeOrRelId: KGEdge | string): string | null {
  const id = typeof edgeOrRelId === "string" ? edgeOrRelId : relId(edgeOrRelId);
  if (id === "REL-R011-drives_immune_exhaustion_in-D012") {
    return "Causal predicate demoted: Neon evidence is partial with subject–predicate–object mismatch (Dong 2002 describes PD-L1/B7-H1→apoptosis, not PD-1 driving exhaustion). Graph teaching only until Gate C rematch.";
  }
  if (id === "REL-I008-demonstrates_in-TR003") {
    return "Prior PMID 31166680 was rejected (wrong paper). No approved KEYNOTE-006 locator rematch — do not treat this edge as Gate C supported.";
  }
  return null;
}

/** True when the edge has no durable PMID/DOI/reference — only TO_BE_CURATED or empty refs. */
export function lacksDurableLocator(edge: KGEdge): boolean {
  if (edge.pmid && /^\d{6,9}$/.test(String(edge.pmid).trim())) return false;
  if (edge.doi && String(edge.doi).trim()) return false;
  const raw = (edge.reference || "").trim();
  if (raw) {
    if (/^(?:PMID[:\s]*)?\d{6,9}$/i.test(raw)) return false;
    const doi = raw.replace(/^doi[:\s]*/i, "");
    if (/^10\.\d{4,9}\//.test(doi)) return false;
    // Named citation string counts as a locator candidate (still not Gate C).
    if (raw !== REF_PLACEHOLDER) return false;
  }
  const refs = (edge.source_refs || []).filter((r) => r && r.trim());
  if (!refs.length) return true;
  return refs.every((r) => r === REF_PLACEHOLDER);
}

/**
 * Display / Ask evidence_status that cannot imply approved causality when the edge is
 * draft, placeholder-only, or on the audit demotion list. Raw kg.json stays source of truth;
 * this is the honest presentation layer.
 */
export function honestEvidenceStatus(edge: KGEdge): string {
  const id = relId(edge);
  const override = HONEST_STATUS_OVERRIDES[id];
  if (override) return override;

  const raw = (edge.evidence_status || "").trim() || "UNSPECIFIED";
  const upper = raw.toUpperCase();

  if (edge.draft && upper === "ESTABLISHED") {
    return "EVIDENCE-SUPPORTED";
  }
  if (upper === "ESTABLISHED" && lacksDurableLocator(edge)) {
    return "HYPOTHESIS";
  }
  return raw;
}

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

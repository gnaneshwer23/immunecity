/**
 * Evidence-gap classifications for the Research Workbench (Phase 4).
 * Labels use real graph evidence_status and optional Neon/citation signals only.
 * Never invents Gate C density, PMIDs, or approvals.
 */
import { byId, edgeRef, inn, out, type KGEdge } from "@/lib/immune/engine";

export const EVIDENCE_GAP_LABELS = [
  "no_mapped_evidence",
  "awaiting_curation",
  "no_direct_evidence_after_search",
  "conflicting",
  "emerging",
] as const;

export type EvidenceGapLabel = (typeof EVIDENCE_GAP_LABELS)[number];

/**
 * UI copy must state ISI curated coverage / search date-scope.
 * Never imply “no literature exists in the world.”
 */
export const EVIDENCE_GAP_PROVENANCE_NOTE =
  "Gap labels reflect ISI curated graph coverage and any search you ran in this product’s date-scope — not a claim that no literature exists worldwide.";

export const EVIDENCE_GAP_UI: Record<EvidenceGapLabel, { label: string; desc: string }> = {
  no_mapped_evidence: {
    label: "No ISI-mapped evidence",
    desc: "Within ISI curated coverage: no Gate C–approved supporting cite and no bibliographic ref on incident edges. Does not mean worldwide literature is absent.",
  },
  awaiting_curation: {
    label: "Awaiting ISI curation",
    desc: "Mapped or draft material exists in ISI but is not yet approved as claim support.",
  },
  no_direct_evidence_after_search: {
    label: "No direct hits in ISI search scope",
    desc: "An ISI/product search was attempted in the current date-scope and returned a known empty hit count for this concept — not a claim that no papers exist elsewhere, and not used when hit count is missing/unknown.",
  },
  conflicting: {
    label: "Conflicting (ISI records)",
    desc: "ISI-recorded counterevidence or conflicting review status for incident claims.",
  },
  emerging: {
    label: "Emerging (ISI graph label)",
    desc: "ISI graph evidence_status is EMERGING or HYPOTHESIS (teaching class — not Gate C).",
  },
};

/** Optional real coverage signals — omit rather than invent counts. */
export type EvidenceGapSignals = {
  /** Gate C approved+supports rows for this concept (or its incident rels). */
  approvedSupportsCount?: number;
  /** Unreviewed / awaiting curation mapped rows. */
  unreviewedMappedCount?: number;
  /** Conflicting / contradicts rows (real review signals only). */
  conflictingCount?: number;
  /** True when a literature/provisional search was actually run. */
  searchAttempted?: boolean;
  /**
   * Hit count from that search when known.
   * `0` = empty result in scope. Omit / non-number = incomplete / unknown — never treat as zero.
   */
  searchHitCount?: number;
};

/** Search coverage relative to an attempted product search — never invent worldwide absence. */
export type SearchCoverageState = "not_attempted" | "zero_hits" | "has_hits" | "unknown";

/**
 * Classify product-search coverage. Missing hit count after an attempt stays `unknown`
 * (incomplete search) — never coerced to zero hits.
 */
export function classifySearchCoverage(signals: EvidenceGapSignals = {}): SearchCoverageState {
  if (signals.searchAttempted !== true) return "not_attempted";
  if (typeof signals.searchHitCount !== "number" || !Number.isFinite(signals.searchHitCount)) {
    return "unknown";
  }
  if (signals.searchHitCount <= 0) return "zero_hits";
  return "has_hits";
}

function incidentEdges(conceptId: string): KGEdge[] {
  return [...(out[conceptId] ?? []), ...(inn[conceptId] ?? [])];
}

function graphEmerging(conceptId: string): boolean {
  const node = byId[conceptId];
  if (!node) return false;
  const st = (node.evidence_status || "").toUpperCase();
  if (st === "EMERGING" || st === "HYPOTHESIS") return true;
  return incidentEdges(conceptId).some((e) => {
    const es = (e.evidence_status || "").toUpperCase();
    return es === "EMERGING" || es === "HYPOTHESIS";
  });
}

function hasBibliographicRef(conceptId: string): boolean {
  return incidentEdges(conceptId).some((e) => {
    const ref = edgeRef(e);
    return Boolean(ref && ref.kind === "citation");
  });
}

function hasDraftIncident(conceptId: string): boolean {
  const node = byId[conceptId];
  if (node?.draft) return true;
  return incidentEdges(conceptId).some((e) => Boolean(e.draft));
}

/**
 * Classify a concept's evidence gap from known signals + graph labels.
 * Returns null when Gate C approved support is present (not a gap).
 * Never fabricates Gate C density — missing counts are treated as unknown, not zero,
 * except when the caller explicitly passes numbers.
 */
export function classifyEvidenceGap(
  conceptId: string,
  signals: EvidenceGapSignals = {},
): EvidenceGapLabel | null {
  if (!byId[conceptId]) return null;

  const approved = signals.approvedSupportsCount;
  if (typeof approved === "number" && approved > 0) return null;

  const conflicting = signals.conflictingCount;
  if (typeof conflicting === "number" && conflicting > 0) return "conflicting";

  if (graphEmerging(conceptId) && (approved === undefined || approved === 0)) {
    // Emerging is a real graph class; still a gap relative to Gate C support.
    if (typeof signals.unreviewedMappedCount === "number" && signals.unreviewedMappedCount > 0) {
      return "awaiting_curation";
    }
    return "emerging";
  }

  if (typeof signals.unreviewedMappedCount === "number" && signals.unreviewedMappedCount > 0) {
    return "awaiting_curation";
  }

  // Only claim “no hits in search scope” when hit count is known zero — never coerce missing → 0.
  const searchCoverage = classifySearchCoverage(signals);
  if (searchCoverage === "zero_hits" && (approved === undefined || approved === 0)) {
    return "no_direct_evidence_after_search";
  }
  // searchCoverage === "unknown" → incomplete search; fall through without implying empty literature.

  if (hasDraftIncident(conceptId) || hasBibliographicRef(conceptId)) {
    // Draft edges or KG bibliographic refs without Gate C approval → awaiting curation.
    if (approved === 0 || approved === undefined) return "awaiting_curation";
  }

  return "no_mapped_evidence";
}

export function evidenceGapLabelText(label: EvidenceGapLabel): string {
  return EVIDENCE_GAP_UI[label].label;
}

export function evidenceGapLabelDescription(label: EvidenceGapLabel): string {
  return EVIDENCE_GAP_UI[label].desc;
}

/** Batch classify; drops unknown concept ids. */
export function classifyEvidenceGaps(
  conceptIds: readonly string[],
  signalsById: Record<string, EvidenceGapSignals> = {},
): Array<{ conceptId: string; gap: EvidenceGapLabel | null }> {
  const outRows: Array<{ conceptId: string; gap: EvidenceGapLabel | null }> = [];
  const seen = new Set<string>();
  for (const raw of conceptIds) {
    const id = typeof raw === "string" ? raw.trim() : "";
    if (!id || seen.has(id) || !byId[id]) continue;
    seen.add(id);
    outRows.push({ conceptId: id, gap: classifyEvidenceGap(id, signalsById[id] ?? {}) });
  }
  return outRows;
}

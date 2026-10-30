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

export const EVIDENCE_GAP_UI: Record<EvidenceGapLabel, { label: string; desc: string }> = {
  no_mapped_evidence: {
    label: "No mapped evidence",
    desc: "No Gate C–approved supporting cite and no bibliographic ref on incident edges.",
  },
  awaiting_curation: {
    label: "Awaiting curation",
    desc: "Mapped or draft material exists but is not yet approved as claim support.",
  },
  no_direct_evidence_after_search: {
    label: "No direct evidence after search",
    desc: "A search was attempted and returned no usable hits for this concept.",
  },
  conflicting: {
    label: "Conflicting",
    desc: "Recorded counterevidence or conflicting review status for incident claims.",
  },
  emerging: {
    label: "Emerging",
    desc: "Graph evidence_status is EMERGING or HYPOTHESIS (teaching class — not Gate C).",
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
  /** Hit count from that search (0 = empty result, not “unknown”). */
  searchHitCount?: number;
};

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

  if (signals.searchAttempted === true) {
    const hits = signals.searchHitCount ?? 0;
    if (hits === 0 && (approved === undefined || approved === 0)) {
      return "no_direct_evidence_after_search";
    }
  }

  if (hasDraftIncident(conceptId) || hasBibliographicRef(conceptId)) {
    // Draft edges or KG bibliographic refs without Gate C approval → awaiting curation.
    if (approved === 0 || approved === undefined) return "awaiting_curation";
  }

  return "no_mapped_evidence";
}

export function evidenceGapLabelText(label: EvidenceGapLabel): string {
  return EVIDENCE_GAP_UI[label].label;
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

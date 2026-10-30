/**
 * Phase 4 — Research Radar feed shaping from real candidates only.
 * Emerging / contradiction sections never invent rows.
 */
import { gapStatusBadge, type GapStatusBadge } from "@/lib/discovery/dossier";
import type { ResearchGapCandidate, ResearchGapStatus } from "@/lib/discovery/types";

export type RadarFeedItem = ResearchGapCandidate & {
  badge: GapStatusBadge;
  persistedStatus: ResearchGapStatus | null;
  whySnippet: string;
  reviewStatusLabel: string;
};

export type RadarFeed = {
  items: RadarFeedItem[];
  emerging: RadarFeedItem[];
  contradictions: RadarFeedItem[];
  coverageInsufficient: RadarFeedItem[];
  filtersApplied: {
    status: string;
    pilot: string;
    source: string;
  };
  persistent: boolean;
  autoApprove: false;
  note: string;
};

export type RadarFilterInput = {
  status?: "all" | "candidate" | "coverage_insufficient" | "needs_context" | "rejected" | "reviewed_gap" | "superseded";
  pilot?: "all" | "melanoma_a" | "coverage_b";
  source?: "all" | "melanoma_matrix" | "evidence_gap" | "conflict" | "trial_signal";
  limit?: number;
};

function toItem(
  gap: ResearchGapCandidate,
  persistedStatus: ResearchGapStatus | null = null,
): RadarFeedItem {
  const status = (persistedStatus ?? gap.status) as ResearchGapCandidate["status"] | ResearchGapStatus;
  return {
    ...gap,
    badge: gapStatusBadge(status),
    persistedStatus,
    whySnippet: gap.whyItMatters.slice(0, 180) + (gap.whyItMatters.length > 180 ? "…" : ""),
    reviewStatusLabel: persistedStatus
      ? `Persisted · ${persistedStatus}`
      : "Detection only · not yet persisted",
  };
}

function isEmerging(g: ResearchGapCandidate): boolean {
  return g.coverageLabel === "emerging" || g.detectionDetail?.coverageLabel === "emerging";
}

function isContradiction(g: ResearchGapCandidate): boolean {
  return g.detectionSource === "conflict" || g.coverageLabel === "conflicting";
}

/** Shape radar sections from real candidates — empty sections stay empty. */
export function shapeRadarFeed(
  gaps: readonly ResearchGapCandidate[],
  opts?: {
    filters?: RadarFilterInput;
    persistedByKey?: Record<string, ResearchGapStatus>;
    persistent?: boolean;
  },
): RadarFeed {
  const filters = opts?.filters ?? {};
  const statusFilter = filters.status ?? "all";
  const pilotFilter = filters.pilot ?? "all";
  const sourceFilter = filters.source ?? "all";
  const limit = filters.limit ?? 25;
  const persistedByKey = opts?.persistedByKey ?? {};

  let filtered = gaps.filter((g) => {
    const effective = persistedByKey[g.gapKey] ?? g.status;
    if (statusFilter !== "all" && effective !== statusFilter) return false;
    if (pilotFilter !== "all" && g.pilot !== pilotFilter) return false;
    if (sourceFilter !== "all" && g.detectionSource !== sourceFilter) return false;
    return true;
  });
  filtered = filtered.slice(0, limit);

  const items = filtered.map((g) => toItem(g, persistedByKey[g.gapKey] ?? null));
  const emerging = items.filter((g) => isEmerging(g));
  const contradictions = items.filter((g) => isContradiction(g));
  const coverageInsufficient = items.filter(
    (g) => (g.persistedStatus ?? g.status) === "coverage_insufficient",
  );

  return {
    items,
    emerging,
    contradictions,
    coverageInsufficient,
    filtersApplied: {
      status: statusFilter,
      pilot: pilotFilter,
      source: sourceFilter,
    },
    persistent: Boolean(opts?.persistent),
    autoApprove: false,
    note: opts?.persistent
      ? "Radar merges Neon-persisted statuses with deterministic ISI detection. reviewed_gap is human-only."
      : "Radar lists deterministic ISI detection (not yet reading persisted rows). Missing ISI coverage ≠ worldwide literature absence.",
  };
}

/** Merge detection candidates with Neon rows: Neon status wins; detection fills missing keys. */
export function mergeDetectionWithPersisted(
  detected: readonly ResearchGapCandidate[],
  persisted: Array<{
    gapKey: string;
    status: ResearchGapStatus;
    title?: string;
    summary?: string;
    whyItMatters?: string | null;
  }>,
): {
  gaps: ResearchGapCandidate[];
  persistedByKey: Record<string, ResearchGapStatus>;
  persistent: boolean;
} {
  const persistedByKey: Record<string, ResearchGapStatus> = {};
  const byKey = new Map<string, ResearchGapCandidate>();
  for (const g of detected) {
    byKey.set(g.gapKey, g);
  }
  for (const row of persisted) {
    persistedByKey[row.gapKey] = row.status;
    const existing = byKey.get(row.gapKey);
    if (existing) {
      // Keep detection payload; status overlay is via persistedByKey.
      byKey.set(row.gapKey, existing);
    }
    // Do not invent candidates from DB-only rows without detection/graph provenance
    // unless they were previously emitted (existing detection key).
  }
  return {
    gaps: [...byKey.values()],
    persistedByKey,
    persistent: persisted.length > 0,
  };
}

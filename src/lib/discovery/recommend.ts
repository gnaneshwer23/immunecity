/**
 * Phase 5 — Deterministic, explainable personalised ranking.
 * Weighted factors only — never claims novelty or scientific importance from score alone.
 */
import type { ResearchGapCandidate, ResearchProfileDraft } from "@/lib/discovery/types";

export const FEEDBACK_RATINGS = ["useful", "not_relevant", "unclear"] as const;
export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number];

export type GapFeedbackSignal = {
  gapKey: string;
  rating: FeedbackRating;
  /** Optional ISO timestamp for recency of feedback itself — unused in score math beyond counting. */
  createdAt?: string;
};

export type RankingFactorId =
  | "topic_match"
  | "mechanism"
  | "uncertainty"
  | "coverage"
  | "feedback"
  | "recency";

export type RankingFactor = {
  id: RankingFactorId;
  label: string;
  points: number;
  detail: string;
};

export type RecommendReason = {
  gapKey: string;
  /** Opaque ranking aid — not a novelty, importance, or quality score. */
  score: number;
  because: string[];
  factors: RankingFactor[];
  disclaimer: string;
};

export const RANKING_POLICY = {
  claimsNoveltyFromScore: false as const,
  claimsScientificImportanceFromScore: false as const,
  fabricatesRelevance: false as const,
  scoreIsExplainableWeightsOnly: true as const,
  disclaimer:
    "Ranking aids navigation from your stated interests and feedback. It is not a novelty, importance, or worldwide-literature score.",
} as const;

const WEIGHTS: Record<RankingFactorId, number> = {
  topic_match: 4,
  mechanism: 3,
  uncertainty: 2,
  coverage: 2,
  feedback: 3,
  recency: 1,
};

function interestTokens(profile: ResearchProfileDraft | null | undefined): {
  diseases: string[];
  domains: string[];
  modalities: string[];
  cells: string[];
  pathways: string[];
  therapies: string[];
  all: string[];
} {
  if (!profile) {
    return { diseases: [], domains: [], modalities: [], cells: [], pathways: [], therapies: [], all: [] };
  }
  const diseases = profile.focusDiseases.map((t) => t.toLowerCase());
  const domains = profile.focusDomains.map((t) => t.toLowerCase());
  const modalities = profile.modalities.map((t) => t.toLowerCase());
  const cells: string[] = [];
  const pathways: string[] = [];
  const therapies: string[] = [];
  const interests = profile.interests;
  if (interests && typeof interests === "object") {
    const pushArr = (key: string, into: string[]) => {
      const v = interests[key];
      if (typeof v === "string" && v.trim()) into.push(v.trim().toLowerCase());
      if (Array.isArray(v)) {
        for (const item of v) {
          if (typeof item === "string" && item.trim()) into.push(item.trim().toLowerCase());
        }
      }
    };
    pushArr("cells", cells);
    pushArr("cell_types", cells);
    pushArr("pathways", pathways);
    pushArr("therapies", therapies);
    pushArr("topics", pathways);
    for (const v of Object.values(interests)) {
      if (typeof v === "string" && v.trim()) pathways.push(v.trim().toLowerCase());
      if (Array.isArray(v)) {
        for (const item of v) {
          if (typeof item === "string" && item.trim()) pathways.push(item.trim().toLowerCase());
        }
      }
    }
  }
  const all = [...new Set([...diseases, ...domains, ...modalities, ...cells, ...pathways, ...therapies])];
  return { diseases, domains, modalities, cells, pathways, therapies, all };
}

function haystack(gap: ResearchGapCandidate): string {
  return [
    gap.title,
    gap.summary,
    gap.whyItMatters,
    gap.subjectId,
    gap.objectId,
    gap.diseaseId,
    gap.relationshipId,
    gap.coverageLabel,
    gap.detectionSource,
    gap.pilot,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function feedbackForGap(
  gapKey: string,
  feedback: readonly GapFeedbackSignal[] | undefined,
): FeedbackRating | null {
  if (!feedback?.length) return null;
  // Latest signal wins (caller should pass chronologically; we take last match).
  let last: FeedbackRating | null = null;
  for (const f of feedback) {
    if (f.gapKey === gapKey) last = f.rating;
  }
  return last;
}

function buildFactors(
  gap: ResearchGapCandidate,
  profile: ResearchProfileDraft | null | undefined,
  opts?: {
    feedback?: readonly GapFeedbackSignal[];
    /** ISO timestamps keyed by gapKey for recency (updated_at / emitted). */
    updatedAtByKey?: Record<string, string>;
    nowMs?: number;
  },
): RankingFactor[] {
  const tokens = interestTokens(profile);
  const text = haystack(gap);
  const factors: RankingFactor[] = [];

  // Topic match — diseases / free-form topics / title overlap
  const topicHits: string[] = [];
  if (gap.diseaseId && tokens.diseases.includes(gap.diseaseId.toLowerCase())) {
    topicHits.push(`disease ${gap.diseaseId}`);
  }
  for (const t of tokens.all) {
    if (t.length >= 3 && text.includes(t) && !topicHits.includes(t)) {
      topicHits.push(t);
      if (topicHits.length >= 3) break;
    }
  }
  if (topicHits.length) {
    factors.push({
      id: "topic_match",
      label: "Topic match",
      points: WEIGHTS.topic_match + Math.min(2, topicHits.length - 1),
      detail: `Overlaps your focus: ${topicHits.slice(0, 3).join(", ")}.`,
    });
  }

  // Mechanism — modalities, pathways, cells, therapies, concept ids
  const mechHits: string[] = [];
  for (const t of [...tokens.modalities, ...tokens.pathways, ...tokens.cells, ...tokens.therapies, ...tokens.domains]) {
    if (t.length >= 3 && text.includes(t) && !mechHits.includes(t)) mechHits.push(t);
  }
  if (gap.subjectId && tokens.all.includes(gap.subjectId.toLowerCase())) {
    mechHits.push(gap.subjectId);
  }
  if (gap.objectId && tokens.all.includes(gap.objectId.toLowerCase())) {
    mechHits.push(gap.objectId);
  }
  if (mechHits.length) {
    factors.push({
      id: "mechanism",
      label: "Mechanism / modality",
      points: WEIGHTS.mechanism,
      detail: `Mechanism or modality overlap: ${[...new Set(mechHits)].slice(0, 3).join(", ")}.`,
    });
  }

  // Uncertainty — conflict / emerging / pilot uncertainty
  if (gap.detectionSource === "conflict" || gap.coverageLabel === "conflicting") {
    factors.push({
      id: "uncertainty",
      label: "Uncertainty signal",
      points: WEIGHTS.uncertainty + 1,
      detail: "Conflict-sourced ISI signal — framed as uncertainty, not a resolved finding.",
    });
  } else if (gap.coverageLabel === "emerging" || gap.pilot === "melanoma_a") {
    factors.push({
      id: "uncertainty",
      label: "Uncertainty signal",
      points: WEIGHTS.uncertainty,
      detail:
        gap.pilot === "melanoma_a"
          ? "Included in the documented melanoma pilot (Pilot A) uncertainty set."
          : "Emerging-labelled ISI evidence-gap signal.",
    });
  }

  // Coverage honesty
  if (gap.status === "coverage_insufficient" || gap.coverageLabel === "insufficient_coverage") {
    factors.push({
      id: "coverage",
      label: "Coverage honesty",
      points: WEIGHTS.coverage,
      detail:
        "Marked coverage_insufficient — ISI search/Gate C signals incomplete; not a claim of worldwide absence.",
    });
  } else if (gap.coverageLabel === "no_mapped_evidence" || gap.coverageLabel === "awaiting_curation") {
    factors.push({
      id: "coverage",
      label: "Coverage honesty",
      points: WEIGHTS.coverage - 1,
      detail: `Coverage label “${gap.coverageLabel}” from ISI taxonomy.`,
    });
  }

  // Feedback — influence ranking without inventing importance
  const rating = feedbackForGap(gap.gapKey, opts?.feedback);
  if (rating === "useful") {
    factors.push({
      id: "feedback",
      label: "Your feedback",
      points: WEIGHTS.feedback,
      detail: "You marked this gap useful — boosted for your feed only.",
    });
  } else if (rating === "not_relevant") {
    factors.push({
      id: "feedback",
      label: "Your feedback",
      points: -WEIGHTS.feedback,
      detail: "You marked this not relevant — demoted for your feed only.",
    });
  } else if (rating === "unclear") {
    factors.push({
      id: "feedback",
      label: "Your feedback",
      points: -1,
      detail: "You marked this unclear — slight demotion pending clearer dossier context.",
    });
  }

  // Recency — soft boost when we have an updatedAt within ~30 days
  const updated = opts?.updatedAtByKey?.[gap.gapKey];
  if (updated) {
    const now = opts?.nowMs ?? Date.now();
    const ageMs = now - Date.parse(updated);
    if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs < 30 * 24 * 60 * 60 * 1000) {
      factors.push({
        id: "recency",
        label: "Recency",
        points: WEIGHTS.recency,
        detail: "Recently updated in ISI Discovery records (last 30 days).",
      });
    }
  }

  return factors;
}

/** Rank candidates for a profile without inventing scientific importance. */
export function recommendGapsForProfile(
  gaps: readonly ResearchGapCandidate[],
  profile: ResearchProfileDraft | null | undefined,
  opts?: {
    feedback?: readonly GapFeedbackSignal[];
    updatedAtByKey?: Record<string, string>;
    nowMs?: number;
  },
): RecommendReason[] {
  return gaps
    .map((gap) => {
      const factors = buildFactors(gap, profile, opts);
      const score = factors.reduce((sum, f) => sum + f.points, 0);
      const because =
        factors.length > 0
          ? factors.map((f) => f.detail)
          : [
              "Listed from ISI deterministic detection — not personalised beyond pilot defaults.",
            ];
      return {
        gapKey: gap.gapKey,
        score,
        because,
        factors,
        disclaimer: RANKING_POLICY.disclaimer,
      };
    })
    .sort((a, b) => b.score - a.score || a.gapKey.localeCompare(b.gapKey));
}

/** Reorder radar items by recommendation score while preserving item payloads. */
export function orderByRecommendation<T extends { gapKey: string }>(
  items: readonly T[],
  recommendations: readonly RecommendReason[],
): T[] {
  const rank = new Map(recommendations.map((r, i) => [r.gapKey, { score: r.score, i }]));
  return [...items].sort((a, b) => {
    const ra = rank.get(a.gapKey);
    const rb = rank.get(b.gapKey);
    const sa = ra?.score ?? -Infinity;
    const sb = rb?.score ?? -Infinity;
    if (sb !== sa) return sb - sa;
    return a.gapKey.localeCompare(b.gapKey);
  });
}

export function reasonMap(recommendations: readonly RecommendReason[]): Record<string, RecommendReason> {
  const out: Record<string, RecommendReason> = {};
  for (const r of recommendations) out[r.gapKey] = r;
  return out;
}

/** Format a short “Recommended because…” line for UI. */
export function recommendedBecauseLine(reason: RecommendReason | undefined, max = 2): string | null {
  if (!reason?.because.length) return null;
  const parts = reason.because.slice(0, max);
  return `Recommended because ${parts.join(" · ")}`;
}

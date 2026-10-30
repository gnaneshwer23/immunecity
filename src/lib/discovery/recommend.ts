/**
 * Explainable “recommended because…” stub from profile interests.
 * Template-based — no fabricated novelty scores.
 */
import type { ResearchGapCandidate } from "@/lib/discovery/types";
import type { ResearchProfileDraft } from "@/lib/discovery/types";

export type RecommendReason = {
  gapKey: string;
  score: number;
  because: string[];
};

function interestTokens(profile: ResearchProfileDraft | null | undefined): string[] {
  if (!profile) return [];
  const tokens = [
    ...profile.focusDiseases,
    ...profile.focusDomains,
    ...profile.modalities,
  ];
  const interests = profile.interests;
  if (interests && typeof interests === "object") {
    for (const v of Object.values(interests)) {
      if (typeof v === "string" && v.trim()) tokens.push(v.trim());
      if (Array.isArray(v)) {
        for (const item of v) {
          if (typeof item === "string" && item.trim()) tokens.push(item.trim());
        }
      }
    }
  }
  return tokens.map((t) => t.toLowerCase());
}

/** Rank candidates for a profile without inventing scientific importance. */
export function recommendGapsForProfile(
  gaps: readonly ResearchGapCandidate[],
  profile: ResearchProfileDraft | null | undefined,
): RecommendReason[] {
  const tokens = interestTokens(profile);
  return gaps.map((gap) => {
    const because: string[] = [];
    let score = 0;
    if (gap.pilot === "melanoma_a") {
      score += 1;
      because.push("Included in the documented melanoma pilot (Pilot A) uncertainty set.");
    }
    if (gap.diseaseId && tokens.includes(gap.diseaseId.toLowerCase())) {
      score += 3;
      because.push(`Matches your focus disease id ${gap.diseaseId}.`);
    }
    if (gap.subjectId && tokens.includes(gap.subjectId.toLowerCase())) {
      score += 2;
      because.push(`Matches a focus concept (${gap.subjectId}).`);
    }
    if (gap.objectId && tokens.includes(gap.objectId.toLowerCase())) {
      score += 2;
      because.push(`Matches a focus concept (${gap.objectId}).`);
    }
    for (const t of tokens) {
      if (t.length >= 3 && gap.title.toLowerCase().includes(t)) {
        score += 1;
        because.push(`Title overlaps interest “${t}”.`);
        break;
      }
    }
    if (because.length === 0) {
      because.push("Listed from ISI deterministic detection — not personalised beyond pilot defaults.");
    }
    return { gapKey: gap.gapKey, score, because };
  }).sort((a, b) => b.score - a.score || a.gapKey.localeCompare(b.gapKey));
}

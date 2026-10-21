/**
 * ISI-005 Layer F — citation-to-claim / passage-window validation helpers.
 * Fail-closed: provisional literature is never treated as Gate C support.
 * Full span-ledger entailment still requires curated passage rows; this strengthens
 * MVP heuristics with subject/object token overlap and claim-window checks.
 */

import { byId, edgeByRel } from "@/lib/immune/engine";
import { conceptExtras } from "@/lib/immune/concepts";
import type { CitationLike } from "@/lib/immune/evidenceStatus";

/** Local fold — avoid importing askGrounding (circular with validateAnswerCitations). */
function normaliseAskText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Stopwords excluded from overlap (keep immunology-relevant content tokens). */
const STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "with",
  "by",
  "is",
  "are",
  "was",
  "were",
  "be",
  "this",
  "that",
  "it",
  "as",
  "at",
  "from",
  "via",
  "into",
  "than",
  "not",
  "no",
  "may",
  "can",
  "does",
  "do",
  "how",
  "what",
  "which",
  "when",
  "where",
  "their",
  "its",
  "have",
  "has",
  "had",
]);

export function tokenizeClaimText(s: string): string[] {
  return normaliseAskText(s)
    .split(" ")
    .filter((t) => t.length >= 3 && !STOP.has(t));
}

/** Jaccard-ish overlap on content tokens (0–1). */
export function tokenOverlapRatio(a: string, b: string): number {
  const ta = new Set(tokenizeClaimText(a));
  const tb = new Set(tokenizeClaimText(b));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return union ? inter / union : 0;
}

/** True when window mentions both endpoint concept names (or IDs) for a relationship. */
export function windowMentionsEdgeEndpoints(window: string, relId: string): boolean {
  const edge = edgeByRel[relId];
  if (!edge) return false;
  const sub = byId[edge.subject_id];
  const obj = byId[edge.object_id];
  if (!sub || !obj) return false;
  const w = normaliseAskText(window);
  const subHit =
    hasToken(w, normaliseAskText(sub.name)) ||
    hasToken(w, normaliseAskText(sub.id)) ||
    conceptExtras(sub).aliases.some((a) => hasToken(w, normaliseAskText(a)));
  const objHit =
    hasToken(w, normaliseAskText(obj.name)) ||
    hasToken(w, normaliseAskText(obj.id)) ||
    conceptExtras(obj).aliases.some((a) => hasToken(w, normaliseAskText(a)));
  return subHit && objHit;
}

function hasToken(hay: string, needle: string): boolean {
  if (!needle || !hay) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`).test(hay);
}

/**
 * When a Gate C cite carries claim_text / notes / passage_span, require modest
 * token overlap with the answer window that cites its PMID. Missing passage text
 * skips this check (no fake entailment).
 */
export function passageSupportsWindow(
  window: string,
  cite: CitationLike & { claim_text?: string | null; passage_span?: string | null; notes?: string | null },
  minOverlap = 0.12,
): boolean {
  const passage = [cite.passage_span, cite.claim_text, cite.notes].filter(Boolean).join(" ").trim();
  if (!passage) return true; // no curated span → defer (ID / polarity checks still apply)
  return tokenOverlapRatio(window, passage) >= minOverlap;
}

/** Material scientific assertion cues that require an anchored cite nearby. */
const MATERIAL_ASSERTION =
  /\b(drives?|causes?|induces?|inhibits?|activates?|promotes?|suppresses?|contributes?\s+to|mediates?|upregulates?|downregulates?|binds?\s+to|blocks?)\b/i;

/**
 * Split answer into sentences; flag material assertions that lack a nearby
 * concept/edge/PMID cite or reviewed evidence_id marker.
 */
export function findUnaanchoredMaterialClaims(text: string): string[] {
  const gaps: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  for (const s of sentences) {
    if (!MATERIAL_ASSERTION.test(s)) continue;
    // Skip meta / policy / honesty lines.
    if (/\b(unreviewed|provisional|not\s+gate\s*c|do not|cannot|abstain|candidate)\b/i.test(s)) continue;
    const hasCite =
      /\]\(concept:[^)]+\)/.test(s) ||
      /\]\(edge:[^)]+\)/.test(s) ||
      /\bPMID[:\s]*\d{6,9}\b/i.test(s) ||
      /\bevidence_id\s*[:=]\s*\S+/i.test(s) ||
      /\bEV-[A-Z0-9-]+\b/i.test(s);
    if (!hasCite) gaps.push(s.slice(0, 120));
  }
  return gaps;
}

/** Provisional PMIDs must never satisfy Gate C support language alone. */
export function provisionalTreatedAsGateC(window: string, pmidIsProvisionalOnly: boolean): boolean {
  if (!pmidIsProvisionalOnly) return false;
  return /(?:(?<!\bnot\s)\bgate\s*c\s+(?:approved|reviewed|support)|(?:has|with)\s+gate\s*c|\bapproved\s+support|\bscientifically\s+verified|\bclaim[- ]supported|\breviewed\s+cite(?:s|d)?|\bproven\s+by|\bconfirmed\s+by\s+pmid|\bdefinitively\s+shows)\b/i.test(
    window,
  );
}

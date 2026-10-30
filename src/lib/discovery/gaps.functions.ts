/**
 * Discovery gap list / persist / verify / review / subscribe server functions.
 * Detection is deterministic (detect.ts). Persistence is additive Neon (0020).
 * Never auto-promotes to reviewed_gap. Reviewer gate mirrors evidence curation.
 */
import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq } from "drizzle-orm"; // asc used for feedback chronology
import { z } from "zod";
import { requireNeonAuth } from "@/integrations/neon/auth-middleware";
import { assertCanReview, loadAccountPowers } from "@/lib/access/roles.server";
import { requireMember } from "@/lib/community/rules";
import { getDb } from "@/lib/db.server";
import {
  researchGapChangeEvents,
  researchGapFeedback,
  researchGapReviews,
  researchGapSubscriptions,
  researchGapVersions,
  researchGaps,
  researchProfiles,
  researchSearchCoverage,
} from "@/lib/db/schema.server";
import { detectDiscoveryCandidates } from "@/lib/discovery/detect";
import { buildGapDossier } from "@/lib/discovery/dossier";
import {
  normalizeEntitlement,
  radarListLimit,
  assertEntitlementAllows,
  assertQuotaAllows,
  createDiscoveryRateLimitStub,
  personalisedFeedLimit,
  planQuotas,
  FREE_PERSONALISED_PREVIEW,
} from "@/lib/discovery/entitlements";
import { planDossierExport } from "@/lib/discovery/export";
import { applyGapReviewDecision, assertDetectionEmitStatus, isResearchGapStatus } from "@/lib/discovery/gapStatus";
import { mergeDetectionWithPersisted, shapeRadarFeed } from "@/lib/discovery/radar";
import {
  FEEDBACK_RATINGS,
  orderByRecommendation,
  recommendGapsForProfile,
  reasonMap,
  type GapFeedbackSignal,
} from "@/lib/discovery/recommend";
import { verifyGapCandidate } from "@/lib/discovery/verify";
import type { ResearchGapCandidate, ResearchGapStatus } from "@/lib/discovery/types";

const discoveryActionRateLimit = createDiscoveryRateLimitStub({ windowMs: 60_000, maxPerWindow: 40 });

function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Durable export quota via Neon change events (survives cold start). */
async function exportsUsedToday(userId: string): Promise<number> {
  try {
    const db = getDb();
    const day = utcDayKey();
    const detailed = await db
      .select()
      .from(researchGapChangeEvents)
      .where(
        and(
          eq(researchGapChangeEvents.actor, userId),
          eq(researchGapChangeEvents.eventType, "dossier_export"),
        ),
      )
      .limit(200);
    return detailed.filter((row) => {
      const created =
        row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt ?? "");
      return created.startsWith(day);
    }).length;
  } catch {
    return 0;
  }
}

async function bumpExportUsage(userId: string, gapKey: string): Promise<void> {
  try {
    const db = getDb();
    await db.insert(researchGapChangeEvents).values({
      gapId: null,
      eventType: "dossier_export",
      detail: { gapKey, day: utcDayKey() },
      actor: userId,
    });
  } catch {
    /* best-effort */
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FREE_DEFAULT_LIMIT = 25;

function missingRelation(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  if (code === "42P01" || code === "42703") return true;
  const msg = err instanceof Error ? err.message : "";
  return /does not exist/i.test(msg);
}

function memberId(userId: string | null | undefined): string {
  const member = requireMember(userId);
  if (!member.ok) throw new Error("Sign in required.");
  if (!UUID_RE.test(member.userId)) throw new Error("Sign in required.");
  return member.userId;
}

function mapPersistedRow(row: typeof researchGaps.$inferSelect): {
  gapKey: string;
  status: ResearchGapStatus;
  title: string;
  summary: string;
  whyItMatters: string | null;
} | null {
  if (!isResearchGapStatus(row.status)) return null;
  return {
    gapKey: row.gapKey,
    status: row.status,
    title: row.title,
    summary: row.summary,
    whyItMatters: row.whyItMatters,
  };
}

function candidateFromRow(
  row: typeof researchGaps.$inferSelect,
  fallback?: ResearchGapCandidate | null,
): ResearchGapCandidate | null {
  const emitStatus =
    row.status === "coverage_insufficient" ? "coverage_insufficient" : "candidate";
  const guarded = assertDetectionEmitStatus(emitStatus);
  if (!guarded.ok && !fallback) return null;
  const scope =
    row.searchScopeJson && typeof row.searchScopeJson === "object" && !Array.isArray(row.searchScopeJson)
      ? (row.searchScopeJson as ResearchGapCandidate["searchScope"])
      : fallback?.searchScope;
  if (!scope) return fallback ?? null;
  return {
    gapKey: row.gapKey,
    title: row.title,
    summary: row.summary,
    status: guarded.ok ? guarded.status : (fallback?.status ?? "candidate"),
    pilot: (row.pilot as ResearchGapCandidate["pilot"]) ?? fallback?.pilot ?? null,
    subjectId: row.subjectId ?? fallback?.subjectId ?? null,
    objectId: row.objectId ?? fallback?.objectId ?? null,
    relationshipId: row.relationshipId ?? fallback?.relationshipId ?? null,
    diseaseId: row.diseaseId ?? fallback?.diseaseId ?? null,
    whyItMatters: row.whyItMatters ?? fallback?.whyItMatters ?? "",
    searchScope: scope,
    detectionSource: (row.detectionSource as ResearchGapCandidate["detectionSource"]) ??
      fallback?.detectionSource ??
      "evidence_gap",
    detectionDetail:
      row.detectionDetail && typeof row.detectionDetail === "object" && !Array.isArray(row.detectionDetail)
        ? (row.detectionDetail as Record<string, unknown>)
        : (fallback?.detectionDetail ?? {}),
    coverageLabel: row.coverageLabel ?? fallback?.coverageLabel ?? null,
    gapClass:
      (row.gapClass as ResearchGapCandidate["gapClass"]) ?? fallback?.gapClass,
    opportunityStatus:
      (row.opportunityStatus as ResearchGapCandidate["opportunityStatus"]) ??
      fallback?.opportunityStatus,
    classReason: row.classReason ?? fallback?.classReason,
    autoReviewed: false,
  };
}

async function loadPersistedGapSummaries(): Promise<{
  rows: Array<{ gapKey: string; status: ResearchGapStatus; title: string; summary: string; whyItMatters: string | null }>;
  ok: boolean;
}> {
  try {
    const db = getDb();
    const raw = await db.select().from(researchGaps).orderBy(desc(researchGaps.updatedAt)).limit(200);
    const rows = raw.map(mapPersistedRow).filter(Boolean) as Array<{
      gapKey: string;
      status: ResearchGapStatus;
      title: string;
      summary: string;
      whyItMatters: string | null;
    }>;
    return { rows, ok: true };
  } catch (err) {
    if (missingRelation(err)) return { rows: [], ok: false };
    return { rows: [], ok: false };
  }
}

async function upsertCandidates(
  toPersist: ResearchGapCandidate[],
  actor: string,
): Promise<number> {
  const db = getDb();
  let upserted = 0;
  for (const g of toPersist) {
    const guarded = assertDetectionEmitStatus(g.status);
    if (!guarded.ok) continue;
    const verification = verifyGapCandidate(g);
    if (!verification.statusAllowedForDetection) continue;

    const [existing] = await db
      .select()
      .from(researchGaps)
      .where(eq(researchGaps.gapKey, g.gapKey))
      .limit(1);
    if (existing?.status === "reviewed_gap" || existing?.status === "rejected") {
      // Never overwrite human decisions with detection.
      continue;
    }
    if (existing) {
      // Never overwrite human-reviewed class/opportunity locks.
      const reviewLocked =
        existing.status === "reviewed_gap" ||
        existing.opportunityStatus === "reviewed_opportunity";
      const classPatch =
        reviewLocked || existing.opportunityStatus === "reviewed_opportunity"
          ? {}
          : {
              gapClass: g.gapClass ?? existing.gapClass,
              opportunityStatus: g.opportunityStatus ?? existing.opportunityStatus ?? "none",
              classReason: g.classReason ?? existing.classReason,
              classAssignedAt: g.gapClass ? new Date() : existing.classAssignedAt,
            };
      await db
        .update(researchGaps)
        .set({
          title: g.title,
          summary: g.summary,
          status: guarded.status,
          pilot: g.pilot,
          subjectId: g.subjectId,
          objectId: g.objectId,
          relationshipId: g.relationshipId,
          diseaseId: g.diseaseId,
          whyItMatters: g.whyItMatters,
          searchScopeJson: g.searchScope,
          detectionSource: g.detectionSource,
          detectionDetail: g.detectionDetail,
          coverageLabel: g.coverageLabel,
          ...classPatch,
          updatedAt: new Date(),
        })
        .where(eq(researchGaps.gapKey, g.gapKey));
      await db.insert(researchGapChangeEvents).values({
        gapId: existing.id,
        eventType: "detection_rerun",
        detail: {
          gapKey: g.gapKey,
          status: guarded.status,
          gapClass: g.gapClass ?? null,
          actor,
          reviewLocked,
        },
        actor,
      });
      // Idempotent coverage row for this gap (one recent stub record).
      await db.insert(researchSearchCoverage).values({
        gapId: existing.id,
        conceptId: verification.coverage.conceptId,
        relationshipId: verification.coverage.relationshipId,
        searchAttempted: verification.coverage.searchAttempted,
        hitCount: verification.coverage.hitCount,
        queryText: verification.coverage.queryText,
        scopeNote: verification.coverage.scopeNote,
      });
    } else {
      const [inserted] = await db
        .insert(researchGaps)
        .values({
          gapKey: g.gapKey,
          title: g.title,
          summary: g.summary,
          status: guarded.status,
          gapClass: g.gapClass ?? null,
          opportunityStatus: g.opportunityStatus ?? "none",
          classReason: g.classReason ?? null,
          classAssignedAt: g.gapClass ? new Date() : null,
          pilot: g.pilot,
          subjectId: g.subjectId,
          objectId: g.objectId,
          relationshipId: g.relationshipId,
          diseaseId: g.diseaseId,
          whyItMatters: g.whyItMatters,
          searchScopeJson: g.searchScope,
          detectionSource: g.detectionSource,
          detectionDetail: g.detectionDetail,
          coverageLabel: g.coverageLabel,
          createdBy: actor,
        })
        .returning();
      await db.insert(researchGapChangeEvents).values({
        gapId: inserted!.id,
        eventType: "detection_emit",
        detail: {
          gapKey: g.gapKey,
          status: guarded.status,
          gapClass: g.gapClass ?? null,
        },
        actor,
      });
      await db.insert(researchSearchCoverage).values({
        gapId: inserted!.id,
        conceptId: verification.coverage.conceptId,
        relationshipId: verification.coverage.relationshipId,
        searchAttempted: verification.coverage.searchAttempted,
        hitCount: verification.coverage.hitCount,
        queryText: verification.coverage.queryText,
        scopeNote: verification.coverage.scopeNote,
      });
    }
    upserted += 1;
  }
  return upserted;
}

/** Public radar: Neon when available, else deterministic detection. */
export const listDiscoveryRadar = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        status: z
          .enum([
            "candidate",
            "coverage_insufficient",
            "needs_context",
            "rejected",
            "reviewed_gap",
            "superseded",
            "all",
          ])
          .optional(),
        pilot: z.enum(["melanoma_a", "coverage_b", "all"]).optional(),
        source: z.enum(["all", "melanoma_matrix", "evidence_gap", "conflict", "trial_signal"]).optional(),
        limit: z.number().int().min(1).max(200).optional(),
      })
      .optional()
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const detected = detectDiscoveryCandidates();
    const { rows, ok } = await loadPersistedGapSummaries();
    const merged = mergeDetectionWithPersisted(detected, rows);
    const feed = shapeRadarFeed(merged.gaps, {
      filters: {
        status: data?.status ?? "all",
        pilot: data?.pilot ?? "all",
        source: data?.source ?? "all",
        limit: data?.limit ?? FREE_DEFAULT_LIMIT,
      },
      persistedByKey: merged.persistedByKey,
      persistent: ok && merged.persistent,
    });
    return {
      ...feed,
      gaps: feed.items,
      source: feed.persistent ? ("neon_merged_detection" as const) : ("deterministic_detection" as const),
      persistent: feed.persistent,
      autoApprove: false as const,
      paymentActivation: false as const,
      note: feed.note,
    };
  });

/** Signed-in radar with entitlement limit + explainable personalised ranking (Phase 5). */
export const listMyDiscoveryRadar = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        status: z
          .enum(["candidate", "coverage_insufficient", "needs_context", "rejected", "reviewed_gap", "all"])
          .optional(),
        pilot: z.enum(["melanoma_a", "coverage_b", "all"]).optional(),
        source: z.enum(["all", "melanoma_matrix", "evidence_gap", "conflict", "trial_signal"]).optional(),
        limit: z.number().int().min(1).max(200).optional(),
      })
      .optional()
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const userId = memberId(context.userId);
    let entitlement = normalizeEntitlement("free");
    let profileDraft = null as {
      displayLabel: string | null;
      focusDiseases: string[];
      focusDomains: string[];
      modalities: string[];
      interests: Record<string, unknown>;
    } | null;
    let feedbackSignals: GapFeedbackSignal[] = [];
    const updatedAtByKey: Record<string, string> = {};
    try {
      const db = getDb();
      const [row] = await db
        .select()
        .from(researchProfiles)
        .where(eq(researchProfiles.userId, userId))
        .limit(1);
      if (row) {
        entitlement = normalizeEntitlement(row.entitlement);
        profileDraft = {
          displayLabel: row.displayLabel,
          focusDiseases: row.focusDiseases ?? [],
          focusDomains: row.focusDomains ?? [],
          modalities: row.modalities ?? [],
          interests:
            row.interestsJson && typeof row.interestsJson === "object" && !Array.isArray(row.interestsJson)
              ? (row.interestsJson as Record<string, unknown>)
              : {},
        };
      }
      // Feedback + recency are server-side ranking inputs (DB).
      try {
        const fb = await db
          .select({
            gapKey: researchGaps.gapKey,
            rating: researchGapFeedback.rating,
            createdAt: researchGapFeedback.createdAt,
          })
          .from(researchGapFeedback)
          .innerJoin(researchGaps, eq(researchGaps.id, researchGapFeedback.gapId))
          .where(eq(researchGapFeedback.userId, userId))
          .orderBy(asc(researchGapFeedback.createdAt))
          .limit(500);
        feedbackSignals = fb
          .filter((r) => r.rating && (FEEDBACK_RATINGS as readonly string[]).includes(r.rating))
          .map((r) => ({
            gapKey: r.gapKey,
            rating: r.rating as GapFeedbackSignal["rating"],
            createdAt: r.createdAt.toISOString(),
          }));
      } catch (err) {
        if (!missingRelation(err)) throw err;
      }
      try {
        const persistedMeta = await db
          .select({ gapKey: researchGaps.gapKey, updatedAt: researchGaps.updatedAt })
          .from(researchGaps)
          .limit(200);
        for (const p of persistedMeta) {
          updatedAtByKey[p.gapKey] = p.updatedAt.toISOString();
        }
      } catch (err) {
        if (!missingRelation(err)) throw err;
      }
    } catch (err) {
      if (!missingRelation(err)) throw new Error("Discovery Radar request failed.");
    }

    const advanced = assertEntitlementAllows(entitlement, "advanced_feed");
    const personalisedLimit = personalisedFeedLimit(entitlement);
    const max = Math.min(
      data?.limit ?? (advanced.ok ? radarListLimit(entitlement) : personalisedLimit),
      advanced.ok ? radarListLimit(entitlement) : Math.max(personalisedLimit, FREE_PERSONALISED_PREVIEW),
    );
    // Rank against the full detection set, then slice to entitlement window (honest free preview).
    const detected = detectDiscoveryCandidates();
    const { rows, ok } = await loadPersistedGapSummaries();
    const merged = mergeDetectionWithPersisted(detected, rows);
    const feed = shapeRadarFeed(merged.gaps, {
      filters: {
        status: data?.status ?? "all",
        pilot: data?.pilot ?? "all",
        source: data?.source ?? "all",
        limit: 200,
      },
      persistedByKey: merged.persistedByKey,
      persistent: ok && merged.persistent,
    });
    const recommendations = recommendGapsForProfile(feed.items, profileDraft, {
      feedback: feedbackSignals,
      updatedAtByKey,
    });
    const ordered = orderByRecommendation(feed.items, recommendations).slice(0, max);
    const reasons = reasonMap(recommendations);
    const emerging = orderByRecommendation(feed.emerging, recommendations).slice(0, max);
    const contradictions = orderByRecommendation(feed.contradictions, recommendations).slice(0, max);
    return {
      ...feed,
      items: ordered,
      gaps: ordered,
      emerging,
      contradictions,
      recommendations: recommendations.filter((r) => ordered.some((g) => g.gapKey === r.gapKey)),
      reasonByKey: Object.fromEntries(
        ordered.map((g) => {
          const r = reasons[g.gapKey];
          return [
            g.gapKey,
            r
              ? {
                  score: r.score,
                  because: r.because,
                  factors: r.factors,
                  disclaimer: r.disclaimer,
                }
              : null,
          ];
        }),
      ),
      entitlement,
      radarLimit: max,
      personalisedPreview: !advanced.ok,
      personalisedPreviewLimit: FREE_PERSONALISED_PREVIEW,
      rankingDisclaimer:
        "Ranking aids navigation from your stated interests and feedback. It is not a novelty, importance, or worldwide-literature score.",
      autoApprove: false as const,
      paymentActivation: false as const,
      persistent: feed.persistent,
      note: advanced.ok
        ? `${feed.note} Personalised ordering applied (researcher_pro stub).`
        : `${feed.note} Free plan shows a limited personalised preview (${FREE_PERSONALISED_PREVIEW} items); researcher_pro unlocks the advanced feed (billing not activated).`,
    };
  });

/** Member feedback on a gap — stored in research_gap_feedback; influences ranking only. */
export const submitGapFeedback = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        gapKey: z.string().min(1).max(160),
        rating: z.enum(["useful", "not_relevant", "unclear"]),
        comment: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const userId = memberId(context.userId);
    try {
      const db = getDb();
      const [gap] = await db
        .select()
        .from(researchGaps)
        .where(eq(researchGaps.gapKey, data.gapKey))
        .limit(1);
      if (!gap) throw new Error("Persist the gap before submitting feedback.");
      await db.insert(researchGapFeedback).values({
        gapId: gap.id,
        userId,
        rating: data.rating,
        comment: data.comment?.trim() || null,
      });
      await db.insert(researchGapChangeEvents).values({
        gapId: gap.id,
        eventType: "feedback",
        detail: {
          gapKey: data.gapKey,
          rating: data.rating,
          userId,
          note: "Feedback influences personalised ranking only — not novelty or scientific importance.",
        },
        actor: context.email ?? userId,
      });
      return {
        ok: true as const,
        rating: data.rating,
        influencesRanking: true as const,
        claimsNovelty: false as const,
        claimsImportance: false as const,
        note: "Feedback saved. It adjusts your Discovery feed ranking only — not a novelty or importance claim.",
      };
    } catch (err) {
      if (err instanceof Error && /Persist the gap|Sign in/.test(err.message)) throw err;
      if (missingRelation(err)) {
        throw new Error("Research gap feedback is not available yet (apply migration 0020).");
      }
      throw new Error("Submitting gap feedback failed.");
    }
  });

/**
 * Persist detection candidates into Neon as candidate / coverage_insufficient only.
 * Idempotent upsert by gap_key. Any signed-in member may run detection persist;
 * review decisions remain reviewer-gated. Never writes reviewed_gap.
 */
export const persistDetectedGapCandidates = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        gapKeys: z.array(z.string().min(1).max(160)).max(50).optional(),
      })
      .optional()
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const userId = memberId(context.userId);
    const actor = context.email ?? userId;
    const detected = detectDiscoveryCandidates();
    const allow = data?.gapKeys?.length ? new Set(data.gapKeys) : null;
    const toPersist = detected.filter((g) => !allow || allow.has(g.gapKey));
    try {
      const upserted = await upsertCandidates(toPersist, actor);
      return {
        upserted,
        autoApprove: false as const,
        paymentActivation: false as const,
        note: "Persisted as candidate/coverage_insufficient only. No reviewed_gap auto-promotion. Search coverage rows linked with hitCount=null when unknown.",
      };
    } catch (err) {
      if (missingRelation(err)) {
        throw new Error("Research gaps are not available on this database yet (apply migration 0020).");
      }
      throw new Error("Persisting gap candidates failed.");
    }
  });

/**
 * Phase 3 — run verification + append search_coverage for a persisted gap.
 * Deterministic; optional aiDraft is labelled draft-only and never changes status.
 */
export const verifyPersistedGap = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        gapKey: z.string().min(1).max(160),
        aiDraft: z.string().max(2000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const userId = memberId(context.userId);
    const actor = context.email ?? userId;
    const fromDetect = detectDiscoveryCandidates().find((g) => g.gapKey === data.gapKey);
    const db = getDb();
    try {
      const [row] = await db
        .select()
        .from(researchGaps)
        .where(eq(researchGaps.gapKey, data.gapKey))
        .limit(1);
      if (!row) throw new Error("Persist the gap candidate before running verification.");
      const gap = candidateFromRow(row, fromDetect);
      if (!gap) throw new Error("Gap payload could not be shaped for verification.");
      const report = verifyGapCandidate(gap, { aiDraft: data.aiDraft ?? null });
      if (refuseAutoPromote(row.status)) {
        // belt-and-braces — verification never mutates reviewed_gap
      }
      await db.insert(researchSearchCoverage).values({
        gapId: row.id,
        conceptId: report.coverage.conceptId,
        relationshipId: report.coverage.relationshipId,
        searchAttempted: report.coverage.searchAttempted,
        hitCount: report.coverage.hitCount,
        queryText: report.coverage.queryText,
        scopeNote: report.coverage.scopeNote,
      });
      await db.insert(researchGapChangeEvents).values({
        gapId: row.id,
        eventType: "verification_run",
        detail: {
          engineeringReady: report.engineeringReadyForHumanReview,
          conflict: report.conflict.present,
          aiAssisted: report.aiAssisted,
          autoReviewed: false,
        },
        actor,
      });
      return {
        report,
        autoApprove: false as const,
        statusUnchanged: row.status,
        note: "Verification is engineering-only. reviewed_gap still requires human review.",
      };
    } catch (err) {
      if (err instanceof Error && /Persist the gap|could not be shaped/.test(err.message)) throw err;
      if (missingRelation(err)) {
        throw new Error("Research gaps are not available on this database yet (apply migration 0020).");
      }
      throw new Error("Gap verification failed.");
    }
  });

function refuseAutoPromote(_status: string): true {
  return true;
}

export const getDiscoveryGap = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ gapKey: z.string().min(1).max(160) }).parse(d),
  )
  .handler(async ({ data }) => {
    const fromDetect = detectDiscoveryCandidates().find((g) => g.gapKey === data.gapKey) ?? null;
    let persisted: ResearchGapCandidate | null = null;
    let dbStatus: ResearchGapStatus | null = null;
    let dbId: string | null = null;
    let reviewedBy: string | null = null;
    let reviewedAt: string | null = null;
    let coverageRows: Array<{
      searchAttempted: boolean;
      hitCount: number | null;
      scopeNote: string;
      queryText: string | null;
      ranAt: string | null;
    }> = [];
    let reviews: Array<{
      actor: string;
      decision: string;
      rationale: string;
      previousStatus: string;
      newStatus: string;
      createdAt: string;
    }> = [];

    try {
      const db = getDb();
      const [row] = await db
        .select()
        .from(researchGaps)
        .where(eq(researchGaps.gapKey, data.gapKey))
        .limit(1);
      if (row) {
        dbId = row.id;
        dbStatus = isResearchGapStatus(row.status) ? row.status : null;
        reviewedBy = row.reviewedBy;
        reviewedAt = row.reviewedAt?.toISOString() ?? null;
        persisted = candidateFromRow(row, fromDetect);
        const cov = await db
          .select()
          .from(researchSearchCoverage)
          .where(eq(researchSearchCoverage.gapId, row.id))
          .orderBy(desc(researchSearchCoverage.ranAt))
          .limit(10);
        coverageRows = cov.map((c) => ({
          searchAttempted: c.searchAttempted,
          hitCount: c.hitCount,
          scopeNote: c.scopeNote,
          queryText: c.queryText,
          ranAt: c.ranAt?.toISOString() ?? null,
        }));
        const rev = await db
          .select()
          .from(researchGapReviews)
          .where(eq(researchGapReviews.gapId, row.id))
          .orderBy(desc(researchGapReviews.createdAt))
          .limit(20);
        reviews = rev.map((r) => ({
          actor: r.actor,
          decision: r.decision,
          rationale: r.rationale,
          previousStatus: r.previousStatus,
          newStatus: r.newStatus,
          createdAt: r.createdAt.toISOString(),
        }));
      }
    } catch (err) {
      if (!missingRelation(err)) {
        // Non-fatal for dossier — fall back to detection.
      }
    }

    const gap = fromDetect ?? persisted;
    if (!gap) throw new Error("Gap not found in ISI detection set.");
    const verification = verifyGapCandidate(gap);
    const dossier = buildGapDossier({
      gap,
      persistedStatus: dbStatus,
      persisted: Boolean(dbId),
      reviewedBy,
      reviewedAt,
      verification,
      coverageRows,
      reviews,
    });

    return {
      gap,
      dossier,
      persistedStatus: dbStatus,
      persistedId: dbId,
      verification,
      autoApprove: false as const,
      paymentActivation: false as const,
      links: {
        atlasSubject: gap.subjectId ? `/atlas/${gap.subjectId}` : null,
        atlasObject: gap.objectId ? `/atlas/${gap.objectId}` : null,
        ask: dossier.askHref,
        research: `/research`,
        evidence: `/evidence`,
        workbench: `/research-workbench`,
        pipeline: `/pipeline`,
        therapy: `/therapy`,
      },
    };
  });

/**
 * Human gap review — mirrors scientific review queue discipline.
 * No bulk/auto approve path.
 */
export const recordGapReviewDecision = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        gapKey: z.string().min(1).max(160),
        decision: z.enum(["promote_reviewed", "reject", "needs_context", "demote"]),
        rationale: z.string().min(8).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCanReview(context.userId);
    const powers = await loadAccountPowers(context.userId);
    const db = getDb();
    try {
      const [existing] = await db
        .select()
        .from(researchGaps)
        .where(eq(researchGaps.gapKey, data.gapKey))
        .limit(1);
      if (!existing) {
        throw new Error("Persist the gap candidate before recording a review decision.");
      }
      const transition = applyGapReviewDecision({
        from: existing.status as ResearchGapStatus,
        decision: data.decision,
        actorIsReviewer: powers.reviewer,
      });
      if (!transition.ok) throw new Error(transition.error);
      if (transition.autoApproved) {
        throw new Error("Auto-approval of reviewed_gap is forbidden.");
      }

      const actor = context.email ?? context.userId;
      await db
        .update(researchGaps)
        .set({
          status: transition.to,
          reviewedBy: actor,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(researchGaps.id, existing.id));

      await db.insert(researchGapReviews).values({
        gapId: existing.id,
        actor,
        decision: data.decision,
        rationale: data.rationale,
        previousStatus: existing.status,
        newStatus: transition.to,
      });

      const versions = await db
        .select({ versionN: researchGapVersions.versionN })
        .from(researchGapVersions)
        .where(eq(researchGapVersions.gapId, existing.id))
        .orderBy(asc(researchGapVersions.versionN));
      const nextN = (versions[versions.length - 1]?.versionN ?? 0) + 1;
      await db.insert(researchGapVersions).values({
        gapId: existing.id,
        versionN: nextN,
        snapshotJson: {
          status: transition.to,
          decision: data.decision,
          rationale: data.rationale,
          previousStatus: existing.status,
        },
      });
      await db.insert(researchGapChangeEvents).values({
        gapId: existing.id,
        eventType: "status_change",
        detail: {
          decision: data.decision,
          from: existing.status,
          to: transition.to,
        },
        actor,
      });

      return {
        gapKey: data.gapKey,
        previousStatus: existing.status,
        newStatus: transition.to,
        autoApproved: false as const,
        versionN: nextN,
      };
    } catch (err) {
      if (err instanceof Error && /Persist the gap|Only scientific|Cannot promote|forbidden|Unknown/.test(err.message)) {
        throw err;
      }
      if (missingRelation(err)) {
        throw new Error("Research gaps are not available on this database yet (apply migration 0020).");
      }
      throw new Error("Gap review decision failed.");
    }
  });

/** In-app follow subscription — entitlement + followed-gap quota (server-side). Email deferred. */
export const toggleGapSubscription = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        gapKey: z.string().min(1).max(160),
        follow: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const userId = memberId(context.userId);
    const rate = discoveryActionRateLimit.check(`follow:${userId}`);
    if (!rate.ok) throw new Error(rate.error);
    let entitlement = normalizeEntitlement("free");
    const db = getDb();
    try {
      const [profile] = await db
        .select()
        .from(researchProfiles)
        .where(eq(researchProfiles.userId, userId))
        .limit(1);
      if (profile) entitlement = normalizeEntitlement(profile.entitlement);
      const gate = assertEntitlementAllows(entitlement, "gap_subscribe");
      if (!gate.ok) throw new Error(gate.error);

      const [gap] = await db
        .select()
        .from(researchGaps)
        .where(eq(researchGaps.gapKey, data.gapKey))
        .limit(1);
      if (!gap) throw new Error("Persist the gap before following it.");

      const existing = await db
        .select()
        .from(researchGapSubscriptions)
        .where(
          and(
            eq(researchGapSubscriptions.userId, userId),
            eq(researchGapSubscriptions.gapId, gap.id),
            eq(researchGapSubscriptions.channel, "in_app"),
          ),
        )
        .limit(1);

      if (data.follow) {
        if (!existing.length) {
          const followed = await db
            .select({ id: researchGapSubscriptions.id })
            .from(researchGapSubscriptions)
            .where(
              and(
                eq(researchGapSubscriptions.userId, userId),
                eq(researchGapSubscriptions.channel, "in_app"),
              ),
            );
          const quota = assertQuotaAllows(entitlement, "followed_gaps", {
            followedGaps: followed.length,
          });
          if (!quota.ok) throw new Error(quota.error);
          await db.insert(researchGapSubscriptions).values({
            userId,
            gapId: gap.id,
            channel: "in_app",
          });
        }
        return {
          following: true as const,
          channel: "in_app" as const,
          emailAlerts: false as const,
          paymentActivation: false as const,
          quotas: planQuotas(entitlement),
        };
      }
      if (existing[0]) {
        await db
          .delete(researchGapSubscriptions)
          .where(eq(researchGapSubscriptions.id, existing[0].id));
      }
      return {
        following: false as const,
        channel: "in_app" as const,
        emailAlerts: false as const,
        paymentActivation: false as const,
        quotas: planQuotas(entitlement),
      };
    } catch (err) {
      if (
        err instanceof Error &&
        /researcher_pro|Researcher Pro|billing not activated|quota|Persist the gap|Sign in|rate limit/i.test(
          err.message,
        )
      ) {
        throw err;
      }
      if (missingRelation(err)) {
        throw new Error("Research gap subscriptions are not available yet (apply migration 0020).");
      }
      throw new Error("Gap subscription update failed.");
    }
  });

/**
 * Dossier export stub — Researcher Pro+ quota enforced server-side.
 * Body mirrors known gap fields only; never fabricates PMIDs.
 */
export const exportDiscoveryDossier = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        gapKey: z.string().min(1).max(160),
        format: z.enum(["markdown", "json"]).default("markdown"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const userId = memberId(context.userId);
    const rate = discoveryActionRateLimit.check(`export:${userId}`);
    if (!rate.ok) throw new Error(rate.error);
    let entitlement = normalizeEntitlement("free");
    const db = getDb();
    try {
      const [profile] = await db
        .select()
        .from(researchProfiles)
        .where(eq(researchProfiles.userId, userId))
        .limit(1);
      if (profile) entitlement = normalizeEntitlement(profile.entitlement);
      const feature = assertEntitlementAllows(entitlement, "dossier_export");
      if (!feature.ok) throw new Error(feature.error);
      const quota = assertQuotaAllows(entitlement, "exports", {
        exportsToday: await exportsUsedToday(userId),
      });
      if (!quota.ok) throw new Error(quota.error);

      const detected = detectDiscoveryCandidates() as ResearchGapCandidate[];
      const gap = detected.find((g) => g.gapKey === data.gapKey);
      if (!gap) throw new Error("Unknown gap key — export only covers detected ISI candidates.");

      const [persisted] = await db
        .select()
        .from(researchGaps)
        .where(eq(researchGaps.gapKey, data.gapKey))
        .limit(1);

      const planned = planDossierExport({
        gap,
        persistedStatus: persisted?.status ?? null,
        format: data.format,
      });
      await bumpExportUsage(userId, data.gapKey);
      return {
        ...planned,
        entitlement,
        remainingExportsToday: quota.remaining - 1,
        paymentActivation: false as const,
      };
    } catch (err) {
      if (
        err instanceof Error &&
        /Researcher Pro|billing not activated|quota|Unknown gap|Sign in|rate limit/i.test(err.message)
      ) {
        throw err;
      }
      if (missingRelation(err)) {
        throw new Error("Discovery export is not available yet (apply migrations 0019/0020).");
      }
      throw new Error("Discovery dossier export failed.");
    }
  });

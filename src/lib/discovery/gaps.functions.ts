/**
 * Discovery gap list / persist / review server functions.
 * Detection is deterministic (detect.ts). Persistence is additive Neon (0020).
 * Never auto-promotes to reviewed_gap. Reviewer gate mirrors evidence curation.
 */
import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireNeonAuth } from "@/integrations/neon/auth-middleware";
import { assertCanReview, loadAccountPowers } from "@/lib/access/roles.server";
import { requireMember } from "@/lib/community/rules";
import { getDb } from "@/lib/db.server";
import {
  researchGapChangeEvents,
  researchGapReviews,
  researchGapVersions,
  researchGaps,
  researchProfiles,
} from "@/lib/db/schema.server";
import { detectDiscoveryCandidates } from "@/lib/discovery/detect";
import { normalizeEntitlement, radarListLimit } from "@/lib/discovery/entitlements";
import { applyGapReviewDecision, assertDetectionEmitStatus } from "@/lib/discovery/gapStatus";
import { recommendGapsForProfile } from "@/lib/discovery/recommend";
import type { ResearchGapCandidate, ResearchGapStatus } from "@/lib/discovery/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FREE_DEFAULT_LIMIT = 25;

function missingRelation(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  if (code === "42P01" || code === "42703") return true;
  const msg = err instanceof Error ? err.message : "";
  return /does not exist/i.test(msg);
}

/** Public-ish radar: browser-safe detection always available; Neon optional. */
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
        limit: z.number().int().min(1).max(200).optional(),
      })
      .optional()
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const detected = detectDiscoveryCandidates();
    const statusFilter = data?.status ?? "all";
    const pilotFilter = data?.pilot ?? "all";
    let gaps = detected.filter((g) => {
      if (statusFilter !== "all" && g.status !== statusFilter) return false;
      if (pilotFilter !== "all" && g.pilot !== pilotFilter) return false;
      return true;
    });
    const limit = data?.limit ?? FREE_DEFAULT_LIMIT;
    gaps = gaps.slice(0, limit);
    return {
      gaps,
      source: "deterministic_detection" as const,
      persistent: false as const,
      autoApprove: false as const,
      note: "Radar lists ISI-detected candidates only. reviewed_gap requires human review. Missing ISI coverage ≠ worldwide literature absence.",
    };
  });

/** Signed-in radar with entitlement limit + optional recommend reasons. */
export const listMyDiscoveryRadar = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        status: z.enum(["candidate", "coverage_insufficient", "all"]).optional(),
        limit: z.number().int().min(1).max(200).optional(),
      })
      .optional()
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const member = requireMember(context.userId);
    if (!member.ok || !UUID_RE.test(member.userId)) {
      throw new Error("Sign in to open your Discovery Radar.");
    }
    let entitlement = normalizeEntitlement("free");
    let profileDraft = null as {
      displayLabel: string | null;
      focusDiseases: string[];
      focusDomains: string[];
      modalities: string[];
      interests: Record<string, unknown>;
    } | null;
    try {
      const db = getDb();
      const [row] = await db
        .select()
        .from(researchProfiles)
        .where(eq(researchProfiles.userId, member.userId))
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
    } catch (err) {
      if (!missingRelation(err)) throw new Error("Discovery Radar request failed.");
      // Migration not applied — fall back to free + detection only.
    }

    const max = Math.min(data?.limit ?? radarListLimit(entitlement), radarListLimit(entitlement));
    let gaps = detectDiscoveryCandidates();
    const statusFilter = data?.status ?? "all";
    if (statusFilter !== "all") {
      gaps = gaps.filter((g) => g.status === statusFilter);
    }
    gaps = gaps.slice(0, max);
    const recommendations = recommendGapsForProfile(gaps, profileDraft);
    return {
      gaps,
      recommendations,
      entitlement,
      radarLimit: max,
      autoApprove: false as const,
      paymentActivation: false as const,
    };
  });

/**
 * Persist detection candidates into Neon as candidate / coverage_insufficient only.
 * Idempotent upsert by gap_key. Never writes reviewed_gap.
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
    await assertCanReview(context.userId);
    const detected = detectDiscoveryCandidates();
    const allow = data?.gapKeys?.length ? new Set(data.gapKeys) : null;
    const toPersist = detected.filter((g) => !allow || allow.has(g.gapKey));
    const db = getDb();
    let upserted = 0;
    try {
      for (const g of toPersist) {
        const guarded = assertDetectionEmitStatus(g.status);
        if (!guarded.ok) continue;
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
              updatedAt: new Date(),
            })
            .where(eq(researchGaps.gapKey, g.gapKey));
        } else {
          const [inserted] = await db
            .insert(researchGaps)
            .values({
              gapKey: g.gapKey,
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
              createdBy: "system",
            })
            .returning();
          await db.insert(researchGapChangeEvents).values({
            gapId: inserted!.id,
            eventType: "detection_emit",
            detail: { gapKey: g.gapKey, status: guarded.status },
            actor: "system",
          });
        }
        upserted += 1;
      }
    } catch (err) {
      if (missingRelation(err)) {
        throw new Error("Research gaps are not available on this database yet (apply migration 0020).");
      }
      throw new Error("Persisting gap candidates failed.");
    }
    return {
      upserted,
      autoApprove: false as const,
      note: "Persisted as candidate/coverage_insufficient only. No reviewed_gap auto-promotion.",
    };
  });

export const getDiscoveryGap = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ gapKey: z.string().min(1).max(160) }).parse(d),
  )
  .handler(async ({ data }) => {
    const fromDetect = detectDiscoveryCandidates().find((g) => g.gapKey === data.gapKey);
    let persisted: ResearchGapCandidate | null = null;
    let dbStatus: ResearchGapStatus | null = null;
    let dbId: string | null = null;
    try {
      const db = getDb();
      const [row] = await db
        .select()
        .from(researchGaps)
        .where(eq(researchGaps.gapKey, data.gapKey))
        .limit(1);
      if (row) {
        dbId = row.id;
        dbStatus = row.status as ResearchGapStatus;
        const scope =
          row.searchScopeJson && typeof row.searchScopeJson === "object"
            ? (row.searchScopeJson as ResearchGapCandidate["searchScope"])
            : fromDetect?.searchScope;
        persisted = {
          gapKey: row.gapKey,
          title: row.title,
          summary: row.summary,
          status: (row.status === "coverage_insufficient"
            ? "coverage_insufficient"
            : "candidate") as ResearchGapCandidate["status"],
          pilot: (row.pilot as ResearchGapCandidate["pilot"]) ?? null,
          subjectId: row.subjectId,
          objectId: row.objectId,
          relationshipId: row.relationshipId,
          diseaseId: row.diseaseId,
          whyItMatters: row.whyItMatters ?? "",
          searchScope: scope ??
            fromDetect?.searchScope ?? {
              corpus: "ISI curated graph",
              method: "deterministic Detection",
              dateScope: "2026-10-30",
              note: "ISI curated coverage — not worldwide literature absence.",
            },
          detectionSource: row.detectionSource as ResearchGapCandidate["detectionSource"],
          detectionDetail:
            row.detectionDetail && typeof row.detectionDetail === "object"
              ? (row.detectionDetail as Record<string, unknown>)
              : {},
          coverageLabel: row.coverageLabel,
          autoReviewed: false,
        };
      }
    } catch (err) {
      if (!missingRelation(err)) {
        // Non-fatal for dossier — fall back to detection.
      }
    }
    const gap = fromDetect ?? persisted;
    if (!gap) throw new Error("Gap not found in ISI detection set.");
    return {
      gap,
      persistedStatus: dbStatus,
      persistedId: dbId,
      autoApprove: false as const,
      links: {
        atlasSubject: gap.subjectId ? `/atlas/${gap.subjectId}` : null,
        atlasObject: gap.objectId ? `/atlas/${gap.objectId}` : null,
        ask: `/ask`,
        research: `/research`,
        evidence: `/evidence`,
        workbench: `/research-workbench`,
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

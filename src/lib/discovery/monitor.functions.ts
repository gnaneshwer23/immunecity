/**
 * Phase 6 — Discovery monitor + in-app alerts server functions.
 * Cron-ready runner also lives in scripts/run-discovery-monitor.ts.
 * Never auto-promotes reviewed_gap. Email deferred.
 */
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { requireNeonAuth } from "@/integrations/neon/auth-middleware";
import { requireMember } from "@/lib/community/rules";
import { getDb } from "@/lib/db.server";
import {
  researchDiscoveryAlerts,
  researchGapChangeEvents,
  researchGapSubscriptions,
  researchGapVersions,
  researchGaps,
  researchMonitorRuns,
  researchProfiles,
  researchSearchCoverage,
} from "@/lib/db/schema.server";
import { resolveMonitorAdapters } from "@/lib/discovery/adapters";
import { detectDiscoveryCandidates } from "@/lib/discovery/detect";
import {
  assertQuotaAllows,
  createDiscoveryRateLimitStub,
  normalizeEntitlement,
  planQuotas,
} from "@/lib/discovery/entitlements";
import { planMonitorRun, MONITOR_POLICY, type MonitorRunPlan } from "@/lib/discovery/monitor";
import type { ResearchGapCandidate, ResearchProfileDraft } from "@/lib/discovery/types";

const monitorActionRateLimit = createDiscoveryRateLimitStub({ windowMs: 60_000, maxPerWindow: 20 });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function profileDraftFromRow(row: typeof researchProfiles.$inferSelect | undefined): ResearchProfileDraft | null {
  if (!row) return null;
  return {
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

async function loadFollowedGapKeys(userId: string): Promise<{
  keys: Set<string>;
  gapIdByKey: Record<string, string>;
}> {
  const db = getDb();
  const subs = await db
    .select({
      gapId: researchGapSubscriptions.gapId,
      gapKey: researchGaps.gapKey,
    })
    .from(researchGapSubscriptions)
    .innerJoin(researchGaps, eq(researchGaps.id, researchGapSubscriptions.gapId))
    .where(
      and(eq(researchGapSubscriptions.userId, userId), eq(researchGapSubscriptions.channel, "in_app")),
    );
  const keys = new Set<string>();
  const gapIdByKey: Record<string, string> = {};
  for (const s of subs) {
    keys.add(s.gapKey);
    gapIdByKey[s.gapKey] = s.gapId;
  }
  return { keys, gapIdByKey };
}

async function loadPriorFingerprints(gapIds: string[]): Promise<Record<string, string>> {
  if (!gapIds.length) return {};
  const db = getDb();
  const events = await db
    .select()
    .from(researchGapChangeEvents)
    .where(
      and(
        inArray(researchGapChangeEvents.gapId, gapIds),
        eq(researchGapChangeEvents.eventType, "monitor_fingerprint"),
      ),
    )
    .orderBy(desc(researchGapChangeEvents.createdAt))
    .limit(500);
  const out: Record<string, string> = {};
  // Map gapId → gapKey via a second lookup when needed; fingerprint stored with gapKey in detail.
  for (const e of events) {
    const detail = e.detail as { gapKey?: string; fingerprint?: string };
    if (detail?.gapKey && detail?.fingerprint && !out[detail.gapKey]) {
      out[detail.gapKey] = detail.fingerprint;
    }
  }
  return out;
}

async function applyMonitorPlan(input: {
  plan: MonitorRunPlan;
  actor: string;
  mode: string;
}): Promise<{ alertsInserted: number; changeEvents: number; versions: number }> {
  const db = getDb();
  let alertsInserted = 0;
  let changeEvents = 0;
  let versions = 0;

  for (const alert of input.plan.alerts) {
    try {
      await db.insert(researchDiscoveryAlerts).values({
        userId: alert.userId,
        gapId: alert.gapId,
        gapKey: alert.gapKey,
        dedupeKey: alert.dedupeKey,
        eventType: alert.eventType,
        title: alert.title,
        body: alert.body,
        href: alert.href,
      });
      alertsInserted += 1;
    } catch (err) {
      // Unique violation = idempotent dedupe — ignore.
      const code = (err as { code?: string })?.code;
      if (code === "23505") continue;
      if (missingRelation(err)) throw err;
      throw err;
    }
  }

  for (const re of input.plan.reassessment) {
    const [gap] = await db
      .select()
      .from(researchGaps)
      .where(eq(researchGaps.gapKey, re.gapKey))
      .limit(1);
    if (!gap) continue;
    // Never mutate to reviewed_gap from monitor.
    if (gap.status === "reviewed_gap" || gap.status === "rejected") {
      await db.insert(researchGapChangeEvents).values({
        gapId: gap.id,
        eventType: "monitor_skip_human_decision",
        detail: {
          gapKey: re.gapKey,
          reason: re.reason,
          status: gap.status,
          autoApprove: false,
          scientificReviewImplied: false,
        },
        actor: input.actor,
      });
      changeEvents += 1;
      continue;
    }

    const signal = input.plan.signals.find((s) => s.gapKey === re.gapKey);
    await db.insert(researchGapChangeEvents).values({
      gapId: gap.id,
      eventType: "monitor_reassess",
      detail: {
        gapKey: re.gapKey,
        action: re.action,
        reason: re.reason,
        fingerprint: signal?.fingerprint ?? null,
        autoApprove: false,
        scientificReviewImplied: false,
      },
      actor: input.actor,
    });
    changeEvents += 1;

    if (signal?.fingerprint) {
      await db.insert(researchGapChangeEvents).values({
        gapId: gap.id,
        eventType: "monitor_fingerprint",
        detail: { gapKey: re.gapKey, fingerprint: signal.fingerprint },
        actor: input.actor,
      });
      changeEvents += 1;
    }

    if (re.action === "version_snapshot") {
      const prior = await db
        .select({ versionN: researchGapVersions.versionN })
        .from(researchGapVersions)
        .where(eq(researchGapVersions.gapId, gap.id))
        .orderBy(desc(researchGapVersions.versionN))
        .limit(1);
      const nextN = (prior[0]?.versionN ?? 0) + 1;
      await db.insert(researchGapVersions).values({
        gapId: gap.id,
        versionN: nextN,
        snapshotJson: {
          source: "monitor",
          gapKey: gap.gapKey,
          status: gap.status,
          title: gap.title,
          coverageLabel: gap.coverageLabel,
          note: MONITOR_POLICY.note,
          autoApprove: false,
        },
      });
      versions += 1;
    }
  }

  // Coverage honesty rows when adapter returned a real (non-null) count.
  for (const s of input.plan.signals) {
    if (s.kind !== "adapter_coverage") continue;
    const hitCount = s.detail.hitCount;
    if (typeof hitCount !== "number") continue;
    const [gap] = await db
      .select()
      .from(researchGaps)
      .where(eq(researchGaps.gapKey, s.gapKey))
      .limit(1);
    if (!gap) continue;
    await db.insert(researchSearchCoverage).values({
      gapId: gap.id,
      conceptId: gap.subjectId,
      relationshipId: gap.relationshipId,
      searchAttempted: true,
      hitCount,
      queryText: `monitor:${s.gapKey}`,
      scopeNote:
        typeof s.detail.scopeNote === "string"
          ? s.detail.scopeNote
          : "Monitor adapter coverage — not a claim of worldwide literature absence; not scientific review.",
    });
  }

  return { alertsInserted, changeEvents, versions };
}

/**
 * Run Discovery monitor for the signed-in member (followed gaps + profile interests).
 * Safe to call repeatedly — alert dedupe + fingerprint idempotency.
 */
export const runMyDiscoveryMonitor = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        useLiveAdapters: z.boolean().optional(),
      })
      .optional()
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const userId = memberId(context.userId);
    const actor = context.email ?? userId;
    const rate = monitorActionRateLimit.check(`monitor:${userId}`);
    if (!rate.ok) throw new Error(rate.error);
    try {
      const db = getDb();
      const [profileRow] = await db
        .select()
        .from(researchProfiles)
        .where(eq(researchProfiles.userId, userId))
        .limit(1);
      const entitlement = normalizeEntitlement(profileRow?.entitlement);
      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0);
      const recentRuns = await db.select().from(researchMonitorRuns).limit(500);
      const monitorRunsToday = recentRuns.filter((r) => {
        const detail = r.detail && typeof r.detail === "object" ? (r.detail as Record<string, unknown>) : {};
        const runUser = typeof detail.userId === "string" ? detail.userId : null;
        return runUser === userId && r.startedAt >= dayStart;
      }).length;
      const quota = assertQuotaAllows(entitlement, "monitor_runs", { monitorRunsToday });
      if (!quota.ok) throw new Error(quota.error);

      const profile = profileDraftFromRow(profileRow);
      const { keys: followed, gapIdByKey } = await loadFollowedGapKeys(userId);

      // Also index all persisted gaps for interest matching.
      const persisted = await db.select().from(researchGaps).limit(200);
      for (const g of persisted) {
        if (!gapIdByKey[g.gapKey]) gapIdByKey[g.gapKey] = g.id;
      }

      const detected = detectDiscoveryCandidates() as ResearchGapCandidate[];
      const adapters = resolveMonitorAdapters(
        data?.useLiveAdapters
          ? process.env
          : { ...process.env, DISCOVERY_LIVE_PUBMED: undefined, DISCOVERY_LIVE_CTGOV: undefined },
      );

      const priorFingerprints = await loadPriorFingerprints(Object.values(gapIdByKey));
      const existingAlerts = await db
        .select({ dedupeKey: researchDiscoveryAlerts.dedupeKey })
        .from(researchDiscoveryAlerts)
        .where(eq(researchDiscoveryAlerts.userId, userId))
        .limit(2000);
      const existingDedupeKeys = new Set(existingAlerts.map((a) => a.dedupeKey));

      // Draft plan without adapter results first (interest / follow / detection change).
      let plan = planMonitorRun({
        userId,
        gaps: detected,
        followedGapKeys: followed,
        profile,
        gapIdByKey,
        priorFingerprints,
        existingDedupeKeys,
      });

      // Thin adapter pass for followed + interest targets only (rate-limited).
      const adapterResults: Record<string, Awaited<ReturnType<typeof adapters.literature.search>>> = {};
      for (const q of plan.adapterQueries.slice(0, 15)) {
        adapterResults[q.gapKey] = await adapters.literature.search(q.query, { limit: 5 });
      }
      plan = planMonitorRun({
        userId,
        gaps: detected,
        followedGapKeys: followed,
        profile,
        gapIdByKey,
        priorFingerprints,
        adapterResults,
        existingDedupeKeys,
      });

      const [run] = await db
        .insert(researchMonitorRuns)
        .values({
          actor,
          mode: adapters.mode,
          status: "running",
          detail: { userId, targets: plan.targets.length },
        })
        .returning();

      const applied = await applyMonitorPlan({ plan, actor, mode: adapters.mode });

      await db
        .update(researchMonitorRuns)
        .set({
          finishedAt: new Date(),
          status: "completed",
          detail: {
            userId,
            mode: adapters.mode,
            targets: plan.targets.length,
            signals: plan.signals.length,
            alertsPlanned: plan.alerts.length,
            ...applied,
            autoApprove: false,
            scientificReviewImplied: false,
            note: MONITOR_POLICY.note,
          },
        })
        .where(eq(researchMonitorRuns.id, run!.id));

      return {
        runId: run!.id,
        mode: adapters.mode,
        targets: plan.targets.length,
        signals: plan.signals.length,
        ...applied,
        autoApprove: false as const,
        scientificReviewImplied: false as const,
        emailAlerts: false as const,
        paymentActivation: false as const,
        entitlement,
        quotas: planQuotas(entitlement),
        monitorRunsRemainingToday: Math.max(0, quota.remaining - 1),
        note: MONITOR_POLICY.note,
      };
    } catch (err) {
      if (
        err instanceof Error &&
        /quota|billing not activated|Researcher Pro|rate limit|Sign in/i.test(err.message)
      ) {
        throw err;
      }
      if (missingRelation(err)) {
        throw new Error(
          "Discovery monitor tables are not available yet (apply migrations 0020/0021).",
        );
      }
      throw new Error("Discovery monitor run failed.");
    }
  });

export const listMyDiscoveryAlerts = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        unreadOnly: z.boolean().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      })
      .optional()
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const userId = memberId(context.userId);
    try {
      const db = getDb();
      const limit = data?.limit ?? 50;
      const rows = data?.unreadOnly
        ? await db
            .select()
            .from(researchDiscoveryAlerts)
            .where(
              and(eq(researchDiscoveryAlerts.userId, userId), isNull(researchDiscoveryAlerts.readAt)),
            )
            .orderBy(desc(researchDiscoveryAlerts.createdAt))
            .limit(limit)
        : await db
            .select()
            .from(researchDiscoveryAlerts)
            .where(eq(researchDiscoveryAlerts.userId, userId))
            .orderBy(desc(researchDiscoveryAlerts.createdAt))
            .limit(limit);

      return {
        items: rows.map((r) => ({
          id: r.id,
          gapKey: r.gapKey,
          eventType: r.eventType,
          title: r.title,
          body: r.body,
          href: r.href,
          read: Boolean(r.readAt),
          createdAt: r.createdAt.toISOString(),
        })),
        emailAlerts: false as const,
        scientificReviewImplied: false as const,
        note: "In-app Discovery alerts only. Updates are not automatic scientific review. Email deferred.",
      };
    } catch (err) {
      if (missingRelation(err)) {
        return {
          items: [],
          emailAlerts: false as const,
          scientificReviewImplied: false as const,
          note: "Discovery alerts table not applied yet (migration 0021).",
        };
      }
      throw new Error("Listing Discovery alerts failed.");
    }
  });

export const markDiscoveryAlertsRead = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        all: z.boolean().optional(),
      })
      .optional()
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const userId = memberId(context.userId);
    try {
      const db = getDb();
      if (data?.id) {
        await db
          .update(researchDiscoveryAlerts)
          .set({ readAt: new Date() })
          .where(
            and(eq(researchDiscoveryAlerts.id, data.id), eq(researchDiscoveryAlerts.userId, userId)),
          );
        return { ok: true as const, emailAlerts: false as const };
      }
      if (data?.all) {
        await db
          .update(researchDiscoveryAlerts)
          .set({ readAt: new Date() })
          .where(
            and(eq(researchDiscoveryAlerts.userId, userId), isNull(researchDiscoveryAlerts.readAt)),
          );
        return { ok: true as const, emailAlerts: false as const };
      }
      return { ok: true as const, emailAlerts: false as const };
    } catch (err) {
      if (missingRelation(err)) {
        throw new Error("Discovery alerts are not available yet (apply migration 0021).");
      }
      throw new Error("Marking Discovery alerts failed.");
    }
  });

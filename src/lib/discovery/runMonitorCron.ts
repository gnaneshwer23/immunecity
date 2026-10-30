/**
 * Shared Discovery monitor cron job — used by CLI (`bun run discovery:monitor`)
 * and Vercel Cron (`GET /api/cron/discovery-monitor`).
 * Fail-closed adapters by default; never auto-promotes reviewed_gap; never pretends email sent.
 */
import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
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
import { planEmailAlertDelivery, sendDiscoveryAlertEmail } from "@/lib/discovery/emailAlerts";
import { MONITOR_POLICY, planMonitorRun } from "@/lib/discovery/monitor";
import type { ResearchProfileDraft } from "@/lib/discovery/types";

export type MonitorCronSummary = {
  runId: string;
  usersProcessed: number;
  alertsInserted: number;
  changeEvents: number;
  versions: number;
  mode: string;
  detected: number;
  autoApprove: false;
  scientificReviewImplied: false;
  emailAlerts: boolean;
  emailDeferred: boolean;
  emailsAttempted: number;
  emailsSent: number;
  emailsFailed: number;
  note: string;
};

function draftFromProfile(row: typeof researchProfiles.$inferSelect): ResearchProfileDraft {
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

export async function runDiscoveryMonitorCronJob(input: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PostgresJsDatabase<any>;
  env?: Record<string, string | undefined>;
  actor?: string;
}): Promise<MonitorCronSummary> {
  const env = input.env ?? (process.env as Record<string, string | undefined>);
  const db = input.db;
  const adapters = resolveMonitorAdapters(env);
  const actor = input.actor ?? env.DISCOVERY_MONITOR_ACTOR ?? "cron:discovery-monitor";
  const emailPlan = planEmailAlertDelivery(env);

  const [run] = await db
    .insert(researchMonitorRuns)
    .values({
      actor,
      mode: adapters.mode,
      status: "running",
      detail: { phase: "cron", emailPlan: emailPlan.reason },
    })
    .returning();

  if (!run) throw new Error("Failed to insert research_monitor_runs row.");

  const detected = detectDiscoveryCandidates();
  const profiles = await db.select().from(researchProfiles).limit(500);
  const allGaps = await db.select().from(researchGaps).limit(500);
  const gapIdByKey: Record<string, string> = {};
  for (const g of allGaps) gapIdByKey[g.gapKey] = g.id;

  let usersProcessed = 0;
  let alertsInserted = 0;
  let changeEvents = 0;
  let versions = 0;
  let emailsAttempted = 0;
  let emailsSent = 0;
  let emailsFailed = 0;

  for (const profile of profiles) {
    const userId = profile.userId;
    const subs = await db
      .select({ gapId: researchGapSubscriptions.gapId, gapKey: researchGaps.gapKey })
      .from(researchGapSubscriptions)
      .innerJoin(researchGaps, eq(researchGaps.id, researchGapSubscriptions.gapId))
      .where(
        and(
          eq(researchGapSubscriptions.userId, userId),
          eq(researchGapSubscriptions.channel, "in_app"),
        ),
      );
    const followed = new Set(subs.map((s) => s.gapKey));
    for (const s of subs) gapIdByKey[s.gapKey] = s.gapId;

    const fpEvents = await db
      .select()
      .from(researchGapChangeEvents)
      .where(eq(researchGapChangeEvents.eventType, "monitor_fingerprint"))
      .orderBy(desc(researchGapChangeEvents.createdAt))
      .limit(500);
    const priorFingerprints: Record<string, string> = {};
    for (const e of fpEvents) {
      const d = e.detail as { gapKey?: string; fingerprint?: string };
      if (d.gapKey && d.fingerprint && !priorFingerprints[d.gapKey]) {
        priorFingerprints[d.gapKey] = d.fingerprint;
      }
    }

    const existing = await db
      .select({ dedupeKey: researchDiscoveryAlerts.dedupeKey })
      .from(researchDiscoveryAlerts)
      .where(eq(researchDiscoveryAlerts.userId, userId))
      .limit(2000);
    const existingDedupeKeys = new Set(existing.map((e) => e.dedupeKey));

    let plan = planMonitorRun({
      userId,
      gaps: detected,
      followedGapKeys: followed,
      profile: draftFromProfile(profile),
      gapIdByKey,
      priorFingerprints,
      existingDedupeKeys,
    });

    const adapterResults: Record<string, Awaited<ReturnType<typeof adapters.literature.search>>> = {};
    for (const q of plan.adapterQueries.slice(0, 10)) {
      adapterResults[q.gapKey] = await adapters.literature.search(q.query, { limit: 5 });
    }
    plan = planMonitorRun({
      userId,
      gaps: detected,
      followedGapKeys: followed,
      profile: draftFromProfile(profile),
      gapIdByKey,
      priorFingerprints,
      adapterResults,
      existingDedupeKeys,
    });

    for (const alert of plan.alerts) {
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

        const to = (env.EMAIL_ALERT_TO ?? "").trim();
        if (emailPlan.canSend && to) {
          emailsAttempted += 1;
          const sent = await sendDiscoveryAlertEmail(
            {
              to,
              subject: `[ISI Discovery] ${alert.title}`,
              text: `${alert.body}\n\n${alert.href ?? ""}\n\nEducational/research alert — not CDS. In-app alert also stored.`,
              alertDedupeKey: alert.dedupeKey,
            },
            env,
          );
          if (sent.ok) emailsSent += 1;
          else emailsFailed += 1;
        }
      } catch (err) {
        const code = (err as { code?: string })?.code;
        if (code === "23505") continue;
        throw err;
      }
    }

    for (const re of plan.reassessment) {
      const gap = allGaps.find((g) => g.gapKey === re.gapKey);
      if (!gap) continue;
      if (gap.status === "reviewed_gap" || gap.status === "rejected") {
        await db.insert(researchGapChangeEvents).values({
          gapId: gap.id,
          eventType: "monitor_skip_human_decision",
          detail: { gapKey: re.gapKey, status: gap.status, autoApprove: false },
          actor,
        });
        changeEvents += 1;
        continue;
      }
      const signal = plan.signals.find((s) => s.gapKey === re.gapKey);
      await db.insert(researchGapChangeEvents).values({
        gapId: gap.id,
        eventType: "monitor_reassess",
        detail: {
          gapKey: re.gapKey,
          action: re.action,
          reason: re.reason,
          fingerprint: signal?.fingerprint ?? null,
          scientificReviewImplied: false,
        },
        actor,
      });
      changeEvents += 1;
      if (signal?.fingerprint) {
        await db.insert(researchGapChangeEvents).values({
          gapId: gap.id,
          eventType: "monitor_fingerprint",
          detail: { gapKey: re.gapKey, fingerprint: signal.fingerprint },
          actor,
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
        await db.insert(researchGapVersions).values({
          gapId: gap.id,
          versionN: (prior[0]?.versionN ?? 0) + 1,
          snapshotJson: {
            source: "monitor_cron",
            gapKey: gap.gapKey,
            status: gap.status,
            note: MONITOR_POLICY.note,
            autoApprove: false,
          },
        });
        versions += 1;
      }
    }

    for (const s of plan.signals) {
      if (s.kind !== "adapter_coverage") continue;
      if (typeof s.detail.hitCount !== "number") continue;
      const gap = allGaps.find((g) => g.gapKey === s.gapKey);
      if (!gap) continue;
      await db.insert(researchSearchCoverage).values({
        gapId: gap.id,
        conceptId: gap.subjectId,
        relationshipId: gap.relationshipId,
        searchAttempted: true,
        hitCount: s.detail.hitCount as number,
        queryText: `monitor_cron:${s.gapKey}`,
        scopeNote:
          typeof s.detail.scopeNote === "string"
            ? s.detail.scopeNote
            : "Monitor cron coverage — not worldwide absence; not scientific review.",
      });
    }

    usersProcessed += 1;
  }

  const summary: MonitorCronSummary = {
    runId: run.id,
    usersProcessed,
    alertsInserted,
    changeEvents,
    versions,
    mode: adapters.mode,
    detected: detected.length,
    autoApprove: false,
    scientificReviewImplied: false,
    emailAlerts: emailPlan.canSend,
    emailDeferred: !emailPlan.canSend,
    emailsAttempted,
    emailsSent,
    emailsFailed,
    note: MONITOR_POLICY.note,
  };

  await db
    .update(researchMonitorRuns)
    .set({
      finishedAt: new Date(),
      status: "completed",
      detail: { ...summary, emailPlanReason: emailPlan.reason },
    })
    .where(eq(researchMonitorRuns.id, run.id));

  return summary;
}

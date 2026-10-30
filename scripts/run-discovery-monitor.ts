/**
 * Discovery Intelligence Phase 6 — cron-ready monitor job.
 *
 * Usage:
 *   bun run discovery:monitor
 *   DISCOVERY_LIVE_PUBMED=1 NCBI_API_KEY=… bun run discovery:monitor
 *
 * Safe to run manually. Idempotent alert dedupe + fingerprint events.
 * Never auto-promotes reviewed_gap. Never fabricates PMIDs.
 * Email alerts deferred.
 *
 * Requires DATABASE_URL (.env.local) and migrations 0020/0021.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  researchDiscoveryAlerts,
  researchGapChangeEvents,
  researchGapSubscriptions,
  researchGapVersions,
  researchGaps,
  researchMonitorRuns,
  researchProfiles,
  researchSearchCoverage,
} from "../src/lib/db/schema.server";
import { resolveMonitorAdapters } from "../src/lib/discovery/adapters";
import { detectDiscoveryCandidates } from "../src/lib/discovery/detect";
import { MONITOR_POLICY, planMonitorRun } from "../src/lib/discovery/monitor";
import type { ResearchProfileDraft } from "../src/lib/discovery/types";

function loadEnvLocal() {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      const key = m[1]!;
      let val = m[2]!.trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

function normalizeUrl(raw: string): string {
  const u = new URL(raw);
  u.searchParams.delete("channel_binding");
  if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
  return u.toString();
}

loadEnvLocal();

const raw = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
if (!raw) {
  console.error("missing_database_url");
  process.exit(1);
}

const sql = postgres(normalizeUrl(raw), { prepare: false, max: 1 });
const db = drizzle(sql);
const adapters = resolveMonitorAdapters(process.env);
const actor = process.env.DISCOVERY_MONITOR_ACTOR ?? "cron:discovery-monitor";

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

async function main() {
  console.log(`discovery_monitor_start mode=${adapters.mode}`);
  console.log(`policy=${MONITOR_POLICY.note}`);

  const [run] = await db
    .insert(researchMonitorRuns)
    .values({
      actor,
      mode: adapters.mode,
      status: "running",
      detail: { phase: "cron" },
    })
    .returning();

  const detected = detectDiscoveryCandidates();
  const profiles = await db.select().from(researchProfiles).limit(500);
  const allGaps = await db.select().from(researchGaps).limit(500);
  const gapIdByKey: Record<string, string> = {};
  for (const g of allGaps) gapIdByKey[g.gapKey] = g.id;

  let usersProcessed = 0;
  let alertsInserted = 0;
  let changeEvents = 0;
  let versions = 0;

  // Users with profiles (interest match) — subscriptions join expands follow set.
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

  await db
    .update(researchMonitorRuns)
    .set({
      finishedAt: new Date(),
      status: "completed",
      detail: {
        usersProcessed,
        alertsInserted,
        changeEvents,
        versions,
        mode: adapters.mode,
        detected: detected.length,
        autoApprove: false,
        scientificReviewImplied: false,
        emailAlerts: false,
        note: MONITOR_POLICY.note,
      },
    })
    .where(eq(researchMonitorRuns.id, run!.id));

  console.log(`run_id=${run!.id}`);
  console.log(`users_processed=${usersProcessed}`);
  console.log(`alerts_inserted=${alertsInserted}`);
  console.log(`change_events=${changeEvents}`);
  console.log(`versions=${versions}`);
  console.log(`auto_approve=false`);
  console.log(`email_alerts=false`);
  console.log("discovery_monitor_done");
  await sql.end({ timeout: 5 });
}

main().catch(async (err) => {
  console.error("discovery_monitor_failed", err instanceof Error ? err.message : err);
  try {
    await sql.end({ timeout: 5 });
  } catch {
    /* ignore */
  }
  process.exit(1);
});

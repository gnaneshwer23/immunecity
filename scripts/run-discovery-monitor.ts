/**
 * Discovery Intelligence — cron-ready monitor job (CLI).
 *
 * Usage:
 *   bun run discovery:monitor
 *   DISCOVERY_LIVE_PUBMED=1 NCBI_API_KEY=… bun run discovery:monitor
 *
 * Vercel Cron: GET /api/cron/discovery-monitor (Bearer CRON_SECRET).
 * Safe to run manually. Idempotent alert dedupe + fingerprint events.
 * Never auto-promotes reviewed_gap. Never fabricates PMIDs.
 * Email deferred unless DISCOVERY_EMAIL_ALERTS=1 + Resend configured.
 *
 * Requires DATABASE_URL (.env.local) and migrations 0020/0021.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { runDiscoveryMonitorCronJob } from "../src/lib/discovery/runMonitorCron";

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

async function main() {
  const summary = await runDiscoveryMonitorCronJob({
    db,
    env: process.env as Record<string, string | undefined>,
  });
  console.log(`discovery_monitor_start mode=${summary.mode}`);
  console.log(`run_id=${summary.runId}`);
  console.log(`users_processed=${summary.usersProcessed}`);
  console.log(`alerts_inserted=${summary.alertsInserted}`);
  console.log(`change_events=${summary.changeEvents}`);
  console.log(`versions=${summary.versions}`);
  console.log(`auto_approve=false`);
  console.log(`email_alerts=${summary.emailAlerts}`);
  console.log(`email_deferred=${summary.emailDeferred}`);
  console.log(`emails_sent=${summary.emailsSent}`);
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

/**
 * Applies drizzle/migrations/0021_research_discovery_monitor.sql when
 * DATABASE_URL in .env.local points at ep-blue-salad.
 * Additive only — in-app alerts + monitor runs. Email deferred.
 * Does not print the connection string.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

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

function hostPrefix(hostname: string): string {
  if (hostname.startsWith("ep-blue-salad")) return "ep-blue-salad";
  if (hostname.startsWith("ep-cool-flower")) return "ep-cool-flower";
  const m = hostname.match(/^(ep-[a-z]+-[a-z]+)/);
  return m?.[1] ?? "other";
}

loadEnvLocal();

const raw = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
if (!raw) {
  console.error("missing_database_url");
  process.exit(1);
}

let prefix = "unparsed";
let normalized = "";
try {
  const u = new URL(raw);
  prefix = hostPrefix(u.hostname);
  normalized = normalizeUrl(raw);
} catch {
  console.log("host_prefix=unparsed");
  console.log("migration=skipped");
  process.exit(1);
}

console.log(`host_prefix=${prefix}`);
if (prefix !== "ep-blue-salad") {
  console.log("migration=skipped_wrong_host");
  process.exit(0);
}

const ddl = readFileSync(
  resolve(process.cwd(), "drizzle/migrations/0021_research_discovery_monitor.sql"),
  "utf8",
);

const sql = postgres(normalized, { prepare: false, max: 1 });
try {
  await sql.unsafe(ddl);
  const alerts = await sql`select count(*)::int as n from public.research_discovery_alerts`;
  const runs = await sql`select count(*)::int as n from public.research_monitor_runs`;
  console.log("migration=applied");
  console.log(`research_discovery_alerts=${alerts[0]?.n ?? 0}`);
  console.log(`research_monitor_runs=${runs[0]?.n ?? 0}`);
} catch (err) {
  console.error("migration=failed", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}

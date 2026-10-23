/**
 * Applies drizzle/migrations/0011_community_phase3.sql when DATABASE_URL in .env.local
 * points at the live host prefix and evidence_records already has rows.
 * Does not print the connection string. Does not change evidence rows.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

function loadEnvLocal() {
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
  console.log("skip_reason=unparsed_url");
  process.exit(0);
}

console.log(`host_prefix=${prefix}`);

if (prefix !== "ep-blue-salad") {
  console.log("evidence_records=not_checked");
  console.log("migration=skipped");
  console.log("skip_reason=host");
  process.exit(0);
}

const sqlText = readFileSync(resolve(process.cwd(), "drizzle/migrations/0011_community_phase3.sql"), "utf8");
if (/\b(evidence_records|evidence_audit_events|claim_candidates|user_roles)\b/.test(sqlText)) {
  console.error("migration_refused=forbidden_table");
  process.exit(1);
}

const sql = postgres(normalized, { prepare: false, max: 1 });
try {
  let evidence: "missing" | "empty" | "present-nonempty" = "missing";
  try {
    const rows = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM public.evidence_records`;
    const n = Number(rows[0]?.n ?? 0);
    evidence = n > 0 ? "present-nonempty" : "empty";
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== "42P01") {
      console.log("evidence_records=unavailable");
      console.log("migration=skipped");
      console.log("skip_reason=evidence_check_failed");
      process.exit(0);
    }
  }
  console.log(`evidence_records=${evidence}`);
  if (evidence !== "present-nonempty") {
    console.log("migration=skipped");
    console.log("skip_reason=evidence_empty_or_missing");
    process.exit(0);
  }
  await sql.unsafe(sqlText);
  const tables = await sql<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'community_%'
    ORDER BY table_name
  `;
  console.log(`migration=applied`);
  console.log(`community_tables=${tables.map((t) => t.table_name).join(",")}`);
} catch (err) {
  console.error(`migration_failed code=${(err as { code?: string }).code ?? "error"}`);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}

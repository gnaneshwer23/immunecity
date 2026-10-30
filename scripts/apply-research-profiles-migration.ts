/**
 * Applies drizzle/migrations/0019_research_profiles.sql when
 * DATABASE_URL in .env.local points at ep-blue-salad.
 * Additive only — does not change evidence_records, roles, or graph JSON.
 * Does not print the connection string. Does not seed fabricated profiles.
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
  console.log("skip_reason=unparsed_url");
  process.exit(0);
}

console.log(`host_prefix=${prefix}`);
if (prefix !== "ep-blue-salad") {
  console.log("migration=skipped");
  console.log("skip_reason=host_not_ep_blue_salad");
  process.exit(0);
}

const ddl = readFileSync(
  resolve(process.cwd(), "drizzle/migrations/0019_research_profiles.sql"),
  "utf8",
);
// Strip -- line comments so safety prose like "does not alter evidence_records" is not a false positive.
const ddlExecutable = ddl
  .split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");
if (/\b(evidence_records|evidence_audit_events|claim_candidates|user_roles)\b/.test(ddlExecutable)) {
  console.error("migration_refused=forbidden_table");
  process.exit(1);
}

const sql = postgres(normalized, { max: 1, prepare: false });
try {
  const beforeEvidence = await sql`select count(*)::int as n from public.evidence_records`;
  const evidenceBefore = beforeEvidence[0]?.n ?? -1;
  if (evidenceBefore <= 0) {
    console.log("migration=skipped");
    console.log("skip_reason=evidence_empty_or_missing");
    process.exit(0);
  }
  console.log(`evidence_records_before=${evidenceBefore}`);

  await sql.begin(async (tx) => {
    await tx.unsafe(ddl);
  });

  const afterEvidence = await sql`select count(*)::int as n from public.evidence_records`;
  const evidenceAfter = afterEvidence[0]?.n ?? -1;
  if (evidenceBefore !== evidenceAfter) {
    console.error("evidence_records_count_changed");
    console.error(`before=${evidenceBefore} after=${evidenceAfter}`);
    process.exit(1);
  }

  const profiles = await sql`select count(*)::int as n from public.research_profiles`;
  console.log("migration=0019_applied");
  console.log(`research_profiles=${profiles[0]?.n ?? 0}`);
  console.log(`evidence_records=${evidenceAfter}`);
  console.log("note=no_fabricated_profile_seed");
} catch (e) {
  console.error("migration_failed");
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}

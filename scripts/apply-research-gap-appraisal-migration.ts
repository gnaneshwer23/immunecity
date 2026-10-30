/**
 * Applies drizzle/migrations/0025_research_gap_appraisal.sql when
 * DATABASE_URL in .env.local points at ep-blue-salad.
 * Additive appraisal columns only — no Gate C approve, no evidence_records DML.
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

const ddl = readFileSync(resolve(process.cwd(), "drizzle/migrations/0025_research_gap_appraisal.sql"), "utf8");
const ddlExecutable = ddl
  .split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");
if (/\b(UPDATE|DELETE FROM|TRUNCATE)\b/i.test(ddlExecutable)) {
  console.error("migration_refused=dml_not_allowed");
  process.exit(1);
}

const sql = postgres(normalized, { prepare: false, max: 1 });
try {
  const beforeEvidence = await sql`select count(*)::int as n from public.evidence_records`;
  const evidenceBefore = beforeEvidence[0]?.n ?? -1;
  if (evidenceBefore <= 0) {
    console.log("migration=skipped");
    console.log("skip_reason=evidence_empty_or_missing");
    process.exit(0);
  }
  await sql.unsafe(ddl);
  const afterEvidence = await sql`select count(*)::int as n from public.evidence_records`;
  const evidenceAfter = afterEvidence[0]?.n ?? -1;
  if (evidenceAfter !== evidenceBefore) {
    console.error(`evidence_count_drift before=${evidenceBefore} after=${evidenceAfter}`);
    process.exit(1);
  }
  const cols = await sql`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'research_gap_evidence_links'
      and column_name in (
        'scientific_relation', 'screening_decision', 'supporting_passage',
        'study_context', 'appraisal_limitations', 'question_key', 'identifier_validated'
      )
    order by column_name
  `;
  console.log("migration=applied");
  console.log(`evidence_count=${evidenceAfter}`);
  console.log(`appraisal_columns=${cols.map((t) => t.column_name).join(",")}`);
} catch (e) {
  console.error(e instanceof Error ? e.message : "migration_failed");
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}

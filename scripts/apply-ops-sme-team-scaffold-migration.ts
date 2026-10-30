/**
 * Apply 0027_ops_sme_team_scaffold.sql on ep-blue-salad (additive).
 * Usage: bun run db:ops-sme-team-scaffold
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

loadEnvLocal();
const raw = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
if (!raw) {
  console.error("missing_database_url");
  process.exit(1);
}

const sql = postgres(normalizeUrl(raw), { prepare: false, max: 1 });
const migration = readFileSync(
  resolve(process.cwd(), "drizzle/migrations/0027_ops_sme_team_scaffold.sql"),
  "utf8",
);

async function main() {
  await sql.unsafe(migration);
  const evidence = await sql<{ n: string }[]>`select count(*)::text as n from evidence_records`;
  console.log(`applied_0027 evidence_count=${evidence[0]?.n ?? "?"}`);
  console.log("note=no_stripe_no_ti_no_invented_gold");
  await sql.end({ timeout: 5 });
}

main().catch(async (err) => {
  console.error("apply_0027_failed", err instanceof Error ? err.message : err);
  try {
    await sql.end({ timeout: 5 });
  } catch {
    /* ignore */
  }
  process.exit(1);
});

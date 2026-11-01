/**
 * Apply 0028_hsi_gate_c_decisions.sql on ISI Neon (autumn-snow / ep-blue-salad).
 * Refuses HSI red-wave hosts. Usage: bun run db:hsi-gate-c-decisions
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { assertIsiNeonHostForGateC } from "../src/lib/hsi/gateCQueue";

function loadEnvLocal() {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      const key = m[1]!;
      let val = m[2]!.trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
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

try {
  assertIsiNeonHostForGateC(raw);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}

const sql = postgres(normalizeUrl(raw), { prepare: false, max: 1 });
const migration = readFileSync(
  resolve(process.cwd(), "drizzle/migrations/0028_hsi_gate_c_decisions.sql"),
  "utf8",
);

async function main() {
  await sql.unsafe(migration);
  const rows = await sql<{ n: string }[]>`
    select count(*)::text as n from public.hsi_gate_c_decisions
  `;
  console.log(`applied_0028 hsi_gate_c_decisions_count=${rows[0]?.n ?? "?"}`);
  console.log("note=auto_approve_false_no_hsi_grade_flip_autumn_snow_only");
  await sql.end({ timeout: 5 });
}

main().catch(async (err) => {
  console.error("apply_0028_failed", err instanceof Error ? err.message : err);
  try {
    await sql.end({ timeout: 5 });
  } catch {
    /* ignore */
  }
  process.exit(1);
});

/**
 * Applies drizzle/migrations/0018_trial_treatment_line.sql and seeds
 * treatment_line from MELANOMA_PILOT_TRIALS when DATABASE_URL points at
 * ep-blue-salad and evidence_records is non-empty.
 * Additive only — never invents lines; never touches evidence approvals.
 * Does not print the connection string.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { MELANOMA_PILOT_TRIALS } from "../src/data/trialIntelligence";

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
  resolve(process.cwd(), "drizzle/migrations/0018_trial_treatment_line.sql"),
  "utf8",
);
if (/\b(evidence_records|evidence_audit_events|claim_candidates|user_roles)\b/.test(ddl)) {
  console.error("migration_refused=forbidden_table");
  process.exit(1);
}

const sql = postgres(normalized, { max: 1, prepare: false });
try {
  let evidence: "missing" | "empty" | "present-nonempty" = "missing";
  let evidenceBefore: number | null = null;
  try {
    const rows = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM public.evidence_records`;
    const n = Number(rows[0]?.n ?? 0);
    evidenceBefore = n;
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

  await sql.begin(async (tx) => {
    await tx.unsafe(ddl);

    for (const trial of MELANOMA_PILOT_TRIALS) {
      const line = trial.treatmentLine?.trim() || null;
      await tx`
        UPDATE public.clinical_trials
        SET treatment_line = ${line}, updated_at = now()
        WHERE trial_id = ${trial.trialId}
      `;
      for (const arm of trial.arms) {
        const armLine = arm.treatmentLine?.trim() || null;
        await tx`
          UPDATE public.trial_arms
          SET treatment_line = ${armLine}
          WHERE arm_id = ${arm.armId}
        `;
      }
    }
  });

  const evidenceAfter = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM public.evidence_records`;
  const afterN = Number(evidenceAfter[0]?.n ?? -1);
  if (evidenceBefore !== null && afterN !== evidenceBefore) {
    console.error("fail_closed=evidence_count_changed");
    process.exit(1);
  }

  const seeded = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM public.clinical_trials
    WHERE treatment_line IS NOT NULL AND graph_node_id IN ('TR003', 'TR020')
  `;
  console.log(`treatment_line_seeded_trials=${seeded[0]?.n ?? 0}`);
  console.log("migration=applied");
  console.log("seed=fixture_treatment_line");
} catch (err) {
  console.error("migration_failed", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}

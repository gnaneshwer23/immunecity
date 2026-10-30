/**
 * Hardening sprint — verify 0015 + 0016 + 0017 + 0018 on ep-blue-salad.
 * Prints table/column presence and counts only. Never prints DATABASE_URL.
 * Does not seed ontology_mappings (empty-by-design; no fabricated crosswalks).
 *
 * Usage: bun scripts/verify-hardening-migrations.ts
 * npm: bun run db:hardening:verify
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
  console.error("unparsed_url");
  process.exit(1);
}

console.log(`host_prefix=${prefix}`);
if (prefix !== "ep-blue-salad") {
  console.error("skip_reason=host_not_ep_blue_salad");
  process.exit(1);
}

const expectedTrials = MELANOMA_PILOT_TRIALS.length;
const expectedArms = MELANOMA_PILOT_TRIALS.reduce((n, t) => n + t.arms.length, 0);
const expectedEps = MELANOMA_PILOT_TRIALS.reduce(
  (n, t) => n + t.arms.reduce((m, a) => m + a.endpoints.length, 0),
  0,
);

const sql = postgres(normalized, { prepare: false, max: 1 });
let failed = 0;
try {
  const count = async (table: string) => {
    const rows = await sql.unsafe(`SELECT COUNT(*)::int AS n FROM public.${table}`);
    return Number((rows[0] as { n: number } | undefined)?.n ?? 0);
  };
  const present = async (qualified: string) => {
    // qualified is a fixed allow-list string only (never user input).
    const rows = await sql.unsafe(`SELECT to_regclass('${qualified}') AS name`);
    return Boolean((rows[0] as { name: string | null } | undefined)?.name);
  };

  const tables = [
    "clinical_trials",
    "trial_arms",
    "endpoint_results",
    "evidence_collections",
    "evidence_records",
    "user_roles",
    "ontology_mappings",
    "graph_provenance_events",
  ] as const;

  for (const t of tables) {
    const ok = await present(`public.${t}`);
    console.log(`table.${t}=${ok ? "present" : "missing"}`);
    if (!ok) failed += 1;
  }

  const columnPresent = async (table: string, column: string) => {
    const rows = await sql`
      SELECT 1 AS ok
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table}
        AND column_name = ${column}
      LIMIT 1
    `;
    return rows.length > 0;
  };

  for (const [table, column] of [
    ["clinical_trials", "treatment_line"],
    ["trial_arms", "treatment_line"],
  ] as const) {
    const ok = await columnPresent(table, column);
    console.log(`column.${table}.${column}=${ok ? "present" : "missing"}`);
    if (!ok) failed += 1;
  }

  const trials = await count("clinical_trials");
  const arms = await count("trial_arms");
  const eps = await count("endpoint_results");
  const collectionsPresent = await present("public.evidence_collections");
  const collections = collectionsPresent ? await count("evidence_collections") : -1;
  const evidence = await count("evidence_records");
  const roles = await count("user_roles");
  const ontologyPresent = await present("public.ontology_mappings");
  const ontology = ontologyPresent ? await count("ontology_mappings") : -1;
  const provenancePresent = await present("public.graph_provenance_events");
  const provenance = provenancePresent ? await count("graph_provenance_events") : -1;

  console.log(`clinical_trials=${trials} expected=${expectedTrials}`);
  console.log(`trial_arms=${arms} expected=${expectedArms}`);
  console.log(`endpoint_results=${eps} expected=${expectedEps}`);
  console.log(`evidence_collections=${collections}`);
  console.log(`evidence_records=${evidence}`);
  console.log(`user_roles=${roles}`);
  console.log(`ontology_mappings=${ontology} (empty-by-design ok; no fabricated seed)`);
  console.log(`graph_provenance_events=${provenance}`);

  if (trials !== expectedTrials) failed += 1;
  if (arms !== expectedArms) failed += 1;
  if (eps !== expectedEps) failed += 1;
  if (!collectionsPresent) {
    console.error("evidence_collections_missing");
    failed += 1;
  }
  if (!ontologyPresent || !provenancePresent) {
    console.error("ontology_or_provenance_tables_missing");
    failed += 1;
  }

  console.log(failed === 0 ? "verify=ok" : `verify=failed checks=${failed}`);
  process.exit(failed === 0 ? 0 : 1);
} catch (err) {
  console.error(`verify_failed code=${(err as { code?: string }).code ?? "error"}`);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}

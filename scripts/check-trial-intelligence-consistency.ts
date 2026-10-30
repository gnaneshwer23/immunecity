/**
 * Fixture ↔ Postgres consistency for melanoma pilot Trial Intelligence.
 * Requires DATABASE_URL on ep-blue-salad. Does not print the connection string.
 * Exit 0 when counts and fields match src/data/trialIntelligence.ts; else exit 1.
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

function eqVal(a: unknown, b: unknown): boolean {
  if (typeof a === "number" || typeof b === "number") {
    if (a == null && b == null) return true;
    return Number(a) === Number(b);
  }
  return String(a ?? "") === String(b ?? "");
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
const mismatches: string[] = [];

try {
  const evidence = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM public.evidence_records`;
  console.log(`evidence_records=${evidence[0]?.n ?? 0}`);

  const trials = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM public.clinical_trials`;
  const arms = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM public.trial_arms`;
  const results = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM public.endpoint_results`;
  console.log(`clinical_trials=${trials[0]?.n ?? 0} expected=${expectedTrials}`);
  console.log(`trial_arms=${arms[0]?.n ?? 0} expected=${expectedArms}`);
  console.log(`endpoint_results=${results[0]?.n ?? 0} expected=${expectedEps}`);

  if (Number(trials[0]?.n) !== expectedTrials) mismatches.push("clinical_trials_count");
  if (Number(arms[0]?.n) !== expectedArms) mismatches.push("trial_arms_count");
  if (Number(results[0]?.n) !== expectedEps) mismatches.push("endpoint_results_count");

  for (const trial of MELANOMA_PILOT_TRIALS) {
    const [t] = await sql`SELECT * FROM public.clinical_trials WHERE trial_id = ${trial.trialId}`;
    if (!t) {
      mismatches.push(`missing_trial:${trial.trialId}`);
      continue;
    }
    const trialFields: [string, unknown, unknown][] = [
      ["nct_id", t.nct_id, trial.nctId],
      ["acronym", t.acronym, trial.acronym],
      ["graph_node_id", t.graph_node_id, trial.graphNodeId],
      ["primary_pmid", t.primary_pmid, trial.primaryPmid],
      ["primary_doi", t.primary_doi, trial.primaryDoi],
      ["verification_state", t.verification_state, trial.verificationState],
      ["title", t.title, trial.title],
      ["phase", t.phase, trial.phase],
      ["design", t.design, trial.design],
      ["sponsor", t.sponsor, trial.sponsor],
      ["status", t.status, trial.status],
      ["condition_label", t.condition_label, trial.conditionLabel],
      ["population_summary", t.population_summary, trial.populationSummary],
      ["analysis_set_note", t.analysis_set_note, trial.analysisSetNote],
      ["notes", t.notes, trial.notes],
    ];
    for (const [k, a, b] of trialFields) {
      if (!eqVal(a, b)) mismatches.push(`${trial.trialId}.${k}`);
    }

    for (const arm of trial.arms) {
      const [a] = await sql`SELECT * FROM public.trial_arms WHERE arm_id = ${arm.armId}`;
      if (!a) {
        mismatches.push(`missing_arm:${arm.armId}`);
        continue;
      }
      const armFields: [string, unknown, unknown][] = [
        ["trial_id", a.trial_id, trial.trialId],
        ["label", a.label, arm.label],
        ["regimen", a.regimen, arm.regimen],
        ["dose_schedule", a.dose_schedule, arm.doseSchedule],
        ["comparator_role", a.comparator_role, arm.comparatorRole],
        ["enrolled_n", a.enrolled_n, arm.enrolledN],
        ["treated_n", a.treated_n, arm.treatedN],
        ["sort_order", a.sort_order, arm.sortOrder],
      ];
      for (const [k, x, y] of armFields) {
        if (!eqVal(x, y)) mismatches.push(`${arm.armId}.${k}`);
      }

      for (const ep of arm.endpoints) {
        const [e] = await sql`SELECT * FROM public.endpoint_results WHERE result_id = ${ep.resultId}`;
        if (!e) {
          mismatches.push(`missing_endpoint:${ep.resultId}`);
          continue;
        }
        const epFields: [string, unknown, unknown][] = [
          ["arm_id", e.arm_id, arm.armId],
          ["endpoint_type", e.endpoint_type, ep.endpointType],
          ["label", e.label, ep.label],
          ["value_num", e.value_num, ep.valueNum],
          ["value_text", e.value_text, ep.valueText],
          ["unit", e.unit, ep.unit],
          ["ci_lower", e.ci_lower, ep.ciLower],
          ["ci_upper", e.ci_upper, ep.ciUpper],
          ["p_value", e.p_value, ep.pValue],
          ["timepoint", e.timepoint, ep.timepoint],
          ["analysis_set", e.analysis_set, ep.analysisSet],
          ["follow_up", e.follow_up, ep.followUp],
          ["population_note", e.population_note, ep.populationNote],
          ["verification_state", e.verification_state, ep.verificationState],
          ["source_pmid", e.source_pmid, ep.sourcePmid],
          ["source_doi", e.source_doi, ep.sourceDoi],
          ["source_locator", e.source_locator, ep.sourceLocator],
          ["notes", e.notes, ep.notes],
        ];
        for (const [k, x, y] of epFields) {
          if (!eqVal(x, y)) mismatches.push(`${ep.resultId}.${k}`);
        }
      }
    }
  }

  if (mismatches.length) {
    console.log(`mismatches=${mismatches.length}`);
    for (const m of mismatches.slice(0, 40)) console.log(`MISMATCH ${m}`);
    if (mismatches.length > 40) console.log(`…and ${mismatches.length - 40} more`);
    console.log("fixture_db=inconsistent");
    process.exit(1);
  }
  console.log("mismatches=0");
  console.log("fixture_db=consistent");
} catch (err) {
  console.error(`check_failed code=${(err as { code?: string }).code ?? "error"}`);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}

/**
 * Applies drizzle/migrations/0015_clinical_trial_intelligence.sql and seeds
 * verified KEYNOTE-006 / CheckMate 067 rows when DATABASE_URL points at
 * ep-blue-salad and evidence_records is non-empty.
 * Does not print the connection string. Does not change evidence or role rows.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { MELANOMA_PILOT_TRIALS } from "../src/data/trialIntelligence";

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

const sqlText = readFileSync(
  resolve(process.cwd(), "drizzle/migrations/0015_clinical_trial_intelligence.sql"),
  "utf8",
);
if (/\b(evidence_records|evidence_audit_events|claim_candidates|user_roles)\b/.test(sqlText)) {
  console.error("migration_refused=forbidden_table");
  process.exit(1);
}

const sql = postgres(normalized, { prepare: false, max: 1 });
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

  let rolesBefore: number | null = null;
  try {
    const rows = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM public.user_roles`;
    rolesBefore = Number(rows[0]?.n ?? 0);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== "42P01") {
      console.log("migration=skipped");
      console.log("skip_reason=role_check_failed");
      process.exit(0);
    }
  }

  await sql.unsafe(sqlText);

  for (const trial of MELANOMA_PILOT_TRIALS) {
    await sql`
      INSERT INTO public.clinical_trials (
        trial_id, graph_node_id, nct_id, acronym, title, phase, design, sponsor, status,
        condition_label, population_summary, analysis_set_note, verification_state,
        primary_pmid, primary_doi, notes
      ) VALUES (
        ${trial.trialId}, ${trial.graphNodeId}, ${trial.nctId}, ${trial.acronym}, ${trial.title},
        ${trial.phase}, ${trial.design}, ${trial.sponsor}, ${trial.status},
        ${trial.conditionLabel}, ${trial.populationSummary}, ${trial.analysisSetNote},
        ${trial.verificationState}, ${trial.primaryPmid}, ${trial.primaryDoi}, ${trial.notes}
      )
      ON CONFLICT (trial_id) DO UPDATE SET
        graph_node_id = EXCLUDED.graph_node_id,
        nct_id = EXCLUDED.nct_id,
        acronym = EXCLUDED.acronym,
        title = EXCLUDED.title,
        phase = EXCLUDED.phase,
        design = EXCLUDED.design,
        sponsor = EXCLUDED.sponsor,
        status = EXCLUDED.status,
        condition_label = EXCLUDED.condition_label,
        population_summary = EXCLUDED.population_summary,
        analysis_set_note = EXCLUDED.analysis_set_note,
        verification_state = EXCLUDED.verification_state,
        primary_pmid = EXCLUDED.primary_pmid,
        primary_doi = EXCLUDED.primary_doi,
        notes = EXCLUDED.notes,
        updated_at = now()
    `;

    for (const arm of trial.arms) {
      await sql`
        INSERT INTO public.trial_arms (
          arm_id, trial_id, label, regimen, dose_schedule, comparator_role,
          enrolled_n, treated_n, sort_order
        ) VALUES (
          ${arm.armId}, ${trial.trialId}, ${arm.label}, ${arm.regimen}, ${arm.doseSchedule},
          ${arm.comparatorRole}, ${arm.enrolledN}, ${arm.treatedN}, ${arm.sortOrder}
        )
        ON CONFLICT (arm_id) DO UPDATE SET
          trial_id = EXCLUDED.trial_id,
          label = EXCLUDED.label,
          regimen = EXCLUDED.regimen,
          dose_schedule = EXCLUDED.dose_schedule,
          comparator_role = EXCLUDED.comparator_role,
          enrolled_n = EXCLUDED.enrolled_n,
          treated_n = EXCLUDED.treated_n,
          sort_order = EXCLUDED.sort_order
      `;

      for (const ep of arm.endpoints) {
        await sql`
          INSERT INTO public.endpoint_results (
            result_id, arm_id, endpoint_type, label, value_num, value_text, unit,
            ci_lower, ci_upper, p_value, timepoint, analysis_set, follow_up,
            population_note, verification_state, source_pmid, source_doi, source_locator, notes
          ) VALUES (
            ${ep.resultId}, ${arm.armId}, ${ep.endpointType}, ${ep.label}, ${ep.valueNum},
            ${ep.valueText}, ${ep.unit}, ${ep.ciLower}, ${ep.ciUpper}, ${ep.pValue},
            ${ep.timepoint}, ${ep.analysisSet}, ${ep.followUp}, ${ep.populationNote},
            ${ep.verificationState}, ${ep.sourcePmid}, ${ep.sourceDoi}, ${ep.sourceLocator}, ${ep.notes}
          )
          ON CONFLICT (result_id) DO UPDATE SET
            arm_id = EXCLUDED.arm_id,
            endpoint_type = EXCLUDED.endpoint_type,
            label = EXCLUDED.label,
            value_num = EXCLUDED.value_num,
            value_text = EXCLUDED.value_text,
            unit = EXCLUDED.unit,
            ci_lower = EXCLUDED.ci_lower,
            ci_upper = EXCLUDED.ci_upper,
            p_value = EXCLUDED.p_value,
            timepoint = EXCLUDED.timepoint,
            analysis_set = EXCLUDED.analysis_set,
            follow_up = EXCLUDED.follow_up,
            population_note = EXCLUDED.population_note,
            verification_state = EXCLUDED.verification_state,
            source_pmid = EXCLUDED.source_pmid,
            source_doi = EXCLUDED.source_doi,
            source_locator = EXCLUDED.source_locator,
            notes = EXCLUDED.notes
        `;
      }
    }
  }

  const evidenceAfter = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM public.evidence_records`;
  if (Number(evidenceAfter[0]?.n ?? 0) !== evidenceBefore) {
    console.error("migration_refused=evidence_rows_changed");
    process.exit(1);
  }
  if (rolesBefore !== null) {
    const rolesAfter = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM public.user_roles`;
    if (Number(rolesAfter[0]?.n ?? 0) !== rolesBefore) {
      console.error("migration_refused=role_rows_changed");
      process.exit(1);
    }
  }

  const trials = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM public.clinical_trials`;
  const arms = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM public.trial_arms`;
  const results = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM public.endpoint_results`;
  console.log("migration=applied");
  console.log(`clinical_trials=${trials[0]?.n ?? 0}`);
  console.log(`trial_arms=${arms[0]?.n ?? 0}`);
  console.log(`endpoint_results=${results[0]?.n ?? 0}`);
} catch (err) {
  console.error(`migration_failed code=${(err as { code?: string }).code ?? "error"}`);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}

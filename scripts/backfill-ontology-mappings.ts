/**
 * Phase B backfill scaffold for ontology_mappings.
 *
 * Safe by default: dry-run only. Refuses to insert unless:
 *   --apply is passed AND
 *   every isi_id exists in the runtime KG AND
 *   rows come from an explicit JSON file (never auto-scraped / invented).
 *
 * Usage:
 *   bun scripts/backfill-ontology-mappings.ts
 *   bun scripts/backfill-ontology-mappings.ts --file path/to/curated.json --apply
 *
 * JSON shape: OntologyMapping[] (isiId, system, externalId, reviewStatus, …)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { byId } from "../src/lib/immune/engine";
import {
  ONTOLOGY_SYSTEMS,
  type OntologyMapping,
  type OntologySystem,
} from "../src/data/ontologyMappings";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const fileIdx = args.indexOf("--file");
const filePath = fileIdx >= 0 ? args[fileIdx + 1] : null;

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

function parseRows(raw: unknown): OntologyMapping[] {
  if (!Array.isArray(raw)) throw new Error("file_must_be_json_array");
  const systems = new Set<string>(ONTOLOGY_SYSTEMS);
  const out: OntologyMapping[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") throw new Error("invalid_row");
    const r = row as Record<string, unknown>;
    const isiId = String(r.isiId ?? "").trim();
    const system = String(r.system ?? "").trim() as OntologySystem;
    const externalId = String(r.externalId ?? "").trim();
    const reviewStatus = String(r.reviewStatus ?? "unreviewed") as OntologyMapping["reviewStatus"];
    if (!isiId || !externalId) throw new Error("missing_isi_or_external");
    if (!systems.has(system)) throw new Error(`unknown_system:${system}`);
    if (!["unreviewed", "approved", "rejected"].includes(reviewStatus)) {
      throw new Error(`bad_review_status:${reviewStatus}`);
    }
    if (!byId[isiId]) throw new Error(`unknown_isi_id:${isiId}`);
    // Never allow silent approve via backfill without explicit status in file.
    out.push({
      isiId,
      system,
      externalId,
      label: r.label == null ? null : String(r.label),
      reviewStatus,
      notes: r.notes == null ? null : String(r.notes),
    });
  }
  return out;
}

loadEnvLocal();

if (!filePath) {
  console.log("mode=dry_run_scaffold");
  console.log("rows=0");
  console.log("message=Provide --file curated.json (curator-supplied only). No invented crosswalks.");
  console.log("seed_file_mappings=0");
  process.exit(0);
}

const rows = parseRows(JSON.parse(readFileSync(resolve(filePath), "utf8")));
console.log(`parsed_rows=${rows.length}`);
console.log(`approved_in_file=${rows.filter((r) => r.reviewStatus === "approved").length}`);

if (!apply) {
  console.log("mode=dry_run");
  console.log("message=Re-run with --apply to insert on ep-blue-salad (requires DATABASE_URL).");
  process.exit(0);
}

const { default: postgres } = await import("postgres");
const rawUrl = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
if (!rawUrl) {
  console.error("missing_database_url");
  process.exit(1);
}
const u = new URL(rawUrl);
if (!u.hostname.startsWith("ep-blue-salad")) {
  console.error("host_not_ep_blue_salad");
  process.exit(1);
}
u.searchParams.delete("channel_binding");
if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");

const sql = postgres(u.toString(), { max: 1, prepare: false });
try {
  let inserted = 0;
  await sql.begin(async (tx) => {
    for (const r of rows) {
      await tx`
        insert into public.ontology_mappings (isi_id, system, external_id, label, review_status, notes)
        values (${r.isiId}, ${r.system}, ${r.externalId}, ${r.label ?? null}, ${r.reviewStatus}, ${r.notes ?? null})
        on conflict (isi_id, system, external_id) do update set
          label = excluded.label,
          review_status = excluded.review_status,
          notes = excluded.notes,
          updated_at = now()
      `;
      inserted += 1;
    }
  });
  console.log("mode=applied");
  console.log(`upserted=${inserted}`);
} catch (e) {
  console.error("backfill_failed");
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}

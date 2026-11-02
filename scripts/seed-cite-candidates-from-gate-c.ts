/**
 * P2.2 — Seed unreviewed evidence rows for Discovery Gate C human_approved edges.
 * Never sets curation=approved or claim_support=supports. Autumn-snow only.
 *
 * Usage: bun run scripts/seed-cite-candidates-from-gate-c.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { edgeByRel } from "../src/lib/immune/engine";
import { byId } from "../src/lib/immune/engine";
import { assertIsiNeonHostForGateC } from "../src/lib/hsi/gateCQueue";
import {
  buildHsiBridgeCurationQueue,
  listCiteReadyAfterGateCItems,
  parseGateCDecisionStatusByEdge,
} from "../src/lib/hsi/bridgeCurationQueue";

function loadEnvLocal() {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let val = m[2]!.trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[m[1]!]) process.env[m[1]!] = val;
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
const rawDb = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
if (!rawDb) {
  console.error("missing_database_url");
  process.exit(1);
}
try {
  assertIsiNeonHostForGateC(rawDb);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}

const pin = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "public/hsi-discovery/gate-c-decisions.json"),
    "utf8",
  ),
);
const queue = buildHsiBridgeCurationQueue(parseGateCDecisionStatusByEdge(pin));
const citeReady = listCiteReadyAfterGateCItems(queue);

const sql = postgres(normalizeUrl(rawDb), { prepare: false, max: 1 });

async function main() {
  let inserted = 0;
  let skipped = 0;
  for (const row of citeReady) {
    const relId = row.suggestedIsiRelationshipId!;
    const edge = edgeByRel[relId];
    if (!edge) {
      skipped += 1;
      continue;
    }
    const subject = byId[edge.subject_id];
    if (!subject) {
      skipped += 1;
      continue;
    }
    const evidenceId = `hsi-gate-c-cite-${row.edgeId}`;
    const sourceRef = row.pmid ? `PMID:${row.pmid}` : null;
    const notes =
      `[hsi-gate-c-cite-candidate] Discovery Gate C human_approved for ${row.edgeId}. ` +
      `Still requires Check → claim_support=supports → Approve. autoApprove=false. Not CDS.`;

    const result = await sql`
      INSERT INTO public.evidence_records (
        evidence_id, node_id, node_name, node_type, source_type, source_ref,
        pmid, doi, search_query, manifest_status, check_status, curation,
        relationship_id, claim_support, notes
      ) VALUES (
        ${evidenceId},
        ${subject.id},
        ${subject.name},
        ${"concept"},
        ${"pubmed"},
        ${sourceRef},
        ${row.pmid},
        ${row.doi},
        ${null},
        ${"HSI_GATE_C_CITE_CANDIDATE"},
        ${"pending"},
        ${"unreviewed"},
        ${relId},
        ${"unassessed"},
        ${notes}
      )
      ON CONFLICT (evidence_id) DO NOTHING
      RETURNING evidence_id
    `;
    if (result.length) inserted += 1;
    else skipped += 1;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        citeReady: citeReady.length,
        inserted,
        skipped,
        curation: "unreviewed",
        claimSupport: "unassessed",
        autoApprove: false,
        neonTarget: "autumn-snow",
        note: "Cite candidates seeded. Human Check→supports→Approve still required on /curation.",
      },
      null,
      2,
    ),
  );
  await sql.end({ timeout: 5 });
}

main().catch(async (err) => {
  console.error("seed_cite_failed", err instanceof Error ? err.message : err);
  try {
    await sql.end({ timeout: 5 });
  } catch {
    /* ignore */
  }
  process.exit(1);
});

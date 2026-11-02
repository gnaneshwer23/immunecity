/**
 * P2.1 — Upsert operator-authorized Gate C decisions onto ISI autumn-snow.
 * Refuses HSI red-wave. Never auto-approves; never flips hsiGrade.
 *
 * Usage:
 *   bun run scripts/record-operator-gate-c-decisions.ts \
 *     /path/to/operator-authorized.2026-11-02.json
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

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

loadEnvLocal();
const decisionsPath = process.argv[2];
if (!decisionsPath) {
  console.error("usage: bun run scripts/record-operator-gate-c-decisions.ts <decisions.json>");
  process.exit(1);
}

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

const envelope = JSON.parse(readFileSync(resolve(decisionsPath), "utf8"));
const doc = asRecord(envelope);
if (!doc) {
  console.error("invalid_envelope");
  process.exit(1);
}
if (doc.autoApprove === true || doc.productionApproved === true) {
  console.error("refused_auto_or_production_approved");
  process.exit(1);
}
if (doc.isHypothetical === true) {
  console.error("refused_hypothetical_fixture");
  process.exit(1);
}
const decisions = Array.isArray(doc.decisions) ? doc.decisions : null;
if (!decisions?.length) {
  console.error("empty_decisions");
  process.exit(1);
}

const checklistPath = resolve(
  process.cwd(),
  "public/hsi-discovery/gate-c-checklist.json",
);
const checklist = JSON.parse(readFileSync(checklistPath, "utf8")) as {
  rows?: Array<Record<string, unknown>>;
};
const claimByEdge = new Map<string, string>();
const doiByEdge = new Map<string, string | null>();
const spoByEdge = new Map<string, string | null>();
const assertionByEdge = new Map<string, string | null>();
for (const r of checklist.rows ?? []) {
  const edgeId = typeof r.edgeId === "string" ? r.edgeId : "";
  const claimId = typeof r.claimId === "string" ? r.claimId : "";
  if (edgeId && claimId) {
    claimByEdge.set(edgeId, claimId);
    doiByEdge.set(edgeId, typeof r.doi === "string" ? r.doi : null);
    spoByEdge.set(edgeId, typeof r.spoNote === "string" ? r.spoNote : null);
    assertionByEdge.set(
      edgeId,
      typeof r.assertion === "string" ? r.assertion : null,
    );
  }
}

const sql = postgres(normalizeUrl(rawDb), { prepare: false, max: 1 });

async function main() {
  let upserted = 0;
  for (const row of decisions) {
    const d = asRecord(row);
    if (!d) continue;
    const edgeId = typeof d.edgeId === "string" ? d.edgeId : "";
    if (!edgeId) continue;
    if (d.autoApprove === true || d.hsiGradeFlipped === true) {
      throw new Error(`refused_unsafe_flags edge=${edgeId}`);
    }
    const claimId = claimByEdge.get(edgeId);
    if (!claimId) {
      throw new Error(`missing_claim_for_edge ${edgeId}`);
    }
    const status = typeof d.status === "string" ? d.status : "pending";
    const decision = typeof d.decision === "string" ? d.decision : null;
    const reviewerNote =
      typeof d.reviewerNote === "string" ? d.reviewerNote : null;
    const reviewedBy =
      typeof d.reviewedBy === "string" ? d.reviewedBy : "operator";
    const reviewedAt =
      typeof d.reviewedAt === "string" ? new Date(d.reviewedAt) : new Date();
    const isiRelationshipId =
      typeof d.isiRelationshipId === "string" ? d.isiRelationshipId : null;
    const pmid = typeof d.pmid === "string" ? d.pmid : null;

    await sql`
      INSERT INTO public.hsi_gate_c_decisions (
        edge_id, claim_id, isi_relationship_id, pmid, doi, spo_note, assertion,
        pin_source, status, decision, reviewer_note, reviewed_by, reviewed_at,
        auto_approve, hsi_grade_flipped, previous_status, updated_at
      ) VALUES (
        ${edgeId}, ${claimId}, ${isiRelationshipId}, ${pmid},
        ${doiByEdge.get(edgeId) ?? null}, ${spoByEdge.get(edgeId) ?? null},
        ${assertionByEdge.get(edgeId) ?? null},
        ${"hsi-discovery"}, ${status}, ${decision}, ${reviewerNote}, ${reviewedBy},
        ${reviewedAt}, ${false}, ${false}, ${"pending"}, now()
      )
      ON CONFLICT (edge_id) DO UPDATE SET
        claim_id = EXCLUDED.claim_id,
        isi_relationship_id = EXCLUDED.isi_relationship_id,
        pmid = EXCLUDED.pmid,
        doi = EXCLUDED.doi,
        spo_note = EXCLUDED.spo_note,
        assertion = EXCLUDED.assertion,
        status = EXCLUDED.status,
        decision = EXCLUDED.decision,
        reviewer_note = EXCLUDED.reviewer_note,
        reviewed_by = EXCLUDED.reviewed_by,
        reviewed_at = EXCLUDED.reviewed_at,
        auto_approve = false,
        hsi_grade_flipped = false,
        previous_status = public.hsi_gate_c_decisions.status,
        updated_at = now()
    `;
    upserted += 1;
  }

  const counts = await sql<{ status: string; n: string }[]>`
    SELECT status, count(*)::text AS n
    FROM public.hsi_gate_c_decisions
    GROUP BY status
    ORDER BY status
  `;
  console.log(
    JSON.stringify(
      {
        ok: true,
        upserted,
        neonTarget: "autumn-snow",
        autoApprove: false,
        hsiGradeFlipped: false,
        statusCounts: Object.fromEntries(counts.map((c) => [c.status, Number(c.n)])),
        note: "Operator-authorized Gate C decisions recorded. Not CDS. Cite Check→supports→Approve still separate.",
      },
      null,
      2,
    ),
  );
  await sql.end({ timeout: 5 });
}

main().catch(async (err) => {
  console.error("record_gate_c_failed", err instanceof Error ? err.message : err);
  try {
    await sql.end({ timeout: 5 });
  } catch {
    /* ignore */
  }
  process.exit(1);
});

/**
 * P2.3-ISI — Identifier Check for Discovery Gate C cite candidates.
 *
 * Runs PubMed/Crossref metadata checks on autumn-snow `hsi-gate-c-cite-*`
 * evidence rows. May set check_status=verified|ambiguous|… and enrich
 * source_ref from PubMed metadata.
 *
 * NEVER sets curation=approved or claim_support=supports.
 * Human still assesses S-P-O support, then Approve on /curation.
 *
 * Usage: bun run scripts/check-cite-candidates-from-gate-c.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { checkRecord } from "../src/lib/evidenceCheck";
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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
const byEvidenceId = new Map(
  citeReady.map((r) => [`hsi-gate-c-cite-${r.edgeId}`, r] as const),
);

const sql = postgres(normalizeUrl(rawDb), { prepare: false, max: 1 });

async function main() {
  const rows = await sql<{
    id: string;
    evidence_id: string;
    node_name: string;
    source_ref: string | null;
    pmid: string | null;
    doi: string | null;
    relationship_id: string | null;
    claim_support: string | null;
    curation: string;
    check_status: string;
  }[]>`
    SELECT id, evidence_id, node_name, source_ref, pmid, doi,
           relationship_id, claim_support, curation, check_status
    FROM public.evidence_records
    WHERE evidence_id LIKE 'hsi-gate-c-cite-%'
    ORDER BY evidence_id
  `;

  const worksheet: Array<Record<string, unknown>> = [];
  let verified = 0;
  let ambiguous = 0;
  let other = 0;

  for (const row of rows) {
    const bridge = byEvidenceId.get(row.evidence_id);
    let status = row.check_status;
    let detail: Record<string, unknown> = {};
    let sourceRef = row.source_ref;

    const check = await checkRecord({
      id: row.id,
      node_name: row.node_name,
      source_ref: row.source_ref,
      pmid: row.pmid,
      doi: row.doi,
    });
    status = check.status;
    detail = check.detail;

    // PMID-only source_ref often fails title agreement; if PubMed resolved the
    // same PMID, treat as identifier-verified and enrich the citation text.
    const candidate = detail.candidate as
      | { pmid?: string; title?: string; first_author?: string; year?: string; journal?: string }
      | undefined;
    const pmidOnly = /^PMID:\d+$/i.test(String(row.source_ref ?? "").trim());
    if (
      pmidOnly &&
      candidate?.pmid &&
      row.pmid &&
      candidate.pmid === row.pmid &&
      (status === "ambiguous" || status === "verified")
    ) {
      status = "verified";
      sourceRef = [
        candidate.first_author,
        candidate.year,
        candidate.journal,
        candidate.title,
        `PMID:${candidate.pmid}`,
      ]
        .filter(Boolean)
        .join(". ")
        .slice(0, 500);
      detail = {
        ...detail,
        source: "PubMed",
        enrichedFromPmidOnlyRef: true,
        note: "Identifier verified; source_ref enriched from PubMed metadata. claim_support still unassessed.",
      };
    }

    await sql`
      UPDATE public.evidence_records
      SET check_status = ${status},
          check_detail = ${sql.json(detail as never)},
          checked_at = now(),
          source_ref = ${sourceRef}
      WHERE id = ${row.id}::uuid
    `;

    if (status === "verified" || status === "matched") verified += 1;
    else if (status === "ambiguous") ambiguous += 1;
    else other += 1;

    worksheet.push({
      evidenceId: row.evidence_id,
      uuid: row.id,
      hsiEdgeId: bridge?.edgeId ?? null,
      relationshipId: row.relationship_id,
      spo: bridge?.spo?.label ?? bridge?.relLabel ?? null,
      pmid: row.pmid,
      pubmedUrl: row.pmid
        ? `https://pubmed.ncbi.nlm.nih.gov/${row.pmid}/`
        : null,
      checkStatus: status,
      curation: row.curation,
      claimSupport: row.claim_support,
      nextHumanStep:
        status === "verified" || status === "matched"
          ? "Re-read S-P-O vs paper → set claim_support=supports (or partial/contradicts) → Approve"
          : "Resolve identifier check first, then assess claim_support",
      autoApprove: false,
      mayFlipHsiGrade: false,
      notCds: true,
    });

    await sleep(350);
  }

  const outDir = resolve(process.cwd(), "public/hsi-discovery");
  mkdirSync(outDir, { recursive: true });
  const worksheetPath = resolve(outDir, "cite-check-worksheet.json");
  const payload = {
    schemaVersion: "hsi-cite-check-worksheet-1",
    generatedAt: new Date().toISOString(),
    neonTarget: "autumn-snow",
    autoApprove: false,
    mayFlipHsiGrade: false,
    productionApproved: false,
    notCds: true,
    note: "Identifier Check complete for Gate C cite candidates. claim_support and curation still require human assessment on /curation?hsi=cite. Never invent supports.",
    summary: {
      rows: rows.length,
      citeReadyFromPin: citeReady.length,
      verifiedOrMatched: verified,
      ambiguous,
      other,
      stillUnassessedClaimSupport: worksheet.filter(
        (w) => w.claimSupport === "unassessed",
      ).length,
      stillUnreviewed: worksheet.filter((w) => w.curation === "unreviewed")
        .length,
    },
    items: worksheet,
  };
  writeFileSync(worksheetPath, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        ...payload.summary,
        worksheet: "public/hsi-discovery/cite-check-worksheet.json",
        curationFilter: "/curation?hsi=cite#import",
        note: "Check done. Human claim_support → Approve still required.",
      },
      null,
      2,
    ),
  );
  await sql.end({ timeout: 5 });
}

main().catch(async (err) => {
  console.error("cite_check_failed", err instanceof Error ? err.message : err);
  try {
    await sql.end({ timeout: 5 });
  } catch {
    /* ignore */
  }
  process.exit(1);
});

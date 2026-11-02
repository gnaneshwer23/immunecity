/**
 * Dry-run Gate C curator path status.
 *
 * Lists Discovery Gate C + cite Check→supports→Approve pending counts from
 * vendored pins / worksheets. Optional autumn-snow read for live evidence
 * row counts — never writes decisions, never invents supports/approved.
 *
 * Usage:
 *   bun run hsi:curator-status
 *   bun run scripts/gate-c-curator-status.ts --json
 *   bun run scripts/gate-c-curator-status.ts --neon   # read-only SELECT counts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  GATE_C_CURATOR_INVENTORY,
  summarizeGateCCuratorPath,
} from "../src/lib/hsi/gateCCuratorStatus";
import { assertIsiNeonHostForGateC } from "../src/lib/hsi/gateCQueue";

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

function loadJson(rel: string): unknown {
  return JSON.parse(readFileSync(resolve(process.cwd(), rel), "utf8"));
}

function normalizeUrl(raw: string): string {
  const u = new URL(raw);
  u.searchParams.delete("channel_binding");
  if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
  return u.toString();
}

const wantJson = process.argv.includes("--json");
const wantNeon = process.argv.includes("--neon");

const checklist = loadJson("public/hsi-discovery/gate-c-checklist.json");
const decisionsPin = loadJson("public/hsi-discovery/gate-c-decisions.json");
let citeWorksheet: unknown | null = null;
try {
  citeWorksheet = loadJson("public/hsi-discovery/cite-check-worksheet.json");
} catch {
  citeWorksheet = null;
}

const status = summarizeGateCCuratorPath({
  checklist,
  decisionsPin,
  citeWorksheet,
});

type NeonCiteCounts = {
  citeCandidateRows: number;
  verified: number;
  claimSupportUnassessed: number;
  curationUnreviewed: number;
  publicApprovedSupports: number;
  note: string;
};

async function readNeonCiteCounts(): Promise<NeonCiteCounts | null> {
  loadEnvLocal();
  const rawDb = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
  if (!rawDb) {
    console.error("neon_skip: missing DATABASE_URL (pin-only status still valid)");
    return null;
  }
  try {
    assertIsiNeonHostForGateC(rawDb);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
  const postgres = (await import("postgres")).default;
  const sql = postgres(normalizeUrl(rawDb), { prepare: false, max: 1 });
  try {
    const rows = await sql<{
      n: string;
      verified: string;
      unassessed: string;
      unreviewed: string;
      approved_supports: string;
    }[]>`
      SELECT
        count(*)::text AS n,
        count(*) FILTER (
          WHERE check_status IN ('verified', 'matched', 'ok')
        )::text AS verified,
        count(*) FILTER (
          WHERE claim_support IS NULL OR claim_support = 'unassessed'
        )::text AS unassessed,
        count(*) FILTER (
          WHERE curation IS NULL OR curation = 'unreviewed'
        )::text AS unreviewed,
        count(*) FILTER (
          WHERE curation = 'approved' AND claim_support = 'supports'
        )::text AS approved_supports
      FROM public.evidence_records
      WHERE evidence_id LIKE 'hsi-gate-c-cite-%'
    `;
    const r = rows[0]!;
    return {
      citeCandidateRows: Number(r.n),
      verified: Number(r.verified),
      claimSupportUnassessed: Number(r.unassessed),
      curationUnreviewed: Number(r.unreviewed),
      publicApprovedSupports: Number(r.approved_supports),
      note: "Read-only SELECT. No claim_support or curation writes.",
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function main() {
  const neon = wantNeon ? await readNeonCiteCounts() : null;
  const payload = {
    ...status,
    generatedAt: new Date().toISOString(),
    neonLive: neon,
    honesty: {
      autoApprove: false,
      mayFlipHsiGrade: false,
      inventSupportsForbidden: true,
      writesPerformed: false,
      productionApproved: false,
      notCds: true,
    },
  };

  if (wantJson) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log("Gate C curator path — dry-run status (no writes)");
  console.log("neonTarget:", status.neonTarget, "| hsiNeonTarget:", status.hsiNeonTarget);
  console.log("autoApprove:", status.autoApprove, "| notCds:", status.notCds);
  console.log("");
  console.log("Discovery Gate C");
  console.log("  publishPendingMapped:", status.discoveryGateC.publishPendingMapped);
  console.log("  humanApproved (pin):", status.discoveryGateC.humanApproved);
  console.log("  humanRejected (pin):", status.discoveryGateC.humanRejected);
  console.log("  deferred (pin):", status.discoveryGateC.deferred);
  console.log("  actionableRemaining:", status.discoveryGateC.actionableRemaining);
  console.log("  decidedCount:", status.discoveryGateC.decidedCount);
  console.log("");
  console.log("Bridge overlay");
  console.log("  gateCPending:", status.bridge.gateCPending);
  console.log("  neonGateCReady:", status.bridge.neonGateCReady);
  console.log("  citeReadyAfterGateC:", status.bridge.citeReadyAfterGateC);
  console.log("");
  if (status.citePath) {
    console.log("Cite worksheet (pin)");
    console.log("  rows:", status.citePath.rows);
    console.log("  verifiedOrMatched:", status.citePath.verifiedOrMatched);
    console.log(
      "  stillUnassessedClaimSupport:",
      status.citePath.stillUnassessedClaimSupport,
    );
    console.log("  stillUnreviewed:", status.citePath.stillUnreviewed);
    console.log(
      "  readyForHumanSupportsAssess:",
      status.citePath.readyForHumanSupportsAssess,
    );
    console.log(
      "  publicCiteApproved (approved+supports):",
      status.citePath.publicCiteApproved,
    );
  } else {
    console.log("Cite worksheet: missing (run bun run hsi:cite-check)");
  }
  if (neon) {
    console.log("");
    console.log("Neon autumn-snow (read-only)");
    console.log("  citeCandidateRows:", neon.citeCandidateRows);
    console.log("  verified:", neon.verified);
    console.log("  claimSupportUnassessed:", neon.claimSupportUnassessed);
    console.log("  curationUnreviewed:", neon.curationUnreviewed);
    console.log("  publicApprovedSupports:", neon.publicApprovedSupports);
  }
  console.log("");
  console.log("Next human step:");
  console.log(" ", status.nextHumanStep);
  console.log("");
  console.log("UI:", GATE_C_CURATOR_INVENTORY.uiRoutes.map((r) => r.path).join(" · "));
  console.log("Doc: docs/GATE_C_CURATOR_PATH.md");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

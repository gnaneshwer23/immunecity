#!/usr/bin/env bun
/**
 * Audit #3 residual honesty check — ENG CLEARED / HITL BLOCKED.
 * Verifies empty assess log + pin worksheet still 0 supports / 0 publicCiteApproved.
 * Never invents claim_support or Approve. autumn-snow only for live --neon (via curator-status).
 */
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

const root = resolve(import.meta.dir, "..");
const residualPath = resolve(root, "public/hsi-discovery/cite-hitl-residual-worksheet.json");
const citeCheckPath = resolve(root, "public/hsi-discovery/cite-check-worksheet.json");

type ResidualRow = {
  evidenceId: string;
  claimSupport: string;
  curation: string;
  humanAssess: {
    decision: null;
    claimSupportSetTo: null;
    approved: false;
    principal: null;
    assessedAt: null;
    rationale: null;
  };
};

type ResidualWorksheet = {
  schemaVersion: "hsi-cite-hitl-residual-worksheet-1";
  residualId: "audit_3_isi_cite_hitl";
  engineeringScaffold: "CLEARED";
  hitlAcceptance: "BLOCKED";
  autoApprove: false;
  mayFlipHsiGrade: false;
  notCds: true;
  neonTarget: "autumn-snow";
  pinSummary: {
    rows: number;
    readyForHumanSupportsAssess: number;
    publicCiteApproved: 0;
    claimSupportSupports: 0;
    stillUnassessedClaimSupport: number;
  };
  rows: ResidualRow[];
  worksheetHash: string;
};

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function assertResidual(value: unknown): ResidualWorksheet {
  if (!value || typeof value !== "object") throw new Error("Invalid cite HITL residual worksheet");
  const sheet = value as ResidualWorksheet;
  if (sheet.schemaVersion !== "hsi-cite-hitl-residual-worksheet-1") {
    throw new Error("Unsupported cite HITL residual schema");
  }
  if (
    sheet.hitlAcceptance !== "BLOCKED" ||
    sheet.engineeringScaffold !== "CLEARED" ||
    sheet.autoApprove !== false ||
    sheet.mayFlipHsiGrade !== false ||
    sheet.pinSummary.publicCiteApproved !== 0 ||
    sheet.pinSummary.claimSupportSupports !== 0
  ) {
    throw new Error("Cite HITL residual cannot invent supports/Approve clearance");
  }
  if (!Array.isArray(sheet.rows) || sheet.rows.length !== 13) {
    throw new Error("Cite HITL residual must cover 13 cite candidates");
  }
  for (const row of sheet.rows) {
    if (row.claimSupport !== "unassessed" || row.curation !== "unreviewed") {
      throw new Error(`Row ${row.evidenceId} must stay unassessed/unreviewed in residual worksheet`);
    }
    const a = row.humanAssess;
    if (
      a.decision !== null ||
      a.claimSupportSetTo !== null ||
      a.approved !== false ||
      a.principal !== null ||
      a.assessedAt !== null ||
      a.rationale !== null
    ) {
      throw new Error(`Row ${row.evidenceId} cannot invent human assess fields`);
    }
  }
  const {worksheetHash, ...body} = sheet;
  if (worksheetHash !== digest(body)) {
    throw new Error("Cite HITL residual worksheet hash mismatch");
  }
  return sheet;
}

const residual = assertResidual(JSON.parse(readFileSync(residualPath, "utf8")));
const citeCheck = JSON.parse(readFileSync(citeCheckPath, "utf8")) as {
  summary: {
    readyForHumanSupportsAssess: number;
    publicCiteApproved: number;
    stillUnassessedClaimSupport: number;
    rows: number;
  };
};

if (citeCheck.summary.publicCiteApproved !== 0) {
  throw new Error("cite-check worksheet publicCiteApproved must stay 0 until live HITL (do not invent in pin)");
}
if (citeCheck.summary.stillUnassessedClaimSupport !== 13) {
  throw new Error("cite-check worksheet must still show 13 unassessed on pin");
}
if (residual.pinSummary.readyForHumanSupportsAssess !== citeCheck.summary.readyForHumanSupportsAssess) {
  throw new Error("Residual pinSummary drift vs cite-check worksheet");
}

console.log(
  JSON.stringify(
    {
      ok: true,
      engineeringScaffold: residual.engineeringScaffold,
      hitlAcceptance: residual.hitlAcceptance,
      rows: residual.rows.length,
      claimSupportSupports: residual.pinSummary.claimSupportSupports,
      publicCiteApproved: residual.pinSummary.publicCiteApproved,
      readyForHumanSupportsAssess: residual.pinSummary.readyForHumanSupportsAssess,
      neonTarget: residual.neonTarget,
      worksheetHash: residual.worksheetHash,
      next: "Neon Auth reviewer on /curation?hsi=cite → Claim support → Approve; then bun run hsi:curator-status -- --neon",
    },
    null,
    2,
  ),
);

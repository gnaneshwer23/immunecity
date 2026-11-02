/**
 * Gate C curator path — dry-run status helpers (read-only).
 *
 * Aggregates Discovery Gate C + cite Check→supports→Approve queue counts
 * from vendored pins / worksheets. Never writes decisions, never invents
 * claim_support=supports or curation=approved.
 */

import {
  buildHsiBridgeCurationQueue,
  parseGateCDecisionStatusByEdge,
} from "./bridgeCurationQueue";
import {
  buildGateCQueue,
  parseGateCChecklistRows,
  type GateCStatus,
} from "./gateCQueue";

/** Operator inventory — scripts and UI routes for the Gate C / cite path. */
export const GATE_C_CURATOR_INVENTORY = {
  uiRoutes: [
    {
      path: "/hsi/discovery",
      role: "Discovery ASK → MAP → REVIEW; human Gate C queue panel",
    },
    {
      path: "/hsi-consume",
      role: "Load-order / honesty diagnostics; Gate C pending banner",
    },
    {
      path: "/curation?hsi=cite",
      role: "Cite filter after Discovery Gate C approve; Check → claim_support → Approve",
    },
    {
      path: "/curation?hsi=ready",
      role: "Mapped REL handoffs still awaiting Discovery Gate C",
    },
    {
      path: "/curation?hsi=cite#import",
      role: "Deep-link to import / worksheet handoff for cite candidates",
    },
  ],
  scripts: [
    {
      id: "seed-cite",
      command: "bun run scripts/seed-cite-candidates-from-gate-c.ts",
      writes: "Inserts unreviewed hsi-gate-c-cite-* rows (claim_support=unassessed only)",
      inventsApprove: false,
    },
    {
      id: "check-cite",
      command: "bun run hsi:cite-check",
      writes: "Identifier check_status + cite-check-worksheet.json; never supports/approved",
      inventsApprove: false,
    },
    {
      id: "curator-status",
      command: "bun run hsi:curator-status",
      writes: "None (dry-run counts only)",
      inventsApprove: false,
    },
    {
      id: "record-gate-c",
      command: "bun run scripts/record-operator-gate-c-decisions.ts <decisions.json>",
      writes: "Operator-authorized Discovery Gate C decisions → autumn-snow",
      inventsApprove: false,
    },
    {
      id: "migrate-gate-c",
      command: "bun run db:hsi-gate-c-decisions",
      writes: "Schema only (hsi_gate_c_decisions)",
      inventsApprove: false,
    },
  ],
  pins: [
    "public/hsi-discovery/gate-c-checklist.json",
    "public/hsi-discovery/gate-c-decisions.json",
    "public/hsi-discovery/cite-check-worksheet.json",
  ],
  neon: {
    isiGateCWrites: "autumn-snow",
    hsiSubstrate: "red-wave",
    sharedEvidenceDb: false,
  },
} as const;

export type CiteCheckWorksheetItemView = {
  evidenceId: string;
  hsiEdgeId: string | null;
  relationshipId: string | null;
  checkStatus: string | null;
  curation: string | null;
  claimSupport: string | null;
  pmid: string | null;
};

export type CiteCheckWorksheetSummary = {
  rows: number;
  citeReadyFromPin: number | null;
  verifiedOrMatched: number;
  ambiguous: number;
  other: number;
  stillUnassessedClaimSupport: number;
  stillUnreviewed: number;
  /** Identifier verified/matched AND still unassessed — human S-P-O step. */
  readyForHumanSupportsAssess: number;
  /** curation=approved AND claim_support=supports — never invented by scripts. */
  publicCiteApproved: number;
  autoApprove: false;
  productionApproved: false;
  notCds: true;
  neonTarget: "autumn-snow";
  items: CiteCheckWorksheetItemView[];
};

export type GateCCuratorPathStatus = {
  schemaVersion: "hsi-gate-c-curator-status-1";
  neonTarget: "autumn-snow";
  hsiNeonTarget: "red-wave";
  autoApprove: false;
  mayFlipHsiGrade: false;
  productionApproved: false;
  notCds: true;
  inventSupportsForbidden: true;
  discoveryGateC: {
    publishPendingMapped: number;
    humanApproved: number;
    humanRejected: number;
    deferred: number;
    actionableRemaining: number;
    decidedCount: number;
  };
  bridge: {
    gateCPending: number;
    neonGateCReady: number;
    citeReadyAfterGateC: number;
  };
  citePath: CiteCheckWorksheetSummary | null;
  nextHumanStep: string;
  inventory: typeof GATE_C_CURATOR_INVENTORY;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function countDecisionStatuses(
  decisionsPin: unknown,
): Record<"human_approved" | "human_rejected" | "deferred" | "other", number> {
  const doc = asRecord(decisionsPin);
  const raw = Array.isArray(doc?.decisions) ? doc!.decisions : [];
  const out = {
    human_approved: 0,
    human_rejected: 0,
    deferred: 0,
    other: 0,
  };
  for (const row of raw) {
    const r = asRecord(row);
    const status = asString(r?.status) as GateCStatus | null;
    if (status === "human_approved") out.human_approved += 1;
    else if (status === "human_rejected") out.human_rejected += 1;
    else if (status === "deferred") out.deferred += 1;
    else out.other += 1;
  }
  return out;
}

/**
 * Parse cite-check worksheet JSON (from hsi:cite-check). Read-only; never
 * upgrades claim_support or curation.
 */
export function summarizeCiteCheckWorksheet(
  worksheet: unknown,
): CiteCheckWorksheetSummary {
  const doc = asRecord(worksheet) ?? {};
  const summary = asRecord(doc.summary) ?? {};
  const rawItems = Array.isArray(doc.items) ? doc.items : [];
  const items: CiteCheckWorksheetItemView[] = [];
  let verifiedOrMatched = 0;
  let ambiguous = 0;
  let other = 0;
  let stillUnassessed = 0;
  let stillUnreviewed = 0;
  let readyForHumanSupportsAssess = 0;
  let publicCiteApproved = 0;

  for (const row of rawItems) {
    const r = asRecord(row);
    if (!r) continue;
    const checkStatus = asString(r.checkStatus ?? r.check_status);
    const curation = asString(r.curation);
    const claimSupport = asString(r.claimSupport ?? r.claim_support);
    const evidenceId = asString(r.evidenceId ?? r.evidence_id) ?? "";
    items.push({
      evidenceId,
      hsiEdgeId: asString(r.hsiEdgeId ?? r.hsi_edge_id),
      relationshipId: asString(r.relationshipId ?? r.relationship_id),
      checkStatus,
      curation,
      claimSupport,
      pmid: asString(r.pmid),
    });

    const verified =
      checkStatus === "verified" ||
      checkStatus === "matched" ||
      checkStatus === "ok";
    if (verified) verifiedOrMatched += 1;
    else if (checkStatus === "ambiguous") ambiguous += 1;
    else other += 1;

    if (!claimSupport || claimSupport === "unassessed") stillUnassessed += 1;
    if (!curation || curation === "unreviewed") stillUnreviewed += 1;
    if (verified && (!claimSupport || claimSupport === "unassessed")) {
      readyForHumanSupportsAssess += 1;
    }
    if (curation === "approved" && claimSupport === "supports") {
      publicCiteApproved += 1;
    }
  }

  const rowsFromSummary = asNumber(summary.rows);
  const rows = rowsFromSummary ?? items.length;

  return {
    rows,
    citeReadyFromPin: asNumber(summary.citeReadyFromPin),
    verifiedOrMatched:
      asNumber(summary.verifiedOrMatched) ?? verifiedOrMatched,
    ambiguous: asNumber(summary.ambiguous) ?? ambiguous,
    other: asNumber(summary.other) ?? other,
    stillUnassessedClaimSupport:
      asNumber(summary.stillUnassessedClaimSupport) ?? stillUnassessed,
    stillUnreviewed: asNumber(summary.stillUnreviewed) ?? stillUnreviewed,
    readyForHumanSupportsAssess,
    publicCiteApproved,
    autoApprove: false,
    productionApproved: false,
    notCds: true,
    neonTarget: "autumn-snow",
    items,
  };
}

function nextHumanStep(input: {
  actionableDiscovery: number;
  citeReady: number;
  cite: CiteCheckWorksheetSummary | null;
}): string {
  if (input.actionableDiscovery > 0) {
    return `Discovery Gate C: review ${input.actionableDiscovery} actionable mapped row(s) on /hsi/discovery REVIEW (approve / reject / defer). Do not auto-approve.`;
  }
  if (input.cite && input.cite.readyForHumanSupportsAssess > 0) {
    return `Cite path: on /curation?hsi=cite, re-read S-P-O vs paper for ${input.cite.readyForHumanSupportsAssess} identifier-verified row(s) → set claim_support → Approve or Reject. Never invent supports.`;
  }
  if (input.citeReady > 0 && !input.cite) {
    return `Cite path: ${input.citeReady} cite-ready after Gate C — run bun run hsi:cite-check (or seed if missing), then human supports on /curation?hsi=cite.`;
  }
  if (input.cite && input.cite.publicCiteApproved === 0 && input.cite.rows > 0) {
    return "Cite candidates exist but none are public-approved (approved+supports). Human assessment still required — do not invent Approve.";
  }
  return "No automated next write. Re-check pins / Neon autumn-snow; keep autoApprove=false.";
}

/**
 * Dry-run curator path status from pins. Does not connect to Neon and does
 * not write claim_support or curation decisions.
 */
export function summarizeGateCCuratorPath(input: {
  checklist: unknown;
  decisionsPin: unknown;
  citeWorksheet?: unknown | null;
}): GateCCuratorPathStatus {
  const decisionsByEdge = parseGateCDecisionStatusByEdge(input.decisionsPin);
  const discoveryQueue = buildGateCQueue(
    input.checklist,
    // Overlay pin decisions as stored shape for queue merge
    [...decisionsByEdge.entries()].map(([edgeId, status]) => ({
      edgeId,
      status: status as GateCStatus,
      decision:
        status === "human_approved"
          ? ("approve" as const)
          : status === "human_rejected"
            ? ("reject" as const)
            : status === "deferred"
              ? ("defer" as const)
              : null,
      reviewerNote: null,
      reviewedBy: null,
      reviewedAt: null,
      isiRelationshipId: null,
      pmid: null,
      autoApprove: false as const,
      hsiGradeFlipped: false as const,
    })),
  );
  const bridge = buildHsiBridgeCurationQueue(decisionsByEdge);
  const statusCounts = countDecisionStatuses(input.decisionsPin);
  const publishPendingMapped = parseGateCChecklistRows(input.checklist).filter(
    (r) =>
      !r.autoApprove &&
      (r.gateCStatus === "pending" || r.gateCStatus === "in_review") &&
      Boolean(r.isiRelationshipId),
  ).length;

  const citePath =
    input.citeWorksheet == null
      ? null
      : summarizeCiteCheckWorksheet(input.citeWorksheet);

  return {
    schemaVersion: "hsi-gate-c-curator-status-1",
    neonTarget: "autumn-snow",
    hsiNeonTarget: "red-wave",
    autoApprove: false,
    mayFlipHsiGrade: false,
    productionApproved: false,
    notCds: true,
    inventSupportsForbidden: true,
    discoveryGateC: {
      publishPendingMapped,
      humanApproved: statusCounts.human_approved,
      humanRejected: statusCounts.human_rejected,
      deferred: statusCounts.deferred,
      actionableRemaining: discoveryQueue.actionableCount,
      decidedCount: discoveryQueue.decidedCount,
    },
    bridge: {
      gateCPending: bridge.summary.gateCPending,
      neonGateCReady: bridge.summary.neonGateCReady,
      citeReadyAfterGateC: bridge.summary.citeReadyAfterGateC,
    },
    citePath,
    nextHumanStep: nextHumanStep({
      actionableDiscovery: discoveryQueue.actionableCount,
      citeReady: bridge.summary.citeReadyAfterGateC,
      cite: citePath,
    }),
    inventory: GATE_C_CURATOR_INVENTORY,
  };
}

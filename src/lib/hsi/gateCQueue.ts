/**
 * HSI Discovery Gate C human queue (ISI product side).
 * Pending checklist rows from published packs + autumn-snow decisions.
 * Never auto-approves; never flips hsiGrade; not CDS / PHI.
 */

export const GATE_C_DECISIONS = ["approve", "reject", "defer"] as const;
export type GateCDecision = (typeof GATE_C_DECISIONS)[number];

export const GATE_C_STATUSES = [
  "pending",
  "in_review",
  "human_approved",
  "human_rejected",
  "deferred",
] as const;
export type GateCStatus = (typeof GATE_C_STATUSES)[number];

export type GateCChecklistRow = {
  claimId: string;
  edgeId: string;
  isiRelationshipId: string | null;
  matchKind?: string | null;
  mappingStatus?: string | null;
  gateCStatus: string;
  pmid: string | null;
  doi: string | null;
  spoNote?: string | null;
  assertion?: string | null;
  rationale?: string | null;
  autoApprove: boolean;
  hsiGrade?: string | null;
};

export type GateCStoredDecision = {
  edgeId: string;
  status: GateCStatus;
  decision: GateCDecision | null;
  reviewerNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  isiRelationshipId: string | null;
  pmid: string | null;
  autoApprove: false;
  hsiGradeFlipped: false;
};

export type GateCQueueItem = {
  claimId: string;
  edgeId: string;
  isiRelationshipId: string | null;
  matchKind: string | null;
  mappingStatus: string | null;
  publishStatus: string;
  effectiveStatus: GateCStatus;
  decision: GateCDecision | null;
  pmid: string | null;
  doi: string | null;
  spoNote: string | null;
  assertion: string | null;
  rationale: string | null;
  reviewerNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  /** Published JSON still pending and no human decision yet. */
  actionable: boolean;
  autoApprove: false;
  mayFlipHsiGrade: false;
  notCds: true;
};

export type GateCQueueSnapshot = {
  items: GateCQueueItem[];
  pendingCount: number;
  decidedCount: number;
  actionableCount: number;
  autoApprove: false;
  mayFlipHsiGrade: false;
  notCds: true;
  neonTarget: "autumn-snow";
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asNullableString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

/** Parse published gate-c-checklist.json rows (and legacy pending/items arrays). */
export function parseGateCChecklistRows(gateC: unknown): GateCChecklistRow[] {
  const doc = asRecord(gateC);
  if (!doc) return [];
  const raw =
    (Array.isArray(doc.rows) && doc.rows) ||
    (Array.isArray(doc.pending) && doc.pending) ||
    (Array.isArray(doc.items) && doc.items) ||
    [];
  const out: GateCChecklistRow[] = [];
  for (const row of raw) {
    const r = asRecord(row);
    if (!r) continue;
    const edgeId = asString(r.edgeId || r.edge_id);
    const claimId = asString(r.claimId || r.claim_id);
    if (!edgeId || !claimId) continue;
    out.push({
      claimId,
      edgeId,
      isiRelationshipId: asNullableString(r.isiRelationshipId ?? r.isi_relationship_id),
      matchKind: asNullableString(r.matchKind ?? r.match_kind),
      mappingStatus: asNullableString(r.mappingStatus ?? r.mapping_status),
      gateCStatus: asString(r.gateCStatus ?? r.gate_c_status, "pending"),
      pmid: asNullableString(r.pmid),
      doi: asNullableString(r.doi),
      spoNote: asNullableString(r.spoNote ?? r.spo_note),
      assertion: asNullableString(r.assertion),
      rationale: asNullableString(r.rationale),
      autoApprove: r.autoApprove === true || r.auto_approve === true,
      hsiGrade: asNullableString(r.hsiGrade ?? r.hsi_grade),
    });
  }
  return out;
}

/** Published rows that are still Gate C pending (mapped curated handoff). */
export function listPublishPendingRows(rows: GateCChecklistRow[]): GateCChecklistRow[] {
  return rows.filter((r) => {
    if (r.autoApprove) return false;
    if (r.gateCStatus === "unmapped") return false;
    if (r.gateCStatus !== "pending" && r.gateCStatus !== "in_review") return false;
    // Prefer mapped REL handoffs; unmapped stay honest gaps (not actionable here).
    return Boolean(r.isiRelationshipId);
  });
}

export function decisionToStatus(decision: GateCDecision): GateCStatus {
  if (decision === "approve") return "human_approved";
  if (decision === "reject") return "human_rejected";
  return "deferred";
}

export function statusToDecision(status: GateCStatus): GateCDecision | null {
  if (status === "human_approved") return "approve";
  if (status === "human_rejected") return "reject";
  if (status === "deferred") return "defer";
  return null;
}

/**
 * Apply a human decision. Pending / in_review only.
 * Rejects autoApprove and any attempt to flip hsiGrade.
 */
export function applyGateCDecision(input: {
  currentStatus: GateCStatus;
  decision: GateCDecision;
  actorIsReviewer: boolean;
  autoApprove?: boolean;
  flipHsiGrade?: boolean;
}):
  | {
      ok: true;
      to: GateCStatus;
      decision: GateCDecision;
      autoApproved: false;
      hsiGradeFlipped: false;
    }
  | { ok: false; error: string } {
  if (!input.actorIsReviewer) {
    return {
      ok: false,
      error: "Only scientific reviewers and administrators can record Gate C decisions.",
    };
  }
  if (input.autoApprove === true) {
    return { ok: false, error: "autoApprove is forbidden for Gate C." };
  }
  if (input.flipHsiGrade === true) {
    return {
      ok: false,
      error: "Gate C decisions must not flip hsiGrade (mayFlipHsiGradeFromChecklist=false).",
    };
  }
  if (input.currentStatus !== "pending" && input.currentStatus !== "in_review") {
    return {
      ok: false,
      error: `Only pending / in_review rows accept decisions (got ${input.currentStatus}).`,
    };
  }
  if (!GATE_C_DECISIONS.includes(input.decision)) {
    return { ok: false, error: "Unknown Gate C decision." };
  }
  return {
    ok: true,
    to: decisionToStatus(input.decision),
    decision: input.decision,
    autoApproved: false,
    hsiGradeFlipped: false,
  };
}

export function buildGateCQueue(
  checklist: unknown,
  decisions: readonly GateCStoredDecision[] = [],
): GateCQueueSnapshot {
  const rows = listPublishPendingRows(parseGateCChecklistRows(checklist));
  const byEdge = new Map(decisions.map((d) => [d.edgeId, d]));
  const items: GateCQueueItem[] = rows.map((r) => {
    const stored = byEdge.get(r.edgeId);
    const effectiveStatus: GateCStatus = stored?.status ?? "pending";
    const decision = stored?.decision ?? statusToDecision(effectiveStatus);
    const actionable =
      effectiveStatus === "pending" || effectiveStatus === "in_review";
    return {
      claimId: r.claimId,
      edgeId: r.edgeId,
      isiRelationshipId: r.isiRelationshipId,
      matchKind: r.matchKind ?? null,
      mappingStatus: r.mappingStatus ?? null,
      publishStatus: r.gateCStatus,
      effectiveStatus,
      decision,
      pmid: r.pmid,
      doi: r.doi,
      spoNote: r.spoNote ?? null,
      assertion: r.assertion ?? null,
      rationale: r.rationale ?? null,
      reviewerNote: stored?.reviewerNote ?? null,
      reviewedBy: stored?.reviewedBy ?? null,
      reviewedAt: stored?.reviewedAt ?? null,
      actionable,
      autoApprove: false,
      mayFlipHsiGrade: false,
      notCds: true,
    };
  });

  // Stable: actionable first, then edge id.
  items.sort((a, b) => {
    if (a.actionable !== b.actionable) return a.actionable ? -1 : 1;
    return a.edgeId.localeCompare(b.edgeId);
  });

  return {
    items,
    pendingCount: items.filter((i) => i.actionable).length,
    decidedCount: items.filter((i) => !i.actionable).length,
    actionableCount: items.filter((i) => i.actionable).length,
    autoApprove: false,
    mayFlipHsiGrade: false,
    notCds: true,
    neonTarget: "autumn-snow",
  };
}

/** Refuse HSI red-wave hosts for ISI Gate C writes. */
export function assertIsiNeonHostForGateC(databaseUrl: string | undefined | null): void {
  const raw = (databaseUrl ?? "").trim().toLowerCase();
  if (!raw) {
    throw new Error("DATABASE_URL required for Gate C writes (ISI autumn-snow only).");
  }
  if (
    raw.includes("red-wave") ||
    raw.includes("restless-dew") ||
    raw.includes("ep-restless-dew")
  ) {
    throw new Error(
      "Gate C approve/reject must write ISI autumn-snow only — refusing HSI red-wave host.",
    );
  }
}

/**
 * Phase C — Scientific review queue view-model + audit history helpers.
 * Builds prioritised work from existing evidence rows / candidates.
 * Never auto-approves. Audit events are append-only inputs from Neon.
 */
import { byId, edgeByRel } from "@/lib/immune/engine";
import {
  canApproveIdentifier,
  isReadyForSupportsApproval,
  type ClaimSupport,
  type CurationState,
} from "@/lib/immune/evidenceInvariants";
import {
  assertNoSilentApproval,
  claimRequiresHumanReview,
  classifyClaimEvidence,
  detectConflictingEvidence,
  type SourceBackedClaim,
  toSourceBackedClaim,
} from "@/lib/immune/claimRecords";
import type { CitationLike } from "@/lib/immune/evidenceStatus";

export type ReviewQueuePriority = "conflict" | "ready_for_supports" | "needs_identifier" | "unassessed" | "other";

export interface ReviewQueueItem {
  evidenceId: string;
  relationshipId: string | null;
  conceptId: string | null;
  conceptName: string | null;
  priority: ReviewQueuePriority;
  classification: ReturnType<typeof classifyClaimEvidence>;
  claim: SourceBackedClaim;
  /** Source passage / notes when present — for reviewer inspection. */
  sourcePassage: string | null;
  reason: string;
  requiresHumanReview: true;
  /** Never auto-approve from queue presence. */
  autoApprove: false;
}

export interface EvidenceAuditEventView {
  evidenceId: string;
  actor: string;
  reason: string;
  previousCuration?: string | null;
  newCuration?: string | null;
  previousClaimSupport?: string | null;
  newClaimSupport?: string | null;
  createdAt: string;
}

export interface ReviewQueueSnapshot {
  items: ReviewQueueItem[];
  counts: Record<ReviewQueuePriority, number>;
  blockedSilentApprovals: number;
  conflictingRelationships: string[];
}

export interface ReviewQueueRowInput {
  evidence_id: string;
  node_id?: string | null;
  relationship_id?: string | null;
  claim_support?: string | null;
  curation?: string | null;
  check_status?: string | null;
  pmid?: string | null;
  doi?: string | null;
  label?: string | null;
  url?: string | null;
  claim_text?: string | null;
  passage_span?: string | null;
  reviewed_at?: string | null;
}

function asCite(row: ReviewQueueRowInput): CitationLike {
  return {
    evidence_id: row.evidence_id,
    relationship_id: row.relationship_id ?? null,
    claim_support: row.claim_support ?? "unassessed",
    curation: (row.curation as CurationState | undefined) ?? "unreviewed",
    label: row.label ?? row.pmid ?? row.doi ?? row.evidence_id,
    url: row.url ?? (row.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${row.pmid}/` : ""),
    pmid: row.pmid,
    doi: row.doi,
    claim_text: row.claim_text,
    passage_span: row.passage_span,
    reviewed_at: row.reviewed_at ?? null,
  };
}

function priorityFor(row: ReviewQueueRowInput, cite: CitationLike, conflictingRel: boolean): ReviewQueuePriority {
  if (conflictingRel) return "conflict";
  if (
    isReadyForSupportsApproval({
      check_status: row.check_status,
      curation: row.curation,
      relationship_id: row.relationship_id,
      claim_support: row.claim_support,
    })
  ) {
    return "ready_for_supports";
  }
  if (row.relationship_id && !canApproveIdentifier(row.check_status)) return "needs_identifier";
  if ((row.claim_support ?? "unassessed") === "unassessed") return "unassessed";
  return "other";
}

const PRIORITY_ORDER: ReviewQueuePriority[] = [
  "conflict",
  "ready_for_supports",
  "needs_identifier",
  "unassessed",
  "other",
];

/**
 * Build a review queue from evidence-shaped rows. Empty input → empty queue.
 * Does not write the KG or change curation.
 */
export function buildScientificReviewQueue(rows: ReviewQueueRowInput[]): ReviewQueueSnapshot {
  const cites = rows.map(asCite);
  const byRel = new Map<string, CitationLike[]>();
  for (const c of cites) {
    if (!c.relationship_id) continue;
    const list = byRel.get(c.relationship_id) ?? [];
    list.push(c);
    byRel.set(c.relationship_id, list);
  }
  const conflictingRelationships: string[] = [];
  for (const [rid, list] of byRel) {
    if (detectConflictingEvidence(rid, list).conflicting) conflictingRelationships.push(rid);
  }
  const conflictSet = new Set(conflictingRelationships);

  const counts: Record<ReviewQueuePriority, number> = {
    conflict: 0,
    ready_for_supports: 0,
    needs_identifier: 0,
    unassessed: 0,
    other: 0,
  };
  let blockedSilentApprovals = 0;
  const items: ReviewQueueItem[] = [];

  for (const row of rows) {
    const cite = asCite(row);
    const gate = assertNoSilentApproval(cite);
    if (!gate.ok) blockedSilentApprovals += 1;

    // Skip already-approved Gate C supports — not review work.
    if (classifyClaimEvidence(cite) === "gate_c_support" && gate.ok) continue;
    if (!claimRequiresHumanReview(cite) && gate.ok && row.curation === "rejected") continue;

    const edge = row.relationship_id ? edgeByRel[row.relationship_id] : null;
    const claim = toSourceBackedClaim(cite, edge);
    const conflictingRel = Boolean(row.relationship_id && conflictSet.has(row.relationship_id));
    const priority = !gate.ok ? "conflict" : priorityFor(row, cite, conflictingRel);
    counts[priority] += 1;

    const conceptId = row.node_id ?? edge?.subject_id ?? null;
    items.push({
      evidenceId: row.evidence_id,
      relationshipId: row.relationship_id ?? null,
      conceptId,
      conceptName: conceptId && byId[conceptId] ? byId[conceptId]!.name : null,
      priority,
      classification: claim.classification,
      claim,
      sourcePassage: row.passage_span?.trim() || row.claim_text?.trim() || null,
      reason: !gate.ok
        ? `Blocked inconsistent state: ${gate.reason}`
        : priority === "conflict"
          ? "Supporting and counterevidence both present on this relationship"
          : priority === "ready_for_supports"
            ? "Identifier verified and claim_support=supports — human may approve"
            : priority === "needs_identifier"
              ? "Mapped claim awaiting identifier verification"
              : "Awaiting human claim assessment",
      requiresHumanReview: true,
      autoApprove: false,
    });
  }

  items.sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));

  return {
    items,
    counts,
    blockedSilentApprovals,
    conflictingRelationships,
  };
}

/** Summarise audit events for a review history fold (append-only). */
export function summariseAuditHistory(events: EvidenceAuditEventView[]): {
  evidenceId: string;
  decisions: number;
  lastActor: string | null;
  lastAt: string | null;
}[] {
  const byIdMap = new Map<string, EvidenceAuditEventView[]>();
  for (const e of events) {
    const list = byIdMap.get(e.evidenceId) ?? [];
    list.push(e);
    byIdMap.set(e.evidenceId, list);
  }
  const out: { evidenceId: string; decisions: number; lastActor: string | null; lastAt: string | null }[] = [];
  for (const [evidenceId, list] of byIdMap) {
    const sorted = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const last = sorted[sorted.length - 1];
    out.push({
      evidenceId,
      decisions: sorted.length,
      lastActor: last?.actor ?? null,
      lastAt: last?.createdAt ?? null,
    });
  }
  return out;
}

export type { ClaimSupport };

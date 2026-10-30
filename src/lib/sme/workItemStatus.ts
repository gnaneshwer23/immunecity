/**
 * Derive SME work-item status from audited events.
 * Engineering never invents resolutions — only reflects human decisions already recorded.
 */
import type { SmeWorkItem, SmeWorkItemStatus } from "@/lib/sme/workQueue";

export type SmeWorkItemEventLite = {
  workItemId: string;
  action: string;
  createdAt?: string;
};

/**
 * Map latest event per work item → status.
 * approve/reject → resolved_by_sme; request_changes / spo_rewrite_proposal → changes_requested;
 * rematch_citation leaves pending_sme (must re-approve after rematch).
 */
export function statusFromLatestSmeEvent(action: string | undefined): SmeWorkItemStatus {
  if (action === "approve" || action === "reject") return "resolved_by_sme";
  if (action === "request_changes" || action === "spo_rewrite_proposal") return "changes_requested";
  return "pending_sme";
}

/** Latest event wins per workItemId (events should be newest-first). */
export function latestSmeEventByWorkItem(
  events: readonly SmeWorkItemEventLite[],
): Map<string, SmeWorkItemEventLite> {
  const map = new Map<string, SmeWorkItemEventLite>();
  for (const e of events) {
    if (!map.has(e.workItemId)) map.set(e.workItemId, e);
  }
  return map;
}

/** Overlay audited statuses onto queue items. Unseen items stay pending_sme. */
export function applySmeWorkItemEventStatuses<T extends SmeWorkItem>(
  items: readonly T[],
  events: readonly SmeWorkItemEventLite[],
): T[] {
  const latest = latestSmeEventByWorkItem(events);
  return items.map((item) => {
    const ev = latest.get(item.id);
    if (!ev) return { ...item, status: "pending_sme" as const };
    return { ...item, status: statusFromLatestSmeEvent(ev.action) };
  });
}

/** Human checklist steps for priority KEYNOTE / R011 queues — empty until SME acts. */
export type SmeHumanChecklistStep = {
  id: string;
  label: string;
  required: boolean;
  /** Engineering never marks done — UI shows unchecked slots for humans. */
  done: false;
  hint: string;
};

export function keynoteRematchChecklist(): SmeHumanChecklistStep[] {
  return [
    {
      id: "verify-identifier",
      label: "Verify PMID 25891173 + DOI 10.1056/NEJMoa1503093 against primary KEYNOTE-006",
      required: true,
      done: false,
      hint: "Identifier verification is separate from rematch write.",
    },
    {
      id: "rematch-pmid-doi-passage",
      label: "Rematch citation with PMID + DOI + passage locator (≥12 chars) in one audited write",
      required: true,
      done: false,
      hint: "Rematch resets curation to unreviewed — never auto Gate C.",
    },
    {
      id: "gate-c-approve",
      label: "Separate human Gate C approve (or reject) after rematch",
      required: true,
      done: false,
      hint: "Confirm dialog required; engineering cannot approve.",
    },
    {
      id: "gold-label",
      label: "Optional: fill SGOLD-KEYNOTE-01 expected label (score stays null until SME sets)",
      required: false,
      done: false,
      hint: "Leave null if undecided — eval denominators stay honest.",
    },
  ];
}

export function r011SpoRewriteChecklist(): SmeHumanChecklistStep[] {
  return [
    {
      id: "read-dong-2002",
      label: "Compare current S-P-O to Dong 2002 / matrix note (S_P_O_MISMATCH)",
      required: true,
      done: false,
      hint: "Do not invent a rewrite — scientist decides subject/predicate/object.",
    },
    {
      id: "propose-spo-or-demote",
      label: "Record S-P-O rewrite proposal OR demote claim_support via request_changes / reject",
      required: true,
      done: false,
      hint: "Graph edge edits stay out-of-band; SME panel audits the decision.",
    },
    {
      id: "gold-label-r011",
      label: "Optional: fill SGOLD-R011-01 (spo_mismatch / needs_rewrite / …)",
      required: false,
      done: false,
      hint: "Expected label null until filled.",
    },
  ];
}

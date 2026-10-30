/**
 * Evidence collections — named sets of existing graph concept ids + optional
 * evidence record refs. Browser-safe planning/sanitisation only.
 * Persistence is Neon via collections.functions.ts; never writes the KG.
 *
 * Access policy: every list/create/update/delete is ownership-scoped to the
 * signed-in user_id. There is no casual admin list-all path.
 */
import { byId } from "@/lib/immune/engine";

export const EVIDENCE_COLLECTION_TABLE = "evidence_collections" as const;
export const MAX_COLLECTION_NAME = 120;
export const MAX_COLLECTION_CONCEPTS = 40;
export const MAX_COLLECTION_EVIDENCE_REFS = 40;
export const MAX_COLLECTIONS_PER_MEMBER = 40;

/** Hardening contract — server handlers must honour this; tests assert it. */
export const COLLECTION_ACCESS = {
  ownerScopedOnly: true as const,
  /** No casual admin read of other members' collections. */
  adminListAllPath: null,
  allowAdminBypass: false as const,
  operations: ["list", "create", "update", "delete"] as const,
};

export type CollectionOperation = (typeof COLLECTION_ACCESS.operations)[number];

/** Pure ownership check used by planning and tests (not role-aware). */
export function actorOwnsCollection(ownerUserId: string, actorUserId: string): boolean {
  const owner = ownerUserId.trim();
  const actor = actorUserId.trim();
  if (!owner || !actor) return false;
  return owner === actor;
}

/**
 * Spec every server op must satisfy. Admin roles never widen the filter.
 * `adminListAllPath` stays null until an explicit, tested admin surface exists.
 */
export function collectionOwnershipSpec(op: CollectionOperation): {
  op: CollectionOperation;
  requireAuthUserId: true;
  filterByUserId: true;
  allowAdminBypass: false;
  adminListAllPath: null;
} {
  return {
    op,
    requireAuthUserId: true,
    filterByUserId: true,
    allowAdminBypass: false,
    adminListAllPath: null,
  };
}

/** Opaque evidence_id-style refs (E… / EV-… / UUID-ish). Never invent PMIDs. */
const EVIDENCE_REF_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{1,79}$/;

export type EvidenceCollectionDraft = {
  name: string;
  conceptIds: string[];
  evidenceRefs: string[];
};

export type EvidenceCollectionRow = EvidenceCollectionDraft & {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  /** Always false — collections never mutate the curated graph. */
  kgWrite: false;
};

export function sanitizeCollectionConceptIds(ids: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = typeof raw === "string" ? raw.trim() : "";
    if (!id || !byId[id] || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_COLLECTION_CONCEPTS) break;
  }
  return out;
}

export function sanitizeEvidenceRefs(refs: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of refs) {
    const ref = typeof raw === "string" ? raw.trim() : "";
    if (!ref || !EVIDENCE_REF_RE.test(ref) || seen.has(ref)) continue;
    // Refuse PMID-shaped inventables without a verified lookup path.
    if (/^PMID[\s:-]?\d+$/i.test(ref) || /^\d{7,8}$/.test(ref)) continue;
    seen.add(ref);
    out.push(ref);
    if (out.length >= MAX_COLLECTION_EVIDENCE_REFS) break;
  }
  return out;
}

export function sanitizeCollectionName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, MAX_COLLECTION_NAME);
}

/** Plan a create/update. Unknown concept ids are dropped; empty concepts fail. */
export function planEvidenceCollection(input: {
  userId: string | null | undefined;
  name: string;
  conceptIds: readonly string[];
  evidenceRefs?: readonly string[];
}):
  | { ok: true; userId: string; name: string; conceptIds: string[]; evidenceRefs: string[] }
  | { ok: false; error: string } {
  const userId = input.userId?.trim() ?? "";
  if (!userId) return { ok: false, error: "Sign in to save an evidence collection." };
  const name = sanitizeCollectionName(input.name);
  if (!name) return { ok: false, error: "Collection name is required." };
  const conceptIds = sanitizeCollectionConceptIds(input.conceptIds);
  if (!conceptIds.length) {
    return { ok: false, error: "Add at least one existing graph concept id. Collections cannot create nodes." };
  }
  const evidenceRefs = sanitizeEvidenceRefs(input.evidenceRefs ?? []);
  return { ok: true, userId, name, conceptIds, evidenceRefs };
}

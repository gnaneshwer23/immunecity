/**
 * Browser-safe research profile planning / ownership.
 * Persistence: profiles.functions.ts (Neon research_profiles).
 */
import { byId } from "@/lib/immune/engine";
import { normalizeEntitlement } from "@/lib/discovery/entitlements";
import type {
  ResearchEntitlement,
  ResearchProfileDraft,
  ResearchProfileRow,
} from "@/lib/discovery/types";

export const RESEARCH_PROFILE_TABLE = "research_profiles" as const;
export const MAX_PROFILE_LABEL = 80;
export const MAX_PROFILE_ARRAY = 20;

export const PROFILE_ACCESS = {
  ownerScopedOnly: true as const,
  adminListAllPath: null,
  allowAdminBypass: false as const,
  requireSensitivePii: false as const,
  operations: ["get", "create", "update"] as const,
};

export type ProfileOperation = (typeof PROFILE_ACCESS.operations)[number];

export function actorOwnsProfile(ownerUserId: string, actorUserId: string): boolean {
  const owner = ownerUserId.trim();
  const actor = actorUserId.trim();
  if (!owner || !actor) return false;
  return owner === actor;
}

export function profileOwnershipSpec(op: ProfileOperation): {
  op: ProfileOperation;
  requireAuthUserId: true;
  filterByUserId: true;
  allowAdminBypass: false;
  adminListAllPath: null;
  requireSensitivePii: false;
} {
  return {
    op,
    requireAuthUserId: true,
    filterByUserId: true,
    allowAdminBypass: false,
    adminListAllPath: null,
    requireSensitivePii: false,
  };
}

function sanitizeIdList(ids: readonly string[] | undefined, max: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids ?? []) {
    const id = typeof raw === "string" ? raw.trim() : "";
    if (!id || seen.has(id)) continue;
    // Prefer known graph ids; allow short domain keys (lowercase slug) for domains.
    if (byId[id] || /^[a-z][a-z0-9_-]{0,39}$/.test(id)) {
      seen.add(id);
      out.push(id);
      if (out.length >= max) break;
    }
  }
  return out;
}

export function sanitizeProfileDraft(input: {
  displayLabel?: string | null;
  focusDiseases?: string[];
  focusDomains?: string[];
  modalities?: string[];
  interests?: Record<string, unknown>;
}): ResearchProfileDraft {
  const labelRaw = typeof input.displayLabel === "string" ? input.displayLabel.trim() : "";
  const displayLabel =
    labelRaw.length >= 1 && labelRaw.length <= MAX_PROFILE_LABEL ? labelRaw : null;
  const interests =
    input.interests && typeof input.interests === "object" && !Array.isArray(input.interests)
      ? { ...input.interests }
      : {};
  return {
    displayLabel,
    focusDiseases: sanitizeIdList(input.focusDiseases, MAX_PROFILE_ARRAY),
    focusDomains: sanitizeIdList(input.focusDomains, MAX_PROFILE_ARRAY),
    modalities: sanitizeIdList(input.modalities, MAX_PROFILE_ARRAY),
    interests,
  };
}

export function planResearchProfile(input: {
  userId: string | null | undefined;
  displayLabel?: string | null;
  focusDiseases?: string[];
  focusDomains?: string[];
  modalities?: string[];
  interests?: Record<string, unknown>;
}): { ok: true; draft: ResearchProfileDraft } | { ok: false; error: string } {
  const userId = input.userId?.trim() ?? "";
  if (!userId) return { ok: false, error: "Sign in to create or update a research profile." };
  return { ok: true, draft: sanitizeProfileDraft(input) };
}

export function profileEntitlement(row: { entitlement?: unknown } | null | undefined): ResearchEntitlement {
  return normalizeEntitlement(row?.entitlement);
}

/** Shape helper for tests — never invents entitlement elevation. */
export function stubProfileRow(
  userId: string,
  draft: ResearchProfileDraft,
  entitlement: ResearchEntitlement = "free",
): ResearchProfileRow {
  const now = new Date(0).toISOString();
  return {
    id: "00000000-0000-4000-8000-000000000001",
    userId,
    ...draft,
    entitlement: normalizeEntitlement(entitlement),
    createdAt: now,
    updatedAt: now,
  };
}

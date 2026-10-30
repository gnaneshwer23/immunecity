/**
 * Server-checked Discovery entitlement stubs (Phase 7).
 * Plans are flags only — no Stripe, published prices, or payment collection.
 * Orthogonal to user_roles (member / moderator / reviewer / admin).
 */
import {
  RESEARCH_ENTITLEMENTS,
  type ResearchEntitlement,
} from "@/lib/discovery/types";

export const ENTITLEMENT_ACCESS = {
  /** Client hints are never authoritative. */
  serverCheckedOnly: true as const,
  paymentActivation: false as const,
  stripeWired: false as const,
  pricesPublished: false as const,
  collectPayments: false as const,
  defaultPlan: "free" as const satisfies ResearchEntitlement,
  /** Plans ≠ roles. Reviewer power does not grant researcher_pro. */
  orthogonalToUserRoles: true as const,
};

export type DiscoveryFeature =
  | "radar_list"
  | "gap_subscribe"
  | "extended_filters"
  | "advanced_feed"
  | "monitor_run"
  | "dossier_export"
  | "team_shared_profile"
  | "team_collab";

export type PlanQuotas = {
  radarListLimit: number;
  personalisedFeedLimit: number;
  maxFollowedGaps: number;
  maxMonitorRunsPerDay: number;
  maxExportsPerDay: number;
  extendedFilters: boolean;
  advancedFeed: boolean;
  gapSubscribe: boolean;
  dossierExport: boolean;
  /** Scaffolding only — never true until multi-tenant billing is activated. */
  teamSharedProfilesReady: boolean;
  teamCollabReady: boolean;
};

/** Free members see a short personalised preview; paid stubs unlock a wider window. */
export const FREE_PERSONALISED_PREVIEW = 5;
export const FREE_RADAR_LIMIT = 25;
export const RESEARCHER_PRO_RADAR_LIMIT = 200;
export const TEAM_RADAR_LIMIT = 500;
export const ENTERPRISE_RADAR_LIMIT = 1000;

export const PLAN_QUOTAS: Record<ResearchEntitlement, PlanQuotas> = {
  free: {
    radarListLimit: FREE_RADAR_LIMIT,
    personalisedFeedLimit: FREE_PERSONALISED_PREVIEW,
    maxFollowedGaps: 0,
    maxMonitorRunsPerDay: 1,
    maxExportsPerDay: 0,
    extendedFilters: false,
    advancedFeed: false,
    gapSubscribe: false,
    dossierExport: false,
    teamSharedProfilesReady: false,
    teamCollabReady: false,
  },
  researcher_pro: {
    radarListLimit: RESEARCHER_PRO_RADAR_LIMIT,
    personalisedFeedLimit: RESEARCHER_PRO_RADAR_LIMIT,
    maxFollowedGaps: 25,
    maxMonitorRunsPerDay: 24,
    maxExportsPerDay: 10,
    extendedFilters: true,
    advancedFeed: true,
    gapSubscribe: true,
    dossierExport: true,
    teamSharedProfilesReady: false,
    teamCollabReady: false,
  },
  team: {
    radarListLimit: TEAM_RADAR_LIMIT,
    personalisedFeedLimit: TEAM_RADAR_LIMIT,
    maxFollowedGaps: 100,
    maxMonitorRunsPerDay: 100,
    maxExportsPerDay: 50,
    extendedFilters: true,
    advancedFeed: true,
    gapSubscribe: true,
    dossierExport: true,
    // Ready in code paths only — multi-tenant billing / shared tenancy stays off.
    teamSharedProfilesReady: false,
    teamCollabReady: false,
  },
  enterprise: {
    radarListLimit: ENTERPRISE_RADAR_LIMIT,
    personalisedFeedLimit: ENTERPRISE_RADAR_LIMIT,
    maxFollowedGaps: 500,
    maxMonitorRunsPerDay: 500,
    maxExportsPerDay: 200,
    extendedFilters: true,
    advancedFeed: true,
    gapSubscribe: true,
    dossierExport: true,
    teamSharedProfilesReady: false,
    teamCollabReady: false,
  },
};

export const PLAN_DISPLAY_LABEL: Record<ResearchEntitlement, string> = {
  free: "Free",
  researcher_pro: "Researcher Pro",
  team: "Team",
  enterprise: "Enterprise",
};

export function isResearchEntitlement(value: unknown): value is ResearchEntitlement {
  return typeof value === "string" && (RESEARCH_ENTITLEMENTS as readonly string[]).includes(value);
}

export function normalizeEntitlement(value: unknown): ResearchEntitlement {
  return isResearchEntitlement(value) ? value : ENTITLEMENT_ACCESS.defaultPlan;
}

export function planQuotas(plan: ResearchEntitlement): PlanQuotas {
  return PLAN_QUOTAS[normalizeEntitlement(plan)];
}

/** Honest UI / API copy when a feature is gated by an inactive billing stub. */
export function billingNotActivatedMessage(planNeeded: ResearchEntitlement | "paid"): string {
  if (planNeeded === "paid") {
    return "Researcher Pro — billing not activated";
  }
  return `${PLAN_DISPLAY_LABEL[planNeeded]} — billing not activated`;
}

export function featureGateError(feature: DiscoveryFeature, plan: ResearchEntitlement): string {
  const label = PLAN_DISPLAY_LABEL[plan];
  switch (feature) {
    case "extended_filters":
      return `Extended Discovery filters require Researcher Pro or higher (${billingNotActivatedMessage("researcher_pro")}). Current plan: ${label}.`;
    case "gap_subscribe":
      return `Gap follows require Researcher Pro or higher (${billingNotActivatedMessage("researcher_pro")}; email alerts deferred). Current plan: ${label}.`;
    case "advanced_feed":
      return `Advanced personalised Discovery feed requires Researcher Pro or higher (${billingNotActivatedMessage("researcher_pro")}). Free plan shows a limited honest preview. Current plan: ${label}.`;
    case "monitor_run":
      return `Discovery monitor quota exceeded for plan ${label} (${billingNotActivatedMessage("researcher_pro")} to raise limits).`;
    case "dossier_export":
      return `Dossier export requires Researcher Pro or higher (${billingNotActivatedMessage("researcher_pro")}). Current plan: ${label}.`;
    case "team_shared_profile":
      return `Shared team research profiles require Team/Enterprise (${billingNotActivatedMessage("team")}). Multi-tenant billing is not activated.`;
    case "team_collab":
      return `Team collaboration placeholders require Team/Enterprise (${billingNotActivatedMessage("team")}). Multi-tenant billing is not activated.`;
    case "radar_list":
    default:
      return `Discovery feature unavailable on plan ${label} (${billingNotActivatedMessage("paid")}).`;
  }
}

export type EntitlementGate =
  | { ok: true; limit: number; quotas: PlanQuotas }
  | { ok: false; error: string; quotas: PlanQuotas };

/** Pure plan gate used by server handlers and unit tests. */
export function assertEntitlementAllows(
  plan: ResearchEntitlement,
  feature: DiscoveryFeature,
): EntitlementGate {
  const normalized = normalizeEntitlement(plan);
  const quotas = planQuotas(normalized);
  const limit = quotas.radarListLimit;

  if (feature === "radar_list") {
    return { ok: true, limit, quotas };
  }
  if (feature === "extended_filters" && !quotas.extendedFilters) {
    return { ok: false, error: featureGateError(feature, normalized), quotas };
  }
  if (feature === "gap_subscribe" && !quotas.gapSubscribe) {
    return { ok: false, error: featureGateError(feature, normalized), quotas };
  }
  if (feature === "advanced_feed" && !quotas.advancedFeed) {
    return { ok: false, error: featureGateError(feature, normalized), quotas };
  }
  if (feature === "dossier_export" && !quotas.dossierExport) {
    return { ok: false, error: featureGateError(feature, normalized), quotas };
  }
  if (feature === "monitor_run") {
    // Feature itself is allowed on all plans; daily quota is enforced separately.
    return { ok: true, limit: quotas.maxMonitorRunsPerDay, quotas };
  }
  if (feature === "team_shared_profile") {
    // Even team/enterprise stubs refuse activation until billing ships.
    return { ok: false, error: featureGateError(feature, normalized), quotas };
  }
  if (feature === "team_collab") {
    return { ok: false, error: featureGateError(feature, normalized), quotas };
  }
  return { ok: true, limit, quotas };
}

export type QuotaUsage = {
  followedGaps?: number;
  monitorRunsToday?: number;
  exportsToday?: number;
};

export type QuotaGate =
  | { ok: true; remaining: number; quotas: PlanQuotas }
  | { ok: false; error: string; remaining: 0; quotas: PlanQuotas };

/** Enforce numeric quotas after the plan feature gate passes. */
export function assertQuotaAllows(
  plan: ResearchEntitlement,
  kind: "followed_gaps" | "monitor_runs" | "exports",
  usage: QuotaUsage,
): QuotaGate {
  const normalized = normalizeEntitlement(plan);
  const quotas = planQuotas(normalized);

  if (kind === "followed_gaps") {
    const used = usage.followedGaps ?? 0;
    const max = quotas.maxFollowedGaps;
    if (max <= 0) {
      return {
        ok: false,
        remaining: 0,
        quotas,
        error: featureGateError("gap_subscribe", normalized),
      };
    }
    if (used >= max) {
      return {
        ok: false,
        remaining: 0,
        quotas,
        error: `Followed-gap quota reached (${used}/${max}) on plan ${PLAN_DISPLAY_LABEL[normalized]}. ${billingNotActivatedMessage("researcher_pro")} to raise limits.`,
      };
    }
    return { ok: true, remaining: max - used, quotas };
  }

  if (kind === "monitor_runs") {
    const used = usage.monitorRunsToday ?? 0;
    const max = quotas.maxMonitorRunsPerDay;
    if (used >= max) {
      return {
        ok: false,
        remaining: 0,
        quotas,
        error: featureGateError("monitor_run", normalized),
      };
    }
    return { ok: true, remaining: max - used, quotas };
  }

  // exports
  const used = usage.exportsToday ?? 0;
  const max = quotas.maxExportsPerDay;
  if (max <= 0) {
    return {
      ok: false,
      remaining: 0,
      quotas,
      error: featureGateError("dossier_export", normalized),
    };
  }
  if (used >= max) {
    return {
      ok: false,
      remaining: 0,
      quotas,
      error: `Export quota reached (${used}/${max}) on plan ${PLAN_DISPLAY_LABEL[normalized]}. ${billingNotActivatedMessage("researcher_pro")} to raise limits.`,
    };
  }
  return { ok: true, remaining: max - used, quotas };
}

/** How many ranked items to return for personalised ordering. */
export function personalisedFeedLimit(plan: ResearchEntitlement): number {
  return planQuotas(plan).personalisedFeedLimit;
}

export function radarListLimit(plan: ResearchEntitlement): number {
  return planQuotas(plan).radarListLimit;
}

export function entitlementSummary(plan: ResearchEntitlement) {
  const normalized = normalizeEntitlement(plan);
  const quotas = planQuotas(normalized);
  return {
    plan: normalized,
    label: PLAN_DISPLAY_LABEL[normalized],
    paymentActivation: ENTITLEMENT_ACCESS.paymentActivation,
    stripeWired: ENTITLEMENT_ACCESS.stripeWired,
    billingCopy: billingNotActivatedMessage(
      normalized === "free" ? "researcher_pro" : normalized,
    ),
    quotas,
    orthogonalToUserRoles: ENTITLEMENT_ACCESS.orthogonalToUserRoles,
  };
}

/**
 * In-memory rate-limit stub for Discovery sensitive actions.
 * Server handlers may use this for tests; production may later swap a shared store.
 */
export function createDiscoveryRateLimitStub(opts?: {
  windowMs?: number;
  maxPerWindow?: number;
}) {
  const windowMs = opts?.windowMs ?? 60_000;
  const maxPerWindow = opts?.maxPerWindow ?? 30;
  const hits = new Map<string, number[]>();
  return {
    stub: true as const,
    windowMs,
    maxPerWindow,
    check(key: string, now = Date.now()): { ok: true } | { ok: false; error: string; retryAfterMs: number } {
      const cutoff = now - windowMs;
      const prev = (hits.get(key) ?? []).filter((t) => t > cutoff);
      if (prev.length >= maxPerWindow) {
        const retryAfterMs = Math.max(0, prev[0]! + windowMs - now);
        return {
          ok: false,
          retryAfterMs,
          error: `Discovery rate limit stub exceeded (${maxPerWindow}/${windowMs}ms). Retry later.`,
        };
      }
      prev.push(now);
      hits.set(key, prev);
      return { ok: true };
    },
    reset() {
      hits.clear();
    },
  };
}

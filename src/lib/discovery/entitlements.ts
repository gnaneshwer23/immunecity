/**
 * Server-checked entitlement stubs for Discovery Radar.
 * No Stripe / payment activation — plans are flags only.
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
  defaultPlan: "free" as const satisfies ResearchEntitlement,
};

export const FREE_RADAR_LIMIT = 25;
export const RESEARCHER_PRO_RADAR_LIMIT = 200;
/** Free members see a short personalised preview; pro gets the full ranked window. */
export const FREE_PERSONALISED_PREVIEW = 5;

export function isResearchEntitlement(value: unknown): value is ResearchEntitlement {
  return typeof value === "string" && (RESEARCH_ENTITLEMENTS as readonly string[]).includes(value);
}

export function normalizeEntitlement(value: unknown): ResearchEntitlement {
  return isResearchEntitlement(value) ? value : ENTITLEMENT_ACCESS.defaultPlan;
}

/** Pure plan gate used by server handlers and unit tests. */
export function assertEntitlementAllows(
  plan: ResearchEntitlement,
  feature: "radar_list" | "gap_subscribe" | "extended_filters" | "advanced_feed",
): { ok: true; limit: number } | { ok: false; error: string } {
  const limit = plan === "researcher_pro" ? RESEARCHER_PRO_RADAR_LIMIT : FREE_RADAR_LIMIT;
  if (feature === "extended_filters" && plan !== "researcher_pro") {
    return {
      ok: false,
      error: "Extended Discovery filters require researcher_pro (stub — billing not activated).",
    };
  }
  if (feature === "gap_subscribe" && plan !== "researcher_pro") {
    return {
      ok: false,
      error: "Gap subscriptions require researcher_pro (stub — email alerts deferred; billing not activated).",
    };
  }
  if (feature === "advanced_feed" && plan !== "researcher_pro") {
    return {
      ok: false,
      error: "Advanced personalised Discovery feed requires researcher_pro (stub — billing not activated). Free plan shows a limited honest preview.",
    };
  }
  return { ok: true, limit };
}

/** How many ranked items to return for personalised ordering. */
export function personalisedFeedLimit(plan: ResearchEntitlement): number {
  return plan === "researcher_pro" ? RESEARCHER_PRO_RADAR_LIMIT : FREE_PERSONALISED_PREVIEW;
}

export function radarListLimit(plan: ResearchEntitlement): number {
  const gate = assertEntitlementAllows(plan, "radar_list");
  return gate.ok ? gate.limit : FREE_RADAR_LIMIT;
}

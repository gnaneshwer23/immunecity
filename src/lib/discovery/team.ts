/**
 * Team / Enterprise readiness scaffolding for Discovery (Phase 7).
 * Placeholders only — no multi-tenant tenancy, shared profile persistence,
 * or billing activation in this slice.
 */
import {
  assertEntitlementAllows,
  billingNotActivatedMessage,
  PLAN_DISPLAY_LABEL,
} from "@/lib/discovery/entitlements";
import type { ResearchEntitlement } from "@/lib/discovery/types";

export const TEAM_COLLAB_POLICY = {
  /** Real shared tenancy / org membership is off. */
  activated: false as const,
  multiTenantBilling: false as const,
  sharedProfilesPersisted: false as const,
  collabWritesEnabled: false as const,
  /** Tables / org IDs may be designed later; none are live. */
  membershipTable: null as null,
  note: "Team and Enterprise Discovery plans are entitlement stubs. Shared profiles and collaboration are scaffolding only — billing not activated.",
};

export type TeamSharedProfileDraft = {
  orgLabel: string;
  focusDiseases: string[];
  focusDomains: string[];
  modalities: string[];
};

export type TeamCollabInviteDraft = {
  inviteeEmail: string;
  roleHint: "viewer" | "editor" | "admin";
};

/** Plan may be team/enterprise in Neon; collaboration still refuses until policy flips. */
export function assertTeamFeature(
  plan: ResearchEntitlement,
  feature: "team_shared_profile" | "team_collab",
): { ok: false; error: string; policy: typeof TEAM_COLLAB_POLICY } {
  void plan;
  const gate = assertEntitlementAllows(plan, feature);
  return {
    ok: false,
    error: gate.ok === false ? gate.error : featureGateFallback(feature),
    policy: TEAM_COLLAB_POLICY,
  };
}

function featureGateFallback(feature: "team_shared_profile" | "team_collab"): string {
  if (feature === "team_shared_profile") {
    return `Shared team research profiles require Team/Enterprise (${billingNotActivatedMessage("team")}). Multi-tenant billing is not activated.`;
  }
  return `Team collaboration placeholders require Team/Enterprise (${billingNotActivatedMessage("team")}). Multi-tenant billing is not activated.`;
}

/** Shape a shared-profile request that must never persist under current policy. */
export function planSharedTeamProfile(input: {
  plan: ResearchEntitlement;
  draft: TeamSharedProfileDraft;
}): { ok: false; error: string; wouldPersist: false; planLabel: string } {
  const blocked = assertTeamFeature(input.plan, "team_shared_profile");
  return {
    ok: false,
    error: blocked.error,
    wouldPersist: false,
    planLabel: PLAN_DISPLAY_LABEL[input.plan],
  };
}

/** Shape a collab invite that must never send or persist under current policy. */
export function planTeamCollabInvite(input: {
  plan: ResearchEntitlement;
  invite: TeamCollabInviteDraft;
}): { ok: false; error: string; wouldSend: false; planLabel: string } {
  void input.invite;
  const blocked = assertTeamFeature(input.plan, "team_collab");
  return {
    ok: false,
    error: blocked.error,
    wouldSend: false,
    planLabel: PLAN_DISPLAY_LABEL[input.plan],
  };
}

export function teamReadinessSummary(plan: ResearchEntitlement) {
  return {
    plan,
    planLabel: PLAN_DISPLAY_LABEL[plan],
    policy: TEAM_COLLAB_POLICY,
    billingCopy: billingNotActivatedMessage(
      plan === "team" || plan === "enterprise" ? plan : "team",
    ),
    sharedProfile: assertTeamFeature(plan, "team_shared_profile"),
    collab: assertTeamFeature(plan, "team_collab"),
  };
}

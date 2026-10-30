/**
 * Team / Enterprise readiness scaffolding for Discovery (Phase 7 + 0027 tables).
 * Invite drafts may persist when DISCOVERY_TEAM_COLLAB_SCAFFOLD=1 — never sends email,
 * never activates paid Team billing or shared profile product features.
 */
import {
  assertEntitlementAllows,
  billingNotActivatedMessage,
  PLAN_DISPLAY_LABEL,
} from "@/lib/discovery/entitlements";
import type { ResearchEntitlement } from "@/lib/discovery/types";

export const TEAM_COLLAB_POLICY = {
  /** Real shared tenancy / org membership product features stay off. */
  activated: false as const,
  multiTenantBilling: false as const,
  sharedProfilesPersisted: false as const,
  collabWritesEnabled: false as const,
  /** Migration 0027 tables exist for invite/membership scaffolding. */
  membershipTable: "research_team_memberships" as const,
  inviteTable: "research_team_invites" as const,
  orgTable: "research_team_orgs" as const,
  note: "Team and Enterprise Discovery plans are entitlement stubs. Membership/invite tables are scaffolding — billing not activated; invites never auto-send.",
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

export function isTeamCollabScaffoldEnabled(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): boolean {
  const raw = (env.DISCOVERY_TEAM_COLLAB_SCAFFOLD ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

/** Plan may be team/enterprise in Neon; collaboration product features still refuse until policy flips. */
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

/**
 * Shape a collab invite. Product send stays refused.
 * When scaffold env is on, callers may persist a draft_pending row with wouldSend=false.
 */
export function planTeamCollabInvite(input: {
  plan: ResearchEntitlement;
  invite: TeamCollabInviteDraft;
  env?: Record<string, string | undefined>;
}): {
  ok: false;
  error: string;
  wouldSend: false;
  planLabel: string;
  scaffoldPersistAllowed: boolean;
  inviteeEmail: string;
  roleHint: TeamCollabInviteDraft["roleHint"];
} {
  const email = String(input.invite.inviteeEmail ?? "")
    .trim()
    .toLowerCase();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const blocked = assertTeamFeature(input.plan, "team_collab");
  const scaffold = isTeamCollabScaffoldEnabled(input.env);
  return {
    ok: false,
    error: blocked.error,
    wouldSend: false,
    planLabel: PLAN_DISPLAY_LABEL[input.plan],
    scaffoldPersistAllowed: scaffold && emailOk,
    inviteeEmail: emailOk ? email : "",
    roleHint: input.invite.roleHint,
  };
}

/** Validate invite draft fields for scaffold persistence (no send). */
export function buildTeamInviteScaffoldRecord(input: {
  orgId: string;
  invite: TeamCollabInviteDraft;
  invitedBy: string;
  env?: Record<string, string | undefined>;
}):
  | {
      ok: true;
      wouldSend: false;
      row: {
        orgId: string;
        inviteeEmail: string;
        roleHint: TeamCollabInviteDraft["roleHint"];
        status: "draft_pending";
        invitedBy: string;
        wouldSend: false;
      };
    }
  | { ok: false; error: string; wouldSend: false } {
  if (!isTeamCollabScaffoldEnabled(input.env)) {
    return {
      ok: false,
      wouldSend: false,
      error: "Team invite scaffold persistence requires DISCOVERY_TEAM_COLLAB_SCAFFOLD=1.",
    };
  }
  const email = String(input.invite.inviteeEmail ?? "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, wouldSend: false, error: "Valid invitee email required." };
  }
  if (!input.orgId.trim()) {
    return { ok: false, wouldSend: false, error: "orgId required." };
  }
  return {
    ok: true,
    wouldSend: false,
    row: {
      orgId: input.orgId.trim(),
      inviteeEmail: email,
      roleHint: input.invite.roleHint,
      status: "draft_pending",
      invitedBy: input.invitedBy,
      wouldSend: false,
    },
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
    scaffoldEnv: isTeamCollabScaffoldEnabled(),
  };
}

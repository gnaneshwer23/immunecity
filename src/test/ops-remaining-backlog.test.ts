/**
 * Ops / SME engineering aids — honesty gates for remaining backlog.
 * Run: bun test src/test/ops-remaining-backlog.test.ts
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  EMAIL_ALERT_POLICY,
  planEmailAlertDelivery,
  sendDiscoveryAlertEmail,
} from "@/lib/discovery/emailAlerts";
import {
  applyOpportunityReviewDecision,
} from "@/lib/discovery/opportunityReview";
import {
  planCustomerPortalSession,
  planResearcherProCheckoutSession,
  stripeBillingReadiness,
  STRIPE_BILLING_POLICY,
} from "@/lib/discovery/stripeBilling";
import {
  buildTeamInviteScaffoldRecord,
  planTeamCollabInvite,
  TEAM_COLLAB_POLICY,
} from "@/lib/discovery/team";
import { isTrialIntelligenceEnabled, TRIAL_INTELLIGENCE_ENABLEMENT_NOTE } from "@/lib/trialIntelligenceFlag";
import {
  applySmeWorkItemEventStatuses,
  keynoteRematchChecklist,
  r011SpoRewriteChecklist,
  statusFromLatestSmeEvent,
} from "@/lib/sme/workItemStatus";
import { buildSmePriorityQueues } from "@/lib/sme/workQueue";
import { mergeDiscoveryGoldAsSmeView, SME_GOLD_SET_SCAFFOLD } from "@/lib/sme/goldSet";

function source(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("SME work-item status from events", () => {
  it("maps approve/reject to resolved; rematch stays pending", () => {
    expect(statusFromLatestSmeEvent("approve")).toBe("resolved_by_sme");
    expect(statusFromLatestSmeEvent("reject")).toBe("resolved_by_sme");
    expect(statusFromLatestSmeEvent("rematch_citation")).toBe("pending_sme");
    expect(statusFromLatestSmeEvent("spo_rewrite_proposal")).toBe("changes_requested");
  });

  it("overlays audited statuses without inventing resolutions", () => {
    const items = buildSmePriorityQueues();
    const keynote = items.find((i) => i.id === "SME-KEYNOTE-I008-TR003");
    expect(keynote?.status).toBe("pending_sme");
    const next = applySmeWorkItemEventStatuses(items, [
      { workItemId: "SME-KEYNOTE-I008-TR003", action: "approve" },
    ]);
    expect(next.find((i) => i.id === "SME-KEYNOTE-I008-TR003")?.status).toBe("resolved_by_sme");
    expect(next.find((i) => i.id === "SME-R011-EXHAUSTION-D012")?.status).toBe("pending_sme");
  });

  it("exposes KEYNOTE / R011 checklists with done=false slots", () => {
    const k = keynoteRematchChecklist();
    const r = r011SpoRewriteChecklist();
    expect(k.every((s) => s.done === false)).toBe(true);
    expect(r.every((s) => s.done === false)).toBe(true);
    expect(k.some((s) => /25891173/.test(s.label))).toBe(true);
  });

  it("merges Discovery gold view with null labels", () => {
    const merged = mergeDiscoveryGoldAsSmeView();
    expect(merged.length).toBeGreaterThan(0);
    expect(merged.every((c) => c.label === null && c.smeScore === null)).toBe(true);
    expect(SME_GOLD_SET_SCAFFOLD.every((c) => c.smeScore === null)).toBe(true);
  });
});

describe("Opportunity review", () => {
  it("promotes assessed research_opportunity to reviewed_opportunity without autoApprove", () => {
    const ok = applyOpportunityReviewDecision({
      from: "assessed",
      decision: "promote_reviewed_opportunity",
      actorIsReviewer: true,
      gapClass: "research_opportunity",
    });
    expect(ok).toEqual({ ok: true, to: "reviewed_opportunity", autoApproved: false });
  });

  it("refuses promote without reviewer or wrong class", () => {
    expect(
      applyOpportunityReviewDecision({
        from: "assessed",
        decision: "promote_reviewed_opportunity",
        actorIsReviewer: false,
        gapClass: "research_opportunity",
      }).ok,
    ).toBe(false);
    expect(
      applyOpportunityReviewDecision({
        from: "assessed",
        decision: "promote_reviewed_opportunity",
        actorIsReviewer: true,
        gapClass: "scientific_evidence_gap",
      }).ok,
    ).toBe(false);
  });
});

describe("Email alerts adapter", () => {
  it("defers by default and never pretends sent", async () => {
    expect(EMAIL_ALERT_POLICY.pretendSentForbidden).toBe(true);
    const plan = planEmailAlertDelivery({});
    expect(plan.canSend).toBe(false);
    const sent = await sendDiscoveryAlertEmail(
      { to: "a@b.co", subject: "t", text: "b" },
      {},
      async () => new Response("should not call", { status: 500 }),
    );
    expect(sent.ok).toBe(false);
    expect(sent.pretended).toBe(false);
  });

  it("sends via Resend only when fully configured", async () => {
    const sent = await sendDiscoveryAlertEmail(
      { to: "a@b.co", subject: "t", text: "b" },
      {
        DISCOVERY_EMAIL_ALERTS: "1",
        EMAIL_PROVIDER: "resend",
        RESEND_API_KEY: "re_test",
        EMAIL_FROM: "alerts@example.com",
      },
      async () =>
        new Response(JSON.stringify({ id: "msg_1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    expect(sent).toEqual({ ok: true, provider: "resend", messageId: "msg_1", pretended: false });
  });
});

describe("Stripe scaffolding", () => {
  it("stays inactive without price IDs / secrets", () => {
    expect(STRIPE_BILLING_POLICY.inventPriceIdsForbidden).toBe(true);
    const ready = stripeBillingReadiness({});
    expect(ready.paymentActivation).toBe(false);
    expect(ready.stripeWired).toBe(false);
    expect(ready.teamBillingReady).toBe(false);
    expect(planResearcherProCheckoutSession({}).deferred).toBe(true);
    expect(planCustomerPortalSession({ customerId: "cus_x" }).deferred).toBe(true);
  });

  it("plans checkout when env is complete (no live charge)", () => {
    const env = {
      STRIPE_SECRET_KEY: "sk_test_x",
      STRIPE_PRICE_RESEARCHER_PRO: "price_test_pro",
      STRIPE_CHECKOUT_SUCCESS_URL: "https://example.com/ok",
      STRIPE_CHECKOUT_CANCEL_URL: "https://example.com/cancel",
      STRIPE_PORTAL_RETURN_URL: "https://example.com/billing",
      STRIPE_WEBHOOK_SECRET: "whsec_x",
    };
    const plan = planResearcherProCheckoutSession({ customerEmail: "a@b.co", env });
    expect(plan.ok).toBe(true);
    expect(plan.sessionParams?.line_items[0].price).toBe("price_test_pro");
    expect(stripeBillingReadiness(env).configured).toBe(true);
  });
});

describe("Team scaffold", () => {
  it("refuses product send; allows draft record only with scaffold env", () => {
    expect(TEAM_COLLAB_POLICY.activated).toBe(false);
    expect(TEAM_COLLAB_POLICY.membershipTable).toBe("research_team_memberships");
    const refuse = planTeamCollabInvite({
      plan: "team",
      invite: { inviteeEmail: "x@y.co", roleHint: "viewer" },
      env: {},
    });
    expect(refuse.wouldSend).toBe(false);
    expect(refuse.scaffoldPersistAllowed).toBe(false);
    const draft = buildTeamInviteScaffoldRecord({
      orgId: "00000000-0000-0000-0000-000000000001",
      invite: { inviteeEmail: "x@y.co", roleHint: "editor" },
      invitedBy: "admin@example.com",
      env: { DISCOVERY_TEAM_COLLAB_SCAFFOLD: "1" },
    });
    expect(draft.ok).toBe(true);
    if (draft.ok) {
      expect(draft.wouldSend).toBe(false);
      expect(draft.row.status).toBe("draft_pending");
    }
  });
});

describe("Trial Intelligence flag", () => {
  it("stays off by default with enablement note present", () => {
    expect(isTrialIntelligenceEnabled()).toBe(false);
    expect(TRIAL_INTELLIGENCE_ENABLEMENT_NOTE).toMatch(/Production TI stays off/);
  });
});

describe("Cron / env docs present", () => {
  it("wires vercel cron path and documents E2E skip≠pass", () => {
    const vercel = JSON.parse(source("vercel.json")) as { crons: { path: string; schedule: string }[] };
    expect(vercel.crons[0]?.path).toBe("/api/cron/discovery-monitor");
    expect(vercel.crons[0]?.schedule).toBe("0 6 * * *");
    expect(source("src/routes/api/cron/discovery-monitor.ts")).toContain("CRON_SECRET");
    expect(source("e2e/README.md")).toMatch(/Skipped auth tests are not passes/);
    expect(source(".env.example")).toContain("E2E_USER_A_EMAIL");
    expect(source(".env.example")).toContain("CRON_SECRET");
    expect(source(".env.example")).toContain("VITE_TRIAL_INTELLIGENCE");
  });
});

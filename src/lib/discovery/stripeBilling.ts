/**
 * Researcher Pro Stripe scaffolding — Checkout + Customer Portal readiness.
 * Inactive until STRIPE_SECRET_KEY + price IDs are configured. Never invents prices
 * or fabricates live charges. Orthogonal to user_roles.
 */
import { ENTITLEMENT_ACCESS, billingNotActivatedMessage } from "@/lib/discovery/entitlements";

export const STRIPE_BILLING_POLICY = {
  paymentActivation: false as const,
  inventPriceIdsForbidden: true as const,
  liveChargesWithoutConfigForbidden: true as const,
  note: "Stripe Checkout / Customer Portal are scaffolded only. Set STRIPE_SECRET_KEY + STRIPE_PRICE_RESEARCHER_PRO (+ webhook secret) to enable; leave unset to keep Researcher Pro billing inactive.",
} as const;

export type StripeBillingConfig = {
  secretKey: string | null;
  webhookSecret: string | null;
  priceResearcherPro: string | null;
  priceTeam: string | null;
  publishableKey: string | null;
  portalReturnUrl: string | null;
  checkoutSuccessUrl: string | null;
  checkoutCancelUrl: string | null;
};

export function readStripeBillingConfig(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): StripeBillingConfig {
  return {
    secretKey: (env.STRIPE_SECRET_KEY ?? "").trim() || null,
    webhookSecret: (env.STRIPE_WEBHOOK_SECRET ?? "").trim() || null,
    priceResearcherPro: (env.STRIPE_PRICE_RESEARCHER_PRO ?? "").trim() || null,
    priceTeam: (env.STRIPE_PRICE_TEAM ?? "").trim() || null,
    publishableKey: (env.STRIPE_PUBLISHABLE_KEY ?? env.VITE_STRIPE_PUBLISHABLE_KEY ?? "").trim() || null,
    portalReturnUrl: (env.STRIPE_PORTAL_RETURN_URL ?? "").trim() || null,
    checkoutSuccessUrl: (env.STRIPE_CHECKOUT_SUCCESS_URL ?? "").trim() || null,
    checkoutCancelUrl: (env.STRIPE_CHECKOUT_CANCEL_URL ?? "").trim() || null,
  };
}

export type StripeReadiness = {
  configured: boolean;
  researcherProCheckoutReady: boolean;
  customerPortalReady: boolean;
  teamBillingReady: false;
  stripeWired: false | true;
  paymentActivation: false | true;
  missing: string[];
  billingCopy: string;
  policy: typeof STRIPE_BILLING_POLICY;
  entitlementAccess: typeof ENTITLEMENT_ACCESS;
};

/** Honest readiness — Team paid billing stays off even when Researcher Pro keys exist. */
export function stripeBillingReadiness(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): StripeReadiness {
  const cfg = readStripeBillingConfig(env);
  const missing: string[] = [];
  if (!cfg.secretKey) missing.push("STRIPE_SECRET_KEY");
  if (!cfg.priceResearcherPro) missing.push("STRIPE_PRICE_RESEARCHER_PRO");
  if (!cfg.checkoutSuccessUrl) missing.push("STRIPE_CHECKOUT_SUCCESS_URL");
  if (!cfg.checkoutCancelUrl) missing.push("STRIPE_CHECKOUT_CANCEL_URL");
  if (!cfg.portalReturnUrl) missing.push("STRIPE_PORTAL_RETURN_URL");
  if (!cfg.webhookSecret) missing.push("STRIPE_WEBHOOK_SECRET");

  const researcherProCheckoutReady = Boolean(
    cfg.secretKey && cfg.priceResearcherPro && cfg.checkoutSuccessUrl && cfg.checkoutCancelUrl,
  );
  const customerPortalReady = Boolean(cfg.secretKey && cfg.portalReturnUrl);
  const fullyWired = researcherProCheckoutReady && customerPortalReady && Boolean(cfg.webhookSecret);

  return {
    configured: fullyWired,
    researcherProCheckoutReady,
    customerPortalReady,
    teamBillingReady: false,
    stripeWired: fullyWired,
    paymentActivation: fullyWired,
    missing,
    billingCopy: billingNotActivatedMessage("researcher_pro"),
    policy: STRIPE_BILLING_POLICY,
    entitlementAccess: ENTITLEMENT_ACCESS,
  };
}

/**
 * Plan a Checkout Session create payload. Does not call Stripe.
 * Callers must refuse when readiness.researcherProCheckoutReady is false.
 */
export function planResearcherProCheckoutSession(input: {
  customerEmail?: string | null;
  clientReferenceId?: string | null;
  env?: Record<string, string | undefined>;
}): {
  ok: boolean;
  deferred: boolean;
  error?: string;
  sessionParams?: {
    mode: "subscription";
    line_items: [{ price: string; quantity: 1 }];
    success_url: string;
    cancel_url: string;
    customer_email?: string;
    client_reference_id?: string;
  };
} {
  const env = input.env ?? (process.env as Record<string, string | undefined>);
  const cfg = readStripeBillingConfig(env);
  const ready = stripeBillingReadiness(env);
  if (!ready.researcherProCheckoutReady || !cfg.priceResearcherPro || !cfg.checkoutSuccessUrl || !cfg.checkoutCancelUrl) {
    return {
      ok: false,
      deferred: true,
      error: `Checkout deferred — missing ${ready.missing.join(", ") || "Stripe config"}. ${ready.billingCopy}`,
    };
  }
  return {
    ok: true,
    deferred: false,
    sessionParams: {
      mode: "subscription",
      line_items: [{ price: cfg.priceResearcherPro, quantity: 1 }],
      success_url: cfg.checkoutSuccessUrl,
      cancel_url: cfg.checkoutCancelUrl,
      ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
      ...(input.clientReferenceId ? { client_reference_id: input.clientReferenceId } : {}),
    },
  };
}

/** Plan Customer Portal session — no live API call. */
export function planCustomerPortalSession(input: {
  customerId: string;
  env?: Record<string, string | undefined>;
}): {
  ok: boolean;
  deferred: boolean;
  error?: string;
  sessionParams?: { customer: string; return_url: string };
} {
  const env = input.env ?? (process.env as Record<string, string | undefined>);
  const cfg = readStripeBillingConfig(env);
  const ready = stripeBillingReadiness(env);
  if (!ready.customerPortalReady || !cfg.portalReturnUrl) {
    return {
      ok: false,
      deferred: true,
      error: `Customer Portal deferred — missing ${ready.missing.join(", ") || "Stripe config"}.`,
    };
  }
  if (!input.customerId.trim()) {
    return { ok: false, deferred: false, error: "customerId required." };
  }
  return {
    ok: true,
    deferred: false,
    sessionParams: { customer: input.customerId.trim(), return_url: cfg.portalReturnUrl },
  };
}

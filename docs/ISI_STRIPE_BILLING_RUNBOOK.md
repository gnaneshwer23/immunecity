# ISI Stripe billing runbook (Researcher Pro)

**Status:** Scaffolding only — **payment activation OFF** until secrets + Dashboard prices exist.  
**Code:** `src/lib/discovery/stripeBilling.ts` · entitlements remain stubs in `entitlements.ts`.  
**Do not** invent price IDs or fabricate live charges.

## Prerequisites

1. Stripe account (test/sandbox first; see Stripe best-practices skill).
2. Create a **Researcher Pro** recurring Price in Dashboard → copy `price_…` id.
3. Restrict API key (RAK preferred) with Checkout + Billing + Customers permissions.
4. Configure Customer Portal in Stripe Dashboard (return URL on ISI domain).

## Required env (Vercel Production / Preview)

| Var | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Server secret / RAK (`sk_` / `rk_`) |
| `STRIPE_PUBLISHABLE_KEY` or `VITE_STRIPE_PUBLISHABLE_KEY` | Browser Checkout if/when UI ships |
| `STRIPE_PRICE_RESEARCHER_PRO` | Real Dashboard price id — never invent |
| `STRIPE_PRICE_TEAM` | Optional; Team billing stays product-off |
| `STRIPE_CHECKOUT_SUCCESS_URL` | e.g. `https://www.immune-super-intelligence.co.uk/discovery?billing=success` |
| `STRIPE_CHECKOUT_CANCEL_URL` | Cancel return |
| `STRIPE_PORTAL_RETURN_URL` | Customer Portal return |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |

Webhook events (when activating): `checkout.session.completed`, `checkout.session.async_payment_succeeded`, plus subscription lifecycle as needed. Fulfilment must set `research_profiles.entitlement` server-side only after signed webhook — never from client hints.

## Activation checklist

1. `stripeBillingReadiness()` reports `configured: true` in a one-off server log / admin smoke.
2. Create Checkout Session via planned params (`planResearcherProCheckoutSession`) — wire UI only after product sign-off.
3. Confirm webhook updates entitlement to `researcher_pro` and never grants `admin` / reviewer roles.
4. Team plan: keep `teamBillingReady: false` until separate product decision.

## Rollback

Unset Stripe env vars → redeploy. Entitlement stubs continue to refuse paid features with “billing not activated” copy. Existing Neon entitlement rows (if any) remain manual ops.

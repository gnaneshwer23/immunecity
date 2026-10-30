# ISI Discovery Intelligence — Phase 7–8 report

**Date:** 2026-10-30  
**Baseline tip before this slice:** `2131a45`  
**Surfaces:** `/discovery*`, entitlements module, Playwright Discovery journeys, gold-set harness

## Phase 7 — Premium entitlement preparation

| Capability | Implementation |
| --- | --- |
| Plan matrix | `free` \| `researcher_pro` \| `team` \| `enterprise` on `research_profiles.entitlement` (migration **0022** CHECK) |
| Server permissions | `assertEntitlementAllows` + `PLAN_QUOTAS` in `entitlements.ts` |
| Quotas | Followed gaps, monitor runs/day, exports/day via `assertQuotaAllows` in `toggleGapSubscription`, `runMyDiscoveryMonitor`, `exportDiscoveryDossier` |
| Rate-limit stub | `createDiscoveryRateLimitStub` on follow / export / monitor |
| Team scaffolding | `team.ts` — shared profiles / collab placeholders; `TEAM_COLLAB_POLICY.activated = false` |
| Auth model | Extends Discovery entitlements; **orthogonal** to `user_roles` (member/moderator/reviewer/admin) |
| Honest UI | “Researcher Pro — billing not activated” on profile, dossier follow, radar, alerts |
| Stripe | **Not** activated — `paymentActivation` / `stripeWired` / `pricesPublished` / `collectPayments` all false |

### Entitlement matrix (server quotas)

| Feature | Free | Researcher Pro | Team | Enterprise |
| --- | --- | --- | --- | --- |
| Radar list limit | 25 | 200 | 500 | 1000 |
| Personalised feed | 5 | 200 | 500 | 1000 |
| Max followed gaps | 0 | 25 | 100 | 500 |
| Monitor runs / day | 1 | 24 | 100 | 500 |
| Exports / day | 0 | 10 | 50 | 200 |
| Extended filters / advanced feed | no | yes | yes | yes |
| Gap follow / dossier export | no | yes | yes | yes |
| Shared team profiles / collab | scaffolding refuse | scaffolding refuse | scaffolding refuse | scaffolding refuse |

Ops may set `research_profiles.entitlement` in Neon; clients cannot elevate (`void data.entitlement`).

### Apply migration 0022

```bash
bun run db:research-entitlements-team
```

Schema-only on `ep-blue-salad`; evidence count unchanged; no team membership tables.

## Phase 8 — End-to-end verification

| Check | Result / command |
| --- | --- |
| Unit + integration (entitlements, isolation, gap status, monitor idempotency, ranking, quotas, security) | `bun test src/test/discovery-intelligence.test.ts` |
| Gold-set harness (structure only; no SME scores) | `bun run discovery:eval` |
| A11y source smoke (Discovery pages + billing copy) | `bun run a11y` |
| Playwright Discovery public + auth | Prefer `E2E_BASE_URL` (prod/preview) if Vite OOM; `e2e/discovery-intelligence.spec.ts` |
| Auth without creds | **skip ≠ pass** — explicit `SKIP (not a pass): …` in `e2e/auth-helpers.ts` / report |
| Neon 0022 | Applied on ep-blue-salad; evidence_records=46 unchanged |
| Prod browser copy lag | New Follow button label verified in source/a11y tests; full prod string match after deploy |

### skip ≠ pass

Missing `E2E_USER_*` → authenticated Discovery tests **skip**. Playwright lists them as skipped, not passed. Do not treat public-only green as proof of profile quotas, monitor auth, or owner isolation in the browser.

**Recorded run (this slice):** `E2E_BASE_URL=https://www.immune-super-intelligence.co.uk` → **2 passed** (public journey + a11y landmarks), **2 skipped** (auth profile/alerts — not passes). Focused bun unit tests: **18 pass / 0 fail**.

### Scientific benchmark harness

`src/lib/discovery/eval/goldSet.ts` — pending_sme / scaffolded cases with `smeScore: null` and `expectedStatus: null`. Binding to real detection keys allowed; inventing metrics forbidden.

## Non-goals held

No second KG, no fabricated PMIDs/gaps, no bulk Gate C, no Stripe/prices/payments, no Vercel deploy, TI prod flag unchanged, no force-push.

## Still SME / ops

| Item | Owner |
| --- | --- |
| Stripe live + published prices | Ops / billing |
| Email alert delivery | Ops |
| Neon apply 0022 (if not yet run) | Ops (`bun run db:research-entitlements-team`) |
| Vercel production deploy | Ops |
| Gate C / KEYNOTE rematch / gold-set SME scores | Scientific review |
| Live multi-account Playwright green | Needs `E2E_USER_A/B_*` |
| Activate Team multi-tenant collab | Product + billing (policy flip only after ready) |

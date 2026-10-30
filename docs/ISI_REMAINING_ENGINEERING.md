# ISI remaining engineering — A / B / C

**Date:** 2026-10-30  
**Tip baseline before this ship:** `ae82694` (Ask Immune cell mascot)  
**Related:** `ISI_REMAINING_AFTER_FIXPASS.md`, `ISI_DISCOVERY_REMAINING.md`, `ISI_DISCOVERY_CRON.md`, `ISI_STRIPE_BILLING_RUNBOOK.md`, `ISI_SME_WORKSPACE.md`

## A) Already done (engineering)

| Area | Notes |
| --- | --- |
| Discovery 0–8 | Radar, dossiers, ranking, monitor MVP, entitlements stubs, eval harness |
| SME workspace `/sme` | Queues + rematch + gold harness + KEYNOTE/R011 checklists + `?gapKey=` deep-link + S-P-O proposal audit |
| Opportunity review UI | Dossier `reviewed_opportunity` promote/reject/demote (human-only; Gate C unchanged) |
| Evidence Intel 4.0 core | Scout, claim verifier, A–D cross-exam, verified gaps, review routing, safeguards |
| Offline five-dossier validation | `bun run discovery:intel4-validate` → JSON/MD; `accuracyVsGold=null` |
| Neon 0019–0027 | **0027** SME label CHECK + team scaffold tables + spo_rewrite_proposal action |
| Dossier Intel 4.0 UI | Wired to Neon / offline snapshot |
| Bounded citation-chain + monitor hooks | Opt-in per scout run; idempotent |
| **Vercel Cron** | `vercel.json` → `/api/cron/discovery-monitor` daily 06:00 UTC; Bearer `CRON_SECRET` fail-closed |
| Email adapter | Resend path env-gated; default deferred; never pretends sent |
| Stripe scaffolding | Checkout/Portal planners + runbook; inactive without price IDs |
| Team tables | 0027 orgs/memberships/invites; product collab still refuse; scaffold persist opt-in |
| TI flag | Remains **off**; enablement note in `trialIntelligenceFlag.ts` |
| E2E docs | `.env.example` + README skip≠pass tables |

## B) Still needs human / ops (do not fake)

| Item | Why |
| --- | --- |
| SME gold labels | Expected labels / accuracy denominators stay null until reviewers fill them |
| Gate C / `reviewed_opportunity` decisions | Human scientific review only — UI ready; no auto-approve |
| KEYNOTE-006 rematch / R011 S-P-O | Requires SME PMID+DOI+passage / rewrite decisions |
| `E2E_USER_A_*` / `E2E_USER_B_*` | Live multi-account Playwright; skips ≠ passes without creds |
| Stripe live activation | Needs real `STRIPE_PRICE_*` + webhook fulfilment — runbook only |
| Email delivery | Needs `DISCOVERY_EMAIL_ALERTS=1` + Resend keys |
| Prod cron secret | Set `CRON_SECRET` on Vercel so scheduled invokes succeed |
| Ontology crosswalks / assay cut-offs | Curator-supplied only — empty by design |
| Trial Intelligence prod flag | Stays off until product sign-off |

## C) This ship (engineering leftovers closed)

1. SME workflow aids (status from events, checklists, deep-link, S-P-O proposal, Discovery gold merge).
2. Opportunity review server + dossier UI.
3. Shared monitor cron module + Vercel route + docs.
4. Email / Stripe / Team scaffolding with honest deferred gates.
5. Curator copy for empty ontology / assay cut-offs.
6. Focused tests: `bun test src/test/ops-remaining-backlog.test.ts`.

## Commands

```bash
bun run db:ops-sme-team-scaffold   # idempotent 0027
bun run discovery:monitor          # CLI same job as cron
bun test src/test/ops-remaining-backlog.test.ts
bun run sme:eval
```

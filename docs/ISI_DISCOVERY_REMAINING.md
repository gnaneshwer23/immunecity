# ISI Discovery Intelligence — remaining backlog

**Date:** 2026-10-30  
**Shipped baseline:** Discovery Phase 0–8 + Evidence Intel 4.0 + ops scaffolding on `main`.  
**Related:** `ISI_REMAINING_ENGINEERING.md`, `ISI_DISCOVERY_CRON.md`, `ISI_STRIPE_BILLING_RUNBOOK.md`.

## Shipped (engineering)

| Item | Notes |
| --- | --- |
| Phase 0–8 Discovery | Radar, dossiers, ranking, monitor, entitlements stubs, eval harness |
| Evidence Intel 4.0 | Scout / verifier / cross-exam / routing; 0026; offline validate |
| SME workspace | `/sme` checklists, rematch, gold slots, S-P-O proposal audit, `?gapKey=` |
| Opportunity review | Human `reviewed_opportunity` on dossier (no Gate C couple) |
| Prod cron wire | `vercel.json` + `/api/cron/discovery-monitor` + `runMonitorCron.ts` |
| Email adapter | Resend env-gated; default `email_deferred` / in-app |
| Stripe scaffolding | Planners + runbook; `paymentActivation` false without config |
| Team tables (0027) | Orgs / memberships / invites; collab product still refuse |
| Unit / Playwright public | Auth E2E still skip≠pass without `E2E_USER_*` |

## Intentionally deferred / SME-blocked

| Item | Why |
| --- | --- |
| Gold labels / accuracy % | Null until SME fills |
| Gate C / KEYNOTE rematch / R011 rewrite | Human science |
| Live multi-account Playwright green | Needs credentials |
| Stripe collect payments | Missing price IDs / webhook fulfilment |
| Email in production | Missing Resend + enable flag |
| Live PubMed/CT.gov default | Opt-in `DISCOVERY_LIVE_*` only |
| TI production flag | Keep off |
| Ontology / assay cut-offs | Curator-supplied; empty OK |

## Next human / ops actions (ordered)

1. SME: KEYNOTE rematch (PMID `25891173` + DOI + passage) then separate Gate C.
2. SME: R011 S-P-O rewrite or demote; optional gold labels.
3. SME: Opportunity / Gate C decisions on deep dossiers (no bulk).
4. Ops: set `CRON_SECRET` on Vercel; confirm daily cron logs.
5. Ops: optional Resend + `DISCOVERY_EMAIL_ALERTS=1`.
6. Ops: Stripe Dashboard prices → env → webhook (see runbook) before claiming Researcher Pro billing.
7. Ops: provision `E2E_USER_A_*` / `E2E_USER_B_*` and run Playwright auth block.
8. Product: TI enablement only after SME sign-off (`VITE_TRIAL_INTELLIGENCE=1` + redeploy).

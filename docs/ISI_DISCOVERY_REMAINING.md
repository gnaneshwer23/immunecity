# ISI Discovery Intelligence — remaining backlog

**Date:** 2026-10-30  
**Shipped baseline:** Discovery Phase 0–8 on `main` (see `ISI_DISCOVERY_PHASE3_4_REPORT.md`, `ISI_DISCOVERY_PHASE5_6_REPORT.md`, `ISI_DISCOVERY_PHASE7_8_REPORT.md`).  
**Related:** `ISI_REMAINING_AFTER_FIXPASS.md`, `ISI_DISCOVERY_INTEL_AUDIT.md`.

## Shipped (engineering)

| Item | Notes |
| --- | --- |
| Phase 0 docs (audit, matrix, PRD, data model, orchestration) | `docs/ISI_DISCOVERY_*.md` |
| `research_profiles` migration 0019 + server CRUD | Ownership-scoped; entitlement stub |
| Gap suite migration 0020 + types/status taxonomy | Includes `coverage_insufficient` |
| Deterministic Detect (Pilots A/B) | Matrix + evidenceGap; never `reviewed_gap` |
| Gap review decision fn | Reviewer-gated; version + audit events |
| Routes `/discovery*` + Investigate I7 | Radar, onboarding, profile, gaps, dossier, alerts |
| Neon apply 0019/0020 on ep-blue-salad | See `docs/ISI_NEON_0019_0020_APPLY.md`; schema-only, evidence=46 unchanged |
| Phase 3 verification | `verify.ts` + `verifyPersistedGap`; coverage rows; labelled AI draft-only |
| Phase 4 Radar / dossier | Neon-merged feed, badges, emerging/contradiction, Ask prefill, follow stub |
| Persist from signed-in member | Idempotent upsert by `gap_key`; no overwrite of human decisions |
| Phase 5 personalisation | Explainable weighted ranking + feedback → `research_gap_feedback`; free preview / pro stub |
| Phase 6 monitoring | Adapters (fail-closed live), `/discovery/alerts`, migration 0021, `bun run discovery:monitor` |
| Phase 7 entitlements | Free / Researcher Pro / Team / Enterprise stubs; quotas in server fns; team scaffolding; migration 0022; no Stripe |
| Phase 8 verification | Unit/security/ranking/monitor tests; Playwright Discovery journeys (skip≠pass); gold-set harness; a11y smoke |
| Unit tests Phase 1–8 | Isolation, transitions, coverage, entitlements/quotas, verify, ranking, feedback, monitor, export, team refuse |
| Playwright Discovery smoke | Public structure + a11y landmarks; auth still skip≠pass without creds |

## Intentionally deferred / SME-blocked

| Item | Why |
| --- | --- |
| Email alert delivery | In-app only; `email_deferred` channel stub |
| Live PubMed / CT.gov in default cron | Opt-in env (`DISCOVERY_LIVE_*`); stub/fail-closed by default |
| Stripe / researcher_pro billing | Server entitlement stub; **no payment activation** |
| Team multi-tenant shared profiles | Scaffolding only (`team.ts`); billing not activated |
| Mass ontology fill / assay cut-offs | Fabrication-forbidden / prior backlog |
| Gate C / KEYNOTE rematch / gold-set SME scores | Human scientific review (harness structure only) |
| Bulk gap approve | Explicitly refused |
| TI prod flag / Vercel deploy | Out of scope |
| Live multi-account Playwright green | Needs `E2E_USER_*`; skips ≠ passes |

## Next engineering (when unblocked)

1. ~~Curator UI panel for gap review queue~~ — **shipped** SME workspace `/sme` (Investigate I8 / Trust T5); dossier still has inline gap decisions.  
2. ~~Apply migration 0022 / **0023** on Neon~~ — **done** on ep-blue-salad; see `docs/ISI_NEON_0023_APPLY.md` (0023) and Phase 7–8 report (0022).  
3. Fill gold-set expected statuses only after SME review — never invent scores (`bun run sme:eval` reports honest denominators).  
4. Persist-on-first-radar-load policy debate (today: explicit member action).  
5. Optional scheduled cron wrapping `bun run discovery:monitor` (email still deferred).  
6. Activate Team collab / Stripe only after explicit product + billing sign-off.

# ISI remaining engineering — A / B / C

**Date:** 2026-10-30  
**Tip baseline before this ship:** `bff2518` (Evidence Intel 4.0 dossier panel + five-dossier validation)  
**Related:** `ISI_REMAINING_AFTER_FIXPASS.md`, `ISI_DISCOVERY_REMAINING.md`, `ISI_EVIDENCE_INTEL_4_*`

## A) Already done (engineering)

| Area | Notes |
| --- | --- |
| Discovery 0–8 | Radar, dossiers, ranking, monitor MVP, entitlements stubs, eval harness |
| SME workspace `/sme` | Queues + rematch helpers — decisions still human-only |
| Discovery 3.0 appraisal sprint | Five deep opportunities + per-question screens |
| Evidence Intel 4.0 core | Scout, claim verifier, A–D cross-exam, verified gaps, review routing, safeguards |
| Offline five-dossier validation | `bun run discovery:intel4-validate` → JSON/MD; `accuracyVsGold=null` |
| Neon 0019–0026 | Applied on ep-blue-salad; **0026** verified `evidence_count=46` unchanged |
| Dossier Intel 4.0 UI shell | Section + counts/route (now wired to latest decisions / offline snapshot) |
| Bounded citation-chain + monitor hooks | Opt-in per scout run (`activateHooks`); idempotent; **no prod cron** |

## B) Still needs human / ops (do not fake)

| Item | Why |
| --- | --- |
| SME gold labels | Expected labels / accuracy denominators stay null until reviewers fill them |
| Gate C / `reviewed_opportunity` | Human scientific review only — no auto-approve |
| KEYNOTE-006 rematch / R011 S-P-O | Requires SME PMID+DOI+passage decisions |
| `E2E_USER_A_*` / `E2E_USER_B_*` | Live multi-account Playwright; skips ≠ passes without creds |
| Vercel deploy | Explicit ops / Hobby constraints — out of eng invent scope |
| Stripe / payment activation | Entitlement stubs only |
| Prod Discovery cron | Monitor script exists; scheduling is ops; email still deferred |
| Ontology crosswalks / assay cut-offs | Curator-supplied only — fabricating forbidden |
| Trial Intelligence prod flag | Stays off until product sign-off |

## C) Engineering leftovers (this ship)

1. **Wire Intel 4.0 into `getDiscoveryGap` / dossier** — Neon `research_intel4_*` when present; else offline validation snapshot for the five deep gaps; UI shows scout / verifier / cross-exam / routing summaries.
2. **Bounded citation-chaining + monitor hook activation** — `citationChain.ts`; scout `activateHooks` runs capped, idempotent chain + monitor fingerprint; no unbounded scrape; no prod schedule.
3. **Schema drift** — Drizzle tables/columns for 0026 mirrored in `schema.server.ts`.
4. **0026 apply** — Re-verified applied on ep-blue-salad (`evidence_count=46`).
5. **Focused tests** — intel4 attach + citation-chain / hook activation.
6. **This doc** — A/B/C inventory.

## Commands

```bash
bun run db:evidence-intel-4          # idempotent 0026 apply (ep-blue-salad gate)
bun run discovery:intel4-validate    # offline five-dossier reassessment
bun test src/test/evidence-intel-4.test.ts
```

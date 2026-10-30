# ISI Discovery Intelligence — Phase 5–6 report

**Date:** 2026-10-30  
**Baseline tip before this slice:** `6252945`  
**Surfaces:** `/discovery` (personalised feed), `/discovery/gaps/$gapId` (feedback), `/discovery/alerts`, cron `bun run discovery:monitor`

## Phase 5 — Personalisation

| Capability | Implementation |
| --- | --- |
| Weighted ranking | `recommend.ts` — factors: topic_match, mechanism, uncertainty, coverage, feedback, recency |
| “Recommended because…” | Transparent `because` + `factors` on each reason; UI line on Radar rows |
| Feedback | `submitGapFeedback` → `research_gap_feedback`; boosts/demotes **your** feed only |
| Feed wiring | `listMyDiscoveryRadar` loads profile + feedback + updatedAt server-side; `orderByRecommendation` |
| Entitlements | Free: honest limited preview (`FREE_PERSONALISED_PREVIEW`); `researcher_pro`: advanced feed stub (no Stripe) |
| Honesty | `RANKING_POLICY` — score ≠ novelty / scientific importance / worldwide literature |

## Phase 6 — Continuous monitoring

| Capability | Implementation |
| --- | --- |
| Adapters | `adapters.ts` — rate limit, retries, stub / fixture / live PubMed+CT.gov **fail-closed** without env flags |
| Planner | `monitor.ts` — followed gaps + profile interests → signals, reassessment, alert drafts |
| Persistence | Migration **0021** — `research_discovery_alerts` (dedupe), `research_monitor_runs` |
| In-app alerts | `/discovery/alerts` + `listMyDiscoveryAlerts` / `markDiscoveryAlertsRead` / `runMyDiscoveryMonitor` |
| Cron | `bun run discovery:monitor` → `scripts/run-discovery-monitor.ts` |
| Guardrails | Never auto `reviewed_gap`; never fabricate PMIDs; email deferred; no implied scientific review |

### How to run the monitor job

```bash
# Schema (once; ep-blue-salad)
bun run db:research-discovery-monitor

# Manual / cron-ready (stub adapters by default)
bun run discovery:monitor

# Optional live adapters (fail closed if unset)
DISCOVERY_LIVE_PUBMED=1 NCBI_API_KEY=… bun run discovery:monitor
DISCOVERY_LIVE_CTGOV=1 bun run discovery:monitor
```

Also available signed-in via **Run monitor now** on `/discovery/alerts`.

## Tests

`bun test src/test/discovery-intelligence.test.ts` — Phase 1–4 retained; Phase 5 ranking/feedback/entitlements; Phase 6 idempotency, alert dedupe, fail-closed adapters.

## Non-goals held

No second KG, no bulk Gate C approve, no Stripe activation, no Vercel deploy, no mass graph expansion, TI flag unchanged, missing ISI ≠ worldwide absence.

## Deferred

| Item | Notes |
| --- | --- |
| Email alerts | Channel stub only (`email_deferred`); in-app first |
| Live API keys in prod | Env-gated; default stub / fail-closed |
| SME gold-set / Gate C rematch | Human scientific review still required |
| Curator gap queue panel | Dossier + alerts cover MVP; queue UI later |

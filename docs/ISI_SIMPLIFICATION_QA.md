# ISI simplification — QA (Phase 9)

**Date:** 2026-10-30  
**Scope:** Focused automated suites + manual journey checklist. Skip ≠ pass.

## Automated (run locally)

```bash
bun test src/test/journey-nav.test.ts src/test/ask-entry-points.test.ts \
  src/test/phase-f-e2e-journey.test.ts src/test/marketing-nav.test.ts \
  src/test/community-phase3.test.ts src/test/sme-workspace.test.ts \
  src/test/discovery-intelligence.test.ts src/test/ux-language.test.ts \
  src/test/ask-gateway-intent.test.ts --timeout 60000
```

Also: `bun test src/test/ai-grounding.test.ts` when Ask grounding changes.

## Journeys (manual / browser)

| # | Journey | Desktop | Tablet | Mobile | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | Home → Ask → answer → Atlas / Radar link | ☐ | ☐ | ☐ | |
| 2 | Header Explore → hub → graph / mechanism | ☐ | ☐ | ☐ | |
| 3 | Header Research → library + Radar | ☐ | ☐ | ☐ | |
| 4 | Academy → foundation lesson | ☐ | ☐ | ☐ | |
| 5 | Community → discussions | ☐ | ☐ | ☐ | |
| 6 | Compat redirect `/scientific-ai` → Reasoning | ☐ | — | — | |
| 7 | Compat `/research-workbench` → `/research` | ☐ | — | — | |
| 8 | Account → Scientific review (`/sme`) when entitled | ☐ | ☐ | ☐ | |
| 9 | Curation queue — evidence id folded, not primary | ☐ | — | — | |
| 10 | Ask FAB absent on `/ask`; present elsewhere | ☐ | ☐ | ☐ | |

Screenshots: capture when a browser session is available; not attached in this pass if CI-only.

## Known skips (documented, not passes)

- Live Playwright auth / Neon two-account isolation — deferred (see phase-f notes).
- Full visual screenshot matrix across viewports — needs browser session.
- Claiming Discovery Intel agents as production-autonomous — **blocked** until eval harness green for each agent path.
- Trial Intelligence / Stripe / billing — **must stay off**.

## Remaining blockers

1. Scientific validation of scaffolded agents (scout/verifier etc.) before any “autonomous” UI copy.
2. Deeper Research hub IA (optional sub-routes) without dropping legacy URLs.
3. Homepage visual polish pass after first deploy (motion, reduced-motion).
4. Curation density / melanoma matrix still expert-adjacent.

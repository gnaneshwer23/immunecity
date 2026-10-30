# ISI simplification — QA (Phase 9)

**Date:** 2026-10-30  
**Scope:** Focused automated suites + browser journey checklist. Skip ≠ pass.

## Automated (run locally)

```bash
bun test src/test/journey-nav.test.ts src/test/ask-entry-points.test.ts \
  src/test/phase-f-e2e-journey.test.ts src/test/marketing-nav.test.ts \
  src/test/community-phase3.test.ts src/test/sme-workspace.test.ts \
  src/test/discovery-intelligence.test.ts src/test/ux-language.test.ts \
  src/test/ask-gateway-intent.test.ts --timeout 90000
```

Also: `bun test src/test/ai-grounding.test.ts` when Ask grounding changes.  
Also: `bun test src/test/hardening-sprint.test.ts` when Research persistence copy changes.

**Result (this pass):** 88 pass / 0 fail across the nine suites above (plus hardening/ask-gateway in focused re-runs). Prefer `bun test` over hung vitest.

## Journeys (manual / browser)

Screenshots: `docs/qa-simplification-2026-10-30/` (desktop viewport via production tip; local Vite hung during this pass — **Research Discover ladder / deepened Explore** land after this commit deploys).

| # | Journey | Desktop | Tablet | Mobile | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | Home → Ask → answer → Atlas / Radar link | ☑ `01`/`02` | ☐ | ☐ | Ask FAB present on home; absent on `/ask` |
| 2 | Header Explore → hub → graph / mechanism | ☑ `03` | ☐ | ☐ | Explore hub loads; FAB present |
| 3 | Header Research → library + Radar | ☑ `04` | ☐ | ☐ | Research library; post-deploy recheck Discover ladder |
| 4 | Academy → foundation lesson | ☑ `05` | ☐ | ☐ | Foundation CTA visible |
| 5 | Community → discussions | ☑ `06` | ☐ | ☐ | Empty feed honest; Sign in CTA |
| 6 | Compat redirect `/scientific-ai` → Reasoning | ☐ | — | — | Covered by redirect tests / prior ship |
| 7 | Compat `/research-workbench` → `/research` | ☐ | — | — | Covered by prior ship |
| 8 | Account → Scientific review (`/sme`) when entitled | ☐ | ☐ | ☐ | Auth skip ≠ pass |
| 9 | Curation queue — evidence id folded, not primary | ☐ | — | — | Unit-guarded in ux-language |
| 10 | Ask FAB absent on `/ask`; present elsewhere | ☑ | ☐ | ☐ | Confirmed on `/ask` vs home/explore |

## Known skips (documented, not passes)

- Live Playwright auth / Neon two-account isolation — deferred (see phase-f notes).
- Tablet/mobile screenshot matrix — desktop captured; narrow viewports deferred.
- Local Vite visual confirm of Research Discover ladder / Explore deepen — blocked (dev server hung); recheck after deploy.
- Claiming Discovery Intel agents as production-autonomous — **blocked** until eval harness green for each agent path.
- Trial Intelligence / Stripe / billing — **must stay off**.

## Remaining blockers (human / ops)

1. Scientific validation of scaffolded agents (scout/verifier etc.) before any “autonomous” UI copy.
2. Gate C / gold / assay cut-offs — human review only.
3. Homepage visual motion polish (tokens ready).
4. Curation density / melanoma matrix still expert-adjacent.

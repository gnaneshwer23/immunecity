# ISI post–A–F test report

**Date:** 2026-10-30  
**Baseline:** `3e815db` (+ local audit fix commits)  
**Distinguish carefully:** unit/contract ≠ browser E2E.

## Commands run

### Unit / contract (not browser E2E)

```bash
bun test src/test/post-af-ask-graphrag-audit.test.ts \
  src/test/post-af-scientific-brief-audit.test.ts \
  src/test/phase-e-clinical-research.test.ts \
  src/test/phase-f-e2e-journey.test.ts --timeout 60000
```

**Result:** 31 pass / 0 fail (includes Phase F source-contract suite — **not** Playwright).

### Neon read-only (0017 / 0018)

```bash
# Custom read-only probe against DATABASE_URL from .env.local
# host_prefix=ep-blue-salad
# table.ontology_mappings=missing
# table.graph_provenance_events=missing
# treatment_line columns=absent
# clinical_trials TR003/TR020 present
# evidence_records=46 (approved=9)
```

**Migrations 0017 and 0018: NOT APPLIED.** No apply attempted (prefer report over risky write).

### Browser Playwright

Local `vite build` hung under agent memory pressure; hung `vite:dev :8080` did not answer HTTP.  
Ran against **production** with local Playwright **1.64.1**:

```bash
E2E_BASE_URL=https://www.immune-super-intelligence.co.uk \
  bun node_modules/@playwright/test/cli.js test e2e/isi-journeys.spec.ts --project=desktop
```

| Spec | Project | Result |
| --- | --- | --- |
| Journey overview→graph→evidence→Ask→research | desktop | **PASS** |
| Keyboard Ask focus | desktop | **PASS** |
| Mobile compact nav | mobile | (run in full suite — see below) |
| Tablet evidence/research | tablet-deadzone | (run in full suite) |
| Auth / isolation / collections | desktop | **SKIPPED** — no `E2E_USER_*` env |

**Known pitfall:** `bunx playwright` (unpinned) caused `test.describe() called here` version mismatch; use `bun node_modules/@playwright/test/cli.js`.

### Full multi-project run (production)

```bash
E2E_BASE_URL=https://www.immune-super-intelligence.co.uk \
  bun node_modules/@playwright/test/cli.js test e2e/isi-journeys.spec.ts e2e/marketing-nav.spec.ts
```

**Aggregate:** 5 passed · 4 failed · 21 skipped (~1.1m)

| Suite | Outcome |
| --- | --- |
| `isi-journeys` desktop journey + keyboard | **PASS** |
| `isi-journeys` mobile / tablet / auth | skipped by design (viewport or missing creds) |
| `marketing-nav` desktop primary / footer / Ask lookup | **FAIL on production** — footer “Community” link missing; Ask textbox name drift; possible **deploy lag** vs `main` (parallel Vercel investigation) |
| `marketing-nav` tablet destination list | **FAIL** — compact panel missing “Platform” label on prod |

Treat marketing-nav failures as **UNVERIFIED RISK / deploy drift** until re-run against a build of this SHA.

## Blockers (honest)

| Item | Blocker |
| --- | --- |
| Local Vite preview E2E | Build OOM / hung; prefer user-run with `NODE_OPTIONS=--max-old-space-size=4096 bun run build` |
| Authenticated member flows | Missing E2E credentials |
| Two-account isolation | Same |
| Evidence collection create/edit/delete browser | Same (Neon API requires session) |
| Live LLM Ask answer sampling | Not run (guardrails unit-tested only) |
| Apply 0017/0018 | Intentionally not applied without backup |

## Regression tests added

- `src/test/post-af-ask-graphrag-audit.test.ts` — unsupported claims, fabricated PMID, conflict, passage mismatch, ambiguous entity, unreviewed≠Gate C, clinical abstention
- `src/test/post-af-scientific-brief-audit.test.ts` — source-backed claims, no placeholders, wired handoff, refuse approved-in-draft
- `e2e/isi-journeys.spec.ts` — real browser journeys

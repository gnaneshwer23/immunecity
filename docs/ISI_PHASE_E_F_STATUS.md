# ISI Phase E / F — Status

**Date:** 2026-10-30  

## Phase E — Clinical and research workflows

**Complete (engineering).** Report: `docs/ISI_PHASE_E_REPORT.md` · `23aabbd`.

Highlights:

- Additive **0018** `treatment_line` (+ seed script `db:trial-treatment-line`)
- `melanomaInvestigationPath.ts` — typed relations, pilots, endpoints, unknowns
- `scientificBrief.ts` + `exportProvenance.ts` — draft brief, review handoff, provenance trail
- Collections / saved-path sync helpers (no community→KG write)
- Biomarker assays remain empty stub; Trial Intelligence prod flag unchanged (off)

## Phase F — End-to-end QA

**Complete (automated focused suite).** Report: `docs/ISI_PHASE_F_REPORT.md` · SHA filled after commit.

```text
bun test src/test/phase-{a,b,c,d,e}*.test.ts src/test/phase-f-e2e-journey.test.ts --timeout 30000
→ 53 pass / 0 fail
```

Gaps: Playwright auth, live Neon isolation re-check, full a11y / Vite build (OOM preference documented).

## Program DoD

Source-traceable melanoma path is available (D012 → PD-1 → TR003/TR020 → Ask neighbourhood → Research brief draft + provenance) **without** unsupported clinical conclusions. SME Gate C density + Ask gold-set sign-off remain open before any clinical-sounding marketing.

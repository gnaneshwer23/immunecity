# ISI Phase E / F — Status (session checkpoint)

**Date:** 2026-10-30  

## Phase E — Clinical and research workflows

**Not fully implemented in this session.** Existing foundations remain:

- Melanoma Trial Intelligence fixtures + 0015 Postgres (flag off in prod)
- Biomarker context empty stub (no invented assays)
- Research Workbench collections + draft briefs (`kgWrite=false`)
- `treatment_line` still fixture-overlay (Phase A contract)

**Recommended next (human-scoped):**

1. Additive `treatment_line` column on `clinical_trials` / `trial_arms` + seed from fixtures  
2. Curated biomarker assay rows only when PMIDs exist  
3. Brief → curation handoff UI (import claim candidates, never auto-approve)  
4. Export provenance trail using `graphProvenance` + audit events  

## Phase F — End-to-end QA

**Not executed as a full journey suite in this session.**

Suggested smoke (manual / Playwright):

1. Unauth: `/` → Learn → Atlas → Graph → Evidence → Methods  
2. Auth member: Research collections create/list (own only)  
3. Ask: clinical abstain; melanoma mechanism question shows NPATH  
4. Trial Intelligence: flag off → panel hidden; flag on in preview only  
5. Curation: non-supports cannot approve  
6. a11y: existing `bun run a11y`  

Two-account isolation already covered in collections ownership tests (hardening sprint).

## Program DoD

Source-traceable melanoma path is **structurally** available (D012 → PD-1 → TR003/TR020 → Ask neighbourhood → Research brief draft) but **must not** be marketed as clinically conclusive until SME Gate C density + Ask gold-set sign-off.

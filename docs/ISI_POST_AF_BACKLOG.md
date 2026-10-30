# ISI post–A–F prioritised backlog

Acceptance criteria are testable. No CDS scope. No bulk approval.

## P0 — Scientific integrity (pilot)

### P0.1 Relabel or re-curate `REL-R011-drives_immune_exhaustion_in-D012`
**Problem:** Causal ESTABLISHED edge; Neon partial notes S-P-O mismatch (Dong 2002).  
**Engineering (fix-pass):** Display/Ask demoted to `HYPOTHESIS` via `honestEvidenceStatus` + honesty note; raw kg.json unchanged.  
**Still SME:** Predicate/subject rewrite + Gate C rematch + Neon claim_support alignment. **No auto-approve.**

### P0.2 Clear `TO_BE_CURATED` ESTABLISHED edges in melanoma seed set
**Edges:** I009-blocks-R011, B011-measures-R012, B011-predicts_response_to-I008, TR003↔I008 evaluates/demonstrates_in (post-reject), TR020 evaluates arms.  
**Engineering (fix-pass):** Honest status demotes ESTABLISHED→`HYPOTHESIS` when locators are placeholder-only.  
**Still SME:** Durable PMID/DOI + enrichment qualifier for predictive biomarker (no assay cut-off invented).

### P0.3 Remap KEYNOTE-006 demonstrates_in with correct locator
**Engineering (fix-pass):** Display demoted; rejected PMID `31166680` blocked in Ask validators; no silent replacement.  
**Still SME:** Human curator maps PMID `25891173` with passage span; Gate C only after supports assessment.

## P1 — Platform honesty / DB

### P1.1 Apply Neon 0017 + 0018 with backup — **DONE 2026-10-30**
**AC (met):**
- Apply note: `docs/ISI_NEON_0017_0018_APPLY.md`; `evidence_records` stayed 46.
- `ontology_mappings` / `graph_provenance_events` exist; ontology seed empty.
- `treatment_line` columns present; TR003/TR020 seeded from fixture text only.
- `db:hardening:verify` asserts ontology tables + `treatment_line` columns (fix-pass).

### P1.2 Draft edges must not display as ESTABLISHED in public UI — **DONE (honesty layer)**
**AC (met):** Inspector / Ask / typed relations use `honestEvidenceStatus`; melanoma draft treats/clinical_context extensions use `EVIDENCE-SUPPORTED`.

## P2 — Research / GraphRAG

### P2.1 Live Ask E2E with fixture LLM or recorded responses
**AC:** Browser or server harness asserts retrieved evidence ids accompany any PMID in answer; conflict + clinical abstention cases green.  
**Partial:** Unit GraphRAG suite strengthened (v12); live LLM browser harness still open.

### P2.2 Wire workbench handoff (`wired: true`) like scientific brief — **DONE**
**AC (met):** `candidateManifest` importable at `/curation` when valid; `autoPromote=false`; no silent KG write.

### P2.3 Authenticated Playwright: onboarding, isolation, collection CRUD
**AC:** Env `E2E_USER_A_*` / `E2E_USER_B_*`; A cannot read B collections; create/edit/delete collection round-trip; scientific brief export provenance visible.  
**Partial:** Specs skip clearly without credentials (see `ISI_REMAINING_AFTER_FIXPASS.md`).

## P3 — Hardening

### P3.1 Lean local build recipe for agent hosts
**AC:** Documented `NODE_OPTIONS` + `vite preview` path; Playwright green locally without relying solely on production URL.  
**Partial:** `playwright.config.ts` uses local `vite preview`; package scripts call Playwright via `node` CLI path.

### P3.2 Passage_span column / claim_text on Neon evidence_records
**AC:** Schema supports locator fields used by Ask passage-window checks; migration reviewed separately from 0017/0018.

# ISI post–A–F prioritised backlog

Acceptance criteria are testable. No CDS scope. No bulk approval.

## P0 — Scientific integrity (pilot)

### P0.1 Relabel or re-curate `REL-R011-drives_immune_exhaustion_in-D012`
**Problem:** Causal ESTABLISHED edge; Neon partial notes S-P-O mismatch (Dong 2002).  
**AC:**
- Predicate/subject rewritten **or** `evidence_status` demoted until Gate C supports the exact claim.
- Neon claim_support aligned; Ask cannot emit Gate C language for this rel without approved+supports.
- SME sign-off recorded; **no auto-approve**.

### P0.2 Clear `TO_BE_CURATED` ESTABLISHED edges in melanoma seed set
**Edges:** I009-blocks-R011, B011-measures-R012, B011-predicts_response_to-I008, TR003↔I008 evaluates/demonstrates_in (post-reject), TR020 evaluates arms.  
**AC:**
- Each edge has durable PMID/DOI **or** status ≠ ESTABLISHED until curated.
- Predictive biomarker edge carries explicit enrichment qualifier; no assay cut-off invented.

### P0.3 Remap KEYNOTE-006 demonstrates_in with correct locator
**AC:** Human curator maps PMID `25891173` (or agreed follow-up) with passage span; previous reject retained in audit; Gate C only after supports assessment.

## P1 — Platform honesty / DB

### P1.1 Apply Neon 0017 + 0018 with backup
**AC:**
- Pre-apply backup note; `evidence_records` count unchanged.
- `ontology_mappings` / `graph_provenance_events` exist; seed empty or curator-only.
- `treatment_line` columns present; TR003/TR020 seeded from fixture text only.
- `bun run db:hardening:verify` extended or sibling verify script green.

### P1.2 Draft edges must not display as ESTABLISHED in public UI
**AC:** Inspector / Ask tier for `draft: true` shows Draft / missing-support; marketing copy never says “established” for draft melanoma treats edges.

## P2 — Research / GraphRAG

### P2.1 Live Ask E2E with fixture LLM or recorded responses
**AC:** Browser or server harness asserts retrieved evidence ids accompany any PMID in answer; conflict + clinical abstention cases green.

### P2.2 Wire workbench handoff (`wired: true`) like scientific brief
**AC:** `candidateManifest` importable at `/curation`; audit event on import; autoPromote remains false.

### P2.3 Authenticated Playwright: onboarding, isolation, collection CRUD
**AC:** Env `E2E_USER_A_*` / `E2E_USER_B_*`; A cannot read B collections; create/edit/delete collection round-trip; scientific brief export provenance visible.

## P3 — Hardening

### P3.1 Lean local build recipe for agent hosts
**AC:** Documented `NODE_OPTIONS` + `vite preview` path; Playwright green locally without relying solely on production URL.

### P3.2 Passage_span column / claim_text on Neon evidence_records
**AC:** Schema supports locator fields used by Ask passage-window checks; migration reviewed separately from 0017/0018.

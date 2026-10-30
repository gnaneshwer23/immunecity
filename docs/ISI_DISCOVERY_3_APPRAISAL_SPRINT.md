# Discovery 3.0 — appraisal sprint (30 Oct 2026)

**Baseline tip:** `e626370` (impl `b365588`)  
**This sprint tip:** *(see git after commit)*  
**Full outcomes:** `ISI_DISCOVERY_3_APPRAISAL_SPRINT_REPORT.md` + `.json`

## Scope (narrow)

1. **Scientific evidence appraisal** — support / contradict / background / insufficient_context **per research question**; identifier validation ≠ scientific appraisal; shared PMID re-appraised per question.
2. **≤5 deep research opportunities** — Pilot A melanoma/exhaustion/checkpoint/antigen presentation + Pilot B CD28-null/RA/SSc/ageing; promote only where retrieval + appraisal warrant; never invent PMIDs.
3. **Neon persistence** — source-to-gap links, screening, provenance, coverage (migration **0025**).
4. **SME path** — Discovery queue prioritizes opportunities; gold-set slots stay null; no auto-approve / Gate C.
5. **Auth E2E** — credentials missing → skip≠pass documented.

## Appraisal outcomes (live)

| Metric | Value |
| --- | --- |
| `scientific_evidence_gap` created | **1** (`GAP-OPP-A-MHC-PD1-RESIST`) |
| `research_opportunity` created | **4** (assessed, **unreviewed**) |
| Disqualified / forced fill | **0** (all five focused questions qualified) |
| Neon persistence | **applied** (`linksTotal=72`) |
| `evidence_records` | **46** unchanged |
| Adapter mode | live PubMed + Europe PMC |

Engineering appraisals are **relevance screens** against each question’s lexicon + abstract passages — **not** SME peer review. `opportunity_status=assessed` ≠ `reviewed_opportunity`.

## Candidate register

| gapKey | Class | Pilot | SME |
| --- | --- | --- | --- |
| `GAP-OPP-A-MHC-PD1-RESIST` | scientific_evidence_gap | melanoma_a | `/sme?gapKey=GAP-OPP-A-MHC-PD1-RESIST` |
| `GAP-OPP-A-LAG3-TIM3-EXHAUST` | research_opportunity | melanoma_a | `/sme?gapKey=GAP-OPP-A-LAG3-TIM3-EXHAUST` |
| `GAP-OPP-A-AGPRES-UPSTREAM` | research_opportunity | melanoma_a | `/sme?gapKey=GAP-OPP-A-AGPRES-UPSTREAM` |
| `GAP-OPP-B-CD28NULL-RA-AGE` | research_opportunity | coverage_b | `/sme?gapKey=GAP-OPP-B-CD28NULL-RA-AGE` |
| `GAP-OPP-B-CD28NULL-SSC` | research_opportunity | coverage_b | `/sme?gapKey=GAP-OPP-B-CD28NULL-SSC` |

Dossiers: `/discovery/gaps/<gapKey>`

## Neon

See `docs/ISI_NEON_0025_APPLY.md`. Idempotent upserts on `(gap_id, question_key, pmid|doi)`.

## Auth E2E blocker

`E2E_USER_A_*` / `E2E_USER_B_*` **missing** in this environment.  
Playwright auth remains **SKIP (not a pass)** — do not treat green public journeys as dual-account coverage.

## Tests

`bun test src/test/discovery-intelligence.test.ts src/test/sme-workspace.test.ts src/test/discovery-eval-harness.test.ts` → pass (appraisal separation, class transitions, persist refuse-overwrite-reviewed, SME priority).

## Blockers (unchanged human)

1. SME labels / `reviewed_opportunity` / Gate C rematch decisions.  
2. E2E dual-account credentials.  
3. No Vercel / Stripe / fabricated science in this sprint.

# ISI Discovery Intelligence 3.0 — implementation matrix

**Baseline tip:** `479531a`  
**Legend:**

| Column | Meaning |
| --- | --- |
| Code present | Implementation exists on disk |
| Runtime verified | Exercised in this environment (unit/script/manual) |
| Scientifically validated | Human SME / documented pilot evidence — **not** engineering-only |
| Blocked | Needs creds, SME, or product approval |
| Missing | Not implemented |

---

## Phase / capability matrix

| # | Capability | Code present | Runtime verified | Scientifically validated | Blocked | Missing / gap |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Audit docs (3.0) | This file + `ISI_DISCOVERY_3_AUDIT.md` | Docs authored at audit tip | N/A | — | Keep updated as SHAs land |
| 2 | `isi_curation_gap` / `scientific_evidence_gap` / `research_opportunity` | **No** at `479531a` | — | — | — | **P0** types + migration + UI + reclass |
| 2b | Status transitions (candidate…reviewed_gap) | Yes | Unit tests | No (no SME promote in prod data assumed) | SME humans | — |
| 2c | Reviewed never auto-overwritten | Yes (persist policy) | Unit | — | — | Extend to gap_class reclass |
| 3 | PubMed adapter (live) | Yes | Fail-closed default; live needs env | No | Opt-in env | Wire to gap assessment + persist links |
| 3b | Europe PMC | No | — | — | — | **P0** adapter |
| 3c | ClinicalTrials.gov adapter | Yes | Fail-closed default | No | Opt-in env | Persist NCT + pilot runs |
| 3d | Bounded pilots A/B retrieval with counts | No end-to-end | — | — | Network + honesty | **P0** script + store |
| 4 | detect→retrieve→extract→classify→novelty→feasibility→review→personalise | Partial (detect/verify/review/personalise) | Partial | No | SME for reviewed opportunity | Connect retrieve/extract/classify |
| 5 | SME `/sme` melanoma/KEYNOTE/R011 | Yes | Unit + UI | Pending human SME | Humans | Discovery gap queue + gold slots |
| 5b | Eval genuine/false/resolved/contradiction/incomplete-retrieval | Partial harness | Honest denoms | No scores until SME | SME labels | Fill only with real candidates |
| 6 | Radar journey dead ends | Mostly complete | Public smoke | N/A | Auth E2E | Neon-only merge; trial_signal |
| 7 | Dossier sections (uncertainty, mechanisms, trials, save/follow) | Partial | Unit + route | No | Pro follow quota | Citations panel; class labels |
| 8 | Monitor bounded run | Yes | Script stub mode | N/A | Prod cron approval | Live pilot separate |
| 9 | Ranking profile comparison (melanoma vs autoimmunity vs biomarker) | Ranking code yes | Unit | N/A (nav aid) | — | Dedicated comparison tests |
| 10 | Auth E2E two accounts | Specs exist | **Skip≠pass** | — | `E2E_USER_A_*` / `E2E_USER_B_*` | Report blockers |
| 11 | Entitlements server-only | Yes | Unit | N/A | Stripe approval | Provisioning fn / ops doc |
| 12 | Reliability (export quota cold-start, unused tables) | Known defects | — | — | — | Fix confirmed defects |

---

## Gap-class target semantics (to implement)

| Class | Route / action | Auto-emit? | “Reviewed” form |
| --- | --- | --- | --- |
| `isi_curation_gap` | `/sme` or `/curation` | Yes as candidate | SME curation decision — not “worldwide evidence gap” |
| `scientific_evidence_gap` | Dossier + retrieval coverage | Only if documented search attempted; else stay `coverage_insufficient` status | Human `reviewed_gap` within scope |
| `research_opportunity` | Requires prior evidence assessment | Never without assessment fields | Human “reviewed opportunity” — never auto |

Insufficient coverage → **block** confident scientific-gap claims. Reclass preserves `research_gap_versions` / change events.

---

## Retrieval pilot targets (engineering)

| Pilot | Theme | Success metric |
| --- | --- | --- |
| A | Melanoma / checkpoint resistance / antigen presentation / T-cell exhaustion | Real found/assessed/linked/excluded counts; zero invented studies |
| B | CD28-null / RA / SSc / immune ageing | Same |

Failed query → null / fail_closed — **not** zero evidence.

---

## Commit / SHA log

| Milestone | SHA | Notes |
| --- | --- | --- |
| Pre-3.0 tip | `479531a` | SME Neon 0023 docs |
| 3.0 audit docs | *(pending)* | This matrix + audit |
| Gap-class migration | *(pending)* | |
| Retrieval + pipeline | *(pending)* | |
| SME + P1/P2 | *(pending)* | |
| Final deliverables | *(pending)* | |

Update this table on each pushed milestone.

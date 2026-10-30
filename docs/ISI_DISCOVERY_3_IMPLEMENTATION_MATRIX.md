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
| 1 | Audit docs (3.0) | Yes | Authored + pushed | N/A | — | — |
| 2 | Three gap classes | Yes (`gapClass.ts`, 0024) | Unit + Neon apply | No (SME) | Humans | — |
| 2b | Status transitions | Yes | Unit | No | SME | — |
| 2c | Reviewed never auto-overwritten | Yes (status + class) | Unit | — | — | — |
| 3 | PubMed adapter (live) | Yes | Live pilot: hits returned | No claim support | Opt-in env | — |
| 3b | Europe PMC | Yes | Live pilot | No | Opt-in env | — |
| 3c | ClinicalTrials.gov | Yes | Live pilot | No | Opt-in env | NCT detail fetch limited |
| 3d | Bounded pilots A/B | Yes | **live found=40 / linked=40 / failed=0** (6 gaps) | No | — | Persist hits into Neon links optional follow-up |
| 4 | Full assessment pipeline | Yes (`pipeline.ts`) | Dry unit + live retrieval script | No | SME review | — |
| 5 | SME `/sme` + Discovery gaps | Yes unified queue | Unit | Pending SME | Humans | Fill gold only with real reviews |
| 5b | Eval slots (5 kinds) | Yes scaffold | Honest denoms | No | SME labels | — |
| 6 | Radar journey | Yes | Prior smoke | N/A | Auth E2E | Neon-only merge; trial_signal still rare |
| 7 | Dossier class + novelty note | Yes | Unit + route fields | No | Pro follow | — |
| 8 | Monitor | Yes | Stub + live adapters via pilots | N/A | Prod cron | — |
| 9 | Ranking profile comparison | Yes | Unit | N/A | — | — |
| 10 | Auth E2E two accounts | Specs | **Skip≠pass** | — | **E2E_USER_A/B missing** | — |
| 11 | Entitlements server-only | Yes | Unit | N/A | Stripe | Provisioning API |
| 12 | Export quota durability | Yes (Neon events) | Code path | N/A | — | — |

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
| 3.0 audit docs | `7c9c73f` | Audit + matrix |
| Gap-class + retrieval + SME + deliverables | *(this push)* | See `ISI_DISCOVERY_3_DELIVERABLES.md` |

Update this table after push with the final SHA.

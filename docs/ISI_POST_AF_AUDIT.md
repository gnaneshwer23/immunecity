# ISI post–Phases A–F independent audit

**Date:** 2026-10-30  
**Baseline HEAD verified:** `3e815dbd70d1c2b15baf734169c04520775e7d65` (`main`, clean at audit start)  
**Product:** Immune Super Intelligence — educational, **not CDS**  
**Scope:** Engineering + scientific integrity after Phases A–F. Not a new feature phase.

## Classification key

| Tag | Meaning |
| --- | --- |
| **CONFIRMED DEFECT** | Reproduced from committed code and/or live Neon read |
| **UNVERIFIED RISK** | Plausible hazard; not fully exercised in this session |
| **INCOMPLETE** | Designed but not finished / not deployed |

---

## 1. End-to-end verification (browser vs unit)

| Layer | What it is | Status |
| --- | --- | --- |
| Unit / contract | `src/test/phase-*.test.ts`, GraphRAG audit tests | Pass (see test report) |
| Phase F “e2e” | `phase-f-e2e-journey.test.ts` — **source-contract**, not browser | Pass — **must not be labelled browser E2E** |
| Browser Playwright | `e2e/marketing-nav.spec.ts`, `e2e/isi-journeys.spec.ts` | Attempted against running Vite; see test report |
| Auth E2E | Two-account isolation, collection CRUD | **BLOCKED** — no `E2E_USER_*` credentials in env |

---

## 2. Confirmed defects

### D1 — Melanoma edges labelled ESTABLISHED without Gate C / with `TO_BE_CURATED`
**Files:** `src/data/kg.json`, typed via `typedRelations` / `melanomaInvestigationPath.ts`  
**Evidence:** 8 of 15 seed-set edges use `source_refs: ["TO_BE_CURATED"]` while `evidence_status=ESTABLISHED`.  
**Impact:** GraphRAG / UI can teach “established” mechanics without durable PMID/DOI.

### D2 — Causal predicate `drives_immune_exhaustion_in` mismatches Neon partial evidence
**Edge:** `REL-R011-drives_immune_exhaustion_in-D012`  
**Neon:** PMID 12091876, curation=unreviewed, claim_support=**partial**, curator note: Dong 2002 is PD-L1/B7-H1 apoptosis — not PD-1 subject driving exhaustion.  
**Impact:** Causal language in graph is not SME-validated; Ask must abstain from Gate C claims (guardrails help; graph label still wrong).

### D3 — Wrong PMID previously mapped to KEYNOTE-006 demonstrates_in (rejected; gap remains)
**Edge:** `REL-I008-demonstrates_in-TR003`  
**Neon:** rejected PMID 31166680 (dabrafenib+trametinib). No approved replacement. Edge remains ESTABLISHED.

### D4 — Scientific brief minted placeholder claim text (fixed in audit)
**File:** `src/lib/research/scientificBrief.ts`  
**Was:** `citeFromEvidenceId` → `Candidate claim linked to brief export (…)`.  
**Fix:** Source-backed candidates from pilot PMIDs/DOIs + optional `reviewRows`; bare ids mint **no** claims; handoff attaches `candidateManifest` with `wired=true`, `autoPromote=false`.

### D5 — Neon migrations 0017 and 0018 **not applied** on intended host
**Host:** `ep-blue-salad` (read-only check)  
| Migration | Expected | Observed |
| --- | --- | --- |
| 0017 | `ontology_mappings`, `graph_provenance_events` | **missing** |
| 0018 | `clinical_trials.treatment_line`, `trial_arms.treatment_line` | **columns absent** |

**Preference:** Report unapplied; do **not** apply without backup + explicit review. Fixture `treatmentLine` still overlays in app read model.

### D6 — Draft clinical edges marked ESTABLISHED
`REL-I008/I009/I025-treats-D012` and trial `has_clinical_context` edges are `draft: true` with ESTABLISHED status and no Neon rows.

---

## 3. Unverified risks

| ID | Risk | Why unverified |
| --- | --- | --- |
| R1 | Cross-member collection leakage | Requires two live accounts |
| R2 | Vite OOM under agent host for `vite build` / full a11y | Build hung / memory pressure observed; lean NODE_OPTIONS documented |
| R3 | Production Ask path still cites graph prose as if evidenced | Unit validators pass; live LLM answers not sampled end-to-end this session |
| R4 | Curation import of brief `candidateManifest` under real admin session | Shape validated via `validateManifestForImport`; live import not run |

---

## 4. GraphRAG / Ask (`askGrounding.ts` v11)

**Confirmed good:**
- `PROMPT_VERSION = ask-grounding-v11`
- Neighbourhood paths emit `GRAPH_NEIGHBOURHOOD` / `NPATH` with review/tier fields
- `REVIEWED_EVIDENCE none…` honesty when Gate C empty
- Validators reject fabricated PMIDs, Gate C overclaims, unlabelled provisional PMIDs, clinical_personal abstention, conflict collapse (unit-tested)

**Confirmed gap:**
- Retrieved graph paths often have **zero** Gate C cites for melanoma pilot edges → answers must stay “graph teaching only”; neighbourhood prose alone is not retrieved evidence.

---

## 5. Research workflow

| Piece | Status |
| --- | --- |
| `claimRecords.ts` | Orthogonal axes + no silent approval — OK |
| `scientificReviewQueue.ts` | Never auto-approves — OK |
| `scientificBrief.ts` | Placeholder removed; handoff wired to `/curation` manifest — **minimal fix shipped** |
| Workbench handoff | Still `wired: false` stub (honest) — backlog |

---

## 6. Database consistency (Neon read-only)

- `evidence_records`: 46 total (34 unreviewed, 9 approved, 3 rejected)
- Melanoma-relevant approved Gate C observed: `REL-I008-blocks-R011` (PMID 25891173)
- Ontology mapping table: **absent** (0017)
- `treatment_line`: **absent** (0018)
- No scientific record mutations performed

---

## 7. What remains scientifically unreviewed

See `ISI_MELANOMA_PILOT_VALIDATION_MATRIX.md`. In short: almost all pilot relationships except the single Gate C pembrolizumab→PD-1 clinical proxy remain **unreviewed / draft / TO_BE_CURATED**. Do not treat graph ESTABLISHED as Gate C.

---

## 8. Commits from this audit

Listed in the final capability comparison / git log after local commits (docs + minimal fixes). **Not pushed.**

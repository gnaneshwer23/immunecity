# SME gold-set sign-off — Immune Super Intelligence

**Status:** ⏳ **Awaiting SME** (cannot be completed by AI or engineering alone)  
**Scope:** Public educational beta — teaching with references; not clinician CDS  
**Automated starter set:** `src/test/eval/scientific-eval-set.ts` — **75** graph-true cases (not yet SME-signed; PRD target 100+)  
**Harness:** `bun scripts/sme-gold-set-status.ts` · smoke `bun scripts/smoke-prd-a2.ts` · retrieval baseline `bun scripts/benchmark-retrieval-baseline.ts`  
**Estimated SME time:** 60–90 minutes for the checklist below  
**Status unchanged:** still **awaiting named SME** — engineering expansions do not constitute sign-off.

---

## Engineering smoke attach (pre-SME)

| Field | Value |
|-------|--------|
| Smoke command | `bun scripts/smoke-prd-a2.ts` |
| Result | **ALL PASSED (75 eval cases + unit checks)** |
| Smoke SHA | `bd51a46351af6a20b0ae9253f3481432e409cd24` (`bd51a46`) |
| Smoke date (UTC) | 2026-10-21 |
| Case count | **75** |
| `bun scripts/sme-gold-set-status.ts` | `signOffStatus: awaiting_sme` (harness must stay awaiting until human signs) |

Paste this table (or CI artefact) into the release gate as **engineering smoke attached** — it does **not** flip Gate E / SME status.

### How to attach to a release gate

1. Run smoke on the release candidate SHA (or note drift if prod deploy SHA differs).
2. Copy the smoke SHA + “ALL PASSED (75…)” line into `docs/RELEASE_AUDIT.md` Gate E notes **and** keep this document’s Status as **Awaiting SME**.
3. Give the SME: this file, the smoke summary, and links to `/reasoning` + `/methods` on the deploy under review.
4. Only a named human SME may fill the Sign-off table below.

---

## What this is

A fixed scientific evaluation set used to catch regressions in Ask grounding, path reasoning, clinical/omics abstentions, and citation hygiene. Engineering can run the automated checks; an immunology SME must **sign off** that expected answers and prohibitions remain scientifically acceptable for educational beta.

## What AI / engineering must not do

- Do not mark this checklist complete without a named human SME.
- Do not invent PubMed IDs, DOIs, or “approved” claim assessments to pass Gate C.
- Do not claim clinical CDS readiness even after sign-off.
- Do not forge a signature, backdate acceptance, or treat engineering smoke green as SME sign-off.

## Automated vs human

| Item | Owner | Status |
|------|-------|--------|
| Run `bun scripts/sme-gold-set-status.ts` (75 cases) | Engineering | Done for SHA `bd51a46` |
| Run `bun scripts/smoke-prd-a2.ts` | Engineering | **ALL PASSED** on SHA `bd51a46` |
| Attach smoke output / note SHA | Engineering | ☑ attached above (2026-10-21) |
| Expand toward PRD 100+ expert items | SME + eng | Open — only with graph-true expectations (gap 25) |
| Confirm path/endpoint expectations are graph-true | SME | ☐ Awaiting SME |
| Confirm refusal/abstention wording is appropriate | SME | ☐ Awaiting SME |
| Confirm no unsupported therapeutic conclusions | SME | ☐ Awaiting SME |
| Sign below | SME | ☐ Awaiting SME |

---

## Pre-flight (engineering — before handing to SME)

1. On a known commit SHA, run:
   ```bash
   bun scripts/sme-gold-set-status.ts
   bun scripts/smoke-prd-a2.ts
   ```
2. Confirm production graph release matches the SHA under review (or note drift).
3. Give the SME: this doc, the smoke summary, and a link to `/reasoning` + `/methods` on the deploy under review.

---

## Review checklist (SME) — actionable

Work through in order. Tick only after you personally checked. File defects instead of silently “fixing” expectations.

### A. Path / retrieval (≈25 min) — spot-check ≥10

Open `src/test/eval/scientific-eval-set.ts` and verify endpoints / retrieval IDs are still graph-true for at least these:

| Case id | What to verify |
|---------|----------------|
| `tnf-ra-path` | TNF (`M001`) ↔ RA (`D001`) teaching path still sensible |
| `checkpoint-tcells` | PD-1 (`R011`) ↔ pembrolizumab (`I008`) neighbourhood |
| `ifn-sle-path` | Type I IFN (`M018`) ↔ SLE (`D007`) — note exemplar may detour via BAFF |
| `mech-tnf-block-ra` | Mechanism workspace expectation still educational, not CDS |
| `mech-ifn-anifrolumab-sle` | Anifrolumab teaching link not overclaimed |
| `exemplar-tnf-ra` / `exemplar-pd1` / `exemplar-ifn-sle` | Maturity labels may be scaffold/partial — do not require Gate C complete |
| `pd1-biomarker-neighbourhood` / `ifn-sle-neighbourhood` | Graph-true multi-concept scaffolds (no invented PMIDs) |
| `cite-gate-c-overclaim-rejected` | Fail-closed when answer implies Gate C without reviewed cites |
| Plus ≥2 more path cases of your choice from the file | Endpoints still in the live graph |

**Status reminder:** this sign-off stays ⏳ awaiting a named human SME — engineering expansion of the automated set does not complete Gate SME.

☐ Path spot-check complete · Defects filed: ________

### B. Clinical refusal + omics abstention (≈15 min)

Confirm these refuse / abstain **before** any model call (wording may educate but must not dose/diagnose):

| Case id | Expect |
|---------|--------|
| `clinical-dose` | Must refuse |
| `clinical-diagnose-me` | Must refuse |
| `omics-scrna` | Must abstain / not_available posture |

☐ Refusal/abstention wording acceptable for educational beta · Defects: ________

### C. Citation hygiene + unsupported (≈15 min)

| Case id | Expect |
|---------|--------|
| `cite-ok-real-ids` (and related cite-* cases) | Reject invented PMIDs / fake concept links |
| `unsupported-zzqx` | No invented atlas content / fake PubMed claims |

☐ Citation + unsupported checks acceptable · Defects: ________

### D. Therapeutic overclaim (≈10 min)

Confirm no case’s expected behaviour encourages unsupported “cures / guaranteed response / prescribe X” conclusions (see `prohibitUnsupportedConclusion` fields).

☐ No unsupported therapeutic conclusions · Defects: ________

### E. Optional expansion (not required for this sign-off)

Propose ≤20 additional gold questions toward PRD 100+. Each must include graph-true expected nodes/paths — engineering will implement; do not invent PMIDs.

☐ Proposals attached / none this round

---

## Sign-off

| Field | Value |
|-------|--------|
| SME name | _awaiting_ |
| Affiliation / role | _awaiting_ |
| Date (UTC) | _awaiting_ |
| Starter set version | **75** cases in `scientific-eval-set.ts` |
| Deploy / git SHA reviewed | _awaiting_ (engineering smoke attach: `bd51a46`) |
| Smoke result attached | ☑ engineering (`ALL PASSED`, 75 cases) · ☐ SME reviewed |
| Decision | ☐ Accept for educational beta · ☐ Accept with defects · ☐ Reject |
| Defect IDs (if any) | |
| Signature / confirmation | _awaiting SME_ |

**Acceptance meaning:** educational-beta eval set is scientifically acceptable to catch regressions. It does **not** mean Gate C evidence coverage is complete, Ask is fully evidence-grounded, or the product is CDS-ready.

---

## Engineering command

```bash
bun scripts/sme-gold-set-status.ts
bun scripts/smoke-prd-a2.ts
```

Until the Sign-off table above is filled by a human SME, Gate E remains **PASS with SME open** and this document must stay **Awaiting SME**.

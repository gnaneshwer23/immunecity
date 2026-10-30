# ISI Phase A Report — Immediate corrections

**Date:** 2026-10-30  
**Product:** Immune Super Intelligence (educational — not CDS)  
**Baseline:** `207e58f` (main)  
**Phase A commit:** `40d9bbc`  

---

## Summary

Phase A closes three honesty / correctness gaps on the existing single knowledge graph and Trial Intelligence read path, with positive / negative / boundary regression tests. No second KG. No invented PMIDs, numerics, or Gate C approvals. `VITE_TRIAL_INTELLIGENCE` production restrictions unchanged (flag-off by default).

---

## Existing vs new functionality

| Area | Existing (pre-Phase A) | New / corrected |
| --- | --- | --- |
| Endpoint pairing | Soft key + identity keys; within-group peers still joined by **array index** | `pairEndpointsByIdentity` — exact identity match first; remainders sorted by identity (order-stable) |
| Evidence gaps | Search unknown ≠ zero; missing Gate C counts could still fall through to `no_mapped_evidence` | New label `insufficient_coverage` when Gate C counts not loaded; `no_mapped_evidence` only with explicit zeros + no draft/bib |
| Trial fixture ↔ DB | 0015 persists arms/endpoints; `treatmentLine` / `sources` / `biomarkerContext` overlay from fixtures | Documented contract module `trialReadModelContract.ts` + regression tests asserting schema/read-path honesty |
| Tests | Correction-sprint suite for prior §4 fixes | `src/test/phase-a-evidence-governed.test.ts` (9 cases) |

---

## Files changed

| Path | Change |
| --- | --- |
| `src/lib/immune/trialComparability.ts` | Identity-first endpoint pairing helper |
| `src/lib/research/evidenceGap.ts` | `insufficient_coverage` vs verified `no_mapped_evidence` |
| `src/lib/immune/trialReadModelContract.ts` | **New** — fixture/schema/read-model matrix |
| `src/lib/research/AGENTS.md` | Gap-label rule update |
| `src/test/phase-a-evidence-governed.test.ts` | **New** — Phase A regressions |
| `src/test/phase4-research-workbench.test.ts` | Label list + coverage distinction expectations |
| `docs/ISI_PHASE_A_REPORT.md` | This report |
| `docs/ISI_EVIDENCE_GOVERNED_KG_BUILD.md` | Rolling master plan |

**Migrations added:** none (Phase A is corrective; additive graph persistence is Phase B).

---

## Tests executed and results

```text
bun test src/test/phase-a-evidence-governed.test.ts \
  src/test/phase4-research-workbench.test.ts \
  src/test/correction-sprint.test.ts \
  --timeout 30000
```

**Result:** 31 pass / 0 fail (160 expects).

| Suite | Result |
| --- | --- |
| `phase-a-evidence-governed.test.ts` | 9 pass |
| `phase4-research-workbench.test.ts` | 4 pass |
| `correction-sprint.test.ts` | 18 pass |

Not run in this phase (document as optional follow-up): full `bun run build`, live `db:trial-intelligence:check` (requires Neon ep-blue-salad).

---

## Scientific claims requiring human review

None introduced. Phase A does not approve evidence, invent trial numerics, or change Gate C density.

Open SME items (unchanged from hardening sprint):

- Ask Immune gold-set sign-off (`docs/SME_GOLD_SET_SIGNOFF.md`)
- Gate C claim approvals (curator process — never mass-approve)
- Enabling `VITE_TRIAL_INTELLIGENCE` in production

---

## Known limitations / unresolved risks

1. **`treatment_line` not in 0015 Postgres** — still fixture-overlay. Postgres-only consumers without fixture merge would lose line facet. Tracked for Phase B/E additive column if needed.
2. **`biomarkerContext` remains empty stub** — no assay cut-offs invented (correct).
3. **Collections UI** calls `classifyEvidenceGap(id)` without Neon counts → clean concepts show `insufficient_coverage`; bib/draft concepts show `awaiting_curation`. Honest, but denser when live Gate C counts are wired later.
4. Soft pairing remainders after identity match can still soft-pair distinct analysis contexts (intentionally surfaces `analysis_population` mismatch).

---

## Commit SHA and rollback

| Item | Value |
| --- | --- |
| Baseline | `207e58f` |
| Phase A HEAD | `40d9bbc` |

**Rollback (safe, no history rewrite):**

```bash
git revert <PHASE_A_SHA>
# or soft restore working tree to baseline without force-push:
git checkout 207e58f -- src/lib/immune/trialComparability.ts \
  src/lib/research/evidenceGap.ts src/lib/research/AGENTS.md \
  src/test/phase4-research-workbench.test.ts
git clean -f src/lib/immune/trialReadModelContract.ts \
  src/test/phase-a-evidence-governed.test.ts
```

Do **not** force-push or rebase published main (Lovable-connected).

**Feature rollback:** unset `VITE_TRIAL_INTELLIGENCE` / set `0` + redeploy (unchanged).

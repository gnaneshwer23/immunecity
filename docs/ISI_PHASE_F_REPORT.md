# ISI Phase F Report — End-to-end QA

**Date:** 2026-10-30  
**Product:** Immune Super Intelligence (educational — not CDS)  
**Baseline:** Phase E `23aabbd`  
**Phase F commit:** `74d357c`  

---

## Summary

Phase F adds an automated journey suite covering Immunology OS → Immune City → evidence honesty → Trial Intelligence flag → Ask Immune → Research Workbench / scientific brief → export provenance. Prefer focused `bun test` over full Vite build (OOM risk). Documented gaps: live Playwright auth, real Neon two-account isolation, full `bun run a11y`.

---

## Journey coverage

| Step | Automated check | Result |
| --- | --- | --- |
| Journey IA (Learn / Explore / Investigate / Trust) | `JOURNEY_NAV` paths include Ask, Atlas, Graph, Evidence, Research, Methods | Pass |
| Melanoma spine | D012 → trials TR003/TR020 → neighbourhood → brief package | Pass |
| Ask Immune | Mechanism query not clinical; clinical-personal abstains; fabricated PMID fails | Pass |
| Trial Intelligence | Prod flag off; panel early-return; empty biomarker / unavailable testids | Pass |
| Evidence honesty | `insufficient_coverage` ≠ verified zero; conflict + silent-approve block | Pass |
| Research sync | Unauth collection plan fails; melanoma path helper exists | Pass |
| Export | Scientific brief `kgWrite=false`, handoff `autoPromote=false` | Pass |
| Cross-trial | `forbidsSuperiorityClaim` + treatment_line mismatch | Pass |
| a11y | Script + package script exist (full run deferred) | Smoke only |
| Regressions A–E | Suite files present; combined A–F run green | Pass |

---

## Auth / isolation notes

| Scenario | Coverage |
| --- | --- |
| Unauth collection create | `planMelanomaInvestigationCollection({ userId: null/"" })` fails closed |
| Owner-scoped collections | `COLLECTION_ACCESS.ownerScopedOnly` + no admin bypass (unit contract) |
| Two-account Neon isolation | **Not re-run live** — covered previously in hardening collections ownership tests; gap if Neon unavailable |
| Curation non-supports approve | Phase C / F conflict suite reasserts `assertNoSilentApproval` |

---

## Tests executed and results

```text
bun test \
  src/test/phase-a-evidence-governed.test.ts \
  src/test/phase-b-scientific-graph.test.ts \
  src/test/phase-c-evidence-intelligence.test.ts \
  src/test/phase-d-ask-graphrag.test.ts \
  src/test/phase-e-clinical-research.test.ts \
  src/test/phase-f-e2e-journey.test.ts \
  --timeout 30000
```

**Result:** **53 pass / 0 fail** (241 expects) · ~94s.

Not run (documented gaps):

- Full `vite build` (prefer focused bun test if OOM)
- `bun run a11y` (script present; suite may be heavy)
- `bun run test:e2e` / Playwright signed-in flows
- Live Neon apply for 0018

---

## Files

| Path | Role |
| --- | --- |
| `src/test/phase-f-e2e-journey.test.ts` | Journey + honesty + regression anchors |
| `docs/ISI_PHASE_F_REPORT.md` | This report |
| `docs/ISI_PHASE_E_F_STATUS.md` | Status → complete |
| `docs/ISI_EVIDENCE_GOVERNED_KG_BUILD.md` | Master plan progress |

---

## Scientific claims requiring human review

Same as Phase E — brief candidates, Gate C density, biomarker assays (none invented), SME Ask gold-set (Phase D open).

---

## Known gaps / limitations

1. No Playwright journey in this pass.
2. Full a11y and production build not executed here.
3. Live two-account isolation not re-verified against Neon in this session.
4. Program DoD path is **structurally** complete and source-traceable; **must not** be marketed as clinically conclusive until SME Gate C + Ask eval sign-off.

---

## Commit SHA and rollback

| Item | Value |
| --- | --- |
| Phase E | `23aabbd` |
| Phase F HEAD | `74d357c` |

**Rollback:** `git revert <PHASE_F_SHA>` (docs + tests only; no DDL in Phase F).

Do not force-push published main (Lovable-connected).

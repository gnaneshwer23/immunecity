# M1 G-Ask / G-Mech v0.1 — SME protocol sign-off (audit)

**Date (UTC):** 2026-11-02  
**Golden set:** `G-Ask/G-Mech-m1-v0.1` (`M1_GOLDEN_SET_ID`)  
**Harness:** `src/lib/research/m1GoldenEval.ts`  
**Verify:** `bun test src/test/m1-golden-eval.test.ts`  
**Product label:** Available research capability — **not CDS**

---

## Decision recorded

| Field | Value |
|-------|--------|
| `expertReviewStatus` | `founder_sme_interim` |
| `targetsConfirmedBy` | `founder-authorized 2026-11-02` |
| `signedOffAt` | `2026-11-02T00:00:00.000Z` |
| Comment | interim founder SME for v0.1 eval set; external SME still recommended for institutional claims |
| Named external immunologist | **None invented** — founder authorization only |
| MoU / institutional letter | **None** — not claimed |

**Authority:** Founder directive to accept the frozen v0.1 eval-set **protocol** (case selection, mechanism expectations, refuse/fail-closed behaviour) for regression harness use.

---

## What this sign-off means

- The v0.1 case list and automated expectations are accepted as the protocol for G-Ask / G-Mech regression checks.
- Mechanism cases must keep Cap 6 / Cap 10 / Cap 11 companions; refuse cases must fail closed.
- Honesty flags on briefs stay research-only (`clinicalAdvice=false`, `kgWrite=false`, etc.).

## What this sign-off does **not** mean

- Not clinical validation or CDS readiness.
- Not inventing Likert / κ / accuracy % performance targets for marketing.
- Automated `baselinesOnly=true` pass/fail remains a **separate** engineering signal.
- Not Gate C evidence completeness, not HSI Clinical / Trials.
- Not a substitute for a named external SME when making institutional scientific claims.

---

## Provenance honesty

Prior state was `expertReviewStatus=awaiting_sme` · `targetsConfirmedBy=null`.  
This audit flips status to **founder_sme_interim** with explicit founder provenance — deliberately **not** forging a named external immunologist or fake MoU.

Vocabulary remaining for a later upgrade:

- `awaiting_sme` — no protocol acceptance yet  
- `founder_sme_interim` — **current** (this note)  
- `signed_off` — reserved for named external SME acceptance  

---

## Related (still human / separate)

| Gate | Status |
|------|--------|
| Ask educational gold-set v0 (`Ask-edu-gold-v0`, `docs/ASK_EDUCATIONAL_GOLD_SET.md` + `docs/SME_GOLD_SET_SIGNOFF.md`) | `founder_sme_interim` 2026-11-02 (separate from this M1 interim; named SME still open) |
| Gate C evidence approvals (cite Check → supports → Approve) | **Next human evidence gate** — operator path [`GATE_C_CURATOR_PATH.md`](./GATE_C_CURATOR_PATH.md); dry-run `bun run hsi:curator-status`; no auto-approve |
| External SME for institutional M1 claims | Recommended — open |
| Numeric accuracy / κ publication | Forbidden until measured + external review |

---

## Engineering verify

```bash
bun test src/test/m1-golden-eval.test.ts
```

Constant source of truth: `M1_GOLDEN_SME_SIGNOFF` in `src/lib/research/m1GoldenEval.ts`.

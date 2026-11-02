# Ask educational gold-set v0 — how to sign off

**Set id:** `Ask-edu-gold-v0` (`ASK_EDU_GOLD_SET_ID`)  
**Harness:** `src/lib/askEducationalGoldSet.ts`  
**Verify:** `bun test src/test/ask-educational-gold-set.test.ts` · `bun run sme:status`  
**Checklist / formal named-SME table:** `docs/SME_GOLD_SET_SIGNOFF.md`  
**Not this set:** M1 G-Ask/G-Mech (`docs/M1_GOLDEN_EVAL_SME_SIGNOFF.md`) — keep separate.

---

## Decision recorded (founder interim)

| Field | Value |
|-------|--------|
| `expertReviewStatus` | `founder_sme_interim` |
| `targetsConfirmedBy` | `founder-authorized 2026-11-02` |
| `signedOffAt` | `2026-11-02T00:00:00.000Z` |
| Comment | interim founder SME for Ask-edu-gold-v0 protocol acceptance only; external SME still recommended for institutional claims; separate from M1 G-Ask/G-Mech |
| Named external immunologist | **None invented** — founder authorization only |
| MoU / institutional letter | **None** — not claimed |

**Authority:** Founder said “M1” in response to Ask-edu interim prompt (say the word, like M1) — interpreted as the same honesty pattern as M1 G-Ask/G-Mech: accept frozen v0 educational case **protocol** for regression harness use.

Constant source of truth: `ASK_EDU_SME_SIGNOFF` in `src/lib/askEducationalGoldSet.ts`.

---

## What engineering already did

- Froze v0 cases: concept lookup, mechanism Q, clinical_person refuse, empty match.
- Wired automated `prepareAsk` checks (`baselinesOnly=true`).
- Recorded `founder_sme_interim` with founder provenance — **no** invented accuracy %, **no** external SME name, **no** MoU.

## What this sign-off means

- The v0 case list and automated expectations are accepted as the protocol for Ask educational regression checks.
- Clinical-personal and empty-match cases must fail closed before the model.
- Honesty flags stay educational-beta (`clinicalAdvice=false`, `kgWrite=false`, `baselinesOnly=true`, `separateFromM1=true`).

## What this sign-off does **not** mean

- Not CDS readiness or clinical validation.
- Not Gate C evidence completeness.
- Not a substitute for M1 G-Ask/G-Mech protocol acceptance (separate bundle — already has its own interim).
- Not named external SME acceptance (`signed_off`) — that still requires filling `docs/SME_GOLD_SET_SIGNOFF.md`.
- Automated green ≠ institutional scientific acceptance.

---

## Sign-off paths (human only)

### A. Founder interim — **done 2026-11-02**

Already recorded in `ASK_EDU_SME_SIGNOFF` (see Decision table above). Do **not** invent a named immunologist or MoU.

### B. Named external SME (preferred for institutional claims)

1. Run engineering smoke / gold eval and attach SHA.
2. SME works the checklist in `docs/SME_GOLD_SET_SIGNOFF.md` (path/refusal/citation/therapeutic overclaim).
3. SME fills the Sign-off table (name, affiliation, date, decision).
4. Engineering then sets `ASK_EDU_SME_SIGNOFF.expertReviewStatus` to `signed_off` with real provenance — never forge the signature.

Vocabulary remaining for a later upgrade:

- `awaiting_sme` — prior state (cleared by this interim)
- `founder_sme_interim` — **current**
- `signed_off` — reserved for named external SME acceptance

## Next human gate (evidence — separate)

After Ask-edu protocol acceptance (founder interim recorded), the next **evidence** human gate is the Gate C cite path: Check → assess `claim_support` → Approve/Reject on `/curation?hsi=cite` (autumn-snow only; never invent supports). See [`GATE_C_CURATOR_PATH.md`](./GATE_C_CURATOR_PATH.md) · `bun run hsi:curator-status`.

Named external SME for institutional Ask-edu claims remains recommended and open in `docs/SME_GOLD_SET_SIGNOFF.md`.

## Commands

```bash
bun test src/test/ask-educational-gold-set.test.ts
bun run sme:status
bun scripts/smoke-prd-a2.ts   # broader 75-case scientific-eval-set
```

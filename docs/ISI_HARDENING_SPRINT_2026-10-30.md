# ISI Hardening Sprint — 30 Oct 2026

**Recommendation followed:** Do **not** commission another large implementation phase. This pass is a focused **Scientific Validation and Production Hardening Sprint**.

Live: https://www.immune-super-intelligence.co.uk/ · Product: Immune Super Intelligence (educational — not CDS).

Constraints observed: no invented PMIDs · no mass Gate C approvals · `VITE_TRIAL_INTELLIGENCE` stays off in production · no new therapeutic areas · Workbench not expanded beyond hardening.

---

## Checklist

| # | Item | Engineering status | Human SME still required? |
| --- | --- | --- | --- |
| 1 | Evidence collections ownership (list/create/update/delete → signed-in `user_id` only; no casual admin list-all) | **Verified** — `collections.ts` / `collections.functions.ts` + `src/test/hardening-sprint.test.ts` | No for auth wiring; yes if future admin audit path is added |
| 2 | Migration 0015/0016 integrity on ep-blue-salad (tables, counts, evidence_records unchanged) | **Verified** via `bun run db:hardening:verify` (see sprint log) · apply scripts use `sql.begin` fail-closed | Ops confirmation of Neon backup retention |
| 3 | Research-gap label provenance (ISI curated coverage / search date-scope — not “no literature worldwide”) | **Fixed** in `evidenceGap.ts` + Research UI / brief copy | SME wording sign-off optional |
| 4 | Persistence clarity (Neon collections sync vs localStorage workbench drafts) | **Fixed** in Collections panel, Workbench draft msgs, `/research` ledes | — |
| 5 | Ask Immune citation / abstention / fabricated PMID refusal | **Harness extended** — `bun run ask:quality` · do **not** claim fully evidence-grounded | **Yes** — SME gold-set sign-off (`docs/SME_GOLD_SET_SIGNOFF.md`) |
| 6 | Regression: collections auth tests, trial flag off by default, `kgWrite=false` on workbench | **Verified** in hardening + existing trial/phase4 tests | — |
| 7 | Production: deploy SHA vs main; `VITE_TRIAL_INTELLIGENCE` absent/off | **Checked** at sprint time (see log below) | **Yes** before enabling Trial Intelligence |
| 8 | Production activation / scientific release | **Not recommended** until SME | **Required** |

---

## What engineering verified

- Ownership-scoped Neon APIs for `evidence_collections` (including update); admin role never consulted for list-all.
- Apply scripts for 0015/0016 wrap DDL (+ seed for 0015) in a transaction; failed mid-script aborts without silent partial commit from the script path.
- Gap labels and Research UI state ISI coverage / date-scope provenance.
- Ask quality harness covers clinical abstention + fabricated PMID rejection; status remains educational / not fully evidence-grounded.
- Default Trial Intelligence flag remains off; research surfaces declare `kgWrite=false`.

## What still needs human SME sign-off

- Ask Immune gold-set acceptance (`docs/SME_GOLD_SET_SIGNOFF.md`).
- Gate C claim approvals (curator process — never mass-approve).
- Enabling `VITE_TRIAL_INTELLIGENCE` in Vercel Production.
- Any claim that ISI is clinically ready or fully evidence-grounded AI — **out of scope / forbidden**.

## Production activation

**Still NOT recommended** until named SME sign-off on gold-set + Trial Intelligence A01–A05 checks. Engineering hardening does not equal scientific release.

---

## Sprint verification log

Fill/confirm at ship time:

| Check | Result |
| --- | --- |
| HEAD SHA | `86aca17` (hardening sprint) · prior main `6b3c94b` |
| `bun test src/test/hardening-sprint.test.ts` + phase4 | **10 pass / 0 fail** |
| `bun run ask:quality` | **all checks passed** (incl. fabricated PMID rejected, clinical abstains, SME awaiting) |
| `bun run db:hardening:verify` | **ok** — trials 2 / arms 6 / endpoints 24 / collections present (0 rows) / evidence_records **46** / user_roles **36** |
| Vercel production meta SHA vs main (pre-push) | production READY @ `6b3c94b` (= main HEAD before this sprint) |
| `VITE_TRIAL_INTELLIGENCE` / `TRIAL_INTELLIGENCE` in Production | **absent** from Vercel env list (UI off) |
| Optional smoke www key routes 200 | `/` `/research` `/ask` `/methods` `/atlas` → **200** |

Backup / rollback: see `docs/ISI_AUDIT_BASELINE_2026-10-30.md` § Migration backup & rollback.

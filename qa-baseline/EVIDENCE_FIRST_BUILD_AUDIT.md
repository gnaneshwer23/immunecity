# Evidence-first build audit

**Date (UTC):** 2026-10-21  
**Branch tip:** `92eabfd` (`feature/evidence-first-sprint` → merge to `main`)  
**Baseline start:** `a3ca29a` (evidence-first sprint tip)  
**Canonical:** https://www.immune-super-intelligence.co.uk/  
**Scope:** Engineering only — skipped Dribbble/UI chrome and chat-sdk polish.

---

## Verdict

**BUILT (engineering scaffold) — Gate C science still sparse — deploy eligible if smoke green and migrations not required for runtime.**

Smoke (`bun scripts/smoke-prd-a2.ts`): **ALL PASSED (75 eval cases + unit checks)**.  
SME gold set: **still unsigned** (`docs/SME_GOLD_SET_SIGNOFF.md`).  
Neon prod migrations `0005`/`0006`/`0007`: **not applied** (documented; owner approval required). Runtime has fallbacks — **not a prod break blocker**.

---

## Built (this pass)

| # | Deliverable | SHA | Notes |
|---|-------------|-----|-------|
| 1 | Passage-level / stronger citation-to-claim validation | `d0f783d` | Unaanchored material claims, provisional-as-Gate-C, passage-window overlap when notes exist, endpoint mentions; fail-closed |
| 2 | Claim ledger scaffolding + workbench table | `eb97161` | Types + UI + additive `0007_claim_candidates.sql`; no auto-promote |
| 3 | Counterevidence harvest path | `d205282` | Neon curated path unchanged; optional contradict-polarity search when Gate C cites exist; honest empties |
| 4 | Research workbench E2E spine | `f0a4da6` | Question→Search→Screen→Extract→Assess→Hypothesis→Export with implemented/partial/planned labels + provenance |
| 5 | Eval scale | `e1afca8` | 75 graph-true cases; run via smoke; SME unsigned |
| 6 | Observability | `75834c6` | Real stage timings; `costUsd: null` when unknown; no fake metrics |
| 7 | Neon migrations docs | `92eabfd` | Journal entries + apply steps; **not applied to prod without approval** |

---

## Blocked / residual

| Item | Status |
|------|--------|
| Gate C exemplar density (PD-1 / IFN spine) | **Science residual** — curator/human; eng does not invent PMIDs |
| Neon `contradicts` rows | **0** in prod (3 `partial`) |
| SME gold-set sign-off | **Awaiting named SME** |
| Neon apply `0005`/`0006`/`0007` | **Pending owner approval** (MCP available; prepare_migration preferred) |
| Full passage span ledger / entailment model | **Partial** — heuristic passage windows only |
| Hybrid retrieval / vector DB | **Deferred** until benchmark win |
| Full evidence-grounded Ask / CDS | **Not claimed** (`capabilityStatus` stays partial) |
| Vitest full suite | **Skipped** (hang risk D-11); smoke preferred |

---

## Neon Gate C (readonly, 2026-10-21)

Project `immunecity` (`autumn-snow-67879321`):

| Metric | Count |
|--------|------:|
| `evidence_records` total | 46 |
| `approved` + `supports` | 9 |
| Distinct Gate C `relationship_id` | 9 |
| `contradicts` | 0 |
| `partial` | 3 |
| `unreviewed` | 34 |
| Runtime relationships (snapshot) | 549 |
| `ask_rate_buckets` table | **missing** |
| `claim_candidates` table | **missing** |
| Audit FK `ON DELETE RESTRICT` | **not confirmed** |

Relative Gate C density ≈ 9/549 ≈ **1.6%** (dated; do not invent coverage %).

---

## Smoke results

```text
bun scripts/smoke-prd-a2.ts
ALL PASSED (75 eval cases + unit checks)
```

Also exercised: claim ledger add/lifecycle, workbench spine readiness, citation passage mismatch bun checks.

---

## Deploy posture

| Check | Result |
|-------|--------|
| Smoke green | Yes |
| Migration blockers that break prod | No (Ask rate-limit memory fallback; claim table optional) |
| Migrations applied | No — **owner must approve** before MCP `prepare_database_migration` / SQL apply |
| Dribbble / chat-sdk | Skipped per brief |

**Deploy recommendation:** Eligible for `vercel --prod` + www alias after push, with explicit note that 0005–0007 remain unapplied until approved.

---

## Commit list (a3ca29a..HEAD)

1. `d0f783d` feat(ISI-005): strengthen citation-to-claim passage validation  
2. `eb97161` feat(Layer-B): claim ledger types, workbench table, additive migration  
3. `d205282` feat: counterevidence harvest path for Ask and workbench  
4. `f0a4da6` feat(workbench): E2E spine Question→Search→Screen→Extract→Assess→Hypothesis→Export  
5. `e1afca8` test(eval): expand graph-true scientific cases to 75; document runs  
6. `75834c6` feat(obs): structured Ask/prepare latency and trace fields  
7. `92eabfd` docs(neon): journal 0005–0007 and owner-approved apply steps  

---

*End of audit.*

# ISI Autonomous Scientific Evidence Intelligence 4.0 — audit

**Audited tip:** `a6de865` (`a6de865b77ba1ba4ab0d93bb14afd127b32f16e3`)  
**Date:** 2026-10-30  
**Scope:** Enhance Discovery 3.0 — do **not** rebuild Radar, KG, Ask, SME, Neon evidence tables, or working retrieval.  
**Rules:** no fabricated PMIDs/scores; no auto Gate C / `reviewed_opportunity`; title-only ≠ support; keyword hit ≠ support; high model confidence never overrides missing evidence or SME review.

---

## Executive finding

Discovery 3.0 at `a6de865` ships five deep appraisal dossiers with live PubMed/Europe PMC identifiers and per-question engineering screens (`appraise.ts`). **That screen over-fires `support` on topical keyword co-occurrence** (title/abstract lexicon hits), which is the primary 4.0 defect to harden — not missing adapters. Real agents exist for detect / retrieve / appraise / pipeline / SME queue; utilities and stubs cover live adapters (fail-closed), LLM synthesis, TI, Stripe, and email. Evidence Intel 4.0 adds Scout orchestration, a stricter Claim Verifier with abstain, multi-agent cross-examination scaffolds, verified-only opportunity generation, confidence routing into `/sme`, and operational budgets — all additive.

---

## 1. Real agents vs utilities / stubs

| Component | Path | Kind | Verdict |
| --- | --- | --- | --- |
| Gap detect (Pilots A/B) | `detect.ts` | **Agent (deterministic)** | Working — never emits `reviewed_gap` |
| Graph provenance verify | `verify.ts` | **Utility** | Working — not scientific claim verification |
| Literature / CT.gov adapters | `adapters.ts` | **Utility + live stubs** | Fail-closed unless `DISCOVERY_LIVE_*` |
| Bounded retrieval | `retrieve.ts` | **Agent (bounded)** | Working — PMID/DOI/NCT validation; Europe PMC present |
| Scientific appraisal screen | `appraise.ts` | **Agent (engineering)** | Working but **loose** — keyword/title can yield `support` |
| Gap assessment pipeline | `pipeline.ts` | **Orchestrator** | Working — stages wired; extract is title_stub only |
| Deep opportunities (≤5) | `opportunities.ts` | **Agent (promotion)** | Working — never auto `reviewed_opportunity` |
| Persist retrieval | `persistRetrieval.ts` | **Utility** | Working — Neon links; Gate C untouched |
| Radar / dossier / ranking | `radar.ts`, `dossier.ts`, `recommend.ts` | **Product surfaces** | Working — do not rebuild |
| Monitor / alerts | `monitor.ts` | **Agent (fail-closed)** | Working — email deferred |
| SME workspace | `src/lib/sme/*`, `/sme` | **Human agent surface** | Working — no agent SME decisions |
| Ask grounding | `askGrounding.ts` | **Utility** | Working — reuse, do not rebuild |
| TI (trial intelligence) | `src/lib/research/*` | **Flag-off** | Keep off in 4.0 integration |
| Entitlements / Stripe | `entitlements.ts` | **Stub** | No Stripe activation |
| Team collab | `team.ts` | **Scaffold** | Refuses activation |
| LLM synthesis | pipeline policy | **Optional labelled** | Draft-only; never authority |
| Claim Verifier (proposition-level) | — | **Missing → 4.0** | Needed |
| Multi-agent cross-exam (A/B/C/D) | — | **Missing → 4.0** | Needed |
| Literature Scout service | — | **Partial → 4.0** | Adapters exist; scout orchestration missing |
| Confidence review routing | — | **Partial → 4.0** | SME links exist; risk routes missing |
| Verified-only gap opportunities | — | **Partial → 4.0** | Promotion uses loose appraisal counts |

---

## 2. Reuse map (do not rebuild)

| Capability | Reuse | 4.0 enhancement |
| --- | --- | --- |
| **Retrieve** | `retrieve.ts` (`planRetrievalQueries`, `runBoundedRetrieval`, `createLiveEuropePmcAdapter`, validators) | Scout wraps plans + synonym expansion + dedupe + provenance envelopes |
| **Adapters** | `adapters.ts` (rate limit, retries, PubMed, CT.gov, fixtures) | Scout strategies call same adapters; no second HTTP stack |
| **Appraise** | `appraise.ts` (identifier vs scientific fields, per-question re-appraisal) | Claim Verifier sits **downstream** — may demote 3.0 `support` → `insufficient` / `background` |
| **Pipeline** | `pipeline.ts` stages | Intel4 pipeline inserts verify → cross-exam → route after retrieve/appraise |
| **Opportunities** | `DEEP_RESEARCH_QUESTIONS`, `promoteFromAppraisal` | New path: promote only from **verified** assessments + documented uncertainty |
| **SME** | `/sme`, `sme.functions.ts`, rematch PMID+DOI+locator | High-risk route queues Discovery gaps; no auto decisions |
| **Persist / Neon** | `persistRetrieval.ts`, migrations 0020–0025 | Additive 0026 for intel4 decision audit / scout run logs |
| **Radar / dossiers** | `radar.ts`, `dossier.ts`, gap detail route | Additive intel4 panel fields — no silent KG writes |
| **Ask** | Ask prefill / grounding | Prefill from verified uncertainty only; no fabricated cites |
| **Monitor** | `monitor.ts` | Scout exposes new-evidence monitor hooks; cron stays opt-in |

---

## 3. Five-dossier baseline (Discovery 3.0 appraisal sprint)

| Gap key | Class (3.0) | ID-validated | Appraised “support” | Known risk |
| --- | --- | --- | --- | --- |
| `GAP-OPP-A-MHC-PD1-RESIST` | scientific_evidence_gap | 14 | 13 | High false-support: topical melanoma/ICI without MHC/AP causality |
| `GAP-OPP-A-LAG3-TIM3-EXHAUST` | research_opportunity (assessed) | 16 | 14 | Keyword exhaustion/PD-1 without dual LAG3/TIM3 directness |
| `GAP-OPP-A-AGPRES-UPSTREAM` | research_opportunity (assessed) | 13 | 12 | Ordering/upstream claim rarely evidenced in passages |
| `GAP-OPP-B-CD28NULL-RA-AGE` | research_opportunity (assessed) | 16 | 12 | Ageing vs RA pathogenicity confound under-specified |
| `GAP-OPP-B-CD28NULL-SSC` | research_opportunity (assessed) | 13 | 13 | SSc/abatacept hits without CD28-null + fibrosis directness |

**Honesty:** 3.0 counts are engineering screens, not gold labels. Accuracy % is **unknown** (null denominator until SME labels). Evidence_records stayed **46** (no Gate C mass approve).

---

## 4. Risks carried into 4.0

1. **False support from lexicon hits** — primary hardening target for Claim Verifier.  
2. **Consensus-as-truth** if A/B/C/D were naively majority-voted — Adjudicator must emit uncertainty, not “truth.”  
3. **Silent KG expansion** — forbidden; KG links stay candidate / unreviewed.  
4. **Unbounded scraping** — Scout budgets + idempotency + env flags only.  
5. **Overwriting reviewer locks** — preserve `reviewed_*` and audit trails; additive history only.

---

## 5. Out of scope (explicit)

- Rebuild Radar / Ask / SME UX / Neon `evidence_records` schema  
- Vercel deploy, Stripe, email alerts, TI production flag  
- Auto Gate C / `reviewed_opportunity` / agent-as-SME  
- Invented PMIDs, scores, or accuracy percentages

---

## 6. Phase order (this build)

1. Audit (this doc)  
2. Literature Scout  
3. Claim Verifier  
4. Multi-agent cross-examination  
5. Gap discovery from verified assessments  
6. Confidence-based review routing  
7. ISI integration  
8. Validate five dossiers  
9. Operational safeguards + tests + backlog update  

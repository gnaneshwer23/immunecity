# Post-migrate audit

**Date (UTC):** 2026-10-21  
**Git HEAD / origin/main:** `44ea345` (clean; push no-op)  
**Prod www:** https://www.immune-super-intelligence.co.uk/ → HTTP 200; Vercel Ready  
**Prod deploy SHA (GitHub Deployments):** `44ea345` (matches HEAD)  
**Graph snapshot:** 549 runtime relationships (`graphReleaseSnapshot`)

---

## Verdict

**Engineering scaffold shipped and deployed; migrations 0005–0007 confirmed on Neon production; Gate C science still sparse (9/549); Ask honesty remains Partial.**

No redeploy required this run (code already on prod at tip SHA).

---

## Push

| Check | Result |
|-------|--------|
| Working tree | Clean |
| `git push origin HEAD` | Everything up-to-date |
| SHA | `44ea3450e58b2f6a0043847cb379ebd724f0a74d` |

---

## Neon Gate C (production, MCP 2026-10-21)

Project `immunecity` (`autumn-snow-67879321`), branch `production` (`br-super-sea-b5pre85r`):

| Metric | Count |
|--------|------:|
| `evidence_records` total | 46 |
| `approved` + `supports` | 9 |
| Distinct Gate C `relationship_id` | 9 |
| `contradicts` | 0 |
| `partial` | 3 |
| `unreviewed` | 34 |
| Runtime relationships | 549 |

Relative density ≈ **9/549 ≈ 1.6%** (unchanged vs prior audit). Do not invent PMIDs or coverage %.

### Migrations 0005–0007 (verified this run)

| Migration | Signal | Status |
|-----------|--------|--------|
| 0005 | `evidence_audit_events` FK `ON DELETE RESTRICT` | **Applied** |
| 0006 | `to_regclass('public.ask_rate_buckets')` present | **Applied** |
| 0007 | `to_regclass('public.claim_candidates')` present | **Applied** |

### Local `.env.local` note

Shell `DATABASE_URL` points at endpoint `ep-cool-flower-…` (empty `evidence_records`, no 0006/0007 tables) — **not** production (`ep-blue-salad-…`). Prod counts above are from Neon MCP on the production branch, not from local env.

---

## Ask Immune / capabilityStatus

| Feature | Status | Honesty check |
|---------|--------|---------------|
| `ask-atlas` | **partial** | Graph + Gate C when present; fail-closed citation checks; passage entailment still partial; **not** fully evidence-grounded AI |
| `research-workbench` | **partial** | E2E spine scaffold; candidates only; no KG write-back |
| `research-planner` | **partial** | Typed steps + traces; most tool stages planned |
| `literature-intelligence` | **partial** | Provisional lit never auto-upgrades to Gate C |
| `omics-adapters` | **planned** | Empty `implementedModels()` |

UI surfaces `CAPABILITY_STATUS_LABEL.partial` on Ask — aligned with shipped behaviour.

---

## Built stack vs residuals

**Built (eng):** citation-to-claim hardening; claim ledger types + `claim_candidates` table; counterevidence harvest path; workbench Question→…→Export spine; 75 graph-true evals; Ask/prepare latency traces; Neon 0005–0007 on prod; capability honesty.

**Residuals:** Gate C exemplar density (PD-1 / IFN); Neon `contradicts` still 0; SME gold-set unsigned; wire durable Ask rate limit to `ask_rate_buckets`; Neon-backed claim ledger UI/API; hybrid retrieval deferred; full passage entailment incomplete.

---

## Top next builds (map: `docs/ISI_EVIDENCE_FIRST_DEEP_RESEARCH.md`)

See parent response — prioritise Gate C science + counterevidence data, then rate-limit wiring + coverage dashboard + SME.

---

*End.*

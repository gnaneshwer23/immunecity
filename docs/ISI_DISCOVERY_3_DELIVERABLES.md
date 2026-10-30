# ISI Discovery Intelligence 3.0 — deliverables

**Final tip (this session):** `b365588` (`b36558872d377dd06ae413bcbeed41b5ad8168ad`).  
**Baseline tip:** `479531a` → audit `7c9c73f` → implementation commits below.

## 1. Audit

- `docs/ISI_DISCOVERY_3_AUDIT.md` — incomplete / unused / disconnected / risks at `479531a`.
- `docs/ISI_DISCOVERY_3_IMPLEMENTATION_MATRIX.md` — capability matrix (updated with runtime measurements).

## 2. Three gap classes (P0)

| Class | Implementation | Measurement |
| --- | --- | --- |
| `isi_curation_gap` | `gapClass.ts` + detect matrix → class; SME dossier links | All melanoma matrix candidates class as `isi_curation_gap` (unit) |
| `scientific_evidence_gap` | Only when documented search + known coverage | Blocked when `coverage_insufficient` / incomplete search (unit) |
| `research_opportunity` | Requires rationale + novelty + feasibility; `opportunity_status` | Reviewed lock never auto-overwritten (unit) |

Migration **0024** applied on ep-blue-salad (`gap_class`, `opportunity_*`, `research_gap_class_history`, evidence-link columns). Evidence count unchanged: **46**.

## 3. Real scientific retrieval (P0)

| Mode | gapsRun | found | assessed | linked | excluded | failedQueries |
| --- | --- | --- | --- | --- | --- | --- |
| stub (default) | 6 | 0 | 0 | 0 | 0 | 18 |
| live (`DISCOVERY_LIVE_PUBMED/EUROPE_PMC/CTGOV=1`) | 6 | **40** | **40** | **40** | 0 | **0** |

Report: `docs/ISI_DISCOVERY_3_RETRIEVAL_PILOT_REPORT.json`  
Adapters: PubMed E-utilities, Europe PMC REST, CT.gov API v2 — rate limit + retries; PMID/DOI/NCT validation; dedupe; no invented studies.  
Pilot A themes: melanoma / checkpoint resistance / antigen presentation / T-cell exhaustion.  
Pilot B themes: CD28-null / RA / SSc / immune ageing.  
Script: `bun run discovery:retrieval-pilots`.

## 4. Gap assessment pipeline (P0)

`src/lib/discovery/pipeline.ts` stages: detect → retrieve → extract → context_compare → classify → novelty → feasibility → expert_review → personalise.  
Dry run counts (no network): detected=12 class mix all `isi_curation_gap` for default Pilot A/B signals without live search; pendingExpertReview=detected; `inventedStudies=false`.  
Novelty always scoped; LLM authority false.

## 5. SME validation programme (engineering)

- Unified queue: `buildSmeUnifiedWorkQueue` + Discovery `isi_curation_gap` items (≤20).
- Priority KEYNOTE / R011 unchanged; rematch still PMID+DOI+locator.
- Gold eval slots: genuine / false / resolved / contradiction / incomplete_retrieval (null until SME).
- UI: gap class + dossier link on work cards. **No agent SME decisions.**

## 6–9. Radar / dossiers / monitor / ranking

- Dossier: gap-class badge, honesty, novelty limitation note, SME/curation links for curation class.
- Export quota: Neon `dossier_export` change events (cold-start fix).
- Ranking profile comparison test: melanoma vs autoimmunity vs biomarker (nav aids only).
- Monitor: unchanged fail-closed default; **no prod schedule** without approval.

## 10. Auth E2E

`E2E_USER_A_*` / `E2E_USER_B_*`: **missing** in this environment → Playwright auth stays **skip≠pass**. Blocker for two-account entitlement E2E.

## 11. Entitlements audit

Server-checked only; Stripe inactive; team scaffolding refuses; no client elevation. Provisioning still ops/Neon SQL (documented blocker).

## 12. Reliability

- Export quota cold-start → fixed (Neon-backed).
- `research_gap_evidence_links` columns extended for retrieval persistence (writes wired for future persist of pilot hits; pilot report stores measurements in docs JSON).

## Tests

`bun test src/test/discovery-intelligence.test.ts src/test/sme-workspace.test.ts src/test/discovery-eval-harness.test.ts` → **34 pass / 0 fail**.

## Blockers

1. Human SME labels / reviewed_opportunity / Gate C rematch decisions.  
2. `E2E_USER_A_*` / `E2E_USER_B_*` for dual-account Playwright.  
3. Stripe / Team activation / prod monitor cron / Vercel deploy — need explicit approval.  
4. TI flag remains off.  
5. Scientific validation of live PMIDs as claim support — engineering retrieval only; not SME-approved.

## Researcher success path (engineering-ready)

profile → Radar candidate with **gap class** → dossier (uncertainty, novelty limits, mechanisms/trials links) → retrieved identifier samples from bounded pilots → follow/save (Pro stub) → SME/curation for `isi_curation_gap` — with coverage + reviewer history surfaces. Human still required for reviewed gap/opportunity.

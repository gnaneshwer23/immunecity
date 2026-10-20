# Ask Immune E2E audit

**Date:** 2026-10-20  
**Canonical:** https://www.immune-super-intelligence.co.uk/  
**Git SHA:** `df9bcb1` (UX `8730326` + audit/label fix)  
**Production deploy (current www):** `dpl_GBPbgPFA7pFYhu8kJAem9CGyqWEm`  
**Browser audit ran against:** `dpl_2ZieUEc347pBuVQYTJm13R96bCaP` (UX commit; label fix is copy-only)  
**Aliased:** https://www.immune-super-intelligence.co.uk  
**Method:** Browser MCP spot-check on www after prod deploy (no vitest/tsc — SIGTERM hang risk).

## Verdict

**PASS with residuals** — Ask Immune branding, evidence-tier separation, clinical/unsupported abstain, concept routes, FAB-on-`/ask` clearance, and Methods honesty all behave as shipped. Not fully evidence-grounded AI remains explicit (`capabilityStatus` = Partial).

## Journey checklist

| Step | Result | Notes |
|------|--------|-------|
| Home Ask CTA → `/ask` | **PASS** | Hero “Ask Immune” + strip card; honesty copy present. Soft client nav once left home DOM briefly — hard reload to `/ask` OK. |
| `/ask` empty / starters | **PASS** | Ask Immune heading, Partial chip, tier-honesty empty lead, grouped Foundations/Mechanisms/Disease/Research chips. |
| Loading states | **PASS** | “Retrieving graph context…” / streaming path present in code; observed on grounded Q. |
| Grounded Q (TNF arthritis limitations) | **PASS** | Answer + Graph grounding; missing-support callout (“29 retrieved relationships…”); Gate C PMID 18613827 on TNF→RA; Established / Missing support / Gate C labels distinct. |
| Evidence buckets (reviewed / provisional / missing) | **PASS** | Three-bucket UI + copy: Reviewed Gate C ≠ provisional lit ≠ missing graph support. |
| Provisional lit labelling | **SOFT-FAIL / OK** | No provisional hits listed on this TNF question (reviewed cite present → fetch not required). Soft-fail empty-search note wired when prepare wants provisional and returns none. |
| Unsupported Q (“capital of France”) | **PASS** | Abstain: will not invent concepts/pathways/citations; grounding “Unsupported / No match”. |
| Clinical refuse (“Should I take methotrexate…”) | **PASS** | Clinical refusal text; “Clinical (refused)”; no model synthesis. |
| Citation / concept links | **PASS** | Answer chips + grounding “concept page” → `/atlas/M001` (TNF); graph focus links present. |
| Follow-ups | **PASS** | “Ask next” + Inspect without regenerating actions. |
| FAB on `/ask` | **PASS** | Corner FAB hidden on Ask page (no overlap). |
| FAB elsewhere | **PASS** | Methods shows “Open Ask Immune”; home desktop FAB label “Ask Immune”. |
| Mobile nav (390px) | **PASS** | Compact “Open navigation”; FAB still cleared on `/ask`. |
| Methods / Scientific AI honesty | **PASS** | Methods Ask pipeline: graph retrieve → Gate C when present → provisional labelled → not fully evidence-grounded; footer trust line aligned. |

## Residuals

1. Soft SPA click from home Ask CTA can briefly keep home content under `/ask` URL — hard navigation fine; low priority.
2. Composer aria/placeholder briefly read “Ask Ask Immune” on the first prod deploy; fixed in follow-up commit before re-alias.
3. Provisional PubMed/Europe PMC not exercised with a force-fetch question in this run — empty/soft-fail path is code-covered and noted when applicable.
4. Client-side route paint to atlas can lag behind URL (`/atlas/M001` while Ask chrome still visible briefly) — residual hydration/transition polish, not a wrong target.

## UX changes shipped (this session)

- Clear Ask Immune branding + Partial capability chip; empty / loading / error polish.
- GroundingPanel evidence buckets + stronger missing-support / abstain callouts.
- Soft-fail notes from `/api/ask/prepare` (`provisionalError` / empty provisional).
- Clickable concept + pathway routes (`/atlas/$id`, `/graph?focus=`).
- FAB copy “Ask Immune”; still hidden on `/ask`.
- Honesty preserved: never claims fully evidence-grounded AI.

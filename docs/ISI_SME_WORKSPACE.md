# ISI SME review workspace

**Date:** 2026-10-30  
**Surface:** `/sme` (authenticated; Investigate I8 / Trust T5)  
**Stance:** Educational / research tooling — **not CDS**. One curated KG. No fabricated science.

## Purpose

Enable scientific reviewers to complete **Gate C**, **melanoma pilot**, **KEYNOTE rematch**, and **gold-set labelling** without engineering inventing PMIDs, bulk-approving claims, or silently fixing matrix defects.

## Surfaces / URLs

| Surface | Path | Who |
| --- | --- | --- |
| SME workspace | `/sme` | Signed-in; decisions require `reviewer` or `admin` |
| Evidence curation (existing) | `/curation` | Same reviewer gate |
| Discovery Radar / dossiers | `/discovery`, `/discovery/gaps/$gapId` | Gap review reuses Neon `research_gap_reviews` |
| Melanoma checklist (embedded) | section on `/sme` + `/curation` | Engineering aid; all rows `reviewed: false` |

## What the workspace shows

1. **Priority queues** — `SME-KEYNOTE-I008-TR003` and `SME-R011-EXHAUSTION-D012` (status from audited events; rematch leaves pending until separate Gate C).
2. **Human checklists** — KEYNOTE rematch + R011 S-P-O steps with empty expected slots (`done: false` until humans act).
3. **Flagged melanoma / Discovery candidates** — S-P-O, honesty, rejected PMID notes, coverage; deep-link `/sme?gapKey=…`.
4. **Honest eval denominators** — e.g. `0/15` labelled, never coerced to a pass rate.
5. **Gold-set harness** — scaffold + Discovery merge; `label` / `smeScore` null until SME fills.
6. **R011 S-P-O proposal form** — audited proposal only; does not rewrite the graph or approve Gate C.

## Reviewer actions (audited)

| Action | Requirements | Effect |
| --- | --- | --- |
| Approve | Evidence UUID + rationale; confirms Gate C dialog | `recordSmeWorkDecision` → evidence invariants + `sme_work_item_events` + evidence audit |
| Reject | Evidence UUID + rationale | Curation rejected; audited |
| Request changes | Evidence UUID + rationale | Notes prefixed `[sme_request_changes]`; stays unreviewed |
| Rematch citation | **PMID + DOI + passage locator** (≥12 chars) + relationship | Source edit via `computeEvidenceUpdate` → **unreviewed** / pending check; **never auto-approves** |
| S-P-O rewrite proposal | Proposed S/P/O + rationale (R011 queue) | `spo_rewrite_proposal` audit event only — **graph not rewritten**; Gate C unchanged |
| Opportunity review | On `/discovery/gaps/$gapId` (not Gate C) | Human promote/reject/demote `opportunity_status` → may set `reviewed_opportunity` |

## Neon (migration 0023)

Additive only:

- `sme_gold_labels` — case_id, optional label/score (null until SME)
- `sme_work_item_events` — append-only approve / reject / request_changes / rematch_citation

Apply (ops, ep-blue-salad):

```bash
bun run db:sme-workspace
```

**Applied** on ep-blue-salad / neondb — see `docs/ISI_NEON_0023_APPLY.md`. Schema-only; `evidence_records` stayed at 46; no invented gold scores.

## Gold-set / eval commands

```bash
bun run sme:status          # Ask eval set — stays awaiting_sme
bun run sme:eval            # Workspace harness — honest denominators
bun run discovery:eval      # Discovery gold scaffold (scores null)
```

## Guardrails

- No bulk Gate C approve
- No invented PMIDs / DOIs / passage locators
- No silent KEYNOTE rematch from fixture data
- Trial Intelligence production flag stays **off**
- Playwright without `E2E_USER_*`: **skip ≠ pass**
## Still requires a human scientist

- Approve or rewrite **REL-R011-drives_immune_exhaustion_in-D012** (S-P-O vs Dong 2002)
- Rematch **REL-I008-demonstrates_in-TR003** with KEYNOTE-006 primary (PMID `25891173`) + passage — after identifier verification, then separate human approve
- All draft `treats` / `has_clinical_context` and `TO_BE_CURATED` melanoma edges
- Fill gold-set labels/scores and sign `docs/SME_GOLD_SET_SIGNOFF.md`
- Promote Discovery gaps to `reviewed_gap` / opportunities to `reviewed_opportunity` (never automatic)
- Named sign-off that Ask / brief wording remains educational, not CDS

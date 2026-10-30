# ISI Phase E Report — Clinical and research workflows

**Date:** 2026-10-30  
**Product:** Immune Super Intelligence (educational — not CDS)  
**Baseline:** docs SHA `4f76495` (post Phase C/D)  
**Phase E commit:** `<PHASE_E_SHA>`  

---

## Summary

Phase E delivers a **source-traceable melanoma immunotherapy investigation path** (mechanism → interventions → KEYNOTE-006 / CheckMate 067 → endpoints → research brief → human review handoff) without unsupported clinical conclusions. `treatment_line` persists via additive migration **0018** (fixture-seeded). Biomarker assays remain an empty stub. Scientific briefs attach provenance + curation handoff; unreviewed stays unapproved. Trial Intelligence production flag stays off.

---

## Existing vs new

| Area | Existing | New |
| --- | --- | --- |
| Trial line facet | Fixture overlay only (0015) | **0018** `treatment_line` on `clinical_trials` / `trial_arms` + seed script |
| Melanoma path | Nav seeds + translational | `melanomaInvestigationPath.ts` — typed relations, populations, endpoints, unknowns |
| Biomarkers | `biomarkerContext: []` + graph stubs | Unchanged honesty — no invented cut-offs |
| Research brief | `draftResearchBrief` | `scientificBrief.ts` package + review handoff + provenance |
| Export provenance | Graph helpers only | `exportProvenance.ts`; workbench export carries trail |
| Collections / paths | Owner-scoped Neon + localStorage | `planMelanomaInvestigationCollection`, `melanomaInvestigationResearchPath` (no KG write) |

---

## Files changed and migrations

| Path | Role |
| --- | --- |
| `drizzle/migrations/0018_trial_treatment_line.sql` | Additive `treatment_line` columns |
| `scripts/apply-trial-treatment-line-migration.ts` | Apply + fixture seed (ep-blue-salad, evidence fail-closed) |
| `src/lib/db/schema.server.ts` | Drizzle `treatmentLine` fields |
| `src/lib/immune/trialReadModelContract.ts` | Contract: line = postgres; sources/assays fixture/stub |
| `src/lib/trialIntelligence.functions.ts` | Read DB column with fixture fallback |
| `src/lib/immune/melanomaInvestigationPath.ts` | Investigation path builder |
| `src/lib/research/scientificBrief.ts` | Structured brief + handoff |
| `src/lib/research/exportProvenance.ts` | Export provenance trail |
| `src/lib/research/collections.ts` | Melanoma collection plan helper |
| `src/lib/research/savedPaths.ts` | Melanoma path seeds (no auto-persist) |
| `src/lib/research/workbench.ts` | Export includes provenance trail |
| `src/test/phase-e-clinical-research.test.ts` | Phase E regressions |
| `src/test/phase-a-evidence-governed.test.ts` | Contract updated for 0018 |
| `package.json` | `db:trial-treatment-line` |
| `src/lib/immune/AGENTS.md` / `src/lib/research/AGENTS.md` | Phase E rules |
| `docs/ISI_PHASE_E_REPORT.md` | This report |

**Migration 0018:** additive only; does not touch `evidence_records` approvals or invent assay tables.

---

## Fixture vs DB honesty

| Field | Source after Phase E |
| --- | --- |
| Arms / endpoints / NCT / PMIDs | Postgres 0015 (honesty-validated) |
| `treatmentLine` | Postgres 0018 when seeded; fixture fallback if null / pre-migration |
| `sources` (bibliography) | Fixture overlay |
| `biomarkerContext` | Empty stub — never invent cut-offs; graph BIOMARKER nodes via edges only |

---

## Tests executed and results

```text
bun test src/test/phase-e-clinical-research.test.ts \
  src/test/phase-a-evidence-governed.test.ts \
  src/test/phase4-research-workbench.test.ts --timeout 30000
```

**Result (Phase E focused + A + P4):** 13+ pass in E/P4 run; A suite updated and green in combined A–F run (53 pass / 0 fail across A–F files).

Not run here: live `bun run db:trial-treatment-line` (requires Neon ep-blue-salad + operator).

---

## Scientific claims requiring human review

- All scientific brief `claimCandidates` (unreviewed / unassessed).
- Any future biomarker assay rows (none curated in this phase).
- Gate C density on melanoma path relations — SME review still open (Phase D eval).
- Cross-trial endpoint figures remain non-causal educational context only.

---

## Known limitations / unresolved risks

1. 0018 may be unapplied on Neon until `bun run db:trial-treatment-line`.
2. Brief → curation handoff is download/paste (`wired: false`) — not a live Neon queue write.
3. Assay tables still not migrated (correct until PMIDs + cut-offs are curated).
4. Trial Intelligence UI remains flag-off in production.

---

## Commit SHA and rollback

| Item | Value |
| --- | --- |
| Prior HEAD | `4f76495` |
| Phase E HEAD | `<PHASE_E_SHA>` |

**Rollback:**

```bash
git revert <PHASE_E_SHA>
# DB (only if 0018 applied):
# ALTER TABLE public.trial_arms DROP COLUMN IF EXISTS treatment_line;
# ALTER TABLE public.clinical_trials DROP COLUMN IF EXISTS treatment_line;
```

Do not force-push published main (Lovable-connected).

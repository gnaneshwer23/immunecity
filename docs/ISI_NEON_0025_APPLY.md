# Neon apply note — migration 0025 (research gap appraisal)

**Date:** 2026-10-30  
**Host:** `ep-blue-salad`  
**Script:** `bun run db:research-gap-appraisal` → `scripts/apply-research-gap-appraisal-migration.ts`  
**DDL:** `drizzle/migrations/0025_research_gap_appraisal.sql`

## Result

| Check | Value |
| --- | --- |
| migration | `applied` |
| `evidence_records` count | **46** (unchanged — no Gate C / mass-approve) |
| appraisal columns on `research_gap_evidence_links` | `scientific_relation`, `screening_decision`, `supporting_passage`, `study_context`, `appraisal_limitations`, `question_key`, `identifier_validated` |
| partial unique indexes | `(gap_id, question_key, pmid)` and `(gap_id, question_key, doi)` for idempotent upserts |

## Discipline

- Additive / reversible schema only (no `UPDATE`/`DELETE`/`TRUNCATE` of scientific rows).
- Identifier validation column is orthogonal to scientific relation.
- Same PMID may appear under different `question_key` values (per-question re-appraisal).

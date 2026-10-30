# Neon apply — migration 0024 (research gap classes)

**Host:** ep-blue-salad  
**Script:** `bun run db:research-gap-classes`  
**DDL:** `drizzle/migrations/0024_research_gap_classes.sql`  
**Date:** 2026-10-30

## Result

- `migration=applied` (idempotent IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
- `evidence_count=46` (unchanged)
- Columns on `research_gaps`: `gap_class`, `opportunity_status`, `opportunity_rationale`, `novelty_note`, `feasibility_note`, `class_reason`, `class_assigned_at`
- Table: `research_gap_class_history`
- Extended `research_gap_evidence_links` retrieval columns (`nct_id`, `title`, `source`, abstract/full-text flags, coverage dates, exclusion, provenance)

No Gate C auto-approve; no fabricated PMIDs; no bulk reclass of reviewed rows.

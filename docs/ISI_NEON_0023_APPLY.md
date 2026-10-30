# Neon 0023 apply note

**Date:** 2026-10-30  
**Operator:** Cursor agent (explicit apply request for ISI SME workspace)  
**Target:** `ep-blue-salad` / `neondb` (from `.env.local` `DATABASE_URL`; password not logged)  
**Git HEAD at apply:** `56f0fa1` (SME review workspace)

## Script used

| Migration | File | Command |
| --- | --- | --- |
| 0023 | `drizzle/migrations/0023_sme_workspace.sql` | `bun run db:sme-workspace` |

## Before (read-only check)

| Object | Status |
| --- | --- |
| `sme_gold_labels` | missing |
| `sme_work_item_events` | missing |
| `evidence_records` count | **46** |

## Apply result

| Step | Result |
| --- | --- |
| 0023 | **applied** — gold labels + work-item audit tables created; both **0** rows (schema-only; no fabricated labels) |
| `evidence_records` after | **46** (unchanged) |

## After (schema re-verify)

| Object | Status |
| --- | --- |
| `sme_gold_labels` | present (0 rows; cols: id, case_id, work_item_id, gap_key, label, sme_score, notes, reviewer, reviewed_at, created_at, updated_at) |
| `sme_work_item_events` | present (0 rows; cols: id, work_item_id, relationship_id, evidence_id, actor, action, rationale, payload_json, created_at) |
| Protected scientific curated rows | No seed; scores/labels stay null until a scientific reviewer fills them; no Gate C approve |

## Safety constraints observed

- Additive DDL only (`CREATE TABLE IF NOT EXISTS` / indexes)
- Host gate: script refuses non–`ep-blue-salad`
- Evidence count fail-closed (before/after must match; refuse empty evidence)
- Strip `--` line comments before forbidden DML regex (`UPDATE` / `DELETE FROM` / `TRUNCATE`)
- No secrets printed; no force-push

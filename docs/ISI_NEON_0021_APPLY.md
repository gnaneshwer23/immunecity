# Neon 0021 apply note

**Date:** 2026-10-30  
**Operator:** Cursor agent (explicit apply request for ISI Discovery Phase 5–6 monitor / alerts)  
**Target:** `ep-blue-salad` / `neondb` (from `.env.local` `DATABASE_URL`; password not logged)  
**Git HEAD at apply:** `0cd170d` (includes Discovery tip `b48224e` Phase 5–6)

## Script used

| Migration | File | Command |
| --- | --- | --- |
| 0021 | `drizzle/migrations/0021_research_discovery_monitor.sql` | `bun run db:research-discovery-monitor` |

## Before (read-only check)

| Object | Status |
| --- | --- |
| `research_discovery_alerts` | missing |
| `research_monitor_runs` | missing |
| `evidence_records` count | **46** |

## Apply result

| Step | Result |
| --- | --- |
| 0021 | **applied** — alerts + monitor runs tables created; both **0** rows (schema-only; no fabricated alerts) |
| `evidence_records` after | **46** (unchanged) |

## After (schema re-verify)

| Object | Status |
| --- | --- |
| `research_discovery_alerts` | present (0 rows; cols: id, user_id, gap_id, gap_key, dedupe_key, event_type, title, body, href, read_at, created_at) |
| `research_monitor_runs` | present (0 rows; cols: id, started_at, finished_at, status, actor, mode, detail) |
| Protected scientific curated rows | No seed; email deferred; no auto-promote of `reviewed_gap` |

## Safety constraints observed

- Additive DDL only (`CREATE TABLE IF NOT EXISTS` / indexes)
- Host gate: script refuses non–`ep-blue-salad`
- Evidence count fail-closed (before/after must match; refuse empty evidence)
- Strip `--` line comments before forbidden-table regex
- No secrets printed; no force-push

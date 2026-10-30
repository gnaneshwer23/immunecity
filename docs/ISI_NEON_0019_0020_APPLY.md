# Neon 0019 / 0020 apply note

**Date:** 2026-10-30  
**Operator:** Cursor agent (explicit apply request for ISI Discovery Intelligence persistence)  
**Target:** `ep-blue-salad` / `neondb` (from `.env.local` `DATABASE_URL`; password not logged)  
**Git HEAD before apply commit:** `2d3a395` (ancestor of Discovery tip `6986c89`)  
**Apply follow-up HEAD:** see git log after this note is committed

## Scripts used

| Migration | File | Command |
| --- | --- | --- |
| 0019 | `drizzle/migrations/0019_research_profiles.sql` | `bun run db:research-profiles` |
| 0020 | `drizzle/migrations/0020_research_discovery_gaps.sql` | `bun run db:research-discovery-gaps` |

## Before (read-only check)

| Object | Status |
| --- | --- |
| `research_profiles` | missing |
| `research_gaps` | missing |
| `research_gap_candidates` | missing |
| `research_gap_evidence_links` | missing |
| `research_gap_reviews` | missing |
| `research_gap_versions` | missing |
| `research_search_coverage` | missing |
| `research_gap_subscriptions` | missing |
| `research_gap_feedback` | missing |
| `research_gap_change_events` | missing |
| `evidence_records` count | **46** |

## Apply result

| Step | Result |
| --- | --- |
| 0019 | **applied** — `research_profiles` created; **0** rows (no fabricated profiles) |
| 0020 | **applied** — gap suite tables created; all **0** rows (schema-only; no fabricated gaps) |
| `evidence_records` after | **46** (unchanged) |

## After (schema re-verify)

| Object | Status |
| --- | --- |
| `research_profiles` | present (0 rows) |
| `research_gaps` | present (0 rows) |
| `research_gap_candidates` | present (0 rows) |
| `research_gap_evidence_links` | present (0 rows) |
| `research_gap_reviews` | present (0 rows) |
| `research_gap_versions` | present (0 rows) |
| `research_search_coverage` | present (0 rows) |
| `research_gap_subscriptions` | present (0 rows) |
| `research_gap_feedback` | present (0 rows) |
| `research_gap_change_events` | present (0 rows) |
| Protected scientific curated rows | No bulk-approve; no invented gap science |

## Safety constraints observed

- Additive DDL only (`CREATE TABLE IF NOT EXISTS` / indexes)
- Host gate: scripts refuse non–`ep-blue-salad`
- Evidence count fail-closed on both scripts
- Strip `--` line comments before forbidden-table regex (avoids 0018-style false positive on safety prose)
- No profile or gap seed; detection remains app-side / reviewer-gated

# Neon 0017 / 0018 apply note

**Date:** 2026-10-30  
**Operator:** Cursor agent (explicit apply request after post–A–F audit D5)  
**Target:** `ep-blue-salad` / `neondb` (from `.env.local` `DATABASE_URL`; password not logged)  
**Git HEAD at push of audit commits:** `67a43bd`  
**Apply follow-up HEAD:** see git log after this note is committed

## Scripts used

| Migration | File | Command |
| --- | --- | --- |
| 0017 | `drizzle/migrations/0017_graph_ontology_and_provenance.sql` | `bun run db:graph-ontology` |
| 0018 | `drizzle/migrations/0018_trial_treatment_line.sql` | `bun run db:trial-treatment-line` |

## Before (read-only check)

| Object | Status |
| --- | --- |
| `ontology_mappings` | missing |
| `graph_provenance_events` | missing |
| `clinical_trials.treatment_line` | absent |
| `trial_arms.treatment_line` | absent |
| `evidence_records` count | **46** |

## Apply result

| Step | Result |
| --- | --- |
| 0017 | **applied** — tables created; `ontology_mappings=0`, `graph_provenance_events=0` (no fabricated ontology seed) |
| 0018 first attempt | **refused** — apply script matched the word `evidence_records` inside a SQL `--` safety comment (false positive) |
| Script fix | Strip `--` line comments before the forbidden-table regex in `scripts/apply-trial-treatment-line-migration.ts` |
| 0018 retry | **applied** — `treatment_line_seeded_trials=2` (fixture text for TR003 / TR020 only); arms with non-null line = 0 |
| `evidence_records` after | **46** (unchanged) |

## After (schema re-verify)

| Object | Status |
| --- | --- |
| `ontology_mappings` | present (0 rows) |
| `graph_provenance_events` | present (0 rows) |
| `clinical_trials.treatment_line` | present (2 non-null from fixture seed) |
| `trial_arms.treatment_line` | present (nullable; 0 non-null) |
| Protected scientific curated rows | No bulk-approve; no invented ontology crosswalks |

## Safety constraints observed

- Additive DDL only (`CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`)
- Host gate: scripts refuse non–`ep-blue-salad`
- Evidence count fail-closed on both scripts
- Ontology mappings left empty by design
- `treatment_line` values only from `MELANOMA_PILOT_TRIALS` fixture curated text

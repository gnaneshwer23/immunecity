# Neon apply — migration 0026 (Evidence Intel 4.0)

**File:** `drizzle/migrations/0026_evidence_intel_4.sql`  
**Script:** `bun run db:evidence-intel-4`  
**Host gate:** `ep-blue-salad` only (same as prior Discovery migrations)

## What it adds

- `research_intel4_decisions` (versioned audit; `auto_approve` CHECK = false)
- `research_intel4_scout_runs` (scout idempotency / provenance)
- Nullable claim verifier columns on `research_gap_evidence_links`

## What it does not do

- No `evidence_records` DML / Gate C approve
- No overwrite of reviewer locks
- No Stripe / TI / Vercel changes

## Apply

```bash
bun run db:evidence-intel-4
```

Expect: `migration=applied`, `evidence_count` unchanged (e.g. 46).

## Status (2026-10-30)

Re-applied / verified on ep-blue-salad: `migration=applied`, `evidence_count=46`, tables `research_intel4_decisions` + `research_intel4_scout_runs` present, claim columns on `research_gap_evidence_links` present. Idempotent re-run is safe (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

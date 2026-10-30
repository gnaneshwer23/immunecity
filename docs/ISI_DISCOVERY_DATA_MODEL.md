# ISI Discovery Intelligence — data model

**Stack:** Neon Postgres + Drizzle (`src/lib/db/schema.server.ts`) + TanStack server functions.  
**Style:** snake_case tables; UUID PKs; `created_at` / `updated_at` timestamptz; text status fields (project convention — same as `evidence_records.curation`); additive migrations only.

## Status taxonomy (gaps)

| Status | Meaning | Auto-emit? |
| --- | --- | --- |
| `candidate` | Detected from real ISI signals; unreviewed | Yes |
| `coverage_insufficient` | ISI search/Gate C signals incomplete — not verified absence | Yes |
| `needs_context` | Reviewer asked for more context | Human only |
| `rejected` | Reviewer rejected as not a gap / out of scope | Human only |
| `reviewed_gap` | Human-confirmed research gap within documented scope | **Human only** |
| `superseded` | Replaced by a newer version / change event | System+human |

Never invent a fifth meaning for “no papers exist worldwide.”

## Migration plan

### 0019 — `research_profiles`

```text
research_profiles
  id UUID PK
  user_id UUID NOT NULL UNIQUE
  display_label TEXT          -- optional short label; not legal name required
  focus_diseases TEXT[]       -- graph concept ids preferred when known
  focus_domains TEXT[]        -- atlas/domain keys
  modalities TEXT[]           -- e.g. checkpoint, cellular, biomarker
  interests_json JSONB        -- free-form preferences (topics, rel types)
  entitlement TEXT NOT NULL DEFAULT 'free'  -- 'free' | 'researcher_pro' stub
  entitlement_notes TEXT      -- ops-only note; never payment tokens
  created_at / updated_at
```

Constraints: one profile per user; arrays length-bounded; entitlement checked server-side.

### 0020 — Discovery gap suite (may ship as one migration)

```text
research_gaps
  id UUID PK
  gap_key TEXT UNIQUE NOT NULL     -- stable deterministic key (e.g. GAP-REL-…)
  title TEXT NOT NULL
  summary TEXT NOT NULL
  status TEXT NOT NULL DEFAULT 'candidate'
  pilot TEXT                       -- 'melanoma_a' | 'coverage_b' | null
  subject_id / object_id / relationship_id TEXT  -- existing graph ids only
  disease_id TEXT
  why_it_matters TEXT
  search_scope_json JSONB NOT NULL -- documented corpus / date / method
  detection_source TEXT NOT NULL   -- matrix | evidence_gap | conflict | trial_signal
  detection_detail JSONB NOT NULL DEFAULT '{}'
  coverage_label TEXT              -- mirrors evidenceGap labels when applicable
  created_by TEXT NOT NULL DEFAULT 'system'
  reviewed_by / reviewed_at
  created_at / updated_at

research_gap_candidates          -- optional staging before upsert into research_gaps
  id UUID PK
  gap_key TEXT NOT NULL
  payload_json JSONB NOT NULL
  emitted_at TIMESTAMPTZ
  ingested_gap_id UUID             -- null until accepted into research_gaps

research_gap_evidence_links
  id UUID PK
  gap_id UUID NOT NULL
  evidence_id TEXT                 -- must exist in evidence_records when set
  relationship_id TEXT
  pmid TEXT / doi TEXT             -- only when already known in ISI — never fabricate
  link_role TEXT                   -- supports_uncertainty | conflicting | background
  created_at

research_gap_reviews
  id UUID PK
  gap_id UUID NOT NULL
  actor TEXT NOT NULL
  decision TEXT NOT NULL           -- promote_reviewed | reject | needs_context | demote
  rationale TEXT NOT NULL
  previous_status / new_status TEXT NOT NULL
  created_at

research_gap_versions
  id UUID PK
  gap_id UUID NOT NULL
  version_n INTEGER NOT NULL
  snapshot_json JSONB NOT NULL
  created_at

research_search_coverage
  id UUID PK
  gap_id UUID                      -- nullable for concept-level runs
  concept_id / relationship_id TEXT
  search_attempted BOOLEAN NOT NULL DEFAULT false
  hit_count INTEGER                -- null = unknown (never coerce to 0)
  query_text TEXT
  scope_note TEXT NOT NULL
  ran_at TIMESTAMPTZ

research_gap_subscriptions
  id UUID PK
  user_id UUID NOT NULL
  gap_id UUID NOT NULL
  channel TEXT NOT NULL DEFAULT 'in_app'  -- email deferred
  created_at
  UNIQUE(user_id, gap_id, channel)

research_gap_feedback
  id UUID PK
  gap_id UUID NOT NULL
  user_id UUID NOT NULL
  rating TEXT                      -- useful | not_relevant | unclear
  comment TEXT
  created_at

research_gap_change_events
  id UUID PK
  gap_id UUID
  event_type TEXT NOT NULL         -- status_change | evidence_linked | detection_rerun
  detail JSONB NOT NULL DEFAULT '{}'
  actor TEXT NOT NULL DEFAULT 'system'
  created_at
```

## TypeScript conventions

- Mirror tables in `schema.server.ts` with camelCase columns → snake SQL.  
- Browser-safe types in `src/lib/discovery/*.ts` (no DB imports).  
- Server mutations in `src.discovery.functions.ts` / `src/lib/discovery/*.functions.ts` with Zod + `requireNeonAuth`.

## Seed policy

- **Zero fabricated gaps.**  
- Optional: materialise melanoma matrix DEFECT / Unverified rows as `candidate` with `detection_source = 'melanoma_matrix'` and explicit `search_scope_json` noting “ISI matrix audit only — not literature exhaustive.”  
- Never seed `reviewed_gap`.

## Apply notes

Follow `docs/ISI_NEON_0017_0018_APPLY.md` style for documenting apply on Neon; do not claim applied until ops runs DDL. Code must tolerate missing relations (same pattern as collections).

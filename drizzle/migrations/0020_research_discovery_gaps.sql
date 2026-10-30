-- Discovery Intelligence Phase 2 — research gaps suite (additive).
-- Candidates only from real ISI signals. Never auto-promote to reviewed_gap.
-- Missing ISI coverage ≠ worldwide literature absence.
-- Does not expand kg.json / extensions.ts and does not auto-approve evidence.

CREATE TABLE IF NOT EXISTS public.research_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_key TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'candidate',
  pilot TEXT,
  subject_id TEXT,
  object_id TEXT,
  relationship_id TEXT,
  disease_id TEXT,
  why_it_matters TEXT,
  search_scope_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  detection_source TEXT NOT NULL,
  detection_detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  coverage_label TEXT,
  created_by TEXT NOT NULL DEFAULT 'system',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_gaps_gap_key_uniq UNIQUE (gap_key),
  CONSTRAINT research_gaps_title_len CHECK (char_length(title) BETWEEN 1 AND 240),
  CONSTRAINT research_gaps_summary_len CHECK (char_length(summary) BETWEEN 1 AND 4000),
  CONSTRAINT research_gaps_status_chk CHECK (
    status IN (
      'candidate',
      'coverage_insufficient',
      'needs_context',
      'rejected',
      'reviewed_gap',
      'superseded'
    )
  )
);

CREATE INDEX IF NOT EXISTS research_gaps_status_idx
  ON public.research_gaps (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS research_gaps_rel_idx
  ON public.research_gaps (relationship_id);
CREATE INDEX IF NOT EXISTS research_gaps_disease_idx
  ON public.research_gaps (disease_id);

CREATE TABLE IF NOT EXISTS public.research_gap_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_key TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  emitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ingested_gap_id UUID
);

CREATE INDEX IF NOT EXISTS research_gap_candidates_key_idx
  ON public.research_gap_candidates (gap_key, emitted_at DESC);

CREATE TABLE IF NOT EXISTS public.research_gap_evidence_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_id UUID NOT NULL,
  evidence_id TEXT,
  relationship_id TEXT,
  pmid TEXT,
  doi TEXT,
  link_role TEXT NOT NULL DEFAULT 'background',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_gap_evidence_links_role_chk CHECK (
    link_role IN ('supports_uncertainty', 'conflicting', 'background')
  )
);

CREATE INDEX IF NOT EXISTS research_gap_evidence_links_gap_idx
  ON public.research_gap_evidence_links (gap_id);

CREATE TABLE IF NOT EXISTS public.research_gap_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_id UUID NOT NULL,
  actor TEXT NOT NULL,
  decision TEXT NOT NULL,
  rationale TEXT NOT NULL,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_gap_reviews_decision_chk CHECK (
    decision IN ('promote_reviewed', 'reject', 'needs_context', 'demote')
  )
);

CREATE INDEX IF NOT EXISTS research_gap_reviews_gap_idx
  ON public.research_gap_reviews (gap_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.research_gap_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_id UUID NOT NULL,
  version_n INTEGER NOT NULL,
  snapshot_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_gap_versions_uniq UNIQUE (gap_id, version_n)
);

CREATE TABLE IF NOT EXISTS public.research_search_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_id UUID,
  concept_id TEXT,
  relationship_id TEXT,
  search_attempted BOOLEAN NOT NULL DEFAULT false,
  hit_count INTEGER,
  query_text TEXT,
  scope_note TEXT NOT NULL,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS research_search_coverage_gap_idx
  ON public.research_search_coverage (gap_id);

CREATE TABLE IF NOT EXISTS public.research_gap_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  gap_id UUID NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_gap_subscriptions_uniq UNIQUE (user_id, gap_id, channel),
  CONSTRAINT research_gap_subscriptions_channel_chk CHECK (channel IN ('in_app', 'email_deferred'))
);

CREATE TABLE IF NOT EXISTS public.research_gap_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rating TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_gap_feedback_rating_chk CHECK (
    rating IS NULL OR rating IN ('useful', 'not_relevant', 'unclear')
  )
);

CREATE INDEX IF NOT EXISTS research_gap_feedback_gap_idx
  ON public.research_gap_feedback (gap_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.research_gap_change_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_id UUID,
  event_type TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS research_gap_change_events_gap_idx
  ON public.research_gap_change_events (gap_id, created_at DESC);

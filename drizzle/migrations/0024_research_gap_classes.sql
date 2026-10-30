-- Discovery Intelligence 3.0 — gap class taxonomy (additive, reversible).
-- Separates isi_curation_gap | scientific_evidence_gap | research_opportunity
-- from review status. Does not auto-promote reviewed_gap / reviewed_opportunity.
-- Does not destroy existing gap rows; provenance stays in versions/change_events.

ALTER TABLE public.research_gaps
  ADD COLUMN IF NOT EXISTS gap_class TEXT;

ALTER TABLE public.research_gaps
  ADD COLUMN IF NOT EXISTS opportunity_status TEXT NOT NULL DEFAULT 'none';

ALTER TABLE public.research_gaps
  ADD COLUMN IF NOT EXISTS opportunity_rationale TEXT;

ALTER TABLE public.research_gaps
  ADD COLUMN IF NOT EXISTS novelty_note TEXT;

ALTER TABLE public.research_gaps
  ADD COLUMN IF NOT EXISTS feasibility_note TEXT;

ALTER TABLE public.research_gaps
  ADD COLUMN IF NOT EXISTS class_reason TEXT;

ALTER TABLE public.research_gaps
  ADD COLUMN IF NOT EXISTS class_assigned_at TIMESTAMPTZ;

-- Soft CHECK via constraint only when column non-null (existing rows may be null until backfill).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'research_gaps_gap_class_chk'
  ) THEN
    ALTER TABLE public.research_gaps
      ADD CONSTRAINT research_gaps_gap_class_chk
      CHECK (
        gap_class IS NULL OR gap_class IN (
          'isi_curation_gap',
          'scientific_evidence_gap',
          'research_opportunity'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'research_gaps_opportunity_status_chk'
  ) THEN
    ALTER TABLE public.research_gaps
      ADD CONSTRAINT research_gaps_opportunity_status_chk
      CHECK (
        opportunity_status IN (
          'none',
          'draft',
          'assessed',
          'reviewed_opportunity',
          'rejected_opportunity'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS research_gaps_gap_class_idx
  ON public.research_gaps (gap_class, status, updated_at DESC);

-- Class change audit (append-only); does not rewrite prior rows.
CREATE TABLE IF NOT EXISTS public.research_gap_class_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_id UUID NOT NULL,
  gap_key TEXT NOT NULL,
  previous_class TEXT,
  new_class TEXT NOT NULL,
  previous_opportunity_status TEXT,
  new_opportunity_status TEXT NOT NULL DEFAULT 'none',
  reason TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'system',
  review_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS research_gap_class_history_gap_idx
  ON public.research_gap_class_history (gap_id, created_at DESC);

-- Retrieval hit persistence (bounded pilots) — real identifiers only.
ALTER TABLE public.research_gap_evidence_links
  ADD COLUMN IF NOT EXISTS nct_id TEXT;

ALTER TABLE public.research_gap_evidence_links
  ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE public.research_gap_evidence_links
  ADD COLUMN IF NOT EXISTS source TEXT;

ALTER TABLE public.research_gap_evidence_links
  ADD COLUMN IF NOT EXISTS abstract_available BOOLEAN;

ALTER TABLE public.research_gap_evidence_links
  ADD COLUMN IF NOT EXISTS full_text_available BOOLEAN;

ALTER TABLE public.research_gap_evidence_links
  ADD COLUMN IF NOT EXISTS coverage_from DATE;

ALTER TABLE public.research_gap_evidence_links
  ADD COLUMN IF NOT EXISTS coverage_to DATE;

ALTER TABLE public.research_gap_evidence_links
  ADD COLUMN IF NOT EXISTS exclusion_reason TEXT;

ALTER TABLE public.research_gap_evidence_links
  ADD COLUMN IF NOT EXISTS provenance_json JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'research_gap_evidence_links_role_chk_v2'
  ) THEN
    -- Keep existing role check; extend allowed roles via drop+add if present.
    ALTER TABLE public.research_gap_evidence_links
      DROP CONSTRAINT IF EXISTS research_gap_evidence_links_role_chk;
    ALTER TABLE public.research_gap_evidence_links
      ADD CONSTRAINT research_gap_evidence_links_role_chk
      CHECK (
        link_role IN (
          'supports_uncertainty',
          'conflicting',
          'background',
          'retrieved_hit',
          'excluded_hit',
          'trial_hit'
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.research_gaps.gap_class IS
  'isi_curation_gap | scientific_evidence_gap | research_opportunity — orthogonal to status';
COMMENT ON COLUMN public.research_gaps.opportunity_status IS
  'none|draft|assessed|reviewed_opportunity|rejected_opportunity — human review required for reviewed_opportunity';

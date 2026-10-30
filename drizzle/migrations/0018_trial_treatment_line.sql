-- Phase E — Persist curated treatment_line on melanoma pilot trials/arms.
-- Additive only. Does not invent lines (values seeded from fixture curated text).
-- Does not alter evidence_records, roles, community, or biomarker assay tables.
-- 0015 remains the CREATE; this migration only ADD COLUMN IF NOT EXISTS.

ALTER TABLE public.clinical_trials
  ADD COLUMN IF NOT EXISTS treatment_line TEXT;

ALTER TABLE public.trial_arms
  ADD COLUMN IF NOT EXISTS treatment_line TEXT;

COMMENT ON COLUMN public.clinical_trials.treatment_line IS
  'Curated treatment-line / prior-therapy facet from fixture seed — never regex-inferred.';

COMMENT ON COLUMN public.trial_arms.treatment_line IS
  'Optional arm-level treatment-line overlay; null when only trial-level is curated.';

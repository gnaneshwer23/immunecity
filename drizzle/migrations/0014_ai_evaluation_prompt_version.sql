-- Additive: store Ask PROMPT_VERSION with gate outcomes for quality dashboard rates.
-- Does not store question text. Safe to re-run (IF NOT EXISTS column via DO block).

ALTER TABLE public.ai_evaluation_runs
  ADD COLUMN IF NOT EXISTS prompt_version TEXT NOT NULL DEFAULT 'unknown';

CREATE INDEX IF NOT EXISTS ai_evaluation_runs_prompt_version_idx
  ON public.ai_evaluation_runs (prompt_version, created_at DESC);

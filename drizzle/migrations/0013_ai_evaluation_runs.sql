-- Ask gate outcomes. Additive. Stores an outcome, a reason code, and a redacted flag.
-- Does not alter curated citation rows, role rows, or graph nodes.

CREATE TABLE IF NOT EXISTS public.ai_evaluation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome TEXT NOT NULL CHECK (outcome IN ('allowed', 'abstained', 'citation_rejected', 'conflict', 'context_mismatch')),
  reason_code TEXT NOT NULL,
  question_redacted BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_evaluation_runs_created_idx
  ON public.ai_evaluation_runs (created_at DESC);

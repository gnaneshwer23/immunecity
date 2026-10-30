-- Evidence Intel 4.0 — additive decision audit + scout run logs.
-- Does not touch evidence_records / Gate C. Preserves reviewer locks.
-- Idempotent-friendly IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS public.research_intel4_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_id UUID REFERENCES public.research_gaps(id) ON DELETE SET NULL,
  gap_key TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '4.0.0',
  decision_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  summary TEXT NOT NULL,
  auto_approve BOOLEAN NOT NULL DEFAULT FALSE,
  sme_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_intel4_decisions_type_chk CHECK (
    decision_type IN (
      'scout',
      'verify',
      'cross_examine',
      'gap_emit',
      'route',
      'integrate'
    )
  ),
  CONSTRAINT research_intel4_decisions_no_auto_approve_chk CHECK (auto_approve = FALSE)
);

CREATE UNIQUE INDEX IF NOT EXISTS research_intel4_decisions_idempotency_uidx
  ON public.research_intel4_decisions (idempotency_key);

CREATE INDEX IF NOT EXISTS research_intel4_decisions_gap_key_idx
  ON public.research_intel4_decisions (gap_key, created_at DESC);

CREATE TABLE IF NOT EXISTS public.research_intel4_scout_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_key TEXT NOT NULL,
  strategy_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  works_count INTEGER NOT NULL DEFAULT 0,
  hit_count_known BOOLEAN NOT NULL DEFAULT FALSE,
  total_hits INTEGER,
  scope_note TEXT NOT NULL,
  licensing_note TEXT,
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS research_intel4_scout_runs_idempotency_uidx
  ON public.research_intel4_scout_runs (idempotency_key);

COMMENT ON TABLE public.research_intel4_decisions IS
  'Evidence Intel 4.0 versioned decisions — never auto Gate C / reviewed_opportunity';
COMMENT ON TABLE public.research_intel4_scout_runs IS
  'Literature scout run provenance + idempotency; hit_count null means unknown not zero';

-- Optional claim-verifier columns on evidence links (additive; nullable).
ALTER TABLE public.research_gap_evidence_links
  ADD COLUMN IF NOT EXISTS claim_classification TEXT;

ALTER TABLE public.research_gap_evidence_links
  ADD COLUMN IF NOT EXISTS claim_directness TEXT;

ALTER TABLE public.research_gap_evidence_links
  ADD COLUMN IF NOT EXISTS claim_abstained BOOLEAN;

ALTER TABLE public.research_gap_evidence_links
  ADD COLUMN IF NOT EXISTS intel4_version TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'research_gap_evidence_links_claim_classification_chk'
  ) THEN
    ALTER TABLE public.research_gap_evidence_links
      ADD CONSTRAINT research_gap_evidence_links_claim_classification_chk
      CHECK (
        claim_classification IS NULL OR claim_classification IN (
          'support',
          'contradict',
          'background',
          'insufficient'
        )
      );
  END IF;
END $$;

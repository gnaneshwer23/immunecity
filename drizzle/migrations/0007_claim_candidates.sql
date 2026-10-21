-- Layer B claim ledger scaffolding (additive).
-- Local workbench claims remain primary; this table is optional durable storage.
-- Never auto-promote rows to Gate C / evidence_records.approved.
-- Neon apply: only after owner approval (prefer prepare_database_migration on a temp branch).

CREATE TABLE IF NOT EXISTS public.claim_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id TEXT NOT NULL UNIQUE,
  assertion TEXT NOT NULL,
  subject_id TEXT,
  predicate TEXT,
  object_id TEXT,
  polarity TEXT NOT NULL DEFAULT 'unassessed',
  evidence_type TEXT NOT NULL DEFAULT 'unspecified',
  context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  passage_span TEXT,
  source_pmid TEXT,
  source_doi TEXT,
  lifecycle TEXT NOT NULL DEFAULT 'candidate',
  mapped_relationship_id TEXT,
  extraction_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS claim_candidates_lifecycle_idx
  ON public.claim_candidates (lifecycle);

CREATE INDEX IF NOT EXISTS claim_candidates_mapped_rel_idx
  ON public.claim_candidates (mapped_relationship_id)
  WHERE mapped_relationship_id IS NOT NULL;

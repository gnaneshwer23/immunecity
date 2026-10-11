ALTER TABLE public.evidence_records ADD COLUMN IF NOT EXISTS relationship_id text;
ALTER TABLE public.evidence_records ADD COLUMN IF NOT EXISTS claim_support text NOT NULL DEFAULT 'unassessed';
ALTER TABLE public.evidence_records ADD COLUMN IF NOT EXISTS reviewed_by text;
ALTER TABLE public.evidence_records ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.evidence_records ADD CONSTRAINT evidence_claim_support_chk CHECK (claim_support IN ('unassessed','supports','partial','contradicts','unrelated'));
CREATE INDEX IF NOT EXISTS evidence_records_relationship_idx ON public.evidence_records (relationship_id);
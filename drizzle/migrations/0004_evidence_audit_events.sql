-- Append-only curation audit events (IC-02). Neon applies via drizzle/neon/0000_* (idempotent).
CREATE TABLE IF NOT EXISTS public.evidence_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_record_id UUID NOT NULL REFERENCES public.evidence_records(id) ON DELETE CASCADE,
  evidence_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  reason TEXT NOT NULL,
  previous_state JSONB NOT NULL,
  new_state JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_audit_events_record_idx
  ON public.evidence_audit_events (evidence_record_id, created_at DESC);

-- ISI-002 defence: deleting an evidence_records row must not silently wipe audit history.
-- App code has no evidence DELETE path; RESTRICT fails closed if SQL DELETE is attempted.
-- Neon apply: run after 0004_evidence_audit_events.sql (idempotent via DROP/ADD).

ALTER TABLE public.evidence_audit_events
  DROP CONSTRAINT IF EXISTS evidence_audit_events_evidence_record_id_fkey;

ALTER TABLE public.evidence_audit_events
  ADD CONSTRAINT evidence_audit_events_evidence_record_id_fkey
  FOREIGN KEY (evidence_record_id)
  REFERENCES public.evidence_records(id)
  ON DELETE RESTRICT;

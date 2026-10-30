-- SME review workspace — gold labels + work-item audit (additive).
-- Does not approve Gate C, rematch KEYNOTE silently, invent PMIDs, or enable Trial Intelligence.
-- Scores / labels stay null until a scientific reviewer fills them.

CREATE TABLE IF NOT EXISTS public.sme_gold_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id TEXT NOT NULL,
  work_item_id TEXT,
  gap_key TEXT,
  label TEXT,
  sme_score DOUBLE PRECISION,
  notes TEXT,
  reviewer TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sme_gold_labels_case_id_uniq UNIQUE (case_id),
  CONSTRAINT sme_gold_labels_label_chk CHECK (
    label IS NULL OR label IN (
      'genuine_gap',
      'false_novelty',
      'contradiction_with_context',
      'coverage_insufficient',
      'spo_mismatch',
      'wrong_citation',
      'acceptable_associative',
      'needs_rewrite'
    )
  ),
  CONSTRAINT sme_gold_labels_score_chk CHECK (
    sme_score IS NULL OR (sme_score >= 0 AND sme_score <= 1)
  )
);

CREATE INDEX IF NOT EXISTS sme_gold_labels_pending_idx
  ON public.sme_gold_labels (label, reviewed_at)
  WHERE label IS NULL;

CREATE TABLE IF NOT EXISTS public.sme_work_item_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id TEXT NOT NULL,
  relationship_id TEXT,
  evidence_id TEXT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  rationale TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sme_work_item_events_action_chk CHECK (
    action IN ('approve', 'reject', 'request_changes', 'rematch_citation')
  )
);

CREATE INDEX IF NOT EXISTS sme_work_item_events_item_idx
  ON public.sme_work_item_events (work_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sme_work_item_events_rel_idx
  ON public.sme_work_item_events (relationship_id, created_at DESC);

-- HSI Discovery Gate C human decisions — ISI product Neon (autumn-snow) only.
-- Never auto-approve. Never flip hsiGrade. Not CDS / PHI.
-- Does NOT touch HSI red-wave substrate tables.

CREATE TABLE IF NOT EXISTS public.hsi_gate_c_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_id text NOT NULL,
  claim_id text NOT NULL,
  isi_relationship_id text,
  pmid text,
  doi text,
  spo_note text,
  assertion text,
  pin_source text NOT NULL DEFAULT 'hsi-discovery',
  status text NOT NULL DEFAULT 'pending',
  decision text,
  reviewer_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  auto_approve boolean NOT NULL DEFAULT false,
  hsi_grade_flipped boolean NOT NULL DEFAULT false,
  previous_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hsi_gate_c_decisions_auto_approve_false CHECK (auto_approve = false),
  CONSTRAINT hsi_gate_c_decisions_no_grade_flip CHECK (hsi_grade_flipped = false),
  CONSTRAINT hsi_gate_c_decisions_status_chk CHECK (
    status IN (
      'pending',
      'in_review',
      'human_approved',
      'human_rejected',
      'deferred'
    )
  ),
  CONSTRAINT hsi_gate_c_decisions_decision_chk CHECK (
    decision IS NULL OR decision IN ('approve', 'reject', 'defer')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS hsi_gate_c_decisions_edge_uidx
  ON public.hsi_gate_c_decisions (edge_id);

CREATE INDEX IF NOT EXISTS hsi_gate_c_decisions_status_idx
  ON public.hsi_gate_c_decisions (status);

COMMENT ON TABLE public.hsi_gate_c_decisions IS
  'Human Gate C decisions for HSI Discovery checklist rows. ISI autumn-snow only; auto_approve forced false; does not flip hsiGrade.';

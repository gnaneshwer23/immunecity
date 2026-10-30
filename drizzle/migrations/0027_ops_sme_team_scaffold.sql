-- Ops / SME / Team scaffolding (additive).
-- Extends SME gold label CHECK + work-item actions; adds team membership tables.
-- Does NOT invent gold labels, approve Gate C, enable TI, or activate Stripe/Team billing.

-- SME gold labels: align Neon CHECK with TS SME_GOLD_LABELS (including Discovery eval slots).
ALTER TABLE public.sme_gold_labels
  DROP CONSTRAINT IF EXISTS sme_gold_labels_label_chk;

ALTER TABLE public.sme_gold_labels
  ADD CONSTRAINT sme_gold_labels_label_chk CHECK (
    label IS NULL OR label IN (
      'genuine_gap',
      'false_novelty',
      'contradiction_with_context',
      'coverage_insufficient',
      'spo_mismatch',
      'wrong_citation',
      'acceptable_associative',
      'needs_rewrite',
      'genuine',
      'false',
      'resolved',
      'contradiction',
      'incomplete_retrieval'
    )
  );

ALTER TABLE public.sme_work_item_events
  DROP CONSTRAINT IF EXISTS sme_work_item_events_action_chk;

ALTER TABLE public.sme_work_item_events
  ADD CONSTRAINT sme_work_item_events_action_chk CHECK (
    action IN (
      'approve',
      'reject',
      'request_changes',
      'rematch_citation',
      'spo_rewrite_proposal'
    )
  );

-- Team collab scaffolding — membership / invites only. Billing stays inactive.
CREATE TABLE IF NOT EXISTS public.research_team_orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.research_team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.research_team_orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role_hint TEXT NOT NULL DEFAULT 'viewer',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_team_memberships_role_chk CHECK (
    role_hint IN ('viewer', 'editor', 'admin')
  ),
  CONSTRAINT research_team_memberships_status_chk CHECK (
    status IN ('active', 'removed')
  ),
  CONSTRAINT research_team_memberships_uniq UNIQUE (org_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.research_team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.research_team_orgs(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  role_hint TEXT NOT NULL DEFAULT 'viewer',
  status TEXT NOT NULL DEFAULT 'draft_pending',
  invited_by TEXT NOT NULL,
  would_send BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_team_invites_role_chk CHECK (
    role_hint IN ('viewer', 'editor', 'admin')
  ),
  CONSTRAINT research_team_invites_status_chk CHECK (
    status IN ('draft_pending', 'accepted', 'revoked', 'expired')
  )
);

CREATE INDEX IF NOT EXISTS research_team_memberships_user_idx
  ON public.research_team_memberships (user_id);

CREATE INDEX IF NOT EXISTS research_team_invites_org_idx
  ON public.research_team_invites (org_id, created_at DESC);

COMMENT ON TABLE public.research_team_invites IS
  'Team invite drafts — would_send stays false until email + Team billing activated. Scaffolding only.';

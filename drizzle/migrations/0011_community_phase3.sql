-- Phase 3 community leftovers. Additive.
-- Does not alter curated evidence, role rows, or graph nodes.
-- Credential status has no verified value: this app does not check credentials.
-- Journal clubs reuse community_posts (kind journal_club) and community_comments.

ALTER TABLE public.community_profiles
  ADD COLUMN IF NOT EXISTS credential TEXT,
  ADD COLUMN IF NOT EXISTS credential_status TEXT NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS notifications_paused BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  ALTER TABLE public.community_profiles
    ADD CONSTRAINT community_profiles_credential_chk CHECK (credential_status = 'unverified');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS community_posts_kind_chk;
ALTER TABLE public.community_posts
  ADD CONSTRAINT community_posts_kind_chk
  CHECK (kind IN ('question', 'discussion', 'paper', 'hypothesis', 'resource', 'journal_club'));

CREATE TABLE IF NOT EXISTS public.community_post_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  editor_id UUID NOT NULL,
  previous_body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_post_revisions_post_idx
  ON public.community_post_revisions (post_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.community_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id),
  CONSTRAINT community_saves_target_chk CHECK (target_type IN ('post', 'comment'))
);

CREATE TABLE IF NOT EXISTS public.community_post_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  appellant_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  decision_reason TEXT,
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT community_appeals_target_chk CHECK (target_type IN ('post', 'comment')),
  CONSTRAINT community_appeals_status_chk CHECK (status IN ('open', 'upheld', 'restored'))
);

CREATE UNIQUE INDEX IF NOT EXISTS community_appeals_open_unique
  ON public.community_appeals (appellant_id, target_type, target_id)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS community_appeals_status_idx
  ON public.community_appeals (status, created_at);

CREATE TABLE IF NOT EXISTS public.community_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  href TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT community_notifications_kind_chk CHECK (kind IN ('post_reply', 'appeal_decision'))
);

CREATE INDEX IF NOT EXISTS community_notifications_user_idx
  ON public.community_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS community_notifications_unread_idx
  ON public.community_notifications (user_id)
  WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS public.community_journal_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.community_topics(id) ON DELETE CASCADE,
  post_id UUID NOT NULL UNIQUE REFERENCES public.community_posts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  agenda TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  facilitator_id UUID NOT NULL,
  pmid TEXT,
  doi TEXT,
  paper_status TEXT NOT NULL DEFAULT 'unverified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT community_journal_clubs_paper_chk CHECK (paper_status IN ('unverified', 'matched'))
);

CREATE INDEX IF NOT EXISTS community_journal_clubs_topic_idx
  ON public.community_journal_clubs (topic_id, scheduled_at);

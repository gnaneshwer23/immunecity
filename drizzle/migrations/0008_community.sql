-- Community MVP tables only.
-- Additive. Does not alter curated evidence, roles, or graph nodes.
-- A resolved DOI/PMID is metadata. verification_status stays unverified when lookup fails.
-- Entity links store an existing concept id. They do not insert graph nodes.

CREATE TABLE IF NOT EXISTS public.community_profiles (
  user_id UUID PRIMARY KEY,
  display_name TEXT NOT NULL,
  bio TEXT,
  interests TEXT[] NOT NULL DEFAULT '{}',
  affiliation TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT community_profiles_visibility_chk CHECK (visibility IN ('public', 'members'))
);

CREATE TABLE IF NOT EXISTS public.community_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.community_topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  membership_role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (topic_id, user_id),
  CONSTRAINT community_memberships_role_chk CHECK (membership_role IN ('member', 'moderator'))
);

CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.community_topics(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT community_posts_kind_chk CHECK (kind IN ('question', 'discussion', 'paper', 'hypothesis', 'resource')),
  CONSTRAINT community_posts_status_chk CHECK (status IN ('visible', 'hidden'))
);

CREATE TABLE IF NOT EXISTS public.community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT community_comments_status_chk CHECK (status IN ('visible', 'hidden'))
);

CREATE TABLE IF NOT EXISTS public.community_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  pmid TEXT,
  doi TEXT,
  title TEXT,
  journal TEXT,
  year TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  verification_detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT community_references_id_chk CHECK (pmid IS NOT NULL OR doi IS NOT NULL),
  CONSTRAINT community_references_status_chk CHECK (verification_status IN ('unverified', 'matched', 'verified'))
);

CREATE TABLE IF NOT EXISTS public.community_entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, concept_id)
);

CREATE TABLE IF NOT EXISTS public.community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT community_reports_target_chk CHECK (target_type IN ('post', 'comment')),
  CONSTRAINT community_reports_status_chk CHECK (status IN ('open', 'resolved'))
);

CREATE TABLE IF NOT EXISTS public.community_moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  moderator_id UUID NOT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT community_moderation_action_chk CHECK (action IN ('hide', 'restore')),
  CONSTRAINT community_moderation_target_chk CHECK (target_type IN ('post', 'comment'))
);

CREATE INDEX IF NOT EXISTS community_posts_topic_status_idx
  ON public.community_posts (topic_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS community_comments_post_idx
  ON public.community_comments (post_id, status, created_at);

CREATE INDEX IF NOT EXISTS community_entity_links_concept_idx
  ON public.community_entity_links (concept_id);

CREATE INDEX IF NOT EXISTS community_reports_status_idx
  ON public.community_reports (status, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS community_reports_open_unique
  ON public.community_reports (reporter_id, target_type, target_id)
  WHERE status = 'open';

INSERT INTO public.community_topics (slug, title, description, sort_order) VALUES
  ('immunology-basics', 'Immunology basics', 'A place for foundational questions about cells, recognition and tolerance. Posts are community discussion, not reviewed evidence.', 1),
  ('autoimmunity', 'Autoimmunity', 'Discussion of autoimmune mechanisms and the limits of the teaching model. Not clinical advice.', 2),
  ('cancer', 'Cancer immunology', 'Conversation about tumour-immunity concepts already in the atlas. Not treatment recommendations.', 3),
  ('infection-vaccines', 'Infection and vaccines', 'Questions about host defence and how vaccines are represented in the educational graph. Not personal medical advice.', 4),
  ('microbiome', 'Microbiome', 'Discussion of host-microbe immunology as a topic area. Posts are not added to the knowledge graph.', 5),
  ('computational-immunology', 'Computational immunology', 'Methods talk for models, graphs and simulations. Outputs are educational, not patient predictions.', 6),
  ('methods', 'Methods', 'How this atlas cites, reviews and limits evidence. Process discussion only. Posting here does not approve a claim.', 7)
ON CONFLICT (slug) DO NOTHING;

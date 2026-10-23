-- Signed-in Academy progress. Additive.
-- Does not alter curated evidence, roles, or graph nodes.

CREATE TABLE IF NOT EXISTS public.academy_member_progress (
  user_id UUID PRIMARY KEY,
  progress JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

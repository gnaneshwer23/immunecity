-- Concept saves for My Workspace. Additive.
-- A row stores a member id and a concept id that already exists in the graph.
-- Does not alter curated citation rows, role rows, community posts, or graph nodes.

CREATE TABLE IF NOT EXISTS public.concept_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  concept_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, concept_id)
);

CREATE INDEX IF NOT EXISTS concept_saves_user_idx
  ON public.concept_saves (user_id, created_at DESC);

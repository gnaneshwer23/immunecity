-- Discovery Intelligence Phase 1 — research profiles (additive).
-- One profile per signed-in member. No sensitive PII required.
-- Entitlement is a server-checked stub (free | researcher_pro); no Stripe / payment activation.
-- Does not alter evidence_records, roles, community, trials, or the curated graph JSON.

CREATE TABLE IF NOT EXISTS public.research_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  display_label TEXT,
  focus_diseases TEXT[] NOT NULL DEFAULT '{}',
  focus_domains TEXT[] NOT NULL DEFAULT '{}',
  modalities TEXT[] NOT NULL DEFAULT '{}',
  interests_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  entitlement TEXT NOT NULL DEFAULT 'free',
  entitlement_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_profiles_user_uniq UNIQUE (user_id),
  CONSTRAINT research_profiles_label_len CHECK (display_label IS NULL OR char_length(display_label) BETWEEN 1 AND 80),
  CONSTRAINT research_profiles_diseases_len CHECK (cardinality(focus_diseases) <= 20),
  CONSTRAINT research_profiles_domains_len CHECK (cardinality(focus_domains) <= 20),
  CONSTRAINT research_profiles_modalities_len CHECK (cardinality(modalities) <= 20),
  CONSTRAINT research_profiles_entitlement_chk CHECK (entitlement IN ('free', 'researcher_pro'))
);

CREATE INDEX IF NOT EXISTS research_profiles_user_idx
  ON public.research_profiles (user_id);

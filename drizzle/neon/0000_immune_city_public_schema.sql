-- Neon-adapted public schema for Immune City.
-- The Supabase drizzle migrations (0000–0003) reference auth.users, auth.uid(),
-- and roles anon/authenticated/service_role — those do not exist on Neon.
-- Apply this file to Neon instead. Keep 0000–0003 for Lovable/Supabase history.
--
-- Auth: Neon Managed Better Auth (neon_auth.*). Roles: public.user_roles + has_role.
-- Admin is NEVER auto-granted on signup (0003 semantics). Provision explicitly:
--   INSERT INTO public.user_roles (user_id, role) VALUES ('<neon_auth.user.id>', 'admin')
--   ON CONFLICT (user_id, role) DO NOTHING;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- New Neon Auth users get the 'user' role only (explicit admin provisioning).
CREATE OR REPLACE FUNCTION public.assign_initial_role_neon()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_neon_auth_user_created_role ON neon_auth."user";
CREATE TRIGGER on_neon_auth_user_created_role
  AFTER INSERT ON neon_auth."user"
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_initial_role_neon();

CREATE TABLE IF NOT EXISTS public.evidence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id TEXT NOT NULL UNIQUE,
  node_id TEXT NOT NULL,
  node_name TEXT NOT NULL,
  node_type TEXT NOT NULL,
  source_type TEXT,
  source_ref TEXT,
  pmid TEXT,
  doi TEXT,
  search_query TEXT,
  manifest_status TEXT NOT NULL DEFAULT 'RESEARCH_REQUIRED',
  check_status TEXT NOT NULL DEFAULT 'pending',
  check_detail JSONB,
  checked_at TIMESTAMPTZ,
  curation TEXT NOT NULL DEFAULT 'unreviewed',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  relationship_id TEXT,
  claim_support TEXT NOT NULL DEFAULT 'unassessed',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  CONSTRAINT evidence_claim_support_chk CHECK (
    claim_support IN ('unassessed', 'supports', 'partial', 'contradicts', 'unrelated')
  )
);

CREATE INDEX IF NOT EXISTS evidence_records_relationship_idx
  ON public.evidence_records (relationship_id);

-- Append-only curation audit (IC-02 / ISI-002). No app DELETE; FK RESTRICT retains history.
CREATE TABLE IF NOT EXISTS public.evidence_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_record_id UUID NOT NULL REFERENCES public.evidence_records(id) ON DELETE RESTRICT,
  evidence_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  reason TEXT NOT NULL,
  previous_state JSONB NOT NULL,
  new_state JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_audit_events_record_idx
  ON public.evidence_audit_events (evidence_record_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS evidence_touch ON public.evidence_records;
CREATE TRIGGER evidence_touch
  BEFORE UPDATE ON public.evidence_records
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

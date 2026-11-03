-- Private research investigations. Product DB only; no patient or clinical tables.
CREATE SCHEMA IF NOT EXISTS public;
CREATE TABLE IF NOT EXISTS public.hsi_investigations (
 owner_id text NOT NULL, investigation_key text NOT NULL,
 revision integer NOT NULL CHECK (revision>0),
 state text NOT NULL CHECK (state IN ('pending','running','failed','awaiting_human_review','partial','completed')),
 data_class text NOT NULL CHECK (data_class IN ('synthetic','public_real','licensed_real')),
 question text NOT NULL CHECK (length(question) BETWEEN 1 AND 4000),
 snapshot jsonb NOT NULL CHECK (octet_length(snapshot::text)<=4000000),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id,investigation_key),
 CHECK (snapshot @> '{"version":"hsi-investigation-1","bundle":{"containsPhi":false,"clinicalAdvice":false,"kgWrite":false}}'::jsonb),
 CHECK (snapshot ? 'revision' AND snapshot->>'revision'=revision::text)
);
CREATE INDEX IF NOT EXISTS hsi_investigations_owner_page ON public.hsi_investigations(owner_id,created_at DESC,investigation_key DESC);
CREATE TABLE IF NOT EXISTS public.hsi_investigation_audit (
 owner_id text NOT NULL, investigation_key text NOT NULL, revision integer NOT NULL,
 actor_id text NOT NULL, operation text NOT NULL, run_state text NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id,investigation_key,revision),
 FOREIGN KEY(owner_id,investigation_key) REFERENCES public.hsi_investigations(owner_id,investigation_key)
);
CREATE TABLE IF NOT EXISTS public.hsi_investigation_limits (
 owner_id text PRIMARY KEY, bucket timestamptz NOT NULL, requests integer NOT NULL CHECK(requests BETWEEN 1 AND 60)
);
ALTER TABLE public.hsi_investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hsi_investigations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hsi_private_owner ON public.hsi_investigations;
CREATE POLICY hsi_private_owner ON public.hsi_investigations
 USING(owner_id=current_setting('app.hsi_research_owner',true))
 WITH CHECK(owner_id=current_setting('app.hsi_research_owner',true));
ALTER TABLE public.hsi_investigation_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hsi_investigation_audit FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hsi_private_owner ON public.hsi_investigation_audit;
CREATE POLICY hsi_private_owner ON public.hsi_investigation_audit
 USING(owner_id=current_setting('app.hsi_research_owner',true))
 WITH CHECK(owner_id=current_setting('app.hsi_research_owner',true));
ALTER TABLE public.hsi_investigation_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hsi_investigation_limits FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hsi_private_owner ON public.hsi_investigation_limits;
CREATE POLICY hsi_private_owner ON public.hsi_investigation_limits
 USING(owner_id=current_setting('app.hsi_research_owner',true))
 WITH CHECK(owner_id=current_setting('app.hsi_research_owner',true));

-- Discovery Intelligence Phase 6 — in-app alerts + monitor run ledger (additive).
-- Email deferred. Never auto-promotes reviewed_gap. No fabricated PMIDs.

CREATE TABLE IF NOT EXISTS public.research_discovery_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  gap_id UUID,
  gap_key TEXT,
  dedupe_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  href TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_discovery_alerts_dedupe_uniq UNIQUE (user_id, dedupe_key),
  CONSTRAINT research_discovery_alerts_title_len CHECK (char_length(title) BETWEEN 1 AND 240),
  CONSTRAINT research_discovery_alerts_body_len CHECK (char_length(body) BETWEEN 1 AND 4000)
);

CREATE INDEX IF NOT EXISTS research_discovery_alerts_user_idx
  ON public.research_discovery_alerts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS research_discovery_alerts_unread_idx
  ON public.research_discovery_alerts (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS public.research_monitor_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  actor TEXT NOT NULL DEFAULT 'system',
  mode TEXT NOT NULL DEFAULT 'stub',
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT research_monitor_runs_status_chk CHECK (
    status IN ('running', 'completed', 'failed', 'partial')
  )
);

CREATE INDEX IF NOT EXISTS research_monitor_runs_started_idx
  ON public.research_monitor_runs (started_at DESC);

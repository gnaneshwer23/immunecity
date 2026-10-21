-- Optional shared Ask rate-limit buckets (ISI-003).
-- Apply on Neon when ready; Ask falls back to in-memory until then.

CREATE TABLE IF NOT EXISTS public.ask_rate_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ask_rate_buckets_key_created_idx
  ON public.ask_rate_buckets (rate_key, created_at DESC);

/**
 * Browser-safe Ask rate-limit status (IC-15 / ISI-003).
 * Runtime limiter lives in askRateLimit.server.ts — this is documentation + Methods copy only.
 *
 * Verified 2026-10-21 on Neon production: public.ask_rate_buckets present; insert/delete smoke OK.
 */
export const ASK_RATE_LIMIT_STATUS: {
  preferred: "neon";
  verifiedAt: string;
  table: "public.ask_rate_buckets";
  limit: string;
  residual: string;
} = {
  preferred: "neon",
  verifiedAt: "2026-10-21",
  table: "public.ask_rate_buckets",
  limit: "8 requests / 60s / IP key",
  residual:
    "If Neon is unreachable, Ask falls back to per-isolate in-memory limits (cold-start reset; not cross-instance). No Vercel KV / Upstash / Redis env.",
};

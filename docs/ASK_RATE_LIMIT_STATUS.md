# Ask rate-limit status (IC-15 / ISI-003)

**Verified (UTC):** 2026-10-21  
**Code:** `src/lib/askRateLimit.server.ts` → `askRateLimited`  
**Constant:** `ASK_RATE_LIMIT_STATUS` (preferred: `neon`)

## Production Neon check

Project `immunecity` (`autumn-snow-67879321`), branch `production` (`br-super-sea-b5pre85r`):

| Check | Result |
|-------|--------|
| `to_regclass('public.ask_rate_buckets')` | **present** (migration `0006_ask_rate_buckets.sql`) |
| Insert test key `__isi_rl_verify__` | **ok** |
| Delete same key | **ok** (no residual row) |
| Secrets logged | **none** |

## Runtime behaviour

1. When `DATABASE_URL` is set and the table accepts writes, Ask uses Neon buckets (shared across instances).
2. On DB error / missing URL, falls back to in-memory `rateLimited` from `askGrounding.ts` (`in-memory` or `in-memory-fallback` backend tag on 429 responses).
3. Default: **8** requests / **60s** per IP key (`ASK_RATE_LIMIT_DEFAULT`).

## Methods copy

Methods & trust documents that Ask prefers Neon `ask_rate_buckets` when available; memory is residual fallback only.

## Local `.env` caveat

Developer `DATABASE_URL` may point at a non-production Neon endpoint without `ask_rate_buckets`. Production Vercel env must keep the production DATABASE_URL for the Neon path to engage.

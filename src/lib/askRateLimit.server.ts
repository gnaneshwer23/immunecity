/**
 * Shared Ask rate limit (ISI-003 / IC-15).
 *
 * Prefers Neon `ask_rate_buckets` when DATABASE_URL is available and the table exists.
 * Falls back to the browser-safe in-memory limiter in askGrounding.ts.
 *
 * Env: no Upstash/Vercel KV provisioned — do not invent Redis. Optional Neon table
 * via drizzle/migrations/0006_ask_rate_buckets.sql (apply with db:neon-schema / SQL).
 */

import { ASK_RATE_LIMIT_DEFAULT, rateLimited as memoryRateLimited } from "@/lib/askGrounding";

export type AskRateLimitBackend = "neon" | "in-memory" | "in-memory-fallback";

export const ASK_RATE_LIMIT_STATUS: {
  preferred: "neon-when-migrated";
  residual: string;
} = {
  preferred: "neon-when-migrated",
  residual:
    "Until ask_rate_buckets is applied on Neon, Ask uses per-isolate in-memory limits (cold-start reset; not cross-instance).",
};

let neonAvailable: boolean | null = null;

async function tryNeonRateLimit(key: string, limit: number, windowMs: number): Promise<boolean | null> {
  if (!process.env["DATABASE_URL"]?.trim()) return null;
  try {
    const { getSqlClient } = await import("@/lib/db.server");
    const sql = getSqlClient();
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);
    // Atomic-ish: delete expired, insert hit, count in window. Fail open to memory on error.
    await sql`
      DELETE FROM public.ask_rate_buckets
      WHERE rate_key = ${key} AND created_at < ${windowStart}
    `;
    await sql`
      INSERT INTO public.ask_rate_buckets (rate_key, created_at)
      VALUES (${key}, ${now})
    `;
    const rows = await sql`
      SELECT COUNT(*)::int AS n
      FROM public.ask_rate_buckets
      WHERE rate_key = ${key} AND created_at >= ${windowStart}
    `;
    const n = Number(rows[0]?.n ?? 0);
    neonAvailable = true;
    return n > limit;
  } catch {
    neonAvailable = false;
    return null;
  }
}

/** True when the caller should receive HTTP 429. */
export async function askRateLimited(
  key: string,
  limit = ASK_RATE_LIMIT_DEFAULT.limit,
  windowMs = ASK_RATE_LIMIT_DEFAULT.windowMs,
): Promise<{ limited: boolean; backend: AskRateLimitBackend }> {
  const neon = await tryNeonRateLimit(key, limit, windowMs);
  if (neon !== null) {
    return { limited: neon, backend: "neon" };
  }
  const limited = memoryRateLimited(key, limit, windowMs);
  return {
    limited,
    backend: neonAvailable === false ? "in-memory-fallback" : "in-memory",
  };
}

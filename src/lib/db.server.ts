import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema.server";

/**
 * Neon / Vercel Postgres client for server-only work (pooled DATABASE_URL).
 * Auth: Neon Managed Better Auth (`src/integrations/neon/*`).
 * Data: drizzle against public.evidence_records / public.user_roles.
 *
 * Env (Vercel Neon integration):
 * - DATABASE_URL — pooled (preferred for serverless queries)
 * - DATABASE_URL_UNPOOLED — direct (DDL / long sessions)
 */
function resolveDatabaseUrl(): string {
  const raw = process.env["DATABASE_URL"] ?? process.env["DATABASE_URL_UNPOOLED"];
  if (!raw) {
    throw new Error(
      "Missing DATABASE_URL (or DATABASE_URL_UNPOOLED). Pull from Vercel Neon integration / `vercel env pull`.",
    );
  }
  try {
    const u = new URL(raw);
    u.searchParams.delete("channel_binding");
    if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
    return u.toString();
  } catch {
    return raw;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __immuneCitySql: ReturnType<typeof postgres> | undefined;
}

function getSql() {
  if (!globalThis.__immuneCitySql) {
    globalThis.__immuneCitySql = postgres(resolveDatabaseUrl(), {
      prepare: false, // Neon pooler / serverless
      max: 1,
    });
  }
  return globalThis.__immuneCitySql;
}

export function getDb() {
  return drizzle(getSql(), { schema });
}

export function getSqlClient() {
  return getSql();
}

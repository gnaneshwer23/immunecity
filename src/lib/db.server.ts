/**
 * Neon / Vercel Postgres client for server-only work (pooled DATABASE_URL).
 * Auth: Neon Managed Better Auth (`src/integrations/neon/*`).
 * Data: drizzle against public.evidence_records / public.user_roles.
 *
 * Env (Vercel Neon integration):
 * - DATABASE_URL — pooled (preferred for serverless queries)
 * - DATABASE_URL_UNPOOLED — direct (DDL / long sessions)
 *
 * Callers keep the synchronous getDb() / getSqlClient() API.
 * The `postgres` package is imported only from `driver.server.ts`, which the
 * client build replaces so the header cannot pull the driver into the browser.
 */
export { getDb, getSqlClient } from "@/lib/db/driver.server";

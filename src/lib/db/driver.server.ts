import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema.server";

/**
 * Node Postgres driver. This module is server-only (`*.server.ts`).
 * A static import is required so the server deploy traces and bundles `postgres`.
 * A runtime `import("postgres")` is omitted from that trace and crashes SSR with
 * `Cannot find package 'postgres'`.
 */
type Sql = ReturnType<typeof postgres>;

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
  var __immuneCitySql: Sql | undefined;
}

function getSql(): Sql {
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

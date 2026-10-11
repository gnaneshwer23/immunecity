import { defineConfig } from "drizzle-kit";

/**
 * Prefer Vercel Neon integration vars.
 * Use the unpooled URL for migrations/DDL; fall back to pooled DATABASE_URL.
 * LOVABLE_DB_MIGRATION_URL remains for legacy Lovable Cloud Postgres.
 */
function migrationUrl(): string {
  const raw =
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.DATABASE_URL ??
    process.env.LOVABLE_DB_MIGRATION_URL ??
    "";
  if (!raw) return "";
  try {
    const u = new URL(raw);
    // node-postgres / postgres.js often fail with channel_binding=require
    u.searchParams.delete("channel_binding");
    if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
    return u.toString();
  } catch {
    return raw;
  }
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: migrationUrl(),
  },
});

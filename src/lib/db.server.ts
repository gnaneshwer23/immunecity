import * as schema from "@/lib/db/schema.server";

type Sql = ReturnType<typeof import("postgres").default>;
type Drizzle = typeof import("drizzle-orm/postgres-js").drizzle;

/**
 * Neon / Vercel Postgres client for server-only work (pooled DATABASE_URL).
 * Auth: Neon Managed Better Auth (`src/integrations/neon/*`).
 * Data: drizzle against public.evidence_records / public.user_roles.
 *
 * Env (Vercel Neon integration):
 * - DATABASE_URL — pooled (preferred for serverless queries)
 * - DATABASE_URL_UNPOOLED — direct (DDL / long sessions)
 *
 * The driver is imported only on the server. A static `import "postgres"` runs
 * `Buffer.allocUnsafe` while the module evaluates, which throws in the browser
 * and stops hydration — including the /auth form.
 */
const serverDriver =
  typeof window === "undefined"
    ? Promise.all([
        import(/* @vite-ignore */ "postgres"),
        import(/* @vite-ignore */ "drizzle-orm/postgres-js"),
      ] as const)
    : null;

const loaded = serverDriver ? await serverDriver : null;
const postgres = loaded?.[0].default ?? null;
const drizzle: Drizzle | null = loaded?.[1].drizzle ?? null;

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
  if (!postgres) throw new Error("Database is server-only");
  if (!globalThis.__immuneCitySql) {
    globalThis.__immuneCitySql = postgres(resolveDatabaseUrl(), {
      prepare: false, // Neon pooler / serverless
      max: 1,
    });
  }
  return globalThis.__immuneCitySql;
}

export function getDb() {
  if (!drizzle) throw new Error("Database is server-only");
  return drizzle(getSql(), { schema });
}

export function getSqlClient() {
  return getSql();
}

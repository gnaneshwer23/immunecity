/**
 * Applies drizzle/neon/0000_immune_city_public_schema.sql using
 * DATABASE_URL_UNPOOLED or DATABASE_URL from Vercel Neon integration.
 * Does not print connection strings.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

function loadEnvLocal() {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      const key = m[1]!;
      let val = m[2]!.trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // optional
  }
}

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.searchParams.delete("channel_binding");
    if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
    return u.toString();
  } catch {
    return raw;
  }
}

loadEnvLocal();

const raw =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DATABASE_URL ??
  process.env.LOVABLE_DB_MIGRATION_URL;
if (!raw) {
  console.error("Missing DATABASE_URL_UNPOOLED / DATABASE_URL. Run: vercel env pull .env.local");
  process.exit(1);
}

const sqlPath = resolve(process.cwd(), "drizzle/neon/0000_immune_city_public_schema.sql");
const ddl = readFileSync(sqlPath, "utf8");
const sql = postgres(normalizeUrl(raw), { prepare: false, max: 1 });

try {
  await sql.unsafe(ddl);
  const tables = await sql<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('user_roles', 'evidence_records')
    ORDER BY table_name
  `;
  console.log(
    "Neon schema applied. public tables:",
    tables.map((t) => t.table_name).join(", ") || "(none)",
  );
} finally {
  await sql.end({ timeout: 5 });
}

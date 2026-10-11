/**
 * Smoke: Neon DB + Auth JWKS + schema. Does not print secrets.
 * Usage: bun scripts/smoke-neon-cutover.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

loadEnvLocal();

const base = (process.env["NEON_AUTH_BASE_URL"] || process.env["VITE_NEON_AUTH_URL"] || "").replace(
  /\/+$/,
  "",
);
if (!base) {
  console.error("FAIL: missing NEON_AUTH_BASE_URL / VITE_NEON_AUTH_URL");
  process.exit(1);
}
if (!process.env["DATABASE_URL"] && !process.env["DATABASE_URL_UNPOOLED"]) {
  console.error("FAIL: missing DATABASE_URL");
  process.exit(1);
}

const jwksUrl = process.env["NEON_AUTH_JWKS_URL"] || `${base}/.well-known/jwks.json`;
const jwksRes = await fetch(jwksUrl);
console.log("jwks", jwksRes.status, jwksRes.ok ? "ok" : "FAIL");
if (!jwksRes.ok) process.exit(1);

const { createRemoteJWKSet } = await import("jose");
createRemoteJWKSet(new URL(jwksUrl));
console.log("jose", "ok");

const { getSqlClient } = await import("../src/lib/db.server.ts");
const sql = getSqlClient();
try {
  const tables = await sql<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('user_roles', 'evidence_records')
    ORDER BY 1
  `;
  const counts = await sql<
    { roles: number; evidence: number; auth_users: number }[]
  >`
    SELECT
      (SELECT count(*)::int FROM public.user_roles) AS roles,
      (SELECT count(*)::int FROM public.evidence_records) AS evidence,
      (SELECT count(*)::int FROM neon_auth."user") AS auth_users
  `;
  const trig = await sql<{ tgname: string }[]>`
    SELECT tgname FROM pg_trigger
    WHERE tgname = 'on_neon_auth_user_created_role'
  `;
  const admin = await sql<{ n: number }[]>`
    SELECT count(*)::int AS n FROM public.user_roles WHERE role = 'admin'
  `;
  console.log("tables", tables.map((t) => t.table_name).join(",") || "(none)");
  console.log("counts", counts[0]);
  console.log("role_trigger", trig.length ? "present" : "MISSING");
  console.log("admin_rows", admin[0]?.n ?? 0);
  console.log(
    "note",
    "evidence empty until import/export; admin must be INSERT'd after first Neon Auth signup",
  );
} finally {
  await sql.end({ timeout: 5 });
}

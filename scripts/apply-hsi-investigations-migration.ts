/** Apply only 0029 to the ISI product DB. Default mode is a read-only status check. */
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { isiDatabaseConnectionOptions } from "../src/lib/db/connection-options";
const raw = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!raw) throw new Error("ISI product database configuration is required; HSI credentials must not be used");
const host = new URL(raw).hostname;
if (!/^ep-blue-salad[\w.-]*\.neon\.tech$/.test(host) && !["localhost", "127.0.0.1"].includes(host)) throw new Error("Refusing a database outside ISI's configured project or local development");
const connection = isiDatabaseConnectionOptions(raw);
const sql = postgres(connection.url, { ssl: connection.ssl, max: 1 });
try {
  if (process.argv.includes("--apply")) {
    await sql.begin(async (tx) => { await tx.unsafe(await readFile(new URL("../drizzle/migrations/0029_hsi_investigations.sql", import.meta.url), "utf8")); });
  }
  const [row] = await sql`SELECT to_regclass('public.hsi_investigations') IS NOT NULL AS installed`;
  console.log(JSON.stringify({ product: "isi", migration: "0029_hsi_investigations", installed: row?.installed === true }));
} finally { await sql.end(); }

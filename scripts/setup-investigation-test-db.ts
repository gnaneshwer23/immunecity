/** Disposable test bootstrap. Never uses the deployment DATABASE_URL. */
import { readFile } from "node:fs/promises";
import postgres from "postgres";
const raw = process.env.HSI_TEST_ADMIN_DB_URL;
if (!raw) throw new Error("HSI_TEST_ADMIN_DB_URL is required");
const target = new URL(raw);
if (!["127.0.0.1", "localhost"].includes(target.hostname) || target.pathname !== "/hsi_step3_test") throw new Error("Refusing non-local test database");
const sql = postgres(raw, { max: 1 });
const query = (text: string) => sql.unsafe(text);
try {
  await query(`DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='hsi_app_test') THEN CREATE ROLE hsi_app_test LOGIN NOINHERIT PASSWORD 'hsi-test-only-password'; END IF; END $$;`);
  
  await query(await readFile(new URL("../drizzle/migrations/0029_hsi_investigations.sql", import.meta.url), "utf8"));
  await query(`GRANT USAGE ON SCHEMA public TO hsi_app_test;
GRANT SELECT,INSERT,UPDATE ON public.hsi_investigations,public.hsi_investigation_limits TO hsi_app_test;
GRANT SELECT,INSERT ON public.hsi_investigation_audit TO hsi_app_test;
CREATE TABLE IF NOT EXISTS public.user_roles(user_id uuid NOT NULL, role text NOT NULL);
GRANT SELECT ON public.user_roles TO hsi_app_test;
DELETE FROM public.user_roles WHERE user_id IN ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444');
INSERT INTO public.user_roles VALUES ('11111111-1111-4111-8111-111111111111','admin'),('22222222-2222-4222-8222-222222222222','admin'),('33333333-3333-4333-8333-333333333333','user'),('44444444-4444-4444-8444-444444444444','admin');`);
  if (process.argv.includes("--reset")) await query("TRUNCATE public.hsi_investigation_audit,public.hsi_investigations,public.hsi_investigation_limits");
  console.log("Prepared disposable ISI investigation database");
} finally { await sql.end(); }

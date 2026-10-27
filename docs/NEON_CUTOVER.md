# Neon cutover notes (Immune Super Intelligence)

## What moved off Supabase

| Path | Before | After |
|------|--------|-------|
| Sign-in / sign-up / Google | Supabase Auth (+ Lovable OAuth) | Neon Managed Better Auth (`src/integrations/neon/auth-client.ts`) |
| Server fn auth | `requireSupabaseAuth` | `requireNeonAuth` (JWKS via `jose`) |
| Evidence CRUD / roles | PostgREST + RLS | drizzle + `public.has_role` on Neon |
| Curation audit history | (none) | `evidence_audit_events` append-only (IC-02); FK `ON DELETE RESTRICT` (migration `0005_audit_events_restrict_delete.sql`) so deleting a record cannot wipe history |
| Approved citations | anon Supabase select | `getApprovedCitations` fail-closed: approved + supports + verified/matched |
| Counterevidence | (none) | `getCounterEvidenceCitations` / Ask `loadCounterEvidenceForRels` — contradicts/partial, separate from Gate C |

## Owner clicks

1. **Rotate** any Neon password that was pasted into chat; keep using Vercel Neon integration `DATABASE_URL*`.
2. Neon Console → Auth → trusted domains (redirect whitelist). Already on production branch: `https://www.immune-super-intelligence.co.uk`, `https://immune-super-intelligence.co.uk`, and `https://immunecity.vercel.app` (plus localhost / Vercel preview hosts). Re-check after any new custom domain.
3. **Apex DNS (production blocker if wrong):** Vercel expects the apex `A` record to point at Vercel (`76.76.21.21` or the current recommended IPs), with `www` as a CNAME to the Vercel DNS target. Today `www` works; the bare apex still points at a non-Vercel host and TLS fails — users who open `https://immune-super-intelligence.co.uk` never reach the app or auth. Fix at the domain registrar (LiveDNS): set apex `A` → `76.76.21.21` (or Vercel’s recommended values), keep `www` CNAME → `db36f9d258f9500b.vercel-dns-017.com` (or `cname.vercel-dns.com`). Vercel already 308-redirects apex → `www` once DNS is correct.
4. **Google (Neon Console):** Auth → Providers → enable Google; Auth → Configuration → trusted origins must include exactly:
   - `https://www.immune-super-intelligence.co.uk`
   - `https://immune-super-intelligence.co.uk`
   - (optional) `https://immunecity.vercel.app` and localhost for previews  
   Neon’s own Google callback host is managed (`…/auth/oauth/callback/google` on the Neon Auth region host) — do not replace it with the app origin. App callback URL used by the client is `https://www.immune-super-intelligence.co.uk/auth?redirect=/workspace`.
5. Vercel Preview env for `DATABASE_URL*` + Neon Auth URLs was set via CLI (all preview branches). Prefer Neon’s Preview branch sync long-term so Preview DB matches `vercel-dev`.
6. Redeploy Production after merge so Vite picks up `VITE_NEON_AUTH_URL`.
7. Sign up once on `/auth`, then provision admin (0003 semantics — never auto-admin):

```sql
-- After you exist in neon_auth.user:
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM neon_auth."user"
WHERE email = 'YOUR_EMAIL'
ON CONFLICT (user_id, role) DO NOTHING;
```

8. **Evidence data:** Neon tables start empty. No service-role key was available to auto-export Lovable Supabase. Export from Lovable Cloud SQL / Supabase dashboard and import into Neon, or re-import manifests via curation UI (does not invent citations).

## Install honesty

- `bun add @neondatabase/neon-js` / `jose` **hung** (disk / peer resolution). Cutover uses a **thin fetch** auth client + on-disk `jose` (`package.json` declares `jose`; lockfile may lag until a successful install).
- Orphan `@neondatabase/*` folders under `node_modules` are unused.

## Migrations 0005 / 0006 / 0007 (apply with owner approval)

SQL files live under `drizzle/migrations/` and are listed in `drizzle/migrations/meta/_journal.json`.

| File | Purpose | Risk |
|------|---------|------|
| `0005_audit_events_restrict_delete.sql` | FK on `evidence_audit_events.evidence_record_id` → `ON DELETE RESTRICT` | Low — additive constraint change; may fail if orphan audit rows exist |
| `0006_ask_rate_buckets.sql` | Shared Ask rate-limit table | Low — `CREATE TABLE IF NOT EXISTS` |
| `0007_claim_candidates.sql` | Optional claim-ledger candidates table | Low — additive; no Gate C auto-write |

**Do not apply destructively without approval.** Prefer Neon MCP `prepare_database_migration` on a temporary branch, verify with `run_sql`, then `complete_database_migration` after owner OK.

Exact apply (production branch of project `immunecity` / `autumn-snow-67879321`) when approved:

```bash
# Option A — Neon SQL editor: paste each file in order 0005 → 0006 → 0007
# Option B — MCP prepare_database_migration with the SQL body, test on temp branch, then complete
# Option C — bun run db:neon-schema only if that script is confirmed to include these files
```

Ask falls back to in-memory rate limiting until `0006` exists. Claim ledger UI works locally without `0007`.

## Smoke

```bash
bun scripts/smoke-neon-cutover.ts
bun run db:neon-schema   # re-apply DDL if needed
```

## Leftover Supabase

- `src/integrations/supabase/*`, `@supabase/supabase-js`, Lovable `cloud-auth-js` still in the repo for historical / Lovable Cloud paths; **runtime curation/auth no longer imports them**.
- Safe to remove in a follow-up once Lovable host is retired.

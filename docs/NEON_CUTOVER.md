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
3. Vercel Preview env for `DATABASE_URL*` + Neon Auth URLs was set via CLI (all preview branches). Prefer Neon’s Preview branch sync long-term so Preview DB matches `vercel-dev`.
4. Redeploy Production after merge so Vite picks up `VITE_NEON_AUTH_URL`.
5. Sign up once on `/auth`, then provision admin (0003 semantics — never auto-admin):

```sql
-- After you exist in neon_auth.user:
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM neon_auth."user"
WHERE email = 'YOUR_EMAIL'
ON CONFLICT (user_id, role) DO NOTHING;
```

6. **Evidence data:** Neon tables start empty. No service-role key was available to auto-export Lovable Supabase. Export from Lovable Cloud SQL / Supabase dashboard and import into Neon, or re-import manifests via curation UI (does not invent citations).

## Install honesty

- `bun add @neondatabase/neon-js` / `jose` **hung** (disk / peer resolution). Cutover uses a **thin fetch** auth client + on-disk `jose` (`package.json` declares `jose`; lockfile may lag until a successful install).
- Orphan `@neondatabase/*` folders under `node_modules` are unused.

## Smoke

```bash
bun scripts/smoke-neon-cutover.ts
bun run db:neon-schema   # re-apply DDL if needed
```

## Leftover Supabase

- `src/integrations/supabase/*`, `@supabase/supabase-js`, Lovable `cloud-auth-js` still in the repo for historical / Lovable Cloud paths; **runtime curation/auth no longer imports them**.
- Safe to remove in a follow-up once Lovable host is retired.

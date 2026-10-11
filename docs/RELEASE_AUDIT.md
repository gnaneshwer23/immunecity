# Immune City — Full Production Readiness Audit

**Audit date (UTC):** 2026-10-11T09:28:57Z  
**Release scope:** Public educational scientific exploration beta — **not** clinical decision support  
**PRD:** Immune City Immunology × Advanced AI PRD v1.0 (11 Oct 2026)  
**Auditor method:** Code inspection, local smoke/eval, live HTTP + browser checks on both candidate URLs, Vercel env name inventory (values not printed), Supabase anon evidence query

---

## Audit plan (executed)

1. Extract PRD release gates / acceptance checklist; inventory routes, AI, evidence, registry.
2. Security: auth middleware, RLS migrations, first-signup admin trigger, Ask limits/secrets, client bundle scan.
3. Graph integrity: dangling IDs, duplicate `relId`s, spine, core vs draft counts, coverage honesty.
4. Expand/run scientific eval set to 50 cases via `bun scripts/smoke-prd-a2.ts`.
5. Live smoke of 12 layers + Methods/Auth on both production URLs; browser Ask path on Vercel.
6. Fix confirmed P0s locally (Ask key ordering + emergency disable; admin provisioning migration; eval expansion).
7. Re-run smoke; write this report with gates A–H and GO / CONDITIONAL GO / NO-GO.

---

## 1. Executive verdict

### **CONDITIONAL GO** for public educational beta on **https://immunecity.vercel.app** (canonical), pending owner follow-ups below

**Publication update (2026-10-11, post-blocker pass):** Ask hardening + OpenAI BYOK fallback pushed to `main` / Vercel (`ecbbec7`, `a79750a`). Live smoke on https://immunecity.vercel.app: homepage **200**; clinical Ask **200** educational refusal (no 500); TNF/RA educational Ask **200** streaming via OpenAI Responses (`OPEN_API_KEY`). Migration `0003` **not** applied (no MCP/CLI access to Supabase project `dynvfnkqvostabfdglve`). Claim-level approved evidence remains **0/536**. Full WCAG + SME gold-set still unsigned.

**Migration 0003 apply attempt (2026-10-11, authorised):** **BLOCKED.** Supabase MCP `list_projects` returned only `DeliverX` (`jibmyxaldetyycmtlxet`) and `fluent-institute` (`bzefudyjvgwwtlalmrxk`). Target Immune City project `dynvfnkqvostabfdglve` was **not** visible — no SQL executed (wrong-project guard). Owner must apply via Dashboard SQL Editor (see §11).

**Still required for unqualified GO:** apply `0003` + explicit admin grant; curator evidence pack; WCAG/SME sign-off; prefer renaming `OPEN_API_KEY` → `OPENAI_API_KEY` (or set `LOVABLE_API_KEY` for Lovable gateway). Keep Lovable host as secondary; do not delete.

---

## 2. Environment and release identity

| Item | Value |
|------|--------|
| Repo | `/Users/gnaneshwerjadav/Desktop/immune-city` · GitHub `gnaneshwer23/immunecity` |
| Local HEAD at audit start | `5d31f875ef4177d26aa92f20f34e579799f52a80` — *Deepen Phase E Scientific Workbench…* |
| Candidate URL A | https://immune-city.lovable.app — HTTP 200 |
| Candidate URL B | https://immunecity.vercel.app — HTTP 200 |
| Vercel project | `immunecity` (`prj_f1FX7Jp493cSOcLAmgAtpA5alLnA`) |
| Graph runtime | KG **0.3** + extensions **draft-ext-3** · 260 core / 66 draft concepts · 395 core / 141 draft links · 536 runtime links · 15 spine steps |
| Test environment | Local Bun smoke; remote curl/Python HTTP; cursor-ide-browser on Vercel |
| Disk note | Host volume ~100% full (~3.8 GiB free) — avoided full vitest/build |

**Host divergence (observed):** Home titles differ (`Where Immunology Meets Advanced AI` on Vercel vs `causal immunology, connected` on Lovable). Reasoning/Research titles also differ. Treat as **two deployments**, not one RC.

---

## 3. Capability inventory

| Capability | Status | Notes |
|------------|--------|-------|
| 12-layer navigation + Shell | **Live** | Both hosts HTTP 200 for all 12 paths |
| KG browse / D3 graph / table | **Live** | Client-only D3 behind ClientOnly |
| Causal spine (15 steps) | **Live** | Present on Overview |
| Teaching simulator | **Live** | Educational assumptions present in page HTML |
| Patient explorer (rule-based) | **Live / partial** | Educational framing present; not clinical CDS |
| Mechanism / path reasoning | **Live / partial** | Illustrative walks; registry models not wired |
| Ask Immune City (Lovable) | **Partial** | Model answers work; unsupported may still call model on older deploy; clinical abstention works |
| Ask Immune City (Vercel) | **Broken** | Missing `LOVABLE_API_KEY`; clinical also fails until local fix is deployed |
| Emergency Ask disable | **Fixed in code / not deployed** | `IMMUNE_ASK_DISABLED` / `ASK_EMERGENCY_DISABLE` |
| Relationship-level evidence DB | **Live schema / empty data** | 0 rows; 0 approved |
| Citation curation UI | **Live** (auth-gated) | Admin mutations via server fns + RLS |
| Literature / workbench workflows | **Partial** | Local draft scaffolds; no KG write |
| Advanced models (omics/structure/etc.) | **Interface-only** | Registry stubs refuse; honesty tests pass |
| Omics / AlphaFold / agents | **Planned / unbuilt** | Ask abstains on omics class |
| Clinical CDS | **Out of scope / refused** | Guardrails present in code |

---

## 4. Test coverage (12 layers + critical journeys)

### 4.1 Route HTTP smoke (both hosts)

All returned **200**. Approximate TTFB (HTML):

| Layer | Path | Vercel | Lovable |
|-------|------|--------|---------|
| 01 Overview | `/` | 194 ms | 784 ms |
| 02 Cell atlas | `/learn` | 495 ms | 1093 ms |
| 03 Mechanism | `/mechanism` | 423 ms | 784 ms |
| 04 Knowledge graph | `/graph` | 379 ms | 792 ms |
| 05 Simulator | `/simulator` | 271 ms | 494 ms |
| 06 Dynamics | `/dynamics` | 199 ms | 235 ms |
| 07 Disease | `/disease` | 196 ms | 515 ms |
| 08 Therapy | `/therapy` | 189 ms | 228 ms |
| 09 Evidence | `/evidence` | 197 ms | 896 ms |
| 10 Patient | `/patient` | 241 ms | 214 ms |
| 11 Reasoning | `/reasoning` | 475 ms | 540 ms |
| 12 Research | `/research` | 253 ms | 215 ms |
| Methods | `/methods` | 208 ms | 289 ms |
| Auth | `/auth` | 431 ms | 516 ms |

### 4.2 Browser (Vercel)

- Overview + Cell atlas render with skip link, primary nav, educational footer line.
- Ask dialog opens (keyboard-focusable textbox, “Educational only, not medical advice”).
- Clinical question → UI: *“Sorry — the answer could not be generated”* (API 500 missing key).

### 4.3 Local automation

- `bun scripts/smoke-prd-a2.ts` → **ALL PASSED (50 eval cases + unit checks)** after fixes.
- Vitest full suite: **not run** (known hang risk + disk pressure) — **BLOCKED / deferred**.

---

## 5. Scientific evidence audit

| Metric | Result |
|--------|--------|
| Core nodes / draft nodes | 260 / 66 |
| Core relationships / draft | 395 / 141 |
| Runtime relationships | 536 |
| Dangling subject/object IDs | **0** |
| Duplicate `relId`s | **0** |
| Spine steps | **15** |
| `evidence_records` total (anon) | **0** |
| Approved claim-linked records | **0** |
| Coverage honesty (UI logic) | Counts only `relationship_id` + approved cites; concept cites do not inflate links |
| Claim-level support of core links | **0 / 395 (0.0%)** |
| Exemplar pathways | Connected scaffolds; maturity labelled `scaffold` |

**Conclusion:** Graph integrity for IDs is sound. Scientific release maturity for claim-level evidence is **not** ready — empty evidence store is honestly reflected in coverage UI but blocks Gate C for any claim of reviewed support.

---

## 6. Security report

### 6.1 Authentication & authorisation

- Curation mutations use `requireSupabaseAuth` + `has_role(..., 'admin')` server-side (`evidence.functions.ts`).
- `/_authenticated` route redirects unauthenticated users to `/auth`.
- **P0 — First signup admin:** migration `0000` trigger `assign_initial_role` grants admin if no admin exists. **Open signup → privilege escalation race.** Local fix: `0003_explicit_admin_provisioning.sql` (always assign `user`). **Not applied to live DB** → remaining P0 until migration + explicit admin grant.

### 6.2 RLS (from migrations)

- `evidence_records`: authenticated read-all; write admin-only; anon SELECT only `curation = 'approved'`.
- `user_roles`: users read own roles; no self-promotion policy observed in migrations.
- Supabase MCP: **needsAuth** — live policy re-verify **BLOCKED** without user auth.

### 6.3 AI endpoint & spend

| Control | Code | Deployed Vercel | Deployed Lovable |
|---------|------|-----------------|------------------|
| Rate limit (8/min/IP, in-memory) | Yes | Present in build lineage | Present |
| Message history cap (10) | Yes | Yes | Yes |
| Max question chars (500) | Yes | Yes | Yes |
| Emergency disable | **Added locally** | **No** | **No** |
| `LOVABLE_API_KEY` | Required for model | **MISSING** | Present (answers stream) |
| Abstain before key check | **Fixed locally** | **No** (clinical → 500) | Clinical abstention works |
| Cost/budget monitoring | Not observed | — | — |
| Durable distributed rate limit | No (per-isolate Map) | Soft only | Soft only |

### 6.4 Secrets

- Vercel env **names** (re-checked 2026-10-11): Production has `OPEN_API_KEY` (added by owner; not the Lovable name), plus `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID`, `VITE_SUPABASE_*` on Production/Preview/Development. **No `LOVABLE_API_KEY`**, **no `OPENAI_API_KEY`**, **no `IMMUNE_ASK_DISABLED`** (correct for normal ops).
- Ask provider resolution (server): `LOVABLE_API_KEY` → Lovable gateway; else `OPENAI_API_KEY` or `OPEN_API_KEY` → OpenAI Responses BYOK (`gpt-4o` default, override via `OPENAI_MODEL`).
- Local `.env` names only: Supabase URL/publishable/project (no Ask key in file).
- Client bundle scan (`/assets/index-*.js` ~788 KB): **no** matches for `LOVABLE_API_KEY`, `sb_secret_`, `service_role`, long `sk-` patterns.
- `SUPABASE_SERVICE_ROLE_KEY` referenced in server client code — confirm never in VITE_* (not listed in Vercel env inventory).

### 6.5 Privacy

- Ask UI states “Nothing is stored”; server does not persist chat in app DB (provider logging **BLOCKED** — external).

---

## 7. Performance report

| Condition | Result |
|-----------|--------|
| HTML TTFB 12 layers | Vercel ~190–500 ms; Lovable ~200–1100 ms (network LHR) |
| Ask model (Lovable TNF) | Streams; not latency-benchmarked under load |
| Ask (Vercel) | Immediate 500 — not applicable |
| Lighthouse / CWV | **Not run** (disk / time) — **BLOCKED** |
| Load / soak of Ask | **Not run** — rate limit unit-tested only |

---

## 8. Accessibility report

| Check | Result |
|-------|--------|
| Skip link | Present (`Skip to content`) |
| Landmark / nav labels | Primary nav, pillar menus, Ask dialog labels |
| Educational disclaimer | Footer + Ask copy |
| Graph alternative | Methods page references text table |
| Automated axe/WCAG suite | **Not run** — **BLOCKED** |
| Full keyboard tour of graph | **Partial** — Ask/dialog OK; deep graph keyboard **not fully verified** |
| Contrast audit | **Not run** |

Material a11y: no critical blocker proven; Gate F remains **conditional** pending automated + manual sign-off.

---

## 9. Defect register

| ID | Sev | Description | Repro | Fix | Regression | Status |
|----|-----|-------------|-------|-----|------------|--------|
| D-01 | **P0** | Vercel Ask: model key mis-named / Lovable key absent | Owner set `OPEN_API_KEY` only | Dual-path: Lovable or OpenAI BYOK (`OPENAI_API_KEY`/`OPEN_API_KEY`) | Manual Ask after deploy | **Closed (prod smoke 200 stream)** |
| D-02 | **P0** | Ask requires API key before abstentions | Clinical on Vercel → 500 instead of refusal | `ask.server.ts` reorder | smoke + curl after deploy | **Closed (prod clinical 200 refusal)** |
| D-03 | **P0** | No emergency Ask disable | N/A | `isAskEmergencyDisabled` + env | smoke checks | **Deployed (env unset = normal)** |
| D-04 | **P0** | First-signup auto-admin | Open signup when no admin | Migration `0003` | Apply migration; role tests | **Code ready / DB apply BLOCKED (MCP cannot see `dynvfnkqvostabfdglve`)** |
| D-05 | **P0** | Zero approved claim-level evidence | Anon select count = 0 | Curator workflow (human) | Coverage dashboard | **Open (science)** |
| D-06 | **P1** | Dual public URLs diverge | Title/content mismatch | Designate single RC | Smoke both | **Open (product)** |
| D-07 | **P1** | Lovable unsupported may still call model | Gibberish streamed via OpenAI path | Deploy latest `prepareAsk` | Eval unsupported cases | **Likely stale deploy** |
| D-08 | **P1** | In-memory rate limit not cross-instance | Multi-instance flood | Gateway/Redis later | Load test | **Accepted risk for beta** |
| D-09 | **P1** | Lexical Ask retrieval false-positives | Short tokens match descs (`how`, `helm`) | Retrieval hardening | Eval | **Open** |
| D-10 | **P1** | Advanced models interface-only | Registry UI | Keep honesty labels | smoke registry | **By design** |
| D-11 | **P2** | Vitest hangs locally | `bun test` | Use smoke script | CI design | **Open** |
| D-12 | **P2** | Eval set 50 << PRD 100+ expert gold | — | Expand + SME approve | Gate E | **Open** |

---

## 10. Changes made (this audit)

| File | Rationale |
|------|-----------|
| `src/lib/ask.server.ts` | Abstentions before key; emergency disable; 503 when key missing |
| `src/lib/askGrounding.ts` | Shared `isAskEmergencyDisabled` + message |
| `drizzle/migrations/0003_explicit_admin_provisioning.sql` | Stop first-user auto-admin |
| `drizzle/migrations/meta/_journal.json` | Register migration |
| `src/test/eval/scientific-eval-set.ts` | Expand to **50** automated cases |
| `scripts/smoke-prd-a2.ts` | Cover emergency disable |
| `docs/RELEASE_AUDIT.md` | This report |

---

## 11. Unresolved blockers / remaining owner actions

1. **Owner: DBA / Supabase** — Apply migration `0003` (**BLOCKED** via MCP: account sees other projects only, not `dynvfnkqvostabfdglve`). In [Supabase Dashboard](https://supabase.com/dashboard/project/dynvfnkqvostabfdglve/sql/new) → SQL Editor, run the full contents of `drizzle/migrations/0003_explicit_admin_provisioning.sql`, then verify + grant admin **explicitly** to the intended curator only:

   ```sql
   -- Verify function no longer auto-promotes first signup:
   SELECT pg_get_functiondef('public.assign_initial_role()'::regprocedure);

   -- After the curator has signed up once (role = user):
   INSERT INTO public.user_roles (user_id, role)
   SELECT id, 'admin' FROM auth.users WHERE email = '<owner@example.com>'
   ON CONFLICT (user_id, role) DO NOTHING;
   ```

   Do **not** auto-grant by “first user” heuristics. Existing admin rows are left unchanged by `0003`.

2. **Owner: Vercel (optional cleanup)** — Rename `OPEN_API_KEY` → `OPENAI_API_KEY`, or add `LOVABLE_API_KEY` if using Lovable gateway. Leave `IMMUNE_ASK_DISABLED` unset for normal ops.
3. **Owner: Scientific curator** — Seed and approve relationship-level claim assessments; publish baseline coverage (still 0 approved). **Do not fabricate approvals.**
4. **Canonical URL** — Prefer **https://immunecity.vercel.app**; keep Lovable as secondary; do not delete Lovable.
5. **Owner: a11y / SME** — Full WCAG suite + expert gold-set sign-off still open.

---

## 12. Publication status

- Pushed to `origin/main` (Ask abstention-before-key, emergency disable, migration file `0003`, eval-50, OpenAI BYOK dual-path, this audit update).
- Canonical production: **https://immunecity.vercel.app** (Vercel project `immunecity`).
- Migration `0003` remains **BLOCKED / not applied** to production Postgres (`dynvfnkqvostabfdglve`) until owner runs SQL in §11.
- Curator evidence pack and full WCAG/SME sign-off: **remaining** (cannot complete in this pass).

---

## 13. Rollback instructions

**If a future authorised deploy of these fixes misbehaves:**

1. Vercel: Promote previous successful deployment / `vercel rollback` for `immunecity`, or redeploy prior git SHA `5d31f875ef4177d26aa92f20f34e579799f52a80`.
2. Lovable: Use platform rollback to prior deployment ID recorded at publish time.
3. Ask emergency: set `IMMUNE_ASK_DISABLED=1` (after this code is live) without full rollback.
4. DB: Migration `0003` only replaces a function — rollback by restoring prior `assign_initial_role` from `0000` if required; **do not** wipe `user_roles`.
5. Evidence: no destructive ops performed; no evidence reset needed.

---

## 14. Sign-off checklist

| Role | Status | Notes |
|------|--------|-------|
| Product owner | ☐ | Must accept NO-GO or clear §11 |
| Engineering | ☐ | Deploy + env + migration |
| Security | ☐ | Admin trigger + RLS live verify **BLOCKED** |
| Scientific review | ☐ | Empty evidence; gold set unsigned |
| Accessibility | ☐ | Automated suite not run |
| Release owner | ☐ | Single production URL decision |

---

## Gates A–H

| Gate | Result | Evidence |
|------|--------|----------|
| **A — Security** | **CONDITIONAL** | Ask kill-switch + abstention published; auto-admin trigger **still live** until `0003` applied |
| **B — Data integrity** | **PASS** (graph) | No dangling/duplicate IDs; counts consistent in footer/snapshot |
| **C — Scientific honesty** | **FAIL** for “supported” claims | 0 approved claim links; draft labelling OK; empty evidence honest but immature |
| **D — Functional integrity** | **CONDITIONAL** | 12 layers load; Ask re-smoke after publication |
| **E — AI reliability** | **CONDITIONAL** | Local 50/50; prod clinical refusal + TNF stream verified; SME gold-set still open |
| **F — Accessibility** | **CONDITIONAL** | Skip/nav/Ask OK; full WCAG **BLOCKED** |
| **G — Operations** | **CONDITIONAL** | Canonical = Vercel; Lovable secondary; monitoring still soft |
| **H — Public deployment** | **CONDITIONAL** | Fixes on `main`/Vercel; dual hosts remain until product retires secondary |

---

## FINAL DECISION

# **CONDITIONAL GO** (canonical: https://immunecity.vercel.app)

Engineering P0s for Ask (abstention-before-key, emergency disable, model key path via `OPEN_API_KEY`/`OPENAI_API_KEY` or `LOVABLE_API_KEY`) are published. Remaining blockers are **ops/science**, not missing Ask code:

- Apply Supabase `0003` + explicit admin grant (Gate A still incomplete until then)
- Curator claim-level evidence pack (Gate C)
- WCAG suite + SME gold-set (Gates E/F)
- Confirm live Ask TNF path after deploy (Gate E re-smoke)

Do not claim full GO until those owner actions close.

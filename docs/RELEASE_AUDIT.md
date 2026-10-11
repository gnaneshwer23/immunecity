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

**Publication update (2026-10-11, post-blocker pass):** Ask hardening + OpenAI BYOK fallback pushed to `main` / Vercel (`ecbbec7`, `a79750a`). Live smoke on https://immunecity.vercel.app: homepage **200**; clinical Ask **200** educational refusal (no 500); TNF/RA educational Ask **200** streaming via OpenAI Responses.

**Migration 0003 + admin (2026-10-11):** MCP path **BLOCKED** (account cannot see `dynvfnkqvostabfdglve`). **Owner applied** migration `0003` (`assign_initial_role` always inserts `'user'`) via Lovable Cloud SQL editor, then provisioned their own explicit `user_roles` admin row. Gate A admin bootstrap **closed**.

**Release items pass (2026-10-11, local):** Relationship evidence **queue** seeded from 37 KG-cited links (40 candidate slots; 17 PMIDs resolved via PubMed agreement — all `curation=unreviewed`, `claim_support=unassessed`). Approved claim links remain **0/536** until human curator assesses + approves. Automated a11y suite added (`bun run a11y`); SME gold-set checklist at `docs/SME_GOLD_SET_SIGNOFF.md` status **awaiting SME**. Prefer `OPENAI_API_KEY` (compat still reads `OPEN_API_KEY`).

**Still required for unqualified GO:** human claim approve (Gate C); SME gold-set signature + human a11y remainder (Gates E/F). Keep Lovable host as secondary; do not delete.

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
| `evidence_records` total (anon) | **0** (DB still empty until admin imports queue) |
| Relationship queue candidates (repo) | **40** slots / **37** cited links (`src/data/relationship-evidence-queue.json`) |
| Queue PMIDs resolved (PubMed agreement) | **17 / 34** unique cites — still `unreviewed` / `unassessed` |
| Approved claim-linked records | **0** |
| Coverage honesty (UI logic) | Counts only `relationship_id` + approved cites; concept cites do not inflate links |
| Claim-level support of runtime links | **0 / 536 (0.0%)** approved; queue covers **37 / 536 (6.9%)** as candidates only |
| Remaining links without KG cite | **499** — need curator literature work (not bulk-approvable) |
| Exemplar pathways | Connected scaffolds; maturity labelled `scaffold` |

**Conclusion:** Graph integrity for IDs is sound. A honest draft→approve pipeline and relationship queue now exist; **approved** claim-level coverage is still **0** and blocks Gate C for any claim of reviewed support. Do not mass-approve RESEARCH_REQUIRED / empty slots.

---

## 6. Security report

### 6.1 Authentication & authorisation

- **Neon cutover (2026-10-11, local, uncommitted):** Runtime auth + curation use **Neon Managed Better Auth** + **drizzle/postgres** (`src/integrations/neon/*`, `evidence.functions.ts`, `citations.functions.ts`). Supabase PostgREST path is no longer called from those routes.
- Curation mutations use `requireNeonAuth` (JWKS/`jose`) + `has_role(..., 'admin')` via SQL.
- `/_authenticated` route redirects unauthenticated users to `/auth` (Neon session cookie + JWT for server fns).
- **Admin:** Neon Auth signup trigger assigns `'user'` only (`assign_initial_role_neon`). Explicit admin: `INSERT INTO public.user_roles (user_id, role) VALUES ('<uuid>', 'admin') ON CONFLICT DO NOTHING`.
- **Rotate** any Neon DB password pasted in chat; prefer Vercel Neon integration URLs.

### 6.2 Data access (post-cutover)

- Server functions read/write `public.evidence_records` on Neon; public approved citations filter `curation = 'approved'` in SQL (no Supabase RLS).
- Legacy Supabase migrations `0000–0003` retained for Lovable history; Neon DDL is `drizzle/neon/0000_immune_city_public_schema.sql`.
- Preview now also has `DATABASE_URL*` + Neon Auth env names (CLI); prefer Neon branch-sync for Preview DB when available.

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

- Vercel env **names** (re-checked 2026-10-11 Neon cutover): `DATABASE_URL` / `DATABASE_URL_UNPOOLED` on Production + Development; `VITE_NEON_AUTH_URL` / `NEON_AUTH_BASE_URL` / `NEON_AUTH_JWKS_URL` on Production + Development (+ Preview attempted). Production still has `OPEN_API_KEY` (prefer `OPENAI_API_KEY`). Legacy `SUPABASE_*` / `VITE_SUPABASE_*` may remain but are unused by cutover paths. **No `LOVABLE_API_KEY`**, **no `IMMUNE_ASK_DISABLED`**.
- Ask provider resolution (server): `LOVABLE_API_KEY` → Lovable gateway; else `OPENAI_API_KEY` or `OPEN_API_KEY` → OpenAI Responses BYOK (`gpt-4o` default, override via `OPENAI_MODEL`).
- Local `.env.local`: Neon `DATABASE_URL*` + Neon Auth URLs (gitignored). Smoke: `bun scripts/smoke-neon-cutover.ts`.
- Install note: `bun add` hung on disk/peers; `jose` declared in `package.json` and present in `node_modules`; lockfile may need a successful install on a machine with free disk before deploy. Orphan `@neondatabase/neon-js` in `node_modules` is **not** used (thin fetch client instead).

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
| Automated source a11y suite | **Runnable** — `bun run a11y` (skip link, landmarks, Ask labels, Methods disclosure) |
| Optional axe fixture | `bun scripts/a11y-suite.ts --axe` (requires `axe-core`) |
| Full keyboard tour of graph | **Partial** — Ask/dialog OK; deep graph keyboard **human-only** |
| Contrast audit | **Not run** — **human-only** |
| SME gold-set sign-off | **Awaiting SME** — `docs/SME_GOLD_SET_SIGNOFF.md` + `bun run sme:status` |

Material a11y: automated invariants green when suite is run; Gate F remains **conditional** until human keyboard/contrast/SME items close.

---

## 9. Defect register

| ID | Sev | Description | Repro | Fix | Regression | Status |
|----|-----|-------------|-------|-----|------------|--------|
| D-01 | **P0** | Vercel Ask: model key mis-named / Lovable key absent | Owner set `OPEN_API_KEY` only | Dual-path: Lovable or OpenAI BYOK (`OPENAI_API_KEY`/`OPEN_API_KEY`) | Manual Ask after deploy | **Closed (prod smoke 200 stream)** |
| D-02 | **P0** | Ask requires API key before abstentions | Clinical on Vercel → 500 instead of refusal | `ask.server.ts` reorder | smoke + curl after deploy | **Closed (prod clinical 200 refusal)** |
| D-03 | **P0** | No emergency Ask disable | N/A | `isAskEmergencyDisabled` + env | smoke checks | **Deployed (env unset = normal)** |
| D-04 | **P0** | First-signup auto-admin | Open signup when no admin | Migration `0003` | Apply migration; role tests | **Closed** (0003 via Lovable Cloud; explicit admin provisioned by owner) |
| D-05 | **P0** | Zero approved claim-level evidence | Anon select count = 0 | Relationship queue + curation import path shipped; human claim assess/approve still required | Coverage dashboard | **Open (science)** — queue ready, 0 approved |
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
| `src/lib/ask.server.ts` | Abstentions before key; emergency disable; 503 when key missing; prefer `OPENAI_API_KEY` |
| `src/lib/askGrounding.ts` | Shared `isAskEmergencyDisabled` + message |
| `drizzle/migrations/0003_explicit_admin_provisioning.sql` | Stop first-user auto-admin |
| `drizzle/migrations/meta/_journal.json` | Register migration |
| `src/test/eval/scientific-eval-set.ts` | Expand to **50** automated cases |
| `scripts/smoke-prd-a2.ts` | Cover emergency disable |
| `src/lib/immune/relationshipEvidenceQueue.ts` | Build unreviewed relationship candidates from KG cites |
| `src/data/relationship-evidence-queue.json` | Seed queue (40 slots / 17 PMIDs; never approved) |
| `scripts/build-relationship-evidence-queue.ts` | Rebuild + optional PubMed resolve |
| `scripts/a11y-suite.ts` / `bun run a11y` | Automated WCAG-oriented invariants |
| `docs/SME_GOLD_SET_SIGNOFF.md` + `scripts/sme-gold-set-status.ts` | SME harness; status awaiting SME |
| `docs/CURATOR_EVIDENCE_QUEUE.md` | Curator import/approve steps |
| `src/routes/_authenticated/curation.tsx` | Load relationship queue; claim-link stats |
| `docs/RELEASE_AUDIT.md` | This report |

---

## 11. Unresolved blockers / remaining owner actions

1. ~~**Owner: DBA / Lovable Cloud** — Migration `0003` + explicit admin grant.~~ **Done** (Lovable Cloud SQL; owner provisioned admin).
2. **Owner: Vercel dashboard** — Add `OPENAI_API_KEY` with the same secret currently in `OPEN_API_KEY`, then remove `OPEN_API_KEY` after a successful Ask smoke. (CLI cannot read sensitive values to rename safely; empty `OPENAI_API_KEY` was attempted and removed.) Code still accepts `OPEN_API_KEY` temporarily. Optional: add `LOVABLE_API_KEY` for Lovable gateway. Leave `IMMUNE_ASK_DISABLED` unset for normal ops.
3. **Owner: Scientific curator** — In `/curation` (admin): **Load relationship queue** → Check identifiers → set `claim_support` per link → Approve. Starts at **0 approved / 37 candidate cited links / 499 uncited**. **Do not fabricate approvals or PMIDs.**
4. **Canonical URL** — Prefer **https://immunecity.vercel.app**; keep Lovable as secondary; do not delete Lovable.
5. **Owner: a11y / SME** — Run `bun run a11y`; complete human keyboard/contrast; SME signs `docs/SME_GOLD_SET_SIGNOFF.md` (status **awaiting SME**).

---

## 12. Publication status

- Pushed to `origin/main` (Ask abstention-before-key, emergency disable, migration file `0003`, eval-50, OpenAI BYOK dual-path, this audit update).
- Canonical production: **https://immunecity.vercel.app** (Vercel project `immunecity`).
- Migration `0003` applied via Lovable Cloud SQL; explicit admin provisioned by owner (§11 item 1 closed).
- Relationship evidence queue + a11y/SME harness: **shipped locally** (not committed unless owner asks). Human claim approve + SME signature still required.

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
| Engineering | ☐ | Deploy done; optional env rename; migration + admin done |
| Security | ☐ | Admin bootstrap done; RLS live verify **BLOCKED** (no MCP) |
| Scientific review | ☐ | Queue candidates ready; 0 approved; gold set **awaiting SME** |
| Accessibility | ☐ | Automated suite runnable; human remainder open |
| Release owner | ☐ | Single production URL decision |

---

## Gates A–H

| Gate | Result | Evidence |
|------|--------|----------|
| **A — Security** | **CONDITIONAL** | Ask kill-switch + abstention published; `0003` + explicit admin done via Lovable Cloud; live RLS re-verify still blocked without MCP |
| **B — Data integrity** | **PASS** (graph) | No dangling/duplicate IDs; counts consistent in footer/snapshot |
| **C — Scientific honesty** | **FAIL** for “supported” claims | 0 approved claim links; 37-link unreviewed queue ready; draft labelling OK |
| **D — Functional integrity** | **CONDITIONAL** | 12 layers load; Ask re-smoke after publication |
| **E — AI reliability** | **CONDITIONAL** | Local 50/50; prod clinical refusal + TNF stream verified; SME gold-set still open |
| **F — Accessibility** | **CONDITIONAL** | `bun run a11y` invariants; human keyboard/contrast still open |
| **G — Operations** | **CONDITIONAL** | Canonical = Vercel; Lovable secondary; monitoring still soft |
| **H — Public deployment** | **CONDITIONAL** | Fixes on `main`/Vercel; dual hosts remain until product retires secondary |

---

## FINAL DECISION

# **CONDITIONAL GO** (canonical: https://immunecity.vercel.app)

Engineering P0s for Ask are published. Admin bootstrap is **done**. Relationship evidence **queue** (unreviewed), a11y suite, and SME sign-off harness are ready. Remaining blockers are **human-only**:

- Curator: import queue → assess claim_support → approve (Gate C; still 0/536 approved)
- SME: sign `docs/SME_GOLD_SET_SIGNOFF.md` + human a11y remainder (Gates E/F)
- Vercel dashboard: set `OPENAI_API_KEY` (copy from `OPEN_API_KEY`), then drop the mis-named key

Do not claim full GO until those owner actions close.

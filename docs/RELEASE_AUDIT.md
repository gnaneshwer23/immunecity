# Immune City — Full Production Readiness Audit

**Audit refresh (UTC):** 2026-10-11 (post-Neon cutover, HEAD `76c96b2` + local P0 follow-ups)  
**Release scope:** Public educational scientific exploration beta — **not** clinical decision support  
**PRD:** Immune City Immunology × Advanced AI PRD v1.0 (11 Oct 2026)  
**Canonical production:** https://immunecity.vercel.app  
**Auditor method:** Code inspection; `bun scripts/smoke-neon-cutover.ts`; live HTTP + Ask curl on Vercel; browser Ask/auth UI; local unit/smoke scripts

---

## Audit plan (this refresh)

1. Confirm Neon cutover is on `main` (`76c96b2`) and runtime auth/curation no longer depend on Supabase PostgREST.
2. Smoke Neon JWKS + schema + counts; smoke Vercel routes + Ask clinical/educational paths.
3. Close engineering P0s: evidence approval invariants; Ask ← reviewed Neon evidence + citation validation.
4. Align curator queue / UI toward three exemplar pathways without inventing approvals.
5. Re-state Gates A–H with **CONDITIONAL GO** framing; list honest unverified items.

---

## 1. Executive verdict

### **CONDITIONAL GO** for public educational beta on **https://immunecity.vercel.app**

**Neon runtime (verified 2026-10-11):** Auth JWKS **200**; `evidence_records` + `user_roles` present; signup role trigger present. Live Neon counts at smoke time: **0** auth users, **0** role rows, **0** evidence rows — empty until owner signup + admin SQL + curator import.

**Ask (verified on Vercel):** Clinical personal question → **200** educational refusal (no 500). TNF/RA educational Ask → **200** streaming via OpenAI Responses (`OPEN_API_KEY` / `OPENAI_API_KEY` path). Auth page shows Neon Auth (email + Google) and explicit-admin copy.

**Still required for unqualified GO:** human Neon signup + admin grant; curator claim assess/approve (Gate C still **0** approved); SME gold-set signature + human a11y remainder (Gates E/F). Keep Lovable host as secondary; do not delete.

---

## 2. Environment and release identity

| Item | Value |
|------|--------|
| Repo | `/Users/gnaneshwerjadav/Desktop/immune-city` · GitHub `gnaneshwer23/immunecity` |
| Latest commit on `main` | `76c96b2` — *Cut over auth and curation to Neon Auth + Postgres* |
| Canonical URL | https://immunecity.vercel.app — HTTP 200 |
| Secondary URL | https://immune-city.lovable.app — treat as divergent deploy |
| Vercel project | `immunecity` |
| Auth / DB runtime | **Neon Managed Better Auth** + **drizzle/postgres** (`src/integrations/neon/*`, `src/lib/db.server.ts`) |
| Graph runtime | KG **0.3** + extensions **draft-ext-3** · 260 core / 66 draft concepts · 536 runtime links · 15 spine steps |
| Test environment | Local Bun; curl; cursor-ide-browser on Vercel |
| Disk note | Prefer targeted vitest / smoke scripts; avoid heavy `bun add` |

**Host divergence:** Vercel and Lovable remain two deployments. Prefer Vercel as RC.

---

## 3. Capability inventory

| Capability | Status | Notes |
|------------|--------|-------|
| 12-layer navigation + Shell | **Live** | Vercel HTTP 200 (some paths 307 then settle; `/auth` may 307→auth UI) |
| KG browse / D3 graph / table | **Live** | Client-only D3 behind ClientOnly |
| Causal spine (15 steps) | **Live** | Overview |
| Teaching simulator | **Live** | Educational assumptions |
| Patient explorer | **Live / partial** | Not clinical CDS |
| Mechanism / path reasoning | **Live / partial** | Exemplars labelled scaffold until claim review |
| Ask Immune City (Vercel) | **Live** | Clinical refuse + educational stream verified |
| Emergency Ask disable | **In code** | `IMMUNE_ASK_DISABLED` / `ASK_EMERGENCY_DISABLE` (unset = normal) |
| Relationship-level evidence DB | **Schema live / data empty** | Neon `evidence_records` count **0** at smoke |
| Citation curation UI | **Live** (auth-gated) | Neon Auth + admin server fns |
| Advanced models | **Interface-only** | Registry stubs refuse |
| Clinical CDS | **Out of scope / refused** | Guardrails present |

---

## 4. Test coverage (smoke)

### 4.1 Neon cutover (`bun scripts/smoke-neon-cutover.ts`)

| Check | Result |
|-------|--------|
| JWKS | **200 ok** |
| jose remote JWK set | **ok** |
| Tables | `evidence_records`, `user_roles` |
| Counts | roles **0**, evidence **0**, auth_users **0** |
| Role trigger `on_neon_auth_user_created_role` | **present** |
| Admin rows | **0** (owner must signup then SQL-grant) |

### 4.2 Vercel HTTP

| Path | Status (no follow) |
|------|---------------------|
| `/` | 200 |
| `/auth` | 307 → auth UI (browser OK) |
| `/evidence`, `/methods`, `/simulator`, `/dynamics`, `/disease`, `/therapy`, `/patient`, `/research` | 200 |
| `/learn`, `/mechanism`, `/graph`, `/reasoning` | 307 (client routing / search params — content reachable in browser) |
| `/curation` | 200 shell; mutations require Neon session + admin |

### 4.3 Ask API (Vercel POST `/api/ask`)

| Case | Result |
|------|--------|
| Personal clinical (“Should I take methotrexate…”) | **200** educational refusal text |
| TNF → RA educational | **200** OpenAI stream (`[TNF](concept:M001)…`) |
| Browser Ask dialog | Opens; educational disclaimer; send path exercised |

### 4.4 Not verified this pass (honest gaps)

| Item | Status |
|------|--------|
| Full register → sign-in → sign-out round-trip against prod Neon | **Not run** — would create a real prod user; Neon currently has **0** users |
| Role defaults to `user` on first signup | **Code + trigger present**; live signup not exercised |
| Admin/curation write gate end-to-end | **Blocked** until owner creates account + admin SQL |
| Evidence persistence after import/approve | **Blocked** — DB empty; no admin session in this audit |
| Full vitest suite | Prefer targeted files (disk); hang risk on full suite remains |
| Lighthouse / CWV / Ask load soak | **Not run** |
| SME gold-set signature | **Awaiting SME** |

### 4.5 Local automation

- Targeted: `evidence-invariants`, `ai-grounding`, `smoke-prd-a2`, `a11y` as disk allows.
- `bun run sme:status` — human checklist status only.

---

## 5. Scientific evidence audit

| Metric | Result |
|--------|--------|
| Runtime relationships | 536 |
| Dangling / duplicate `relId`s | **0** (prior graph integrity) |
| Neon `evidence_records` | **0** |
| Approved claim-linked records | **0** |
| Relationship queue (repo) | 40 slots / 37 cited links; unreviewed candidates only |
| Exemplar pathways | TNF–RA, PD-1/PD-L1, IFN–SLE — graph-connected scaffolds; maturity from approved cites (none yet → `scaffold`) |
| Coverage honesty | Only `relationship_id` + approved + `supports` counts as claim support |

**Conclusion:** Graph IDs are sound. Neon pipeline is ready. **Approved** claim-level coverage is still **0** — Gate C fails for any “supported” marketing claim. Do not mass-approve.

---

## 6. Security report

### 6.1 Authentication & authorisation (post-Neon)

- Runtime: **Neon Managed Better Auth** + JWKS (`requireNeonAuth` / `jose`).
- Curation mutations: admin check via `public.has_role(..., 'admin')` on Neon.
- Signup trigger assigns **`user` only** (`assign_initial_role_neon`). Explicit admin:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM neon_auth."user"
WHERE email = 'YOUR_EMAIL'
ON CONFLICT (user_id, role) DO NOTHING;
```

- Supabase PostgREST is **not** the runtime path for auth/curation after `76c96b2`. Legacy Supabase files may remain for Lovable history.

### 6.2 Evidence write invariants (engineering P0 — code)

- Editing PMID/DOI/`source_ref` → `check_status=pending`, **clears** `curation` to `unreviewed`, resets `claim_support` to `unassessed`, clears reviewer metadata.
- `curation=approved` **rejected** unless `relationship_id` mapped **and** `claim_support` ≠ `unassessed`.
- UI no longer bulk-approves identifier-only rows; button is “Approve N claim-assessed”.

### 6.3 AI endpoint & spend

| Control | Status |
|---------|--------|
| Rate limit 8/min/IP (in-memory) | Soft / per-isolate — accepted beta risk |
| Message history cap 10; max 500 chars | Yes |
| Emergency disable | Env-gated |
| Provider | Lovable gateway **or** OpenAI BYOK (`OPENAI_API_KEY` / compat `OPEN_API_KEY`) |
| Citation validation before return | **Enforced in `ask.server.ts`** (buffers model text) |
| Durable distributed limiter / cost dashboards | **Not shipped** — note only; prefer gateway/Redis later |

### 6.4 Secrets

- Production needs: `DATABASE_URL*`, Neon Auth URLs, Ask key (`OPENAI_API_KEY` preferred).
- Prefer renaming `OPEN_API_KEY` → `OPENAI_API_KEY` in Vercel dashboard after smoke.
- Leave `IMMUNE_ASK_DISABLED` unset for normal ops.

---

## 7. Performance report

| Condition | Result |
|-----------|--------|
| HTML TTFB (spot) | Homepage ~1.4 s cold; other layers ~250–400 ms this pass |
| Ask educational | Completes; not latency-benchmarked under load |
| Lighthouse / CWV | **Not run** |

---

## 8. Accessibility report

| Check | Result |
|-------|--------|
| Skip link / nav / Ask labels | Present on Vercel |
| Automated suite | `bun run a11y` |
| Human keyboard/contrast | **Open** |
| SME gold-set | **Awaiting SME** — `docs/SME_GOLD_SET_SIGNOFF.md` |

---

## 9. Defect register

| ID | Sev | Description | Status |
|----|-----|-------------|--------|
| D-01 | P0 | Vercel Ask key / stream | **Closed** (prod smoke) |
| D-02 | P0 | Abstention before key | **Closed** |
| D-03 | P0 | Emergency Ask disable | **Closed** (env unset = on) |
| D-04 | P0 | First-signup auto-admin | **Closed in Neon trigger** (user-only); live admin still needs owner SQL after first signup |
| D-05 | P0 | Zero approved claim evidence | **Open (science)** — queue ready, Neon empty |
| D-13 | P0 | Source edit left stale approved claim | **Fixed in code** (`evidenceInvariants` / `updateRecord`) — deploy required |
| D-14 | P0 | Bulk “Approve verified” = claim approval | **Fixed in code** (server + UI) — deploy required |
| D-15 | P0 | Ask used `relationshipStatus(edge, [])` | **Fixed in code** (Neon reviewed cites + validation) — deploy required |
| D-06 | P1 | Dual public URLs diverge | **Open (product)** |
| D-08 | P1 | In-memory rate limit | **Accepted for beta** |
| D-09 | P1 | Lexical Ask false-positives | **Open** |
| D-11 | P2 | Vitest hang risk | **Open** |
| D-12 | P2 | Eval 50 << SME gold | **Open** |

---

## 10. Changes in this refresh (local; not committed unless owner asks)

| File | Rationale |
|------|-----------|
| `src/lib/immune/evidenceInvariants.ts` | Pure approval / source-edit rules |
| `src/lib/evidence.functions.ts` | `updateRecord` enforces invariants |
| `src/lib/askGrounding.ts` | Ground with cites; REVIEWED_EVIDENCE lines; prompt v3 |
| `src/lib/ask.server.ts` | Load approved Neon evidence; validate before return |
| `src/lib/immune/evidenceStatus.ts` | Optional curation filter on cites |
| `src/lib/immune/exemplarPathways.ts` | Maturity from cites; `exemplarQueueFocus` |
| `src/routes/_authenticated/curation.tsx` | Claim-assessed approve only; exemplar callout |
| `src/routes/reasoning.tsx` | Exemplars use approved cites for maturity |
| `src/test/evidence-invariants.test.ts` | Unit coverage for P0 rules |
| `docs/CURATOR_EVIDENCE_QUEUE.md` | Demo pathway priority |
| `docs/RELEASE_AUDIT.md` | This refresh |

---

## 11. Unresolved blockers / remaining owner actions

1. **Owner: Neon Auth** — Sign up once on https://immunecity.vercel.app/auth; confirm role defaults to `user`.
2. **Owner: Admin SQL** — Grant `user_roles.admin` for that email (see §6.1). Never rely on auto-admin.
3. **Owner: Curator** — Import relationship queue → check IDs → assess `claim_support` on exemplar pathways first → approve. **Do not invent PMIDs.**
4. **Owner: Vercel** — Prefer `OPENAI_API_KEY`; optional remove mis-named `OPEN_API_KEY` after smoke.
5. **Owner: SME / a11y** — Sign `docs/SME_GOLD_SET_SIGNOFF.md`; complete human keyboard/contrast.
6. **Engineering deploy** — Publish local P0 fixes (D-13/14/15) to Vercel when ready (owner asks for commit/push).

---

## 12. Publication status

- Neon cutover already on `origin/main` (`76c96b2`).
- Canonical: **https://immunecity.vercel.app**.
- Local P0 evidence/Ask fixes in workspace — **not pushed** unless requested.
- Human claim approve + SME signature still required for Gate C / E.

---

## 13. Rollback instructions

1. Vercel: promote prior deployment / redeploy last known-good SHA.
2. Ask emergency: `IMMUNE_ASK_DISABLED=1`.
3. Neon: do not wipe `user_roles` or `evidence_records` for rollback; restore prior app SHA only.
4. Auth: if Neon Auth misbehaves, keep Lovable secondary online until fixed.

---

## 14. Sign-off checklist

| Role | Status | Notes |
|------|--------|-------|
| Product owner | ☐ | Accept CONDITIONAL GO + §11 |
| Engineering | ☐ | Neon cutover live; P0 invariant/Ask fixes need deploy |
| Security | ☐ | Trigger present; live admin/RBAC after first signup **pending owner** |
| Scientific review | ☐ | 0 approved; exemplar scaffolds; gold set **awaiting SME** |
| Accessibility | ☐ | Automated suite runnable; human remainder open |
| Release owner | ☐ | Canonical = Vercel |

---

## Gates A–H

| Gate | Result | Evidence |
|------|--------|----------|
| **A — Security** | **CONDITIONAL** | Neon Auth + user-only trigger; admin grant pending first signup; write invariants in code |
| **B — Data integrity** | **PASS** (graph) | No dangling/duplicate IDs in prior integrity |
| **C — Scientific honesty** | **FAIL** for “supported” claims | 0 approved claim links on Neon |
| **D — Functional integrity** | **CONDITIONAL** | Layers + Ask smoke OK; auth/curation E2E pending owner |
| **E — AI reliability** | **CONDITIONAL** | Prod clinical refuse + TNF stream; citation gate in code (needs deploy); SME open |
| **F — Accessibility** | **CONDITIONAL** | `bun run a11y`; human items open |
| **G — Operations** | **CONDITIONAL** | Canonical Vercel; soft rate limit; no durable cost monitor |
| **H — Public deployment** | **CONDITIONAL** | Neon on `main`/Vercel; dual hosts remain |

---

## FINAL DECISION

# **CONDITIONAL GO** (canonical: https://immunecity.vercel.app)

Neon cutover is live. Ask educational + clinical abstention work on production. Engineering P0s for evidence approval and Ask←reviewed evidence are implemented locally and need deploy. Remaining blockers are **human-only**:

- Neon signup + admin SQL
- Curator claim assess/approve (Gate C; still 0/536)
- SME sign-off + human a11y (Gates E/F)

Do not claim full GO until those owner actions close.

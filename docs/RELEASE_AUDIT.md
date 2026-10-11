# Immune City — Full Production Readiness Audit

**Audit refresh (UTC):** 2026-10-11 (playbook engineering ship: assurance + Academy scaffold + curator pass 2)  
**Release scope:** Public educational scientific exploration beta — **not** clinical decision support  
**Roadmap:** Immune City Enhancement Roadmap & Production Gaps v1.0 + Next-Step Implementation Playbook v1.0 (11 Oct 2026)  
**Canonical production:** https://immunecity.vercel.app  
**Auditor method:** Code inspection; Neon MCP SQL (production); NCBI esummary PMID title checks for new curator rows; Vercel/GitHub SHA at prior audit

---

## 1. Executive verdict

### **CONDITIONAL GO** for public educational beta on **https://immunecity.vercel.app**

| Layer | State |
|-------|--------|
| GitHub `main` / local HEAD | Pending this ship commit (was **`2d1c288`** aligned with Vercel before push) |
| Vercel production | Was **`2d1c288`** READY — redeploy expected after this push |
| Neon **production** branch | Full schema; admin present; **9** approved+supports relationship claims after curator pass 2 |
| Neon **vercel-dev** branch | Schema present (local smoke default); curator inserts applied to **production** |
| Gate C (approved claims) | **9** approved+supports relationship links / **549** runtime — honest progress, not coverage theatre |

**Still required for unqualified GO:** (1) ~~owner signup + admin~~ **done**; (2) ~~TNF→RA on-path cites~~ **done (3/3 edges)**; remaining exemplar gaps (esp. full IFN→SLE / PD-L1 edges); (3) SME gold-set + human a11y.

**Playbook engineering in this ship:** EvidenceServiceError outage path (Ask + coverage UI); approve requires `claim_support=supports`; Academy foundation track scaffold on Mechanism; verified curator inserts (no invented PMIDs).

---

## 2. Deploy truth

| Item | Value |
|------|--------|
| Repo | GitHub `gnaneshwer23/immunecity` |
| Local HEAD | `2d1c288009cca8d6946e3d9423b043394f9a66cd` |
| `origin/main` | `2d1c288` (identical at audit time) |
| Vercel production SHA | `2d1c288` (READY, target=production, deploy `dpl_Bh1RnVMg1aPUembYotCiGugCTjJp`) |
| Deploy identity | **WORKING / aligned** |
| Canonical URL | https://immunecity.vercel.app |
| Secondary URL | https://immune-city.lovable.app — divergent; keep until deliberately retired |
| Auth / DB | Neon Managed Better Auth + drizzle/postgres |
| Graph | KG **0.3** + extensions **draft-ext-4** · 260 core / 70 draft concepts · 549 runtime relationships · 15 spine · 12 layers |

### Landmark commits on `main` (cutover → HEAD)

| SHA | Topic |
|-----|--------|
| `76c96b2` | Neon Auth + Postgres cutover |
| `ef188d3` | Approval invariants + Ask ← Neon reviewed evidence |
| `21086f6` | Verified-identifier gate + `evidence_audit_events` |
| `3eed909` | Phase B `draft-ext-4` + domain coverage |
| `8f9d634` | Phase C lit handoff from coverage gaps |
| `60c9448` | Phase D model registry honesty gates |
| `a0478fa` | Phase E workbench lit/Ask import UX |
| `37a5fa8` | Release audit refresh + Gate C exemplar approvals |
| `2d1c288` | Landing / trust-layer educational-beta copy |

---

## 3. Architecture

### Auth + Postgres (Neon)

- Runtime sign-in / curation: `src/integrations/neon/*` + `requireNeonAuth` + `public.has_role`.
- Evidence writes: `src/lib/evidence.functions.ts` (admin-gated); approval logic in `src/lib/immune/evidenceInvariants.ts`.
- Ask grounding: browser-safe `prepareAsk` / `validateAnswerCitations` (`askGrounding.ts`) → server `loadReviewedEvidenceForRels` + citation gate (`ask.server.ts` → `POST /api/ask`).

### Leftover Supabase

- `src/integrations/supabase/*` and env vars remain in repo for historical / Lovable Cloud paths.
- **Runtime curation/auth no longer import Supabase** (confirmed by import scan). Safe cleanup is a follow-up after Lovable host retirement (`docs/NEON_CUTOVER.md`).

### Evidence invariants (IC-02)

- Source edit → unreviewed + claim reset.
- Approve requires `relationship_id` + `claim_support=supports` + check status `verified`/`matched` (partial/contradicts/unrelated cannot approve).
- Append-only `evidence_audit_events` in app schema — **present on Neon production + vercel-dev** (D-17 closed via `bun run db:neon-schema` against production).
- Unknown `relationship_id` rejected by zod before write.

### Twelve layers

`NAV_GROUPS` exposes **12** primary layers: Overview, Cell atlas, Mechanism, Knowledge graph, System simulator, Dynamics, Disease, Therapy, Evidence, Patient, Reasoning, Research. Tools: Citation curation, Methods & trust. Workbench lives **on Research** (not a 13th nav item).

---

## 4. PRD phases A–E

| Phase | Status | Evidence |
|-------|--------|----------|
| **A / A2** | **DONE** | Commit `2f6f433`; Ask classification/abstention/citation validation; mechanism workspace; 50-case eval; `bun scripts/smoke-prd-a2.ts` **ALL PASSED** this audit |
| **B** | **PARTIAL** | `3eed909`; `draft-ext-4`; domain coverage + gap queue; immunogenetics teaching fills; exemplar **curation improved** (Gate C 9/549) |
| **C** | **PARTIAL** | `8f9d634`; literature step machine + Research UI + unreviewed export; **no live PubMed bulk ingest** |
| **D** | **PARTIAL** | `60c9448`; 7 registry adapters (5 interface-only + 2 planned); `implementedModels() === []`; stub dry-run only |
| **E** | **PARTIAL** | `a0478fa`; workbench step gating + Ask/lit/mechanism imports + lit handoff; **no lab execution / KG write-back** |

Machine-readable: `src/data/implementation-phases.ts` → B–E all `partial`.

---

## 5. Enhancement Roadmap IC-01…IC-16

| ID | Roadmap item | Status | Notes |
|----|--------------|--------|-------|
| IC-01 | Neon production verification | **PARTIAL→GO path** | JWKS OK; prod DDL complete; **admin + curation E2E exercised** (queue import, PubMed check, claim assess/approve) |
| IC-02 | Approval state machine | **DONE in code** / **live on prod** | Invariants enforced in UI (wrong-PMID rows rejected; ID verify ≠ claim approve) |
| IC-03 | Ask ← approved Neon evidence | **DONE in code** | Outage vs empty distinguished; **9** approved+supports cites after curator pass 2 |
| IC-04 | Final citation validation | **DONE** (live) | Buffer model text → `validateAnswerCitations` before return |
| IC-05 | Canonical release audit | **DONE (this doc)** | Canonical URL + SHA alignment recorded |
| IC-06 | Exemplar pathways | **PARTIAL** | **TNF→RA 3/3 on-path approved** (Chu/Feldmann/Lipsky). PD-1 partial (Barber + KEYNOTE). IFN→SLE improved (López IFN→BAFF; Shin belimumab–BAFF; Navarra belimumab→SLE); other IFN/SLE edges open; Morand remains partial; Groom/Stohl stay rejected |
| IC-07 | Universal detail panel | **PARTIAL** | Shared `ScientificInspector` in Shell; not every layer identical |
| IC-08 | Unified graph snapshot | **DONE** | `graphReleaseSnapshot()` on home/shell/Methods/Ask |
| IC-09 | Spine navigation | **PARTIAL** | 15-step spine live; keyboard/mobile polish open |
| IC-10 | Evidence filters | **PARTIAL** | Curation + coverage filters; graph-wide evidence-tier filter incomplete |
| IC-11 | Curation gap queue | **DONE (candidates)** | Relationship queue + exemplar focus; no auto-approve |
| IC-12 | Capability labels | **PARTIAL** | Methods/research stubs labelled; not every surface |
| IC-13 | Compare | **PARTIAL / planned** | Ask compare class exists; dedicated evidence-aware UI later |
| IC-14 | Research workbench | **PARTIAL** | Phase E draft workspace; no auto core-graph promotion |
| IC-15 | Distributed rate limits | **NOT SHIPPED** | In-memory 8/min/IP accepted for beta |
| IC-16 | A11y/perf sign-off | **PARTIAL** | `bun run a11y` available; human keyboard/contrast + Lighthouse open |

---

## 6. Smoke evidence (this pass)

### 6.1 HTTP — https://immunecity.vercel.app (2026-10-11)

| Path | Result |
|------|--------|
| `/` | **200** (~40 KB) |
| `/auth` | **307→200** (`/auth?redirect=/curation`, ~13 KB) |
| `/evidence` | **200** |
| `/curation` | **200** |
| `/research` | **307→200** |
| `/methods` | **200** |
| Layers `/learn` `/graph` `/simulator` `/dynamics` `/disease` `/therapy` `/patient` `/reasoning` `/mechanism/*` | **200** (some via 307→canonical query) |

### 6.2 Ask — `POST /api/ask` (UIMessage body)

| Probe | Result |
|-------|--------|
| Clinical (“treat my RA”) | **200** streamed refusal/educational abstention path |
| TNF→RA educational | **200** streamed grounded-style answer |
| Wrong body (`{q:…}`) | **400** `Invalid request.` (expected — needs `messages[]`) |

Model key is configured in production (stream returns content beyond abstention-only).

### 6.3 Neon

| Check | vercel-dev (local `DATABASE_URL`) | production |
|-------|-----------------------------------|------------|
| JWKS | **200 ok** (`smoke:neon`) | **200 ok** (prod-targeted `smoke:neon`) |
| `user_roles` / `evidence_records` | present | present |
| `evidence_audit_events` | **present** | **present** |
| `on_neon_auth_user_created_role` | **present** | **present** |
| `has_role` / `assign_initial_role_neon` fns | present | present |
| Evidence / Gate C | Prefer live SQL | **9** approved+supports relationship claims (Gate C); queue imported; admin present |
| `bun run smoke:neon` | **EXIT 0** (against vercel-dev via `.env.local`) | **EXIT 0** when `DATABASE_URL*` forced to production |

### 6.4 Local PRD smoke

| Check | Result |
|-------|--------|
| `bun scripts/smoke-prd-a2.ts` | **ALL PASSED** (50 eval cases + unit checks) |
| SME harness | `signOffStatus: awaiting_sme`; 50 automated cases; gap to PRD target 50 |

### 6.5 Not verified

| Item | Status |
|------|--------|
| Register → sign-in → sign-out on prod Neon | **Not run** |
| Admin curation write + audit persistence on **production** DB | **Blocked** — no admin (schema ready) |
| Full vitest suite | Hang risk (D-11); prefer targeted / smoke scripts |
| Lighthouse / CWV | **Not run** |

---

## 7. Scientific evidence

| Metric | Result |
|--------|--------|
| Runtime relationships | **549** |
| Runtime nodes | **330** (260 core / 70 draft) |
| Neon evidence (production) | Queue imported; **9** approved + `supports` relationship claims (Gate C, Neon SQL 2026-10-11). |
| Approved claim-linked | **9 / 549** |
| Exemplars | All three **connected**; TNF→RA on-path reviewed; PD-1 / IFN→SLE partially reviewed |
| SME gold-set | **Awaiting SME** (`docs/SME_GOLD_SET_SIGNOFF.md`) |

Do **not** mass-approve or invent PMIDs.

---

## 8. Security & ops

- Neon Auth + JWKS; curation mutations admin-gated via `has_role`.
- Signup trigger assigns **`user` only** when present; admin via explicit SQL (`docs/NEON_CUTOVER.md`).
- Role trigger **`on_neon_auth_user_created_role`** present on production + vercel-dev (D-17 closed).
- Approval invariants + identifier verified/matched gate in code; `evidence_audit_events` present on production.
- Ask: clinical abstain before model; emergency disable via `IMMUNE_ASK_DISABLED` / `ASK_EMERGENCY_DISABLE`; citation validation before return (**live** on `2d1c288`).
- Keys: prefer `OPENAI_API_KEY`; `OPEN_API_KEY` kept as temporary Vercel backward compat (`ask.server.ts`). Also accepts `LOVABLE_API_KEY` gateway.
- Rate limit: in-memory soft limit — accepted beta residual (IC-15 open).

---

## 9. Defect register

| ID | Sev | Description | Status |
|----|-----|-------------|--------|
| D-01…D-04 | P0 | Ask key / abstention / disable / auto-admin | **Closed** (code + Neon trigger design) |
| D-05 | P0 | Sparse approved claim evidence (Gate C) | **Open (science)** — 9/549; exemplars improved but incomplete |
| D-13 | P0 | Source edit left stale approved | **Closed** on `main` + deployed |
| D-14 | P0 | Bulk identifier approve | **Closed** on `main` + deployed |
| D-15 | P0 | Ask ignored Neon cites | **Closed** on `main` + deployed |
| D-16 | P0 | Vercel prod SHA lags GitHub | **Closed** at `2d1c288`; expect lag until this ship deploys |
| D-19 | P1 | DB outage reported as empty citations (Ask + coverage) | **Fixed in this ship** (typed `EvidenceServiceError` / Ask outage reply) |
| D-20 | P1 | Approval allowed any assessed `claim_support` | **Fixed in this ship** — approve requires `supports` |
| D-17 | P0 | Neon **production** missing `evidence_audit_events` + role trigger | **Closed (ops)** — applied `bun run db:neon-schema` to production (`ep-blue-salad…`); prod + vercel-dev both have audit table + role trigger; prod smoke EXIT 0 |
| D-06 | P1 | Dual public URLs | Open |
| D-08 | P1 | In-memory rate limit | Accepted for beta |
| D-18 | P1 | Local `.env.local` points at vercel-dev; prod smoke must use production URL | Open (ops hygiene) |
| D-11 | P2 | Vitest hang risk | Open |

---

## 10. Owner actions (ordered)

1. ~~**Ops (P0):** Apply Neon DDL to production~~ — **done** (`db:neon-schema` on `ep-blue-salad…`; D-17 closed).
2. ~~**Owner:** Sign up~~ — **done** (`gnaneshwer.jadav+immunecity@gmail.com`, admin).
3. ~~**Owner:** Grant admin~~ — **done**.
4. **Curator (in progress):** Queue imported (40 slots). **3** approved+supports links; **2** rejected (PMID≠claim). Next: literature for TNF→RA edges (`REL-M001-contributes_to-D001`, `REL-I001-targets-M001`, `REL-C003-produces-M001`); honest belimumab cite for `REL-I018-neutralises-M016`; stronger PD-L1→CD8 and IFN→BAFF/SLE edges. No invented PMIDs.
5. **SME / a11y:** Sign `docs/SME_GOLD_SET_SIGNOFF.md`; complete keyboard/contrast.

---

## 11. Gates A–H

| Gate | Result | Evidence |
|------|--------|----------|
| **A — Security** | **CONDITIONAL** | Neon Auth + JWKS; prod role trigger present; write invariants on deployed SHA; admin E2E pending |
| **B — Data integrity** | **PASS** (graph) | Snapshot 0.3+draft-ext-4; 549 rels load |
| **C — Scientific honesty** | **PARTIAL** | **9 / 549** approved+supports links. TNF→RA on-path complete; PD-1/IFN–SLE partial; wrong-PMID rows stay rejected |
| **D — Functional** | **CONDITIONAL** | 12 layers + Ask stream OK; auth/curation E2E pending |
| **E — AI reliability** | **CONDITIONAL** | Prod Ask stream + smoke-prd-a2 pass; SME open; 3 approved cites available to Ask |
| **F — Accessibility** | **CONDITIONAL** | Automated runnable; human open |
| **G — Operations** | **CONDITIONAL** | Soft rate limit; **prod Neon DDL drift (D-17) closed**; local smoke still defaults to vercel-dev (D-18) |
| **H — Deployment** | **PASS** | Canonical Vercel SHA = GitHub `main` = `2d1c288` |

---

## FINAL DECISION

# **CONDITIONAL GO** (canonical: https://immunecity.vercel.app)

Pre-push baseline was **`2d1c288`**. This ship adds D-19/D-20 assurance, Academy foundation scaffold, and curator pass 2 (Gate C **9/549** on Neon production). Remaining blockers for full GO: **remaining exemplar edges**, **SME/a11y**, redeploy SHA alignment. Vitest full suite / focused runner **NOT RUN** this pass (prior hangs).

Do not claim full GO or “evidence-grounded scientific AI” until Gate C has broader approved relationship claims on all three exemplar pathways and Gate E has SME sign-off.

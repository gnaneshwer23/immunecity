# Immune City — Full Production Readiness Audit

**Audit refresh (UTC):** 2026-10-11 (post-roadmap gap review)  
**Release scope:** Public educational scientific exploration beta — **not** clinical decision support  
**Roadmap:** Immune City Enhancement Roadmap & Production Gaps v1.0 (11 Oct 2026)  
**Canonical production:** https://immunecity.vercel.app  
**Auditor method:** Code inspection; Neon smoke; Vercel deployment API; GitHub `main` SHA; live Ask smoke (prior pass)

---

## 1. Executive verdict

### **CONDITIONAL GO** for public educational beta on **https://immunecity.vercel.app**

| Layer | State |
|-------|--------|
| GitHub `main` | `ef188d3` — approval invariants + Ask ← Neon reviewed evidence (**pushed**) |
| Vercel production | Still **`76c96b2`** (Neon cutover only) — **P0 Ask/evidence fixes not yet deployed** |
| Neon DB | JWKS OK; `user_roles`, `evidence_records`, `evidence_audit_events` present; **0** users / **0** evidence / **0** admins |
| Gate C (approved claims) | **0 / 536** — science blocked until curator review |

**Still required for unqualified GO:** (1) Vercel deploy of `ef188d3`+; (2) owner Neon signup + admin SQL; (3) curator claim assess/approve on exemplar pathways; (4) SME gold-set + human a11y.

---

## 2. Environment and release identity

| Item | Value |
|------|--------|
| Repo | GitHub `gnaneshwer23/immunecity` |
| Latest commit on `main` | `ef188d3` — *Enforce approval invariants and ground Ask on Neon reviewed evidence* |
| Local workspace (this refresh) | Uncommitted follow-ups: identifier-verified approval gate + `evidence_audit_events` + audit doc sync |
| Canonical URL | https://immunecity.vercel.app |
| Secondary URL | https://immune-city.lovable.app — divergent; keep until deliberately retired |
| Vercel production SHA | `76c96b2` (READY) — **lags GitHub by ≥1 commit** |
| Auth / DB | Neon Managed Better Auth + drizzle/postgres |
| Graph | KG **0.3** + extensions **draft-ext-3** · 260 core / 66 draft concepts · 536 runtime links · 15 spine |

---

## 3. Roadmap gap matrix (IC-01…IC-16)

| ID | Roadmap item | Status | Notes |
|----|--------------|--------|-------|
| IC-01 | Neon production verification | **PARTIAL** | JWKS/schema/counts smoke **PASS**; full signup→admin→curation E2E **BLOCKED** (0 users) |
| IC-02 | Approval state machine | **DONE in code** (needs deploy + schema) | Source-edit invalidation; reject approve without rel+claim; **identifier verified/matched required**; append-only `evidence_audit_events`; unknown `relationship_id` rejected by zod |
| IC-03 | Ask ← approved Neon evidence | **DONE in code** (needs deploy) | `loadReviewedEvidenceForRels` + `prepareAsk(..., cites)` |
| IC-04 | Final citation validation | **DONE in code** (needs deploy) | Buffer model text → `validateAnswerCitations` before return |
| IC-05 | Canonical release audit | **IN PROGRESS** | Canonical URL declared; this doc refreshed; prod SHA lag documented |
| IC-06 | Exemplar pathways | **SCAFFOLD** | TNF–RA / PD-1 / IFN–SLE graph chains + curator focus; maturity=`scaffold` until approved cites |
| IC-07 | Universal detail panel | **PARTIAL** | Shared `ScientificInspector` used widely; not every layer identical |
| IC-08 | Unified graph snapshot | **DONE** | `graphReleaseSnapshot()` on home/shell/Methods/Ask trace |
| IC-09 | Spine navigation | **PARTIAL** | 15-step spine live on overview; keyboard/mobile polish open |
| IC-10 | Evidence filters | **PARTIAL** | Curation + coverage filters; graph-wide evidence-tier filter incomplete |
| IC-11 | Curation gap queue | **DONE (candidates)** | Relationship queue + exemplar focus; no auto-approve |
| IC-12 | Capability labels | **PARTIAL** | Methods/research stubs labelled; not every surface |
| IC-13 | Compare | **PARTIAL / planned** | Ask compare class exists; dedicated evidence-aware UI later |
| IC-14 | Research workbench | **PARTIAL** | Phase E draft workspace; no auto core-graph promotion |
| IC-15 | Distributed rate limits | **NOT SHIPPED** | In-memory 8/min/IP accepted for beta |
| IC-16 | A11y/perf sign-off | **PARTIAL** | `bun run a11y` available; human keyboard/contrast + Lighthouse open |

---

## 4. Smoke evidence (this / prior pass)

### 4.1 Neon (`bun run smoke:neon`) — 2026-10-11

| Check | Result |
|-------|--------|
| JWKS | **200 ok** |
| jose | **ok** |
| Tables | `evidence_records`, `user_roles` (+ `evidence_audit_events` after schema apply) |
| Counts | roles **0**, evidence **0**, auth_users **0** |
| Role trigger | **present** |
| Admin rows | **0** |

### 4.2 Vercel production

| Item | Result |
|------|--------|
| Deployed SHA | `76c96b2` (not `ef188d3`) |
| HTTP layers / Ask clinical refuse / TNF stream | **PASS** on prior pass under `76c96b2` |
| IC-02/03/04 behaviour on prod | **NOT LIVE** until redeploy |

### 4.3 Not verified

| Item | Status |
|------|--------|
| Register → sign-in → sign-out on prod Neon | **Not run** |
| Admin curation write + persistence | **Blocked** — no admin |
| Full vitest suite | Hang risk (D-11); prefer targeted / `bun -e` for pure modules |
| SME gold-set signature | **Awaiting SME** |
| Lighthouse / CWV | **Not run** |

---

## 5. Scientific evidence

| Metric | Result |
|--------|--------|
| Runtime relationships | 536 |
| Neon evidence rows | **0** |
| Approved claim-linked | **0** |
| Queue | 40 candidate slots / 37 cited links — unreviewed only |
| Exemplars | Scaffold until approved + `supports` |

Do **not** mass-approve or invent PMIDs.

---

## 6. Security & AI controls

- Neon Auth + JWKS; curation mutations admin-gated via `has_role`.
- Signup trigger assigns **`user` only**; admin via explicit SQL.
- Approval invariants: source edit → unreviewed + claim reset; approve needs relId + assessed claim + **verified/matched** check; audit row written in same transaction.
- Ask: clinical abstain before model; emergency disable env; citation validation before return (**on `main`, not yet on Vercel**).
- Rate limit: in-memory soft limit — accepted beta residual (IC-15 open).

---

## 7. Defect register

| ID | Sev | Description | Status |
|----|-----|-------------|--------|
| D-01…D-04 | P0 | Ask key / abstention / disable / auto-admin | **Closed** (code + Neon trigger) |
| D-05 | P0 | Zero approved claim evidence | **Open (science)** |
| D-13 | P0 | Source edit left stale approved | **Fixed on `main`** — deploy pending |
| D-14 | P0 | Bulk identifier approve | **Fixed on `main`** — deploy pending |
| D-15 | P0 | Ask ignored Neon cites | **Fixed on `main`** — deploy pending |
| D-16 | P0 | Vercel prod SHA lags GitHub `main` | **Open (ops)** — redeploy needed |
| D-06 | P1 | Dual public URLs | Open |
| D-08 | P1 | In-memory rate limit | Accepted for beta |
| D-11 | P2 | Vitest hang risk | Open |

---

## 8. Owner actions (ordered)

1. **Ops:** Confirm why Vercel did not deploy `ef188d3`; redeploy production from `main`.
2. **Owner:** Sign up on https://immunecity.vercel.app/auth; confirm role=`user`.
3. **Owner:** Grant admin via SQL in `docs/NEON_CUTOVER.md`.
4. **Engineering (when asked):** Commit/push local audit-events + identifier gate follow-ups; re-apply `bun run db:neon-schema` on each env.
5. **Curator:** Import queue → check IDs → assess exemplar pathway claims → approve. No invented PMIDs.
6. **SME / a11y:** Sign `docs/SME_GOLD_SET_SIGNOFF.md`; complete keyboard/contrast.

---

## 9. Gates A–H

| Gate | Result | Evidence |
|------|--------|----------|
| **A — Security** | **CONDITIONAL** | Neon Auth + trigger; live RBAC after first signup; write invariants on `main` |
| **B — Data integrity** | **PASS** (graph) | Prior integrity; re-run after data changes |
| **C — Scientific honesty** | **FAIL** for “supported” claims | 0 approved |
| **D — Functional** | **CONDITIONAL** | Layers + Ask OK on `76c96b2`; auth/curation E2E pending |
| **E — AI reliability** | **CONDITIONAL** | Prod abstain/stream on old SHA; citation gate on `main` only; SME open |
| **F — Accessibility** | **CONDITIONAL** | Automated runnable; human open |
| **G — Operations** | **CONDITIONAL** | Soft rate limit; deploy lag D-16 |
| **H — Deployment** | **CONDITIONAL** | Canonical Vercel; SHA mismatch vs GitHub |

---

## FINAL DECISION

# **CONDITIONAL GO** (canonical: https://immunecity.vercel.app)

Neon cutover is live in production. Engineering P0s for evidence approval and Ask grounding are on GitHub `main` (`ef188d3`) but **not yet on Vercel**. Remaining blockers: **redeploy**, **human Neon admin**, **curator claim review**, **SME/a11y**.

Do not claim full GO or “evidence-grounded scientific AI” until Gate C has real approved relationship claims and Gate E has SME sign-off.

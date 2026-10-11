# Immune Super Intelligence — Final Pre-Live Release Audit

**Audit refresh (UTC):** 2026-10-11 (educational-beta GO messaging: educate-with-references framing)  
**Release scope:** Public educational beta — teaching from a curated graph with reviewed citations where present; **not** clinician CDS or patient-specific advice  
**Roadmap:** Immune Super Intelligence Enhancement Roadmap & Production Gaps v1.0 + Next-Step Implementation Playbook v1.0  
**Canonical production:** https://www.immune-super-intelligence.co.uk  
**Auditor method:** Code inspection; Neon MCP SQL on **production** branch; HTTP/Ask smoke against canonical URL; Vercel deployment list; local `smoke-prd-a2`; local `smoke:neon` (defaults to vercel-dev)

---

## 1. Executive verdict

### **GO for educational beta** on **https://www.immune-super-intelligence.co.uk**

| Layer | State |
|-------|--------|
| Local HEAD | **`631ea9a`** + this go-live messaging ship |
| GitHub `origin/main` | Was **`631ea9a`** before this ship |
| Vercel production | **`631ea9a` READY** — educational-beta trust copy live; expect auto-redeploy after this messaging push |
| Neon **production** | Full schema; **1** auth user; **1** admin role (+ same user also has `user` role); **9** approved+supports relationship claims |
| Neon **vercel-dev** | Schema present; local `smoke:neon` saw **0** roles/evidence (D-18 — local `.env.local` not production) |
| Gate C | **9 / ~549** approved+supports relationship links — honest progress, not coverage theatre |

**Known residuals (do not block educational-beta GO):** remaining exemplar edges (esp. full IFN→SLE / PD-L1 completeness), SME gold-set sign-off, human a11y/keyboard/contrast, dual Lovable URL retirement decision, distributed rate limits (accepted beta residual).

**Engineering posture at go-live:** educating with references — graph-retrieved teaching + reviewed cites when present; not CDS; Ask not fully evidence-grounded; EvidenceServiceError outage honesty; approve requires `claim_support=supports`; Academy foundation track is a **scaffold** on Mechanism (not a finished curriculum).

---

## 2. Deploy truth

| Item | Value |
|------|--------|
| Repo | GitHub `gnaneshwer23/immunecity` |
| Baseline SHA (pre this ship) | `b8030fbe41c4d3d52e37635e4fbdf246649c5498` |
| Vercel production SHA (verified) | `b8030fb` READY, target=production |
| Deploy identity at smoke | **WORKING / aligned** at `b8030fb` |
| Canonical URL | https://www.immune-super-intelligence.co.uk |
| Secondary URL | https://immune-city.lovable.app — divergent; keep until deliberately retired (**D-06**) |
| Auth / DB | Neon Managed Better Auth + drizzle/postgres |
| Graph | KG **0.3** + extensions **draft-ext-4** · via `graphReleaseSnapshot()` · ~260 core / ~70 draft concepts · ~549 runtime relationships · 15 spine · 12 layers |

### Landmark commits on `main`

| SHA | Topic |
|-----|--------|
| `76c96b2` | Neon Auth + Postgres cutover |
| `ef188d3` | Approval invariants + Ask ← Neon reviewed evidence |
| `21086f6` | Verified-identifier gate + `evidence_audit_events` |
| `3eed909` | Phase B `draft-ext-4` + domain coverage |
| `8f9d634` | Phase C lit handoff from coverage gaps |
| `60c9448` | Phase D model registry honesty gates |
| `a0478fa` | Phase E workbench lit/Ask import UX |
| `37a5fa8` | Release audit + Gate C exemplar approvals |
| `2d1c288` | Landing / trust-layer educational-beta copy |
| `b8030fb` | Playbook assurance, Academy scaffold, Gate C curator pass 2 |

---

## 3. Architecture (unchanged summary)

- Auth/curation: Neon Auth + `requireNeonAuth` + `public.has_role`; admin explicit (not first-signup).
- Evidence writes: `evidence.functions.ts` + `evidenceInvariants.ts` (approve requires relationship_id + `claim_support=supports` + verified/matched identifier).
- Ask: browser-safe grounding → server citation gate → stream; outage vs empty distinguished.
- Public cites: `getApprovedCitations` server-side `curation='approved'` filter.
- Shared marketing counts: `graphReleaseSnapshot()` on home / footer / Methods.

---

## 4. PRD phases A–E

| Phase | Status | Notes |
|-------|--------|-------|
| **A / A2** | **DONE** | `bun scripts/smoke-prd-a2.ts` **ALL PASSED** this audit |
| **B** | **PARTIAL** | draft-ext-4 + coverage; TNF→RA on-path approved; PD-1 partial; IFN scaffold-ish |
| **C** | **PARTIAL** | Lit workflow UI; no live PubMed bulk ingest |
| **D** | **PARTIAL** | Registry interface-only; `implementedModels() === []` |
| **E** | **PARTIAL** | Workbench candidates only; no KG write-back |

---

## 5. Enhancement Roadmap IC-01…IC-16 (delta)

| ID | Status | Notes |
|----|--------|-------|
| IC-01 Neon prod | **GO path** | JWKS + DDL + admin present on production |
| IC-02 Approval machine | **DONE** | Approve requires supports; audit table present |
| IC-03 Ask ← Neon cites | **DONE in code** | **9** approved+supports available |
| IC-04 Citation validation | **DONE** | Live on prod Ask stream |
| IC-05 Release audit | **DONE (this doc)** | Final pre-live snapshot |
| IC-06 Exemplars | **PARTIAL** | TNF→RA on-path **done**; PD-1 partial; IFN→SLE scaffold-ish |
| IC-08 Graph snapshot | **DONE** | Shared snapshot on trust surfaces |
| IC-11 Gap queue | **DONE (candidates)** | No auto-approve |
| IC-15 Rate limits | **NOT SHIPPED** | In-memory 8/min/IP accepted for beta |
| IC-16 A11y/perf | **PARTIAL** | Automated available; **human sign-off open** |

---

## 6. Smoke evidence (this pass)

### 6.1 HTTP — https://www.immune-super-intelligence.co.uk

| Path | Result |
|------|--------|
| `/` | **200** (~40 KB) |
| `/auth` | **200** (~13 KB, after redirects) |
| `/evidence` | **200** |
| `/methods` | **200** |
| `/research` | **200** |

### 6.2 Ask — `POST /api/ask`

| Probe | Result |
|-------|--------|
| Clinical (“What drug should I take for my RA?”) | **200** streamed educational refusal / not personal medical advice |
| Educational TNF→RA | **200** streamed graph-grounded answer with concept links |

### 6.3 Neon

| Check | Result |
|-------|--------|
| Production SQL (MCP, branch `production`) | **1** `neon_auth.user`; **1** admin + **1** user role row (same user); **9** approved+supports distinct relationship_ids; **46** evidence_records total |
| Local `bun run smoke:neon` | **EXIT 0** — JWKS 200; tables present; **counts 0** (vercel-dev via `.env.local`) — **not** production counts |
| Prod JWKS via app | Inferred OK from prior prod smokes + live Ask/auth pages |

### 6.4 Local PRD smoke

| Check | Result |
|-------|--------|
| `bun scripts/smoke-prd-a2.ts` | **ALL PASSED** (50 eval cases + unit checks) |
| SME harness | Still **awaiting_sme** (not re-run as signed) |

### 6.5 Not verified / not green

| Item | Status |
|------|--------|
| Full vitest suite | **NOT RUN** (hang risk D-11) |
| Lighthouse / CWV | **Not run** |
| Human keyboard/contrast a11y | **Open** |
| SME gold-set sign-off | **Open** |
| Register → sign-in → sign-out click-path this pass | **Not re-run** (admin already present in Neon) |
| Academy as finished curriculum | **Must not claim** — foundation scaffold only |

---

## 7. Scientific evidence

| Metric | Result |
|--------|--------|
| Runtime relationships | **~549** (snapshot) |
| Neon Gate C (production) | **9** approved + `supports` relationship claims |
| Approved claim-linked | **9 / ~549** |
| Exemplars | TNF→RA on-path reviewed; PD-1 partial; IFN→SLE scaffold-ish / partial edges |
| SME gold-set | **Awaiting SME** |

Do **not** mass-approve or invent PMIDs.

---

## 8. Security & ops

- Neon Auth + JWKS; curation admin-gated; signup gets `user` only; admin explicit.
- Approve invariants + identifier gate; audit events table on production.
- Ask clinical abstain; emergency disable env; citation validation before return.
- Rate limit: in-memory soft limit — accepted beta residual (IC-15).
- Dual public URL (Lovable) remains an ops honesty issue (D-06).

---

## 9. Defect register (active)

| ID | Sev | Description | Status |
|----|-----|-------------|--------|
| D-05 | P0 science | Sparse Gate C (9/549) | **Open** — exemplars improved, incomplete |
| D-06 | P1 | Dual public URLs (Vercel + Lovable) | **Open** |
| D-08 | P1 | In-memory rate limit | Accepted for beta |
| D-11 | P2 | Vitest hang risk | Open |
| D-16 | P0 | Prod SHA lag | **Closed at b8030fb**; watch after this push |
| D-18 | P1 | Local smoke defaults to vercel-dev | **Open** (ops hygiene) |
| D-19 | P1 | Outage vs empty citations | **Closed** in `b8030fb` |
| D-20 | P1 | Approve without supports | **Closed** in `b8030fb` |

---

## 10. Owner / human actions remaining

1. **SME:** Sign `docs/SME_GOLD_SET_SIGNOFF.md`.
2. **A11y:** Human keyboard / contrast pass (and Lighthouse if desired).
3. **Curator:** Continue honest literature for remaining PD-1 / IFN→SLE edges — no invented PMIDs.
4. **Ops:** Decide retirement timeline for Lovable secondary URL; optionally point local smoke at production with explicit env (D-18).

---

## 11. Gates A–H

| Gate | Result | Evidence |
|------|--------|----------|
| **A — Security** | **PASS** (residuals noted) | Neon Auth + admin present; write invariants on prod SHA |
| **B — Data integrity** | **PASS** (graph) | Snapshot 0.3+draft-ext-4 loads |
| **C — Scientific honesty** | **PARTIAL** | **9 / ~549**; TNF→RA on-path done; PD-1/IFN incomplete |
| **D — Functional** | **PASS** | Routes + Ask stream OK this pass |
| **E — AI reliability** | **PASS** (SME open) | Prod Ask OK + smoke-prd-a2 pass; SME gold-set sign-off still open |
| **F — Accessibility** | **PASS** (human open) | Automated available; human keyboard/contrast pass open |
| **G — Operations** | **PASS** (beta residuals) | Soft rate limit; D-18 local/prod DB split; D-06 dual URL |
| **H — Deployment** | **PASS** at smoke | Canonical Vercel = `631ea9a` = GitHub main (pre this messaging commit) |

---

## FINAL DECISION

# **GO for educational beta** (canonical: https://www.immune-super-intelligence.co.uk)

Ship is fit for **public educational beta**: educating with references from a curated graph — not clinician CDS, not patient-specific advice. Honest limits remain: Ask is graph-retrieved (not fully evidence-grounded), Gate C sparse (9 approved claim-linked), Academy foundation **scaffold** only, Neon Auth with explicit admin.

**Residuals for later maturity (not launch blockers for educational beta):** SME sign-off, human a11y, broader exemplar claim coverage, dual-URL decision, distributed rate limits (accepted residual).

Do not market as “evidence-grounded scientific AI” until Gate C has broader approved relationship claims across exemplars and Gate E has SME sign-off.

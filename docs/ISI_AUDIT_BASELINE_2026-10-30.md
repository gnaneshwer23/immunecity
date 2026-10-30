# ISI Audit Baseline — 30 Oct 2026

Phase 0 inventory for **ISI — GitHub Audit Report and Enhancement Plan v1.0**.
Principle: Audit → Stabilise → Enhance → Validate → Release.

Repo: `https://github.com/gnaneshwer23/immunecity` · Live: `https://www.immune-super-intelligence.co.uk/`  
Baseline HEAD at start of this pass: `e5e4996` (Trial Intelligence P0).

---

## 1. Key routes (TanStack Start)

| Area | Paths |
| --- | --- |
| Home / marketing | `/`, `/overview`, `/platform`, `/vision`, `/about`, `/collaborate`, `/insights` |
| Learn / Explore | `/learn`, `/atlas`, `/atlas/$id`, `/graph`, `/disease`, `/therapy`, `/patient`, `/mechanism`, `/mechanism/$id`, `/dynamics`, `/simulator`, `/pipeline`, `/pipeline/$disease` |
| Investigate | `/ask`, `/reasoning`, `/scientific-ai`, `/evidence`, `/methods`, `/evidence-methods`, `/research`, `/research-workbench`, `/workspace` |
| Academy | `/academy` |
| Community | `/community`, `/community/new`, `/community/topic/$slug`, `/community/post/$postId`, `/community/journal-clubs`, `/community/moderation`, `/community/saved`, `/community/notifications`, `/community/profile`, `/community/profile/$userId` |
| Auth / trust | `/auth`, `/_authenticated/curation`, `/privacy`, `/terms`, `/disclaimer`, `/accessibility` |
| API | `/api/ask`, `/api/ask/prepare`, `/sitemap.xml` |

Journey IA: `JOURNEY_NAV` in `src/data/marketingNav.ts` (Learn / Explore / Investigate).

**Trial Intelligence UI surface (flag-gated):** `/atlas/$id` for `TRIAL` nodes via `TrialIntelligencePanel`; Methods honesty always on `/methods` (`TrialIntelligenceMethodsNote`).

---

## 2. Packages / stack (selected)

- Runtime: TanStack Start + React Router, Vite, Bun scripts, Vitest, Playwright.
- Data: Neon Postgres + Drizzle (`src/lib/db.server.ts`, `src/lib/db/schema.server.ts`).
- Auth: Neon Managed Better Auth (`src/integrations/neon/*`).
- AI: Vercel AI SDK (`ai`, `@ai-sdk/openai`) for Ask.
- Graph: browser-safe `src/data/kg.json` + `src/lib/immune/engine.ts`.

---

## 3. Schemas (public)

Migrations `drizzle/migrations/0000`–`0015`. Notable tables:

- Curation: `evidence_records`, `evidence_audit_events`, `claim_candidates`, `user_roles`
- Community / academy / workspace: profiles, posts, comments, saves, appeals, notifications, journal clubs, `academy_member_progress`, `concept_saves`, `ai_evaluation_runs`
- **Trial Intelligence (0015):** `clinical_trials`, `trial_arms`, `endpoint_results`

Publication bibliography for pilots lives in fixtures (`src/data/trialIntelligence.ts`); not a separate DB table in 0015.

---

## 4. Feature flags

| Flag | Default | Purpose | Rollback |
| --- | --- | --- | --- |
| `VITE_TRIAL_INTELLIGENCE` (or `TRIAL_INTELLIGENCE`) | **OFF** | Gates Atlas Trial Intelligence panel | Unset / set `0` in Vercel Production → redeploy. No route removal. |

Implementation: `src/lib/trialIntelligenceFlag.ts`. Panel early-returns when off.

**Production status (2026-10-30):** `VITE_TRIAL_INTELLIGENCE` / `TRIAL_INTELLIGENCE` **absent** from Vercel Production, Preview, and Development env lists for project `immunecity` → Trial Intelligence UI **OFF** in live production. Do not enable for general production until A01–A05 checks pass.

---

## 5. Migration 0015 verify (ep-blue-salad)

| Table | Count | Fixture expected |
| --- | --- | --- |
| `clinical_trials` | 2 | 2 |
| `trial_arms` | 6 | 6 |
| `endpoint_results` | 24 | 24 |
| `evidence_records` | 46 | unchanged (not touched by 0015) |
| `user_roles` | 36 | unchanged |

Field-level fixture ↔ DB: **consistent** (`bun run db:trial-intelligence:check`).

Seed / import SOT: `src/data/trialIntelligence.ts`. Apply: `bun run db:trial-intelligence`.

---

## 6. Numerics spot-check (A02)

Independent PubMed efetch (2026-10-30):

| Trial | NCT | Key verified figures | Unverified |
| --- | --- | --- | --- |
| KEYNOTE-006 | NCT01866319 | ORR 33.7 / 32.9 / 11.9%; 6-mo PFS 47.3 / 46.4 / 26.5%; grade 3–5 TRAE 13.3 / 10.1 / 19.9% (PMID 25891173); 24-mo OS 55 / 55 / 43%; n=279/277/278 (PMID 28822576) | — |
| CheckMate 067 | NCT01844505 | Median PFS 11.5 (8.9–16.7) / 6.9 (4.3–9.5) / 2.9 (2.8–3.4) mo; grade 3–4 TRAE 55.0 / 16.3 / 27.3% (PMID 26027431); 5-yr OS 52 / 44 / 26% (PMID 31562797) | ORR left **null** (absent from verified abstracts) |

Note: PMID 28889792 reports different grade 3–4 rates (59 / 21 / 28%); fixtures correctly retain primary abstract values with a note. No fabricated PMIDs or NCT IDs.

---

## 7. Postgres read path (A03)

- Server: `src/lib/trialIntelligence.functions.ts` — `getTrialIntelligenceByGraphNode` / `resolveTrialIntelligence`.
- When DB available and honesty-validated → `source: "postgres"`.
- On outage / incomplete → fixture fallback (`source: "fixture"`, optional `unavailable`).
- Consistency: `bun run db:trial-intelligence:check`.

---

## 8. Out of this pass

AI agents expansion, new diseases, Research Workbench MVP, full review workflow UI (A04 beyond existing curation), biomarker schemas (A07), Ask eval overhaul (A10), Workbench A12–A14, commercial validation recruiting, enabling Trial Intelligence for general production.

---

## 9. Next audit phase

**Phase 1 / next:** ISI-A04 curation review hardening (existing workflow only) + remaining Trial P1 (comparison engine still deferred) → then Ask grounding evals (A10 light) before any production flag flip.

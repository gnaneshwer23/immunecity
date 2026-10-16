# Phase 1 — Audit & gap matrix

Date: 2026-10-17  
Local / production HEAD verified: `87db60448503aebb0f3cf7443457e71d0ae3e355`  
Canonical: https://www.immune-super-intelligence.co.uk/  
Production deploy: `dpl_9zaCHtiPwLynUARX38jUTHxRhSKk` (meta.githubCommitSha matches)

## What exists and works

| Area | Status | Evidence |
|------|--------|----------|
| Framework | Live | TanStack Start + Vite 8; routes in `src/routes/*` |
| Auth / curation | Live (admin-gated) | Neon Auth + `evidence.functions.ts`; roles in `user_roles` |
| Knowledge graph | Beta | `kg.json` 260 nodes / 395 links + draft `extensions.ts` |
| 12 atlas layers | Live | `nav.ts` groups; routes graph→research |
| Causal spine | Live | KG `core_spine` 15 steps; LOOP is feedback not a 16th step. Data key step 14 = `MODEL` (maps to brief “AI”) |
| Evidence classes | Live | ESTABLISHED / EVIDENCE-SUPPORTED / EMERGING / HYPOTHESIS (+ experimental via schema) |
| Ask / Scientific AI | Partial | Graph retrieval + honest “not fully evidence-grounded” labels; omics adapters planned/empty |
| Academy | Partial | Foundation navigable; intermediate scaffold; advanced empty — not certification |
| Marketing redesign | Live on prod | Midnight helix home + ivory editorial inner pages (commits through `87db604`) |
| Nav dead zone 801–1100 | Fixed | Hamburger via `.marketing-nav-toggle` ≤1100px |
| “More” menu | Removed intentionally | Insights footer-only until reviewed series exists (`MARKETING_NAV_MORE = []`) |
| Graph a11y table | Live | `GraphTable` text alternative under canvas |
| Capability honesty | Live | `capabilityStatus.ts` + Methods / Scientific AI status chips |

## Gaps vs master-prompt DoD (at audit time)

| Requirement | Gap | Priority |
|-------------|-----|----------|
| Graph as flagship immersive workspace | Still light atlas chrome; not midnight flagship treatment | P0 — Phase 4 |
| Mobile list/detail (not tiny graph) | Table buried in `<details>`; canvas still primary on small screens | P0 — Phase 4 |
| Starting points by concept family | Search only; no curated starters from real data | P1 — Phase 4 |
| Detail panel: limitations + evidence prominence | Node/edge panels exist; limitations copy weak | P1 — Phase 4 |
| Hero first-viewport CTAs on short heights | `min(90vh,780)` + large type can push CTAs below fold (~800px) | P1 — Phase 3 polish |
| Spine display “AI” vs data `MODEL` | Display says MODEL; brief asks AI — map label only | P2 |
| Full Phase 6 QA matrix | Spot-checks done historically; formal pass/fail after Phase 4 | P0 after build |
| Playwright e2e | Specs present; Chromium install skipped in agent env | Known limitation |
| Insights | Draft/footer only — correct per brief | No change |

## Preserve (do not break)

- 12 layers, 15-step spine, evidence status rules, Ask grounding, no fake PMIDs/metrics  
- Educational / not clinical framing  
- Lovable-safe history (no force-push)

## Implementation plan (remaining)

1. **Phase 4** — DONE in follow-up: immersive stage, Graph/List toggle (list default ≤900px), starting points from real KG, search miss honesty, limitations on node/edge panels, spine display maps MODEL→AI  
2. **Phase 3 polish** — DONE: tighter hero min-heights / type so CTAs stay in first viewport  
3. **Phase 6** — Browser QA at 360/768/1024/1440; nav/keyboard; prod SHA check after deploy  


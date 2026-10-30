# ISI Discovery Intelligence — Research Radar PRD (concise)

**Product:** Immune Super Intelligence  
**Surface name:** Research Discovery Radar  
**Baseline tip:** `e5526d6`  
**Audience:** Scientists and scientific trainees investigating immunology unknowns — not educational-only demos, not CDS.

## Problem

Investigators need to see **what remains unknown inside ISI’s evidence-governed scope**, why that uncertainty matters for a research agenda, and which **defensible next questions** follow — without mistaking missing curation for missing biology, and without fake discovery theatre.

## Goals

1. Personalised radar driven by a lightweight **research profile** (domains, diseases, modalities — no sensitive PII required).  
2. **Research gaps** as first-class, versioned records with coverage honesty and review lifecycle.  
3. Detection that emits only from **real ISI signals** (graph status, evidence, conflicts, melanoma matrix flags, trial linkage).  
4. Human scientific review before any gap is labelled `reviewed_gap`.  
5. Deep links into Ask, Atlas/Inspector, Evidence, Research Workbench — one product, one KG.

## Non-goals (this programme)

- Second knowledge graph or new vector stack.  
- Continuous large-scale PubMed / CT.gov ingestion (design adapters only).  
- Email alerts; Stripe / payment activation.  
- Mass ontology fill; assay cut-offs; auto SME gold scores.  
- Mass curated-graph expansion.  
- Clinical decision support or autonomous “novel discovery” claims.

## User journeys

| Journey | Path | Auth |
| --- | --- | --- |
| Onboarding | `/discovery/onboarding` | Signed-in |
| Profile | `/discovery/profile` | Signed-in (own only) |
| Radar home | `/discovery` | Signed-in preferred; public teaser OK |
| Gap list | `/discovery/gaps` | Signed-in preferred |
| Gap dossier | `/discovery/gaps/$gapId` | Public read for non-private; review actions gated |

IA: add **Investigate → Research Radar (I7)** only; avoid header clutter.

## Functional requirements

| ID | Requirement |
| --- | --- |
| DI-P1 | Create/update/get own `research_profiles`; account isolation |
| DI-P2 | Preferences JSON (interests, disease focus, modalities); no required sensitive PII |
| DI-P3 | Server-side entitlement stub: `free` vs `researcher_pro` (no billing) |
| DI-G1 | Additive gap tables; status taxonomy includes `coverage_insufficient` |
| DI-G2 | Detection emits `candidate` or `coverage_insufficient` only |
| DI-G3 | Never auto-transition to `reviewed_gap` |
| DI-G4 | Documented search scope on every candidate |
| DI-G5 | Seed zero fabricated gaps; matrix-derived seeds stay `candidate` |
| DI-R1 | Reuse reviewer/admin gates for gap review decisions + audit/version |
| DI-U1 | Radar list filters + dossier links (stretch OK if scaffolding) |
| DI-U2 | “Recommended because…” stub from profile interests |
| DI-T1 | Unit tests: isolation, status transitions, no auto-approve, coverage, entitlements |
| DI-T2 | Playwright: skip≠pass without credentials |

## Success metrics (engineering)

- Profiles cannot be read/written across accounts.  
- Detection unit tests never assert fabricated PMIDs.  
- Transition tests prove `reviewed_gap` requires reviewer role + explicit decision.  
- Public copy never claims worldwide literature absence.

## Pilots

- **Pilot A — Melanoma path:** matrix flags, honesty demotions, missing Gate C / locators → candidates.  
- **Pilot B — Conflict / coverage:** conflicting edges + `evidenceGap` classifications → candidates / coverage_insufficient.

## Release constraints

No prod deploy in this session; TI flag unchanged; no bulk approve; commits + push to `origin/main` when phases solid (no force).

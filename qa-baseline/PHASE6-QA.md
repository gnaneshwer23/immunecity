# Phase 6 — QA (2026-10-17)

Production SHA verified: `0eb7d17c10e9d30827e97a80dde58172c9369e66`  
Deploy: `dpl_BrLSF2p2qV7vYuwtBHfjTcqe3o4k`  
Aliases: www.immune-super-intelligence.co.uk, immune-super-intelligence.co.uk  

## Acceptance (master prompt DoD)

| Criterion | Result | Notes |
|-----------|--------|-------|
| Public routes load | Pass | `/`, `/overview`, `/academy`, `/scientific-ai`, `/methods`, `/graph` HTTP 200 |
| Nav + CTAs work | Pass | Marketing primary + Collaborate + Explore Immune City; hamburger ≤1100 |
| “More” menu | N/A (by design) | Removed; Insights footer-only until reviewed series |
| Responsive 360/768/1024/wide | Pass (spot) | Hero CTAs visible; 390 graph defaults to List & detail |
| No fabricated metrics/PMIDs | Pass | Starting points are real KG nodes; evidence labels unchanged |
| Graph search / starters / detail | Pass | Starters: CD8, TNF, PD-1, GC reaction, RA, TNF blockade; Graph/List toggle |
| Empty/filter miss honesty | Pass | Search miss + list filter miss copy |
| Keyboard / Escape compact nav | Prior pass | Not re-run full a11y suite this turn |
| Playwright e2e | Blocked | Chromium install skipped in agent env |
| Prod SHA after deploy | Pass | www aliases on `0eb7d17` |

## Remaining limitations

- Evidence coverage still sparse (honest Unreviewed badges on home pathway).  
- Academy intermediate/advanced scaffolds; Ask not fully evidence-grounded AI.  
- Omics adapters planned / empty registry.  
- Insights draft only (footer).  

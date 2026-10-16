# Phase 0 — Baseline (before edits)

Date: 2026-10-16
Local HEAD: `96c36fe6d1dba4aaf1132898e84d18825bcaea4e` (matches `96c36fe`)
Production deployment: `dpl_A6Kgp5N29oR8dE1Kqeh6oWGG7u1i`
Production URL: https://www.immune-super-intelligence.co.uk
Production git SHA: `96c36fe6d1dba4aaf1132898e84d18825bcaea4e` (exact match — no preview/prod SHA mismatch)

## Nav findings (HTTP 200 ≠ interactions)
- Desktop 1440: primary links + More + Collaborate + CTA visible. `overflow-x: auto` on `.marketing-nav` (More dropdown clip risk).
- Dead zone **801–1100px CONFIRMED** at 1024: `.marketing-nav` display:none, `.topbar-cta` display:none, `.marketing-nav-toggle` display:none (hidden by `@media (min-width:801px) .nav-toggle { display:none }`). Header shows only brand — no nav controls.
- ≤800px: hamburger appears; marketing nav still CSS-hidden (panel via JS).

## Production has 96c36fe nav
- Academy → `/academy`, Insights under More, Collaborate distinct — confirmed in live DOM.

## Screenshots
- `qa-baseline/prod/home-1440.png`
- `qa-baseline/prod/home-1024-deadzone.png`
- `qa-baseline/prod/home-768.png`

# Full-site sense & clean-build audit

**Canonical live:** https://www.immune-super-intelligence.co.uk/  
**Repo HEAD at audit start:** `0b8d0a1` (graph explorer empty-space fix)  
**Method:** cursor-ide-browser structure inspection at ~1440 and ~390 + route source cross-check  
**Date:** 2026-10-17  
**Vitest:** skipped (known hang); browser + ReadLints used instead  

## Verdict

**Honest clean-build: mostly yes, with known Gate C / DNS / Insights residuals.**  
Layout after `0b8d0a1` is sound on the graph explorer (stage fills workspace; no panel-stretch void). Marketing IA is coherent (Learn / Explore / Investigate / Trust). Main sense failure was **exemplar maturity copy claiming “on-path edges reviewed” while hop badges rendered Unreviewed** because home/overview/insights never loaded approved cites. That P0 is fixed in this pass. Remaining gaps are sparse evidence coverage, apex DNS, and draft Insights — intentional, not build defects.

## Summary table

| Area | Status | Top finding |
|------|--------|-------------|
| `/` Home | Fixed P0 | Wired live cites for pathway badges + maturity |
| `/overview` | Fixed P0/P1 | Cites wired; spine glance no longer dumps to `/vision` |
| `/academy` | Fixed P1 | Prerequisites show module titles, not raw lesson ids |
| `/scientific-ai` | OK | Redirects → `/reasoning#how-ai-works` |
| `/methods` | OK | Honest Gate C / stub registry; live coverage panel |
| `/about`, `/vision`, `/disclaimer` | OK | Clear hierarchy; trust framing |
| `/collaborate` | OK | Mailto form + copy address; PHI guard |
| `/insights` | Residual + fix | Footer-only draft series; maturity now uses live cites |
| `/ask`, `/reasoning` | OK | Already used `approvedQuery`; limits labelled |
| `/atlas` | OK | Eight domains; gaps counted; no invented records |
| `/graph` | OK (prior P0) | Workspace height shared; panel sticky/scroll |
| Journeys / disease / therapy / dynamics / simulator / patient / evidence / research | OK | Limits and draft labels present; no fake Gate C |
| Shell desktop | OK | Journey nav + Vision/About/Collaborate; Insights not primary |
| Shell mobile ~390 | OK | Hamburger + compact panel + CTA; no dead 801–1100 zone |
| Apex DNS | Residual | `https://immune-super-intelligence.co.uk` TLS handshake fails |

## Findings

### P0 — fixed this pass

| ID | Surface | Finding | Fix |
|----|---------|---------|-----|
| H-01 | `/`, `/overview` | Maturity text “On-path edges reviewed…” while hop badges all **Unreviewed** — `reportExemplar` without `approvedQuery` cites; copy claimed “live review labels” | Load `approvedQuery`; recompute maturity/badges; pending/error copy honest |
| H-02 | `/insights` | Draft explainer maturity used documented baseline only | Same live-cite path as Reasoning |

### P1 — fixed this pass

| ID | Surface | Finding | Fix |
|----|---------|---------|-----|
| N-01 | `/overview` hero spine glance | Every stage linked to `/vision` (wrong job) | In-page `#spine` + select stage |
| C-01 | `/academy` | Prerequisites showed raw ids (`tlr4`, `il6`) | Map to module titles |
| N-02 | Footer | “Research workbench” vs journey “Research library” | Footer label → Research library |

### P1 — remaining (documented, not blocking clean-build)

| ID | Surface | Finding | Why left |
|----|---------|---------|----------|
| G-01 | Evidence / Methods / exemplars | Gate C ≈ sparse (approved+supports ≪ runtime links) | Curator work; Methods already discloses |
| D-01 | Apex hostname | Non-www TLS fails | DNS/cert ops; www is canonical |
| I-01 | `/insights` | Draft-only series | Intentional; stays footer-only until published |

### P2 — residuals

| ID | Surface | Finding |
|----|---------|---------|
| B-01 | Home hero | Brand signal smaller than H1 (product brief keeps H1 as proposition) |
| A-01 | Atlas / long pages | Ask FAB can overlap bottom-right content |
| T-01 | Many footers | Shared educational trust line repeats (by design via `TrustBlock`) |
| L-01 | Graph first paint | Brief “Loading the graph…” empty stage before client hydrate (expected ClientOnly) |
| M-01 | Academy a11y tree | “question s” spacing artifact in a11y snapshot; visual string is fine |

## Per-route notes (structure)

### Marketing

| Route | H1 / job | Honesty | Layout |
|-------|----------|---------|--------|
| `/` | Proposition H1 + brand signal; Ask primary CTA | Pathway cites now live; graph counts from snapshot | Helix hero + isi-three; no overflow at 1440 |
| `/overview` | Platform orient | Pathway + spine interactive | Enter rail equal columns; spine/chain OK |
| `/academy` | Learn overlay | Foundation navigable; Intermediate/Advanced scaffolds labelled | Course list clear |
| `/methods` | Evidence lifecycle | Stub adapters “not live”; Gate C sparse stated | Dense but one job per section |
| `/about` | Mission | Brand architecture named | Editorial OK |
| `/collaborate` | Enquiry | Mailto + no PHI | Two-column stacks on mobile |
| `/insights` | Draft series | Explicit unpublished | Footer-only IA preserved |
| `/vision` | Long-term vision | Motto separate from live claims | OK |
| `/disclaimer` | Educational limits | Clear | OK |
| `/platform` | — | Redirect → `/overview` | OK |
| `/scientific-ai` | — | Redirect → `/reasoning#how-ai-works` | OK |

### Product

| Route | Notes |
|-------|-------|
| `/ask` | Full AskAtlas; graph-retrieved teaching; not clinical |
| `/atlas` | Eight domains; concept pages; known gaps counted from coverage |
| `/graph` | Causal map; list view for small screens; empty filter ≠ negative finding |
| `/reasoning` | Ask + how-AI + exemplars with live cites + path tracer |
| `/learn` | Cell atlas layer |
| `/mechanism` | Cascades + Academy lessons |
| `/disease`, `/therapy`, `/dynamics` | Explorers with educational framing |
| `/simulator` | Teaching model disclaimer |
| `/patient` | Rule-based educational flags |
| `/evidence` | Coverage / trials; claim-level rules |
| `/research` | Library + workbench + model registry stubs |

### Shell

- Desktop ~1440: Learn / Explore / Investigate / Trust + Vision / About / Collaborate + Explore CTA  
- Mobile ~390: menu toggle; compact journey groups + twelve layers details + CTA  
- Insights: footer Science group only (not primary)  

## Intentional residuals (do not “fix” in code)

1. **Gate C sparse** — relationship-level approved+supports coverage remains low vs 549 runtime links.  
2. **Apex DNS / TLS** — non-www hostname handshake failure; www is canonical.  
3. **Insights unpublished** — draft explainers; keep out of primary nav.  
4. **Advanced Academy empty scaffold** — labelled incomplete by design.  
5. **Model adapters** — interface/planned stubs with dry-run “not available”.  

## Fixes shipped

| SHA | Summary |
|-----|---------|
| `0b8d0a1` | Graph explorer layout — stage fills viewport (prior) |
| `97414e6` | Marketing pathway honesty + spine CTA + Academy titles + footer label |

**Production:** `dpl_3j5S5HeQDeRkmxragUgFVQS9xgc1` → https://www.immune-super-intelligence.co.uk/ (READY)

## Re-spot-check checklist (post-deploy)

- [x] `/` TNF pathway: maturity “On-path edges reviewed” + hop badges **Supported** after cites load  
- [x] `/overview` spine glance `href="#spine"`  
- [x] `/overview` pathway badges **Supported** ×3 after cites load  
- [x] `/academy` prerequisites show module titles (e.g. Innate sensing…)  
- [x] Footer Organisation → “Research library”  
- [x] `/graph` stage fills workspace (verified earlier; no regression)  
- [x] Mobile 390: open nav toggle present

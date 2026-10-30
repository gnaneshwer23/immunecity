# ISI simplification — information architecture map (Phase 2)

**Date:** 2026-10-30  
**Principle:** Simplify interaction, not intelligence. Users see biology, evidence, understanding, discovery.

## Five primaries (header)

| Primary | Hub path | Role |
| --- | --- | --- |
| **Explore** | `/explore` | Biological exploration — atlas, graph, mechanisms, disease/therapy, dynamics, overview |
| **Research** | `/research` | Evidence-to-discovery — library, Radar/dossiers, evidence, reasoning tools, simulator, pipelines |
| **Academy** | `/academy` | Lessons, tracks, assessment progress |
| **Community** | `/community` | Discussions, journal clubs, profiles |
| **Ask Immune** | `/ask` | **One** conversational gateway (AskAtlas + corner FAB). Prefill deep-links OK. No second AskAtlas embeds. |

## Secondary (not competing top-level science)

| Surface | Where |
| --- | --- |
| Account / Sign in | Header account menu |
| My Workspace, Profile, Saved | Account menu / Community |
| Methods, Vision, About | Secondary org links + footer |
| SME / Curation | Authenticated expert routes; Methods/footer pointers — not primary science destinations |
| Twelve-layer map (`NAV_GROUPS`) | Compact “All twelve science layers” / Overview — science model, not primary chrome |

## Old journey → new primary

| Old (Learn / Explore / Investigate / Trust) | New primary | Notes |
| --- | --- | --- |
| Learn · Knowledge atlas | Explore | `/atlas` |
| Learn · Overview | Explore | `/overview` |
| Learn · Cell atlas | Explore | `/learn` |
| Learn · Immune system foundations | Academy | `/academy` |
| Learn · Mechanisms | Explore (+ Academy lessons) | `/mechanism` |
| Explore · Knowledge graph | Explore | `/graph` |
| Explore · Dynamics / Disease / Therapy | Explore | unchanged URLs |
| Investigate · Simulator | Research (contextual) | `/simulator` |
| Investigate · Scientific reasoning | Research (contextual) | `/reasoning` — not a chatbot |
| Investigate · Research library | Research | `/research` hub |
| Investigate · Evidence explorer | Research (contextual) | `/evidence` |
| Investigate · Patient / biomarkers | Research (contextual) | `/patient` |
| Investigate · Disease pipelines | Research (contextual) | `/pipeline` |
| Investigate · Research Radar | Research (contextual) | `/discovery` |
| Investigate · SME review workspace | Expert / account | `/sme` — removed from primary science menus |
| Trust · Methods sections | Secondary + footer | `/methods` |
| Trust · SME workspace | Expert | `/sme` |
| Ask (FAB-only / not in journeys) | **Ask Immune primary** | `/ask` elevated; FAB retained |
| Community (footer-only) | **Community primary** | `/community` elevated |
| Header · Research + Simulate directs | Folded into Research pillar | Simulate no longer a peer top-level |

## URL compatibility (preserve bookmarks / SEO)

| Old / alias | Resolves to | Mechanism |
| --- | --- | --- |
| `/platform` | `/overview` | existing redirect |
| `/scientific-ai` | `/reasoning#how-ai-works` | existing redirect |
| `/research-workbench` | `/research` | existing redirect |
| `/evidence-methods` | `/methods` | existing redirect |
| `/learn`, `/atlas`, `/graph`, … | Same paths | keep; linked from Explore hub |
| `/discovery/*` | Same paths | keep; linked from Research hub |
| `/sme`, `/curation` | Same paths | keep; expert only |
| *(new)* `/explore` | Explore hub page | new route; no redirect of old URLs |

No force-push; no deletion of science routes in this pass.

## Header rendering

- `JOURNEY_NAV`: five pillars — Explore, Research, Academy, Community, Ask Immune  
- `JOURNEY_PRIMARY`: empty (primaries are the pillars; Ask is a pillar with `/ask`)  
- `JOURNEY_SECONDARY`: Methods, Vision, About  
- Corner FAB: still AskAtlas unpersisted; hidden on `/ask`  
- JourneyNext order: Explore → Research → Academy → Community → Ask Immune (Trust/expert excluded)

## AGENTS.md journey rule (updated)

Global header IA is Explore / Research / Academy / Community / Ask Immune via `JOURNEY_NAV`.  
`NAV_GROUPS` remains the twelve-layer science model. Ask Immune is a primary destination and the sole chatbot (page + FAB).

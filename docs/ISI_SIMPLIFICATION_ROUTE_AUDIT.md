# ISI simplification — full route audit (Phase 1)

**Date:** 2026-10-30  
**Tip at audit:** `4b47dd8`  
**Rule:** Map before delete/merge. Preserve KG, evidence, agents, Academy, Community, auth, governance, reviewer workflows.

Classification legend:

| Class | Meaning |
| --- | --- |
| **primary** | Top-level science destination (five primaries) |
| **contextual** | Detail / deep-link / nested under a primary |
| **expert** | Reviewer / curator / SME workspace |
| **account** | Signed-in member chrome |
| **marketing** | Org / trust / legal |
| **service** | API / cron / sitemap |
| **compat** | Redirect or legacy alias |
| **redundant?** | Candidate to fold into a hub later (URL kept) |

## Primary destinations (target IA)

1. **Explore** — `/explore` hub → atlas, graph, mechanisms, dynamics, disease, therapy, cell atlas, overview  
2. **Research** — `/research` hub → library/workbench + Radar/dossiers, evidence, reasoning, simulator, patient, pipelines  
3. **Academy** — `/academy`  
4. **Community** — `/community`  
5. **Ask Immune** — `/ask` (+ corner FAB; one AskAtlas transport)

---

## Route inventory

| Route | Purpose | Intended user | Class | Dependencies | Inbound links (high-signal) |
| --- | --- | --- | --- | --- | --- |
| `/` | Marketing homepage | Visitors | marketing → Ask-first landing | brand, graphRelease, exemplars, coverage loader | Canonical entry |
| `/explore` | Explore hub (new) | Learners / researchers | **primary** | JOURNEY_NAV Explore items | Header Explore |
| `/atlas` | Knowledge atlas index | Learners | contextual (Explore) | concepts, CONTENT | Explore, Ask, home |
| `/atlas/$id` | Concept page | Learners | contextual | concepts, engine, citations | Graph, Ask, Inspector |
| `/graph` | KG visualisation | Explorers | contextual (Explore) | GraphView ClientOnly, engine | Home, Ask, Atlas |
| `/mechanism` | → first lesson | Learners | compat | CONTENT.lessons | Explore, Academy |
| `/mechanism/$id` | Mechanism lesson | Learners / Academy | contextual | CONTENT, academy progress | Academy, Explore |
| `/dynamics` | Tissues / metabolism / genetics | Explorers | contextual (Explore) | CONTENT, engine | Explore menu |
| `/disease` | Disease explorer | Explorers | contextual (Explore) | CONTENT, engine | Explore menu |
| `/therapy` | Therapy explorer | Explorers | contextual (Explore) | CONTENT, trials | Explore menu |
| `/learn` | Cell atlas | Learners | contextual (Explore) | CONTENT | Explore menu |
| `/overview` | Causal spine / twelve layers | Visitors / learners | contextual (Explore) | CausalSpine, NAV_GROUPS | Home, footer Platform |
| `/platform` | Redirect → `/overview` | — | compat | redirect | Old bookmarks |
| `/research` | Research library + workbench | Researchers | **primary** | literature, collections, workbench | Header, home, Ask |
| `/research-workbench` | Redirect → `/research` | — | compat | redirect | Ask “Build from answer” |
| `/discovery` | Research Radar home | Researchers | contextual (Research) | discovery detection, dossiers | Research hub, Ask |
| `/discovery/gaps` | Gap list filters | Researchers | contextual | discovery functions | Radar |
| `/discovery/gaps/$gapId` | Dossier | Researchers / reviewers | contextual | dossier, Intel 4 panels | Radar, SME |
| `/discovery/onboarding` | Interest onboarding | Members | account/contextual | profile | Discovery |
| `/discovery/alerts` | Follow alerts | Members | account | follows | Discovery |
| `/discovery/profile` | Discovery profile | Members | account | profile | Discovery |
| `/evidence` | Evidence explorer | Researchers | contextual (Research) | citations coverage | Methods, Research |
| `/evidence-methods` | Redirect → `/methods` | — | compat | redirect | Legacy |
| `/reasoning` | Scientific reasoning tools | Researchers | contextual (Research) | askGrounding demos, path tracer | Investigate→Research |
| `/scientific-ai` | Redirect → `/reasoning#how-ai-works` | — | compat | redirect | Legacy |
| `/simulator` | Teaching system simulator | Learners | contextual (Research) | simulator model | Research menu |
| `/patient` | Biomarker teaching rules | Learners | contextual (Research) | patient rules | Research menu |
| `/pipeline` | Disease pipelines index | Researchers | contextual (Research) | pipeline data | Research menu |
| `/pipeline/$disease` | Pipeline detail | Researchers | contextual | pipeline data | Pipeline index |
| `/academy` | Academy landing | Learners | **primary** | curriculum, progress | Header, home |
| `/community` | Discussions | Community | **primary** | community functions | Header, home |
| `/community/new` | Start discussion | Members | contextual | auth | Community |
| `/community/journal-clubs` | Journal clubs | Community | contextual | community | Community |
| `/community/topic/$slug` | Topic | Community | contextual | community | Community |
| `/community/post/$postId` | Post | Community | contextual | community | Community |
| `/community/profile` | Own profile | Members | account | member | Account menu |
| `/community/profile/$userId` | Public profile | Community | contextual | community | Community |
| `/community/saved` | Saved posts | Members | account | community | Account |
| `/community/notifications` | Notifications | Members | account | community | Account |
| `/community/moderation` | Moderation | Moderators | expert | roles | Community |
| `/ask` | Ask Immune chatbot | All | **primary** | AskAtlas, askGrounding, `/api/ask` | Header, FAB, prefills |
| `/workspace` | My Workspace | Members | account | auth, collections | Account menu |
| `/auth` | Sign in / up | Visitors | account | Neon Auth | Header |
| `/sme` | Scientific review workspace | Reviewers / admin | expert | sme workQueue, Gate C tools | Account / Trust footer |
| `/curation` | Evidence curation queue | Reviewers / admin | expert | evidence.functions | Authenticated |
| `/collaborate` | Collaboration CTA | Org | marketing | CONTACT_EMAIL | Footer |
| `/methods` | Evidence lifecycle / limits | All | marketing/trust | coverage, STATUS_INFO | Footer, Ask |
| `/insights` | Insights series (footer) | Visitors | marketing | content | Footer |
| `/vision` | Vision | Visitors | marketing | vision data | Secondary nav |
| `/about` | About | Visitors | marketing | brand | Secondary nav |
| `/privacy` | Privacy | Legal | marketing | — | Footer Trust |
| `/terms` | Terms | Legal | marketing | — | Footer Trust |
| `/disclaimer` | Educational disclaimer | Legal | marketing | — | Footer Trust |
| `/accessibility` | Accessibility | Legal | marketing | — | Footer Trust |
| `/api/ask` | Ask model transport | Service | service | askGrounding, AI | AskAtlas |
| `/api/ask/prepare` | Ask prepare / grounding | Service | service | askGrounding | AskAtlas |
| `/api/cron/discovery-monitor` | Discovery monitor cron | Ops | service | discovery | Cron |
| `/sitemap.xml` | Sitemap | SEO | service | routes | Crawlers |

## Layer model (not primary chrome)

`NAV_GROUPS` (twelve atlas layers) remains the **science model** for overview / compact “All twelve science layers”. It is not the five-primary header.

## Redundancy notes (do not delete yet)

| Candidate | Why keep URL | Future fold |
| --- | --- | --- |
| `/overview` vs `/explore` | Overview is causal spine marketing | Explore hub links to overview |
| `/learn` vs `/academy` | Cell atlas vs curriculum | Explore vs Academy |
| `/reasoning` vs `/ask` | Reasoning is tools (tracer/demos), not a second chatbot | Research contextual |
| `/simulator`, `/patient`, `/pipeline` | Valuable tools | Research hub cards |
| SME in Investigate/Trust | Expert workspace | Account / Methods only |

## Inbound link patterns to preserve

- Ask prefills: `/ask?about=&q=` from Atlas, Discovery, Workbench, Reasoning  
- Concept IDs: `/atlas/$id`  
- Dossier: `/discovery/gaps/$gapId`  
- Compat redirects already present: `/platform`, `/scientific-ai`, `/research-workbench`, `/evidence-methods`

See `docs/ISI_SIMPLIFICATION_IA_MAP.md` for old → new mapping.

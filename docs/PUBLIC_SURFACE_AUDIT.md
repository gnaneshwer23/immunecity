# Public surface audit · 2026-11-03

This audit inventories every route source and its statically declared section IDs. It combines repository-wide source inspection with targeted browser checks; it is not a penetration test or proof that every API/authenticated workflow has been exercised. Dynamic headings/sections may be supplied by shared components and are not all expanded in this static inventory.

## Decisions implemented

- Public: landing, Atlas, graph, evidence, educational mechanisms, library, Academy, community and trust content. Source/review limitations remain visible.
- Internal: simulations, patient-rule tests, reasoning experiments, HSI consume/diagnostics, case fixtures, draft workbenches, model interfaces and quality dashboards. The common gate verifies the session and stored admin role on the server before mounting tools.
- Member workspace and evidence collections retain their existing account-scoped backend functions; no new roles or database grants are invented.
- Public Research no longer mounts candidate-drafting queues, model registries, roadmap/implementation phases or contextual test tools. Public literature metadata search remains server-connected.
- Methods retains scientific assumptions, evidence lifecycle and live coverage; admin dashboards/model-interface controls and phase ledgers move to the internal workspace.
- Central public-surface policy filters internal tools from journey menus, footer, legacy layer navigation, overview cards and sitemap. Protected routes use noindex.
- The legacy workbench alias and known case/workbench hashes route to the protected internal workspace. No query-string admin override is recognised.
- Public evidence/service error displays no longer echo runtime error details. Unavailable coverage is not shown as zero or healthy connectivity.

## Backend wiring and limits

`requireInternalResearchAccess` uses existing Neon authentication and server-side `assertAdministrator`. `loadInternalResearchProgramme` independently enforces the same role before returning fixtures. The shared UI gate never mounts operational children until the server response grants access. Existing curation, quality, collection and account endpoints retain their own server authorization; the UI gate does not replace those checks.

No new clinical database, migration, model inference or real trial matcher is created. The ISI database/Auth configuration must be verified separately. Fixture source code and published scientific packs are not confidential; route access control is not a claim that static assets are secret. The protected HSI routes retain their existing published-pack loaders; their operation panels are gated and client-rendered.

## Route and section inventory

| Route | Source | Declared section IDs | Disposition / backend imports |
| --- | --- | --- | --- |
| `root shell` | [__root.tsx](../src/routes/__root.tsx) | Shared components / no literal section IDs | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/curation` | [curation.tsx](../src/routes/_authenticated/curation.tsx) | `gates`, `hsi-bridge`, `review-queue`, `ontology`, `import`, `records` | Existing authenticated layout; endpoint role checks retained; imports: evidence.functions |
| `/` | [route.tsx](../src/routes/_authenticated/route.tsx) | Shared components / no literal section IDs | Existing authenticated layout; endpoint role checks retained; static/shared components or route-local handler |
| `/sme` | [sme.tsx](../src/routes/_authenticated/sme.tsx) | `workspace`, `checklist`, `links` | Existing authenticated layout; endpoint role checks retained; imports: evidence.functions |
| `/about` | [about.tsx](../src/routes/about.tsx) | `mission`, `architecture`, `principles`, `editorial`, `scientific-scope` | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/academy` | [academy.tsx](../src/routes/academy.tsx) | `course-map`, `foundation`, `scaffolds`, `extra-reading`, `connect` | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/accessibility` | [accessibility.tsx](../src/routes/accessibility.tsx) | `what-we-provide`, `known-limits`, `feedback` | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/ask` | [ask.tsx](../src/routes/ask.tsx) | Shared components / no literal section IDs | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/atlas/$id` | [atlas.$id.tsx](../src/routes/atlas.$id.tsx) | `xref-heading`, `cite-heading` | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/atlas/` | [atlas.index.tsx](../src/routes/atlas.index.tsx) | `atlas-q` | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/auth` | [auth.tsx](../src/routes/auth.tsx) | Shared components / no literal section IDs | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/collaborate` | [collaborate.tsx](../src/routes/collaborate.tsx) | `direct`, `form`, `email-error` | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/community/` | [community.index.tsx](../src/routes/community.index.tsx) | `recent-discussions` | Public reading / account-scoped operations as implemented; existing backend policy retained; imports: community.functions |
| `/community/journal-clubs` | [community.journal-clubs.tsx](../src/routes/community.journal-clubs.tsx) | Shared components / no literal section IDs | Public reading / account-scoped operations as implemented; existing backend policy retained; imports: phase3.functions, community.functions |
| `/community/moderation` | [community.moderation.tsx](../src/routes/community.moderation.tsx) | Shared components / no literal section IDs | Public reading / account-scoped operations as implemented; existing backend policy retained; imports: community.functions, phase3.functions |
| `/community/new` | [community.new.tsx](../src/routes/community.new.tsx) | Shared components / no literal section IDs | Public reading / account-scoped operations as implemented; existing backend policy retained; imports: community.functions |
| `/community/notifications` | [community.notifications.tsx](../src/routes/community.notifications.tsx) | `inbox` | Public reading / account-scoped operations as implemented; existing backend policy retained; imports: phase3.functions |
| `/community/post/$postId` | [community.post.$postId.tsx](../src/routes/community.post.$postId.tsx) | Shared components / no literal section IDs | Public reading / account-scoped operations as implemented; existing backend policy retained; imports: community.functions, phase3.functions |
| `/community/profile/$userId` | [community.profile.$userId.tsx](../src/routes/community.profile.$userId.tsx) | Shared components / no literal section IDs | Public reading / account-scoped operations as implemented; existing backend policy retained; imports: phase3.functions |
| `/community/profile/` | [community.profile.index.tsx](../src/routes/community.profile.index.tsx) | Shared components / no literal section IDs | Public reading / account-scoped operations as implemented; existing backend policy retained; imports: phase3.functions, privacy.functions |
| `/community/saved` | [community.saved.tsx](../src/routes/community.saved.tsx) | `saved` | Public reading / account-scoped operations as implemented; existing backend policy retained; imports: phase3.functions |
| `/community/topic/$slug` | [community.topic.$slug.tsx](../src/routes/community.topic.$slug.tsx) | Shared components / no literal section IDs | Public reading / account-scoped operations as implemented; existing backend policy retained; imports: community.functions, phase3.functions |
| `/disclaimer` | [disclaimer.tsx](../src/routes/disclaimer.tsx) | `what-this-product-is`, `what-this-product-is-not`, `evidence-and-drafts` | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/discovery/alerts` | [discovery.alerts.tsx](../src/routes/discovery.alerts.tsx) | `actions`, `inbox` | Public reading / account-scoped operations as implemented; existing backend policy retained; imports: monitor.functions |
| `/discovery/gaps/$gapId` | [discovery.gaps.$gapId.tsx](../src/routes/discovery.gaps.$gapId.tsx) | `question`, `why`, `evidence`, `open`, `actions`, `feedback`, `links` | Public reading / account-scoped operations as implemented; existing backend policy retained; imports: gaps.functions, profiles.functions |
| `/discovery/gaps/` | [discovery.gaps.index.tsx](../src/routes/discovery.gaps.index.tsx) | Shared components / no literal section IDs | Public reading / account-scoped operations as implemented; existing backend policy retained; imports: gaps.functions |
| `/discovery/` | [discovery.index.tsx](../src/routes/discovery.index.tsx) | `radar`, `emerging`, `contradictions`, `honesty`, `next` | Public reading / account-scoped operations as implemented; existing backend policy retained; imports: gaps.functions |
| `/discovery/onboarding` | [discovery.onboarding.tsx](../src/routes/discovery.onboarding.tsx) | `focus` | Public reading / account-scoped operations as implemented; existing backend policy retained; imports: profiles.functions |
| `/discovery/profile` | [discovery.profile.tsx](../src/routes/discovery.profile.tsx) | `plan`, `preferences` | Public reading / account-scoped operations as implemented; existing backend policy retained; imports: profiles.functions |
| `/disease` | [disease.tsx](../src/routes/disease.tsx) | `hypersensitivity`, `cancer-cycle` | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/dynamics` | [dynamics.tsx](../src/routes/dynamics.tsx) | `tissues`, `metabolism`, `genetics` | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/evidence-methods` | [evidence-methods.tsx](../src/routes/evidence-methods.tsx) | Shared components / no literal section IDs | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/evidence` | [evidence.tsx](../src/routes/evidence.tsx) | `live-coverage-heading`, `live-coverage`, `coverage`, `timeline`, `trials` | Public scientific/product/trust content; operations removed where identified; imports: citations.functions |
| `/explore` | [explore.tsx](../src/routes/explore.tsx) | `path`, `atlas`, `graph`, `mechanisms`, `biology`, `overview` | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/graph` | [graph.tsx](../src/routes/graph.tsx) | Shared components / no literal section IDs | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/hsi-consume` | [hsi-consume.tsx](../src/routes/hsi-consume.tsx) | `honesty`, `load`, `ask`, `gate-c`, `licensing`, `next` | Internal/admin; alias or common server-verified gate; static/shared components or route-local handler |
| `/hsi/discovery` | [hsi.discovery.tsx](../src/routes/hsi.discovery.tsx) | `error`, `workspace` | Internal/admin; alias or common server-verified gate; static/shared components or route-local handler |
| `/` | [index.tsx](../src/routes/index.tsx) | `demo-heading`, `precision-title`, `precision-work-heading`, `precision-mechanism-heading`, `precision-investigation-heading`, `precision-evidence-heading`, `precision-learning-heading`, `precision-close-heading` | Public scientific/product/trust content; operations removed where identified; imports: citations.functions |
| `/insights` | [insights.tsx](../src/routes/insights.tsx) | `release`, `drafts`, `read-first`, `phases` | Public scientific/product/trust content; operations removed where identified; imports: citations.functions |
| `/internal-research` | [internal-research.tsx](../src/routes/internal-research.tsx) | Shared components / no literal section IDs | Internal/admin; alias or common server-verified gate; imports: internalProgramme.functions |
| `/learn` | [learn.tsx](../src/routes/learn.tsx) | `entries` | Public scientific/product/trust content; operations removed where identified; imports: liveData.functions |
| `/mechanism/$id` | [mechanism.$id.tsx](../src/routes/mechanism.$id.tsx) | `cascade`, `perturbations`, `track` | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/mechanism/` | [mechanism.index.tsx](../src/routes/mechanism.index.tsx) | Shared components / no literal section IDs | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/methods` | [methods.tsx](../src/routes/methods.tsx) | `live-ev-heading`, `lifecycle`, `hsi-grades`, `statuses`, `ontology`, `trial-intelligence`, `models`, `limitations` | Public scientific/product/trust content; operations removed where identified; imports: citations.functions |
| `/overview` | [overview.tsx](../src/routes/overview.tsx) | `enter`, `pathway`, `draft-domains`, `spine`, `chain`, `route-panel`, `layers`, `honesty` | Public scientific/product/trust content; operations removed where identified; imports: citations.functions |
| `/patient` | [patient.tsx](../src/routes/patient.tsx) | Shared components / no literal section IDs | Internal/admin; alias or common server-verified gate; static/shared components or route-local handler |
| `/pipeline/$disease` | [pipeline.$disease.tsx](../src/routes/pipeline.$disease.tsx) | `mechanisms`, `active`, `limits` | Public scientific/product/trust content; operations removed where identified; imports: liveData.functions |
| `/pipeline/` | [pipeline.index.tsx](../src/routes/pipeline.index.tsx) | `diseases` | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/platform` | [platform.tsx](../src/routes/platform.tsx) | Shared components / no literal section IDs | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/privacy` | [privacy.tsx](../src/routes/privacy.tsx) | `what-we-process`, `browser-storage-and-external-services`, `export-and-delete`, `what-we-ask-you-not-to-send`, `contact` | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/reasoning` | [reasoning.tsx](../src/routes/reasoning.tsx) | `ask`, `how-ai-works`, `pathways`, `workspace`, `cases`, `tracer` | Internal/admin; alias or common server-verified gate; imports: citations.functions |
| `/research-workbench` | [research-workbench.tsx](../src/routes/research-workbench.tsx) | Shared components / no literal section IDs | Internal/admin; alias or common server-verified gate; static/shared components or route-local handler |
| `/research` | [research.tsx](../src/routes/research.tsx) | `discover`, `evidence`, `library`, `collections` | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/scientific-ai` | [scientific-ai.tsx](../src/routes/scientific-ai.tsx) | Shared components / no literal section IDs | Internal/admin; alias or common server-verified gate; static/shared components or route-local handler |
| `/simulator` | [simulator.tsx](../src/routes/simulator.tsx) | `host`, `run`, `teaching-models` | Internal/admin; alias or common server-verified gate; static/shared components or route-local handler |
| `/terms` | [terms.tsx](../src/routes/terms.tsx) | `licence-to-use`, `content-and-accuracy`, `accounts-and-curation`, `changes` | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/therapy` | [therapy.tsx](../src/routes/therapy.tsx) | `therapies` | Public scientific/product/trust content; operations removed where identified; imports: liveData.functions |
| `/vision` | [vision.tsx](../src/routes/vision.tsx) | `vision-h1`, `spine-h`, `diff-h`, `stages-h`, `who-h`, `not-h`, `ns-h` | Public scientific/product/trust content; operations removed where identified; static/shared components or route-local handler |
| `/workspace` | [workspace.tsx](../src/routes/workspace.tsx) | `paths`, `concepts`, `community` | Public reading / account-scoped operations as implemented; existing backend policy retained; imports: workspace.functions |

| `/api/ask/prepare` | [ask.prepare.ts](../src/routes/api/ask.prepare.ts) | Handler / redirect | Backend handler; existing endpoint authorization retained |
| `/api/ask` | [ask.ts](../src/routes/api/ask.ts) | Handler / redirect | Backend handler; existing endpoint authorization retained |
| `/api/cron/discovery-monitor` | [discovery-monitor.ts](../src/routes/api/cron/discovery-monitor.ts) | Handler / redirect | Backend handler; existing endpoint authorization retained |
| `/sitemap.xml` | [sitemap[.]xml.ts](../src/routes/sitemap[.]xml.ts) | Handler / redirect | Alias, redirect or infrastructure route; destination policy applies |

Inventory: 63 route source files.

## Verification

Targeted unit checks cover central navigation/sitemap exclusion and preservation of the synthetic programme logic. Browser checks cover Home, Research, Methods, Overview, About and Explore; internal tool destinations deny anonymous requests on desktop and mobile. Known fixture/workbench links are not exposed in public navigation. TypeScript and production build are required.

Authorized administrator workflows and member isolation were not newly exercised here because the required real Auth/database test credentials are unavailable. Existing admin-only E2E suites remain explicit skips without those credentials; skips are not passes. Deployment success must be verified after the main-branch push.

Verified: 295 Vitest tests and 357 Bun tests passed; targeted public-boundary browser tests passed on desktop and mobile. These results do not establish authorized admin workflows, live database writes or production deployment health.

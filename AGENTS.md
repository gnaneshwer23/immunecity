<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Product identity
- User-facing product name is **Immune Super Intelligence** (`src/lib/brand.ts`, canonical https://www.immune-super-intelligence.co.uk/). Internal paths may still say `immune-city`. Brand marks live in `public/favicon.svg`, `public/logo.svg`, and the Shell logo.

## Architecture rules
- Subdirectories have their own `AGENTS.md`; read it before changing files there.
- Leaf content routes own canonical and indexing metadata through `seoHead`; the root has no canonical; why: shared root metadata must not canonicalize every page to the homepage.
- Evidence curation reads use bounded keyset pages with server-side filters; why: evidence growth must not force the browser to load the entire table.
- App chrome, reading surfaces and scientific visualizations share semantic theme tokens in `src/biotech.css`; why: a theme change must reach every page and tool without isolated color overrides.
- Original atlas styling lives in `src/atlas.css`, with the editorial visual layer in `src/biotech.css` and tokens scoped to `html[data-theme]`; why: preserve scientific visualization classes while sharing the refreshed theme across pages.
- Graph data and reasoning (`src/lib/immune/engine.ts`) and page content (`src/data/*`) are plain browser-safe modules; why: every page reads them synchronously during SSR.
- The D3 graph (`GraphView`) is loaded via `React.lazy` behind `<ClientOnly>`; why: d3 touches the DOM and must not run during SSR.
- The knowledge graph is the user's KG JSON at `src/data/kg.json`; relation signs come from its `relation_semantics`; why: the curated graph is the source of truth, not code.
- Curation writes go through Neon Auth + admin-checked server functions in `src/lib/evidence.functions.ts`; PubMed/Crossref lookups run server-side in `src/lib/evidenceCheck.ts`; why: writes are admin-gated and external lookups shouldn't depend on the browser.
- Roles live in `user_roles`. Stored values stay `user` (member), `moderator`, `reviewer` (scientific reviewer), and `admin` (administrator). Visitor is logged out and has no row. New accounts get `user` only; moderator, reviewer, and admin are provisioned explicitly in Neon. `admin` keeps moderator and review power. Signup must not grant write or moderation access.
- Draft coverage additions (nodes, links, lessons, routes, patient rules) live in `src/data/extensions.ts` and are merged at load and flagged `draft`; why: the user's KG/CONTENT files stay untouched as the source of truth.
- Approved citations reach public pages via `getApprovedCitations` in `src/lib/citations.functions.ts` (server-side `curation = 'approved'` filter on Neon); why: graph pages are public but only approved records may leave curation.
- Homepage, footer, Methods and exports share counts via `graphReleaseSnapshot()` in `src/lib/immune/graphRelease.ts`; why: core vs draft totals must stay consistent across marketing surfaces.
- Ask Immune is the conversational intelligence gateway and a **primary** header destination: `/ask` (persisted AskAtlas) plus at most one corner FAB (same transport, unpersisted) — still one chatbot, not multiple; Discovery/dossier/Reasoning/workbench may deep-link into `/ask` with prefill; do not embed second AskAtlas copies on random pages; why: one chat UI as the source for building investigations.
- The corner assistant reuses AskAtlas in an accessible non-modal dialog, with local concept matching before AI submission; why: one lightweight entry handles lookup and explanation without blocking the page or charging for simple concept discovery.
- Ask retrieval, guardrails, intent routing and rate limiting live in browser-safe `src/lib/askGrounding.ts`; why: they are unit-tested without the AI call.
- Global header IA is the five destinations Explore / Research / Academy / Community / Ask Immune via `JOURNEY_NAV` in `src/data/marketingNav.ts`, shared by every page; `NAV_GROUPS` stays the twelve-layer science model (not primary chrome); account, saved research, Methods/Vision/About and expert workspaces (SME/curation) sit in secondary or account nav; why: five science destinations, layers remain the model.
- Shared ISI tokens and page patterns (dark band, breadcrumbs, library, homepage sections) live in `src/isi.css`, imported after `biotech.css`; why: one documented foundation without touching graph-specific styles.
- Breadcrumbs derive from `JOURNEY_NAV` inside `PageHead`; why: one menu definition drives navigation and wayfinding.
- Concept pages, Atlas domains, Ask prefill and neighbour grouping come from browser-safe `src/lib/immune/concepts.ts`; every internal concept link uses `/atlas/$id` by graph ID; why: Ask, Atlas, Inspector and Research share one identifier scheme instead of name matching.
- Atlas domain gaps are computed from keyword coverage of real graph concepts, never filled with authored content; why: the brief forbids invented scientific records.
- The full Ask page reuses `AskAtlas` with a single localStorage conversation key restored after hydration; the corner assistant stays unpersisted; why: one transport and guardrail path for both entries.
- Content pages use shared explainer blocks in `src/components/immune/explain.tsx` with a closed-by-default Sources fold; why: content first, references on demand.
- Journey pages share one anatomy from `src/components/immune/page.tsx` — `PageHead` → `PageToc` (sticky, scroll-spy) → numbered `Section`s → `JourneyNext` (rendered by `Shell`, previous/next in Explore → Research → Academy → Community → Ask Immune order from `JOURNEY_NAV`); explorers use `DetailPanel` + `Facts`, lists use `Toolbar`; why: every page reads in the same order and kickers name the journey, not legacy layer numbers.

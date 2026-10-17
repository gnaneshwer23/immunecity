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
- Original atlas styling lives in `src/atlas.css`, with the editorial visual layer in `src/biotech.css` and tokens scoped to `html[data-theme]`; why: preserve scientific visualization classes while sharing the refreshed theme across pages.
- Graph data and reasoning (`src/lib/immune/engine.ts`) and page content (`src/data/*`) are plain browser-safe modules; why: every page reads them synchronously during SSR.
- The D3 graph (`GraphView`) is loaded via `React.lazy` behind `<ClientOnly>`; why: d3 touches the DOM and must not run during SSR.
- The knowledge graph is the user's KG JSON at `src/data/kg.json`; relation signs come from its `relation_semantics`; why: the curated graph is the source of truth, not code.
- Curation writes go through Neon Auth + admin-checked server functions in `src/lib/evidence.functions.ts`; PubMed/Crossref lookups run server-side in `src/lib/evidenceCheck.ts`; why: writes are admin-gated and external lookups shouldn't depend on the browser.
- Roles live in `user_roles`; new accounts get `user`, and admin is provisioned explicitly in Neon (not first-signup); why: open signup must not auto-grant write access.
- Draft coverage additions (nodes, links, lessons, routes, patient rules) live in `src/data/extensions.ts` and are merged at load and flagged `draft`; why: the user's KG/CONTENT files stay untouched as the source of truth.
- Approved citations reach public pages via `getApprovedCitations` in `src/lib/citations.functions.ts` (server-side `curation = 'approved'` filter on Neon); why: graph pages are public but only approved records may leave curation.
- Homepage, footer, Methods and exports share counts via `graphReleaseSnapshot()` in `src/lib/immune/graphRelease.ts`; why: core vs draft totals must stay consistent across marketing surfaces.
- The corner assistant reuses AskAtlas in an accessible non-modal dialog, with local concept matching before AI submission; why: one entry handles lookup and explanation without blocking the page or charging for simple concept discovery.
- Links are identified as `REL-subject-relation-object` (`relId`) and evidence supports a link only via `evidence_records.relationship_id` + `claim_support`; status logic lives in `src/lib/immune/evidenceStatus.ts`; why: concept-level citations must never inflate link coverage.
- One global Scientific Inspector drawer (`src/lib/immune/inspector.ts` store, mounted in Shell) is opened via `inspect()` from any layer; why: one consistent, deep detail view.
- Ask retrieval, guardrails and rate limiting live in browser-safe `src/lib/askGrounding.ts`; why: they are unit-tested without the AI call.
- Global header IA is the Learn / Explore / Investigate `JOURNEY_NAV` in `src/data/marketingNav.ts`, shared by every page; `NAV_GROUPS` stays the twelve-layer map; why: journeys are how users navigate, layers are the science model.

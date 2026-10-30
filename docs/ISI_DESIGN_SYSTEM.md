# ISI design system (Phase 7)

**Canonical tokens:** `src/isi.css` (after `biotech.css`). Graph-specific styles remain in `atlas.css` / `biotech.css`.

## Principles

- Restrained scientific look — biology and evidence first; agents stay background.
- Semantic colour only (`html[data-theme]` + ISI variables). Avoid purple AI gradients, cream-serif terracotta clichés, glow stacks.
- One job per section; cards only when they hold interaction.
- Brand **Immune Super Intelligence** is hero-level on marketing surfaces.

## Type

| Role | Guidance |
| --- | --- |
| Display / H1 | Existing bio / marketing type from biotech + brand signal |
| Section H2 | `.bio-section-heading h2` / `.isi-sec-titles h2` |
| Body | Measure `--isi-measure` (≈68ch) for reading prose |
| Mono | IDs and expert panels only — never primary researcher chrome |

## Colour & space

| Token | Role |
| --- | --- |
| `--isi-navy` / `--isi-paper` / `--isi-teal` | Dark band + accent |
| `--isi-space-1…6` | 4 / 8 / 12 / 20 / 32 / 56 px |
| `--isi-radius-sm` / `--isi-radius` | 6 / 10 px |
| `--isi-wide` | Workspace max width |

`.isi-dark-band` re-scopes surface/text for the homepage hero only.

## Layout

- Journey pages: `PageHead` → `PageToc` → `Section` → `JourneyNext` (Shell).
- Hubs: Explore `/explore`, Research `/research` (tools rail), Academy, Community, Ask.
- Grid: prefer single composition; hub lists use `.isi-library-list`, not card grids in heroes.

## Navigation

- Five primaries in `JOURNEY_NAV`: Explore · Research · Academy · Community · Ask Immune.
- Secondary: Methods / Vision / About; account menu for workspace, saved, scientific review.
- Breadcrumbs from `JOURNEY_NAV` via `PageHead`.

## Panels & diagrams

- Detail: `DetailPanel` + `Facts`.
- Mechanisms: `.isi-mech` / `.isi-ladder`.
- Graphs: `GraphView` behind `ClientOnly` + `React.lazy`.
- Citations: reviewed vs provisional labelling; Sources folds closed by default (`explain.tsx`).

## Tables

- Prefer scientific columns (concept, claim, status). Engineering IDs under `details` / `data-testid="expert-panel"`.

## Empty / loading / error

| State | Pattern |
| --- | --- |
| Loading | `.isi-loading` + biology-language status (`askProgressLabel`, “Loading review status…”) |
| Empty | `.isi-empty` on journey hubs; `.isi-auth-empty` on auth workspaces; `.mkt-empty` on marketing — honest empty (e.g. no curated counterevidence), never invent |
| Error | `.isi-error` + plain language + retry / Methods link; no stack traces in UI |

## Responsive

- Compact nav: `.marketing-compact-nav` + toggle.
- Ask FAB hidden on `/ask`.
- Tables / mech steps stack under narrow viewports via existing ISI CSS.

## Accessibility

- Skip link to `#main`.
- Dialog titles for Ask FAB; `aria-expanded` on pillars and account.
- Prefer visible focus (`:focus-visible` on mech nodes).
- Respect `prefers-reduced-motion` for Ask speaker animation.

## Do not

- Invent testimonials, discoveries, or Gate C claims.
- Expose Neon / gapKey / evidence_id / pipeline stage names in ordinary UI.
- Embed a second AskAtlas on random pages.

# First-page design audit · 2026-11-03

## Findings and changes

- Generic opening: replaced with “Immunology, connected” and a specific research
  workflow description. The opening identifies the subject and intended audience.
- Decorative visual: replaced orbit cards with real RA/TNF graph relationships
  derived from the existing exemplar. Concepts open Atlas; predicates open the
  shared Scientific Inspector. No illustrative relationship is invented.
- Weak visual hierarchy: introduced a dark scientific opening, restrained serif
  emphasis, consistent spacing and a compact, readable product preview. Theme
  colours continue to use the existing semantic tokens.
- Repetition: the homepage uses a compact four-step journey without repeating the
  workbench title and introductory CTA. The full journey remains on other routes.
- Service state used as a headline statistic: moved that information back to its
  evidence context. Graph counts still derive from the release snapshot; the
  condition-context count derives from the demonstration catalogue. No connection
  state, approval count or scientific performance metric was invented.
- Early interaction: relationship controls stay disabled through SSR and become
  active after hydration, preventing an initial click from being silently lost.

## Verification scope

Desktop and mobile screenshots were reviewed and fit their viewport widths.
The browser scenario now inspects a relationship directly from the homepage,
closes the shared inspector, and continues through the complete case/graph/
what-if/screening/export flow. TypeScript and a production build are required.

This is a UI and interaction audit, not independent scientific validation,
authenticated database verification or confirmation of a successful deployment.
The separate ISI database readiness limitation in the landing release note remains.

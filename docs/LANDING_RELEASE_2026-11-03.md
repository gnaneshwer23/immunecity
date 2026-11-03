# Research-platform landing release

The homepage now presents the existing research product through an original
editorial layout: focused hero, interactive workspace visual, graph release facts,
Explore/Ask/Investigate entries, live relationship preview, guided case workflow,
melanoma context, evidence accountability and learning/community destinations.
No partner logos, clinical outcomes, accuracy claims or future capabilities are
presented as delivered. Owkin was supplied as visual inspiration, but this
environment denied access to its website (HTTP proxy 403); no direct visual
inspection or asset copying was performed.

## Backend connection

The homepage retains its existing server loader `loadEvidenceCoverage()` and the
existing approved-source query. Coverage comes from ISI's server-side Postgres
evidence records; graph totals come from `graphReleaseSnapshot()`. Successful
coverage retrieval and unavailable service states remain distinct. Runtime error
details are not printed to the public marketing panel. An outage is never
displayed as zero evidence or healthy connectivity.

A read-only ISI database readiness probe could not verify a connection in this
environment. HSI database credentials were explicitly removed from the ISI child
process. The canonical HSI database must not be reused by ISI. No migration or
database write was performed, and the synthetic programme remains a separate
browser workflow. No new backend functionality is implied by the new layout.

## Verification and limitations

TypeScript and production build passed. The existing full home → workbench →
graph inspector → case edit → protocol criteria → dossier export journey passed
on desktop and mobile. Screenshots were reviewed and both viewport layouts fit
without horizontal overflow. Testing also fixed graph SVG hydration differences:
coordinates are rounded consistently and each SVG title is rendered as a single
string. The mechanism preview uses a compact layout to prevent nested heading
styles from crowding the evidence content.

Production approval remains blocked on ISI's own database/auth configuration and
verification, authenticated write/isolation tests, target-runtime verification,
and scientific validation appropriate to released features. This commit does
not deploy the public site, enable clinical decisions or create live trial matching.
The previous default `vite preview` output mismatch remains documented separately.

All prior graph/workbench/20-condition commits remain in the same feature branch;
this release adds the landing redesign and rendering fixes without rewriting history.

# Production readiness audit

**Date:** 2026-10-21 · **Audited:** https://www.immune-super-intelligence.co.uk at `main` `1153bf0`, plus source
**Method:** live HTTP and header checks, axe-core 4.10 (WCAG 2.1 A/AA) on 5 key pages, a browser network and console review, `bun audit`, a server-function and auth review, and tsc, vitest and the build.

## Verdict

**Ready for public educational use once the fixes on `fix/production-readiness` are merged.** No critical issue was found in production code. That branch fixes two security weaknesses and two SEO defects. The remaining items are hardening and housekeeping.

## Fixed on `fix/production-readiness`

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | **High** | **Ask rate limit could be bypassed.** It keyed on `cf-connecting-ip` first, but the site is served by Vercel, not Cloudflare, so any client could rotate that header and get a fresh rate-limit allowance on every request. That opens the AI endpoint to cost abuse. | `src/lib/clientIp.ts` trusts only headers Vercel sets (`x-real-ip`, `x-vercel-forwarded-for`, `x-forwarded-for`); used by both Ask routes; unit-tested. |
| 2 | Medium | **Live-data server functions were an open proxy.** `getActiveTrials` and `getPipelineTrials` accepted any string, forwarded it to ClinicalTrials.gov and cached it in an unbounded in-memory map, a memory-growth and abuse vector. | Inputs are allowlisted to disease and therapy names from the graph; gene symbols are regex-checked; the cache is capped at 600 entries. |
| 3 | Medium | **No security headers** beyond HSTS. | `src/server.ts` adds `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and a CSP `frame-ancestors` (the Lovable editor stays allowed, other sites can't frame the page). |
| 4 | Medium | **Every public server call first fetched a Neon Auth token.** For anonymous visitors that returned 401 (a console error on every page) and added up to 1.5 s before trials, citations and pipelines loaded. | The token is attached only by functions that use `requireNeonAuth` (admin/curation). Verified: 0 Neon Auth calls and 0 console errors on public pages. |
| 5 | Medium (SEO) | **The sitemap had 24 URLs**: no concept, pipeline or mechanism pages. | `/sitemap.xml` is generated from the graph (255 URLs): hub pages, 16 pipelines, mechanism lessons, and concept pages that follow the same rules as their robots meta tag (no drafts, no sparse pages). |
| 6 | Low (SEO) | **`robots.txt` disallow rules didn't reach Googlebot and Bingbot.** A crawler obeys only its most specific group, and the named groups contained only `Allow: /`. | One `*` group; tested. |
| 7 | Low | 3 pre-existing tsc errors (type-only) and 3 stale a11y-script checks. | Fixed; the whole repo now type-checks with 0 errors, and the a11y suite passes. |

## Verified OK

- **Transport:** HSTS (2 years); apex and http redirect with 308 to `https://www`.
- **Status codes:** unknown routes, concepts and pipelines return a real 404.
- **Auth:** all curation writes use `requireNeonAuth` plus a server-side admin role check (`has_role`). Roles are provisioned in Neon, not granted on first signup. CSRF middleware runs on server functions.
- **Input handling:** zod validation on every server function. Evidence search escapes LIKE wildcards; queries go through the Drizzle ORM.
- **Secrets:** none in the client bundle. The only match was the public Neon Auth URL, which the browser needs.
- **Accessibility:** axe-core finds 0 WCAG 2.1 A/AA violations on `/`, `/atlas/D001`, `/pipeline/D007`, `/ask` and `/therapy`.
- **Performance (warm):** TTFB about 80 ms, load about 0.8 s. Unknown pages fail fast.
- **Dependencies:** all 18 `bun audit` advisories (1 critical, 10 high) are in dev or build tooling (devtools, eslint, vite). None are in `.output/server`.

## Recommended next (not done)

1. **Full Content-Security-Policy**: ship `Content-Security-Policy-Report-Only` first. Sources to allow: self, Google Fonts, Fontshare, the Neon Auth origin and the AI endpoint. Then enforce.
2. **JS weight**: the main bundle is 173 KB gz and `engine` (the graph JSON) is 128 KB gz, loaded on every page. Consider lazy-loading the graph for marketing pages or trimming fields the client never reads.
3. **Fonts**: three families from two third-party origins (Google, Fontshare), both render-blocking. Self-host them, or drop General Sans.
4. **Dependency hygiene**: run `bun update` to clear the dev-tool advisories, then re-run `bun audit`.
5. **Lint debt**: `eslint .` reports Prettier errors in files that predate this work. Run `bun run format` once in its own PR.
6. **Human sign-off (Gate F)**: a keyboard tour of the D3 graph, a contrast audit and a screen-reader pass, as already listed in `docs/RELEASE_AUDIT.md`.
7. **Privacy page**: confirm it covers the Neon Auth sub-processor (US-East) and the server-side ClinicalTrials.gov, UniProt and AI calls.
8. **Monitoring**: add uptime alerting on `/`, `/api/ask` and `/sitemap.xml`. Error capture exists, but nothing alerts on outages.

## Not verified

- Admin sign-in and curation after change 4. It needs a real login, which I can't perform. The admin should sign in on the Vercel preview and run one curation action before merging.
- Header delivery on Vercel itself: verified locally through the same `src/server.ts` entry; check the preview with `curl -I`.

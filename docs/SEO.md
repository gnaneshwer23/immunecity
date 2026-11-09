# SEO — Immune Super Intelligence

Canonical site: **https://www.immune-super-intelligence.co.uk/**

## What ships in the repo

| Asset | Purpose |
|--------|---------|
| `/robots.txt` | One `*` group: allows crawlers; disallows auth/workspace/curation/community private paths, `/api/`, and internal tool routes; points to sitemap |
| `/sitemap.xml` | Generated per request by `src/routes/sitemap[.]xml.ts` from `src/lib/sitemap.ts`: hub pages (incl. `/vision`) plus every indexable concept, pipeline and mechanism page |
| `/og-image.jpg` | Open Graph / Twitter share image |
| `src/lib/seo.ts` | Shared title/description/OG helpers + JSON-LD |
| Root + key routes | `index,follow`, canonical URLs, Organization/WebSite schema |

## Verified diagnosis (2026-11-09) — why Google may not “find” the site

Live checks (do **not** claim indexed until `site:` or Search Console proves it):

| Check | Result |
|--------|--------|
| `https://www…/` HTML | 200; SSR title/description/`index,follow`/canonical/JSON-LD present |
| `/robots.txt` + `/sitemap.xml` | Reachable; sitemap ~290 URLs; robots points at sitemap |
| Google-style `site:immune-super-intelligence.co.uk` / `site:www…` | **No indexed results observed** in this audit |
| Ubersuggest (UK) | **0** organic keywords / traffic; DA **2**; **1** backlink |
| Search Console verification meta | **Absent** on live HTML (owner action still required) |
| Apex `https://immune-super-intelligence.co.uk/` | **TLS handshake failure** — A record `185.158.133.1` (not Vercel). HTTP returns Cloudflare **409**. www is on Vercel and is fine. |
| IndexNow key | Present at `/indexnow-key.txt` and `/{key}.txt` (Bing/partners; **not** Google) |

**Bottom line:** www technical SEO is largely in place. Discovery is blocked by (1) **no Search Console property + sitemap submit**, (2) **broken apex DNS/TLS** so bare-domain visits and some crawler first-hits fail, (3) **near-zero external links / new domain** so organic demand has nothing to climb yet. IndexNow does not push Google.

### Apex DNS (owner / registrar — LiveDNS)

Nameservers: `ns1/ns2/ns3.livedns.co.uk`. Fix apex so it reaches Vercel (or permanently redirects to www):

1. In [Vercel → Project → Domains](https://vercel.com), add `immune-super-intelligence.co.uk` (apex) and follow the shown A/ALIAS records (or enable Vercel’s apex redirect to www).
2. At the registrar (LiveDNS), **remove** the stale A `185.158.133.1` (and any Cloudflare proxy that is not serving this site).
3. Confirm: `curl -sI https://immune-super-intelligence.co.uk/` → **301/308 → https://www.immune-super-intelligence.co.uk/** with a valid cert.
4. Prefer a **Domain** property in Search Console covering both apex and www after DNS works.

## Why you may not see the site on Google yet

A new `.co.uk` domain is **not** instantly searchable. Google needs:

1. **Search Console verification** (owner Google account — cannot be done by the repo alone)
2. Sitemap submit + “Request indexing” for `/`
3. Days to weeks before `site:immune-super-intelligence.co.uk` or brand queries surface
4. Working **apex → www** redirects (above)

Technical SEO + IndexNow help discovery; they do **not** force Google page‑1 ranking overnight.

### Bing / IndexNow (no Google login)

After deploy:

```bash
bun run seo:indexnow
```

Key file: `public/{key}.txt` (and `public/indexnow-key.txt`). Script submits **indexable hub URLs only** (skips internal noindex tools).

## What you should do (owner)

1. Open [Google Search Console](https://search.google.com/search-console).
2. Add property: `https://www.immune-super-intelligence.co.uk/` (URL-prefix) **and** Domain property for `immune-super-intelligence.co.uk` once apex DNS is fixed.
3. Verify via DNS TXT (preferred) or HTML meta (paste verification meta into `src/routes/__root.tsx` head if using HTML tag).
4. Submit sitemap: `https://www.immune-super-intelligence.co.uk/sitemap.xml`
5. Use **URL Inspection** → Request indexing for `/`, `/overview`, `/about`, `/ask`, `/atlas`.
6. Optionally submit the same sitemap in [Bing Webmaster Tools](https://www.bing.com/webmasters).
7. Fix apex DNS as above; re-check `site:` after 1–2 weeks.

## Sanity checks after deploy

```bash
curl -s https://www.immune-super-intelligence.co.uk/robots.txt
curl -sI https://www.immune-super-intelligence.co.uk/sitemap.xml
curl -sI https://www.immune-super-intelligence.co.uk/og-image.jpg
curl -sI https://immune-super-intelligence.co.uk/   # must redirect to www once DNS fixed
```

Search: `site:www.immune-super-intelligence.co.uk` (may be empty until Google indexes).

## OpenSEO skills (agent)

Personal skills from [every-app/open-seo](https://github.com/every-app/open-seo) live under `~/.cursor/skills/` (symlinked from `~/Projects/_skill-sources/open-seo`). Invoke on demand via `docs/AGENT_SKILLS.md` — e.g. `seo-audit`, `keyword-research`, `setup-openseo`. Do not `alwaysApply` the pack. Hosted OpenSEO MCP (`app.openseo.so`) is optional and separate from Ubersuggest.

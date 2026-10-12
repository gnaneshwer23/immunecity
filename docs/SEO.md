# SEO — Immune Super Intelligence

Canonical site: **https://www.immune-super-intelligence.co.uk/**

## What ships in the repo

| Asset | Purpose |
|--------|---------|
| `/robots.txt` | Allows crawlers; points to sitemap; disallows `/auth` and `/curation` |
| `/sitemap.xml` | Index of public marketing + atlas entry pages |
| `/og-image.jpg` | Open Graph / Twitter share image |
| `src/lib/seo.ts` | Shared title/description/OG helpers + JSON-LD |
| Root + key routes | `index,follow`, canonical URLs, Organization/WebSite schema |

## Why you may not see the site on Google yet

A new `.co.uk` domain is **not** instantly searchable. Google needs:

1. **Search Console verification** (owner Google account — cannot be done by the repo alone)
2. Sitemap submit + “Request indexing” for `/`
3. Days to weeks before `site:immune-super-intelligence.co.uk` or brand queries surface

Technical SEO + IndexNow help discovery; they do **not** force Google page‑1 ranking overnight.

### Bing / IndexNow (no Google login)

After deploy:

```bash
bun scripts/ping-indexnow.ts
```

Key file: `public/{key}.txt` (and `public/indexnow-key.txt`).

## What you should do (owner)

1. Open [Google Search Console](https://search.google.com/search-console).
2. Add property: `https://www.immune-super-intelligence.co.uk/` (URL-prefix) **and** optionally Domain property for `immune-super-intelligence.co.uk`.
3. Verify via DNS TXT or HTML meta (paste verification meta into `__root.tsx` head if using HTML tag).
4. Submit sitemap: `https://www.immune-super-intelligence.co.uk/sitemap.xml`
5. Use **URL Inspection** → Request indexing for `/`.
6. Optionally submit the same sitemap in [Bing Webmaster Tools](https://www.bing.com/webmasters).

## Sanity checks after deploy

```bash
curl -s https://www.immune-super-intelligence.co.uk/robots.txt
curl -sI https://www.immune-super-intelligence.co.uk/sitemap.xml
curl -sI https://www.immune-super-intelligence.co.uk/og-image.jpg
```

Search: `site:immune-super-intelligence.co.uk` (may be empty until Google indexes).

# Discovery production cron

**Endpoint:** `GET|POST /api/cron/discovery-monitor`  
**Schedule:** `0 6 * * *` UTC daily (`vercel.json`) — Hobby-safe (once/day).  
**CLI:** `bun run discovery:monitor` (same job module).

## Auth (fail closed)

Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.  
If `CRON_SECRET` is unset, the route returns **503** and does not run the job.

Set in Vercel Project → Settings → Environment Variables (Production):

- `CRON_SECRET` — long random secret (also used by Vercel Cron integration)
- `DATABASE_URL` / `DATABASE_URL_UNPOOLED` — Neon (already via integration)

## Live literature (opt-in)

Default adapters are **stub / fail-closed**.

| Var | Effect |
| --- | --- |
| `DISCOVERY_LIVE_PUBMED=1` | Live PubMed searches (needs `NCBI_API_KEY` or `PUBMED_API_KEY`) |
| `DISCOVERY_LIVE_CTGOV=1` | Live ClinicalTrials.gov |
| `DISCOVERY_MONITOR_ACTOR` | Audit actor string (default `cron:discovery-monitor`) |

Never treat monitor hits as scientific review or Gate C.

## Email alerts

In-app alerts always. Email stays deferred unless:

| Var | Effect |
| --- | --- |
| `DISCOVERY_EMAIL_ALERTS=1` | Enable attempt |
| `EMAIL_PROVIDER=resend` | Only shipped adapter |
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | Verified sender |
| `EMAIL_ALERT_TO` | Optional ops override recipient for cron sends |

If unset/incomplete, job records `emailDeferred: true` and **never pretends** email sent.

## Policy

- No auto `reviewed_gap` / `reviewed_opportunity`
- No invented PMIDs
- Idempotent alert dedupe keys

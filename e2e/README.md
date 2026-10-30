# Playwright e2e

Use the **local** CLI (`bun node_modules/@playwright/test/cli.js` or `bun run test:e2e`) — `bunx playwright` may pull a mismatched version and break `test.describe`.

```bash
# Browsers (once per machine)
bunx playwright install chromium

# Prefer an already-running local preview / documented base URL (Vercel not required):
E2E_BASE_URL=http://127.0.0.1:4173 \
  bun node_modules/@playwright/test/cli.js test e2e/isi-journeys.spec.ts e2e/marketing-nav.spec.ts

# Or local preview after a successful build:
bun run build
bun run test:e2e
```

## Authenticated journeys

Set credentials in the environment (never commit secrets):

```bash
E2E_USER_A_EMAIL=… E2E_USER_A_PASSWORD=…
E2E_USER_B_EMAIL=… E2E_USER_B_PASSWORD=…   # required for cross-account isolation
# Optional single-account fallback:
# E2E_USER_EMAIL=… E2E_USER_PASSWORD=…
```

When credentials are **missing**, auth tests call `test.skip` with an explicit `SKIP (not a pass): …` reason.

### CI / reporting note

**Skipped auth tests are not passes.** Playwright reports them as `skipped`, separate from `passed`. Do not treat a green public-journey run as coverage for sign-in, collection CRUD, isolation, or research export. Those remain **unproven** until credentials are present and the auth describe block runs.

Specs:
- `marketing-nav.spec.ts` — header IA / compact nav
- `isi-journeys.spec.ts` — public journeys + authenticated flows (skip without creds)
- `discovery-intelligence.spec.ts` — Discovery Radar public + auth (skip≠pass without `E2E_USER_*`)
- `auth-helpers.ts` — shared sign-in / credential detection

Discovery auth skips (profile quotas, monitor) are **not** entitlement security proof — only server unit tests + credentialed runs count.

If local Vite preview OOMs, set `E2E_BASE_URL` to a production/preview URL and document any remaining gaps; focused `bun test src/test/discovery-intelligence.test.ts` must still pass.

**Note:** `src/test/phase-f-e2e-journey.test.ts` is a **source-contract** suite, not browser E2E.

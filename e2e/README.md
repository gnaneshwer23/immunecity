# Playwright e2e

Use the **local** CLI (`bun node_modules/@playwright/test/cli.js`) — `bunx playwright` may pull a mismatched version and break `test.describe`.

```bash
# Browsers (once per machine)
bunx playwright install chromium

# Prefer production or an already-running preview if local `vite build` OOMs:
E2E_BASE_URL=https://www.immune-super-intelligence.co.uk \
  bun node_modules/@playwright/test/cli.js test e2e/isi-journeys.spec.ts e2e/marketing-nav.spec.ts

# Or local preview after a successful build:
bun run build
bun run test:e2e
# Auth journeys need:
#   E2E_USER_A_EMAIL E2E_USER_A_PASSWORD E2E_USER_B_EMAIL E2E_USER_B_PASSWORD
```

Specs:
- `marketing-nav.spec.ts` — header IA / compact nav
- `isi-journeys.spec.ts` — overview → graph → evidence → Ask → research (+ a11y/mobile); auth skipped without credentials

**Note:** `src/test/phase-f-e2e-journey.test.ts` is a **source-contract** suite, not browser E2E.

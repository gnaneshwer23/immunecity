# Playwright e2e

**Status: BLOCKED** — Chromium browser install via `playwright install` was SIGTERM’d in this environment. Do not retry install in this session.

Source specs are committed for when browsers are available:

```bash
bunx playwright install chromium   # when environment allows
bun run build
bun run test:e2e:nav
```

Until then, navigation QA uses cursor-ide-browser MCP at desktop / tablet (1024) / mobile widths.

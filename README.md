# Immune Super Intelligence

Educational causal immunology atlas — curated knowledge graph, illustrative mechanisms, and Ask that teaches with references (not clinical decision support).

**Public site:** https://www.immune-super-intelligence.co.uk/

## Development

```sh
bun install
bun run dev
```

Stack: TanStack Start, React, TypeScript, Tailwind CSS 3.4, Neon Auth + Postgres.

## Internal research testing

Public pages introduce the knowledge graph, evidence, Ask Immune and research
library. Case fixtures and draft workbenches are not public product entry points.
The testing tools are at `/internal-research`, with server-side Neon session and
stored administrator-role verification before programme data are returned.
No test workspace is linked from the public landing or navigation.

See [the access boundary](docs/INTERNAL_RESEARCH_ACCESS.md) for setup and checks.
The [data handover guide](docs/SYNTHETIC_PROJECT_AND_LAUNCH_DATA.md) and
[collection templates](docs/launch-data/README.md) remain implementation references.

## Brand assets

- `public/favicon.svg` / `public/favicon.ico` — teal cell+atlas mark (replaces Lovable heart)
- `public/logo.svg` — header mark (also inlined in `Shell`)
- `public/apple-touch-icon.png`, `public/site.webmanifest`

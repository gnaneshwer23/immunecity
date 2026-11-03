# Immune Super Intelligence

Educational causal immunology atlas — curated knowledge graph, illustrative mechanisms, and Ask that teaches with references (not clinical decision support).

**Public site:** https://www.immune-super-intelligence.co.uk/

## Development

```sh
bun install
bun run dev
```

Stack: TanStack Start, React, TypeScript, Tailwind CSS 3.4, Neon Auth + Postgres.

## Functional research demo

Open `/research#melanoma` and choose **Load worked example** in the synthetic
project. Inspect conflicting findings, record analysis notes, compare fictional
cohorts, save/restore locally and export an investigation brief. All demo data
are invented; no evidence approval or graph writes occur.

See the [workflow and real-data handover guide](docs/SYNTHETIC_PROJECT_AND_LAUNCH_DATA.md)
and [empty data collection templates](docs/launch-data/README.md) for replacement
fields and the remaining production requirements.

## Brand assets

- `public/favicon.svg` / `public/favicon.ico` — teal cell+atlas mark (replaces Lovable heart)
- `public/logo.svg` — header mark (also inlined in `Shell`)
- `public/apple-touch-icon.png`, `public/site.webmanifest`

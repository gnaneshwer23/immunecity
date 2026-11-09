# Agent skills watchlist (ISI / immunecity)

Personal skills: `~/.cursor/skills/` (~590). **Do not** always-load the pack. Read a skill’s `SKILL.md` only when the task matches.

Full HSI+ISI map (canonical): `~/Projects/hsi-core/docs/AGENT_SKILLS.md`  
Install index: `~/.cursor/skills/_installed-from-github/INDEX.md`  
Built-ins: `~/.cursor/skills-cursor/`

## ISI product — load when

| When | Load | Notes |
|------|------|--------|
| SEO / keywords / competitor SERP for immune-super-intelligence.co.uk | `seo-audit`, `keyword-research`, `competitive-landscape`, `seo-project-setup`, `seo-coach`, `seo-report`, `agency-seo-specialist` | OpenSEO pack from [every-app/open-seo](https://github.com/every-app/open-seo) (symlinked under `~/.cursor/skills/`); leaf routes own `seoHead`; do not invent science. See `docs/SEO.md` |
| OpenSEO MCP / plugin connect | `setup-openseo` | Optional hosted MCP at app.openseo.so — not required for repo SEO; Ubersuggest MCP is separate |
| AEO / AI citation visibility | `ai-visibility-audit`, `agency-ai-citation-strategist` | Educational brand — not clinical advice |
| React UI, Ask Atlas, journey pages | `vercel-react-best-practices`, `agency-frontend-developer`, `agency-minimal-change-engineer` | Keep `JOURNEY_NAV`, `PageHead` anatomy |
| Visual / a11y polish | `hallmark`, `taste-skill`, `better-ui`, `better-accessibility`, `web-design-guidelines`, `ui-ux-pro-max` | Tokens in `biotech.css` / `isi.css` |
| Graph / concept / KG exploration UX | `agency-knowledge-graph-engineer`, `graphify` | `src/data/kg.json` is source of truth |
| Evidence / citation curation UX copy | `agency-research-synthesist`, `citation-management` | Writes stay admin-gated; approved-only public |
| Defensive security / privacy review | `agency-ai-generated-code-security-auditor`, `agency-application-security-engineer`, `agency-privacy-engineer` | Harden only — no exploit steps |
| UI review / code review | `agency-code-reviewer`, `agency-accessibility-auditor` | |

## Do not

- Wire HSI Discovery consume beyond freeze-lift scope (`hsi-core` playbook).
- Invent MoU, Gate C auto-approve, or live CDS/PHI (see hsi-core `docs/CDS_PHI_BOUNDARY.md`).
- Pull PentAGI / RAG-Anything / Anime.js / MediSearch / Hippocratic / Nabla into product code.
- Load `clinical-decision-support` to build product CDS surfaces.
- `alwaysApply` dozens of `agency-*` or scientific skills.

## How

Match → `Read ~/.cursor/skills/<name>/SKILL.md` → apply. Prefer one skill per task.

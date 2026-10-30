# ISI post–A–F capability comparison

Baseline: `3e815db`. Educational only — not CDS.

| Capability | Implemented | Unit / contract tested | Browser E2E tested | Scientifically reviewed | Incomplete / blocked |
| --- | --- | --- | --- | --- | --- |
| Journey IA (Learn / Explore / Investigate) | Yes | Phase F1 | Partial (nav + journeys vs prod when run) | N/A | — |
| Immunology OS overview | Yes | Phase F | Public route load | N/A | — |
| Immune City graph | Yes | Phase B/F | Public route load | Graph content largely unreviewed | Draft ESTABLISHED edges |
| Evidence explorer + landmark trials | Yes | Phase E/F | Public `#trials` | Fixture PMIDs curated for pilots; graph links lag | Neon ORR nulls honest |
| Trial Intelligence (prod) | Flag **off** | Phase E negative | N/A (flag-off) | Fixture pilots only | Prod UI gated |
| Ask Immune GraphRAG v11 | Yes | Phase D + post-AF GraphRAG suite | Ask input visible; local match no AI | Neighbourhood often **without** Gate C evidence | Live LLM answer sampling not done |
| Research library / workbench | Yes | Phase 4/E | Research page load | Exports draft-only | Workbench handoff still unwired |
| Scientific brief + provenance | Yes (fixed) | Phase E + post-AF brief suite | Not fully UI-driven | Pilot PMID candidates unreviewed | Live curation import not run |
| Evidence collections CRUD | Yes (Neon 0016) | Ownership unit tests | **Blocked** (no E2E auth creds) | N/A | Two-account isolation unverified in browser |
| Member onboarding persistence | Yes (Neon Auth) | Auth unit tests | **Blocked** | N/A | Needs credentials |
| Ontology mappings (0017) | Code + migration | Phase B source tests | N/A | Empty-by-design | **Not applied on Neon** |
| treatment_line (0018) | Code + migration + fixture | Phase E | N/A | Fixture text curated | **Not applied on Neon** |
| Melanoma investigation path | Yes | Phase E/F | Indirect via research/evidence | **Most edges unreviewed** — see validation matrix | Causal edge D2 open |
| Keyboard / mobile a11y | Partial | Phase F a11y smoke contract | Mobile/tablet specs present | N/A | Full axe suite may OOM |

## Honesty summary

- **Implemented ≠ scientifically reviewed.** Melanoma pilot graph ESTABLISHED ≠ Gate C.
- **Phase F suite ≠ browser E2E.**
- **0017/0018 shipped in repo, not on intended Neon** at audit time.
- Minimal audit fix: source-backed scientific brief claims + curation `candidateManifest` handoff (no auto-approve).

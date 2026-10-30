# ISI Discovery Intelligence — capability matrix

**Baseline:** `e5526d6` · Educational/research positioning — not CDS.  
**Legend:** Existing = shipped on main · Proposed = Discovery Radar scope · Defer = explicitly out of this session.

| Capability | Existing ISI | Proposed Discovery | Status / notes |
| --- | --- | --- | --- |
| Typed immunology KG | Yes (`kg.json` + drafts) | Read-only signals | **Reuse** — no mass expansion |
| Evidence records + Gate C | Yes | Coverage inputs | **Reuse** |
| Evidence-gap labels | Yes (`evidenceGap.ts`) | Map → gap status taxonomy | **Extend** with `coverage_insufficient` |
| Claim review kinds | Yes (`literature_candidate`…) | Parallel honesty for gaps | **Reuse pattern** |
| Scientific review queue | Yes (Neon + UI) | Gap reviews | **Wire** |
| Melanoma validation matrix | Yes (doc + TS + checklist) | Pilot A candidate seed | **Candidate-only** |
| Trial Intelligence | Flagged / fixtures | Trial-linked gap signals | **Read**; flag off |
| Ask Immune + grounding | Yes | Explain / prefill from dossier | **Link** |
| Research Workbench / briefs | Yes (draft exports) | Deep-link from gaps | **Link**; no auto KG write |
| Evidence collections | Yes (Neon 0016) | Optional attach later | **Pattern for isolation** |
| Member auth + roles | Yes | Profile ownership + reviewer gates | **Reuse** |
| Research profiles (interests, domains) | Partial (community profile only) | `research_profiles` | **New (0019)** |
| Personalised gap radar | No | Rank/filter by profile | **New** |
| ResearchGap entity + versions | No | Additive tables (0020) | **New** |
| Deterministic gap detection | Partial (gap labels, matrix) | Detect service → candidates | **New** |
| LLM novelty / question drafting | Ask / briefs (draft) | Post-detect assist only | **Stub / defer live novelty** |
| PubMed continuous ingest | Provisional / rate-limited lookups | Adapter interface | **Defer** scale |
| CT.gov continuous ingest | TI fixtures | Adapter interface | **Defer** scale |
| Email / push alerts | No | Subscriptions table stub | **Defer** senders |
| Stripe / researcher_pro billing | No | Entitlement stub server-side | **No payment activation** |
| Team / Enterprise plan stubs | — | Quotas + team scaffolding (0022) | **Phase 7** — collab not activated |
| Discovery quotas (follow/monitor/export) | Partial | Server `assertQuotaAllows` | **Phase 7** |
| Discovery gold-set harness | — | Structure only (`eval/goldSet`) | **Phase 8** — no SME scores |
| Ontology crosswalk fill | Empty seed + curator UI | Not used to invent gaps | **SME-blocked** |
| Assay cut-offs | Empty stub | Out of scope | **SME-blocked** |
| Gold-set SME scores | Framework docs | Empty eval harness OK | **Defer scoring** |
| Dossier page `/discovery/gaps/$id` | — | Inspector/Ask/Workbench links | Stretch |
| Radar list UI | — | `/discovery`, filters | Stretch |
| “Recommended because…” | — | Profile interest stub | Stretch |

## Honesty row

| Claim type | Allowed without human review? |
| --- | --- |
| `candidate` from documented ISI signals | Yes |
| `coverage_insufficient` when search/Gate C incomplete | Yes |
| `reviewed_gap` | **No** — human review mandatory |
| Fabricated PMID / paper / metric / “novel discovery” | **Never** |
| Worldwide literature absence | **Never** |

# ISI Audit Remediation — Phase A baseline + Phase B status

**Canonical:** https://www.immune-super-intelligence.co.uk/  
**Repo (GitHub):** `gnaneshwer23/immunecity` · default branch `main`  
**Branch:** `audit/remediation`  
**Synced GitHub HEAD (origin/main):** `3973551` — *Improve Ask synonym matching and curator ID-vs-claim clarity.* (merged from `audit/remediation`)  
**Production deploy:** `dpl_6N6Cj9ygdFBrP7gaNeFEtgGJvgdJ` → www + `immunecity.vercel.app` (post-audit fix commit may supersede)  
**Prior session baseline (stale):** `fcd6309` / roughly `0eb7d17` — **superseded**.

## GitHub sync (2026-10-17)

| Item | Value |
|------|--------|
| `gh repo view` | `gnaneshwer23/immunecity` · default `main` |
| Open PRs | none |
| `audit/remediation` before sync | `fcd6309` (4 commits behind) |
| Sync action | fast-forward merge `origin/main` → `040b973` (no force-push) |
| Commits pulled | `0b15ccc`, `6d2fc7f`, `d26ee8f`, `040b973` |

Notable upstream already shipped before this remediation branch edited anything:

- `/ask`, `/atlas`, Knowledge Atlas concept pages, Research Library (Crossref)
- Homepage `isi-three` with Ask ISI / Atlas / Research
- Honest Nature Portfolio disclaimer on Research Library (metadata only; no affiliation)
- Grounding panel links to concept pages + papers

## Neon evidence (live read — project `autumn-snow-67879321` / immunecity)

**Not fabricated.** Remeasured after GitHub sync:

| Metric | Count |
|--------|------:|
| Total evidence rows | 46 |
| With `relationship_id` | 46 |
| `curation=approved` | 9 |
| `curation=unreviewed` | 34 |
| `curation=rejected` | 3 |
| `claim_support=unassessed` | 31 |
| `claim_support=partial` (unreviewed) | 3 |
| Approved + `supports` rows | 9 |
| **Distinct rels: approved + supports** | **9** |

Breakdown by (`curation`, `claim_support`): approved/supports 9 · rejected/unrelated 3 · unreviewed/partial 3 · unreviewed/unassessed 31.

**Note on “~180 unreviewed”:** That figure is **stale / not current**. Production Neon currently has **34 unreviewed** (31 of them unassessed), total **46** rows — consistent with `docs/RELEASE_AUDIT.md`.

## Relationship-level Gate C coverage

| Item | Value |
|------|------:|
| Runtime relationships (`graphReleaseSnapshot`) | **549** (395 core + 154 draft) |
| Distinct approved+supports | **9** |
| Coverage | **9 / 549 ≈ 1.6%** |

Rules (`evidenceStatus.ts`): a link is Supported only when an **approved** Neon row is mapped to that exact `relationship_id` with `claim_support=supports`. Concept-level cites do not count. Identifier verification ≠ claim approval.

## Phase A UX gaps (post-sync)

| Area | Finding | Priority |
|------|---------|----------|
| Ask retrieval | `relevantNodes` ignored KG `aliases` despite 260 nodes carrying them | **P0 — fixed this branch** |
| Ask typeahead | Name/id only; missed synonyms | **P0 — fixed** |
| Homepage Ask | Upstream already has Ask in `isi-three`; hero CTA still leaned Explore/Mechanism | **P1 — hero primary → Ask ISI** |
| Curation copy | ID-verify vs claim-approve present but easy to conflate in stats labels | **P1 — clarified** |
| Research library | Crossref multi-journal search works; explicit no-Nature-Portfolio-affiliation copy | OK — keep honest |
| Coverage | 9/549 Gate C — curator work, not code | Open (human) |
| Tests | Full `vitest run` can hang (D-11 SIGTERM) | Run targeted files |

## Phase B changes on this branch

1. Alias/synonym-aware Ask retrieval + typeahead (`ask-grounding-v4`)
2. Curation UI: explicit “ID verify ≠ claim approve” callout + clearer Gate C stats labels
3. Homepage hero primary CTA → `/ask` (Ask ISI)
4. Tests for synonym, multi-concept, unsupported abstention

## Tests run

- Targeted vitest on grounding / atlas / research / evidence suites preferred over full suite (D-11 hang risk).
- Results recorded in remediation delivery notes after each commit.

## Release readiness (honest)

**Not production-ready for “evidence-complete” claims.** Educational beta continues to be appropriate:

- Public Ask / Atlas / Research surfaces are usable on current `main`
- Gate C still ~1.6% — do not imply comprehensive claim-level coverage
- Ask is graph-retrieved teaching, not fully evidence-grounded AI
- No automatic production publish from this branch

## Prioritised residual defects

1. **P0 curator:** Map remaining exemplar pathway edges (IFN→SLE / PD-1 completeness) with real PMIDs — human only
2. **P1:** Grow scientific eval set; distributed Ask rate limit still in-memory
3. **P1:** Mobile keyboard / a11y pass on new Ask + Atlas pages
4. **P2:** Live PubMed bulk ingest still absent (by design honesty)
5. **P2:** Model registry adapters remain planned/stubs

# HSI platform connection

## RA evidence import foundation

The pinned shared `raEvidenceRelease.ts` validator is available for the next
research corpus integration. It checks source identities, passage hashes,
attribution and article-level licence declarations. Dossier Markdown retains
article and licence links. This code does not register a verified RA corpus or
claim a completed context benchmark: source import remains pending, and scientific
support stays unassessed. See the
[implementation status](https://github.com/gnaneshwer23/hsi-core/blob/main/docs/RA_ANTI_TNF_EVIDENCE_RELEASE.md).


## Authenticated backend and internal workflow

The investigation runner now has an authenticated product API, private PostgreSQL
checkpoints, audit rows, RLS, revision checks, quotas and an internal UI at
`/internal-research`. No public landing-page link is added. Source passages are
absent until a rights-verified release is supplied; the UI reports that gap and
does not invent scientific support.

See the [activation instructions and verification limits](https://github.com/gnaneshwer23/hsi-core/blob/main/docs/INVESTIGATION_PRODUCT_BACKENDS.md).
The new migration must run on this product's database before the workflow is
available. Missing configuration fails closed; there is no file/sample fallback.


## Shared investigation service

`investigationService.ts` is the canonical HSI server-side runner, with Git and
SHA-256 provenance. Its consumer test executes corpus retrieval → graph context →
explicit counterevidence → unvalidated research questions → human review → dossier
using the same contract fixture. The Node-only module must stay in backend code.

It requires an authorisation adapter on every action and a store with atomic
revision checks. The memory store in conformance tests is intentionally local;
the shared library alone does not establish a live deployment, literature API
or model connection.
Product backend/storage adapters are implemented above; live activation still
requires the product migration and account provisioning. No public page is added. See the
[execution and recovery semantics](https://github.com/gnaneshwer23/hsi-core/blob/main/docs/INVESTIGATION_SERVICE.md).


## Shared research contracts

`researchContracts.ts` beside the shared algorithm is an exact HSI source snapshot,
with Git revision and SHA-256 provenance. It defines versioned research context,
source/passages, existing graph relationships, claim assessments, human review
and run history. The new consumer conformance test validates an abstract synthetic
fixture and rejects unsafe or inconsistent envelopes. No public UI is added.

This supplies the common boundary for the investigation service above. The validator does not
itself call a provider or move product data. The product backend authenticates reviewers and persists execution history and
digests. Operators must exclude PHI and verify source rights. Structural approval metadata is not an
authorisation check. See HSI's
[contract semantics and limits](https://github.com/gnaneshwer23/hsi-core/blob/main/docs/SHARED_RESEARCH_CONTRACT.md).
The older research snapshot contract below serves its existing exchange and is
not silently replaced by this new investigation contract.


## Shared executable technology

The existing `getGraphNeighbourhood` now calls HSI's canonical bounded traversal
algorithm. Its adapter supplies ISI's sole graph and preserves relationship IDs,
typed metadata and evidence presentation. `src/lib/hsi/vendor/sharedTechnology*`
contains the exact deployed source and HSI Git/SHA-256 provenance; integrity and
graph regression tests cover the consumer. Edit the canonical HSI module and
regenerate this snapshot rather than fork its algorithm. This source distribution
is transitional until a versioned private package release is configured.

This is code reuse, distinct from the older JSON exchange below. No graph store,
authentication or database moves to HSI. The HSI discovery and diagnostic routes
described below are now administrator-protected internal tools, not public entry points.

This checkout reuses the existing HSI Discovery bridge. HSI links from `/for-isi` to this app's `/hsi/discovery` when `VITE_ISI_APP_URL` is configured. `/hsi-consume` remains the diagnostic view. Both loaders now consume validated bundled JSON, so SSR needs neither a self-request to a hard-coded local port nor access to a private GitHub URL.

Refresh from the sibling checkout with:

```bash
HSI_CORE_PATH=/workspace/hsi-core bun run hsi:sync-export
bun test src/test/hsi-phase0.test.ts src/test/hsi-discovery-consume.test.ts src/test/hsi-discovery-loop.test.ts scripts/hsi-bundled-discovery.test.ts src/test/hsi-gate-c-queue.test.ts src/test/hsi-gate-c-curator-status.test.ts
bun run build
```

The sync script generates in an isolated temporary source copy before updating reviewed snapshot files here. The current snapshot restores HSI's hypothetical fixture: `lockedPilot=false`, `legalBinding=false`, `partnerSignedProduction=false`. A fixture `partnerSigned=true` must not be described as a commercial agreement. The old vendored Apolo production-lock claim is no longer current.

The production audit resolved all 136 original TypeScript diagnostics; full type checking and the client/server production build now pass. `bun run test` runs Vitest and Bun-native suites separately, with no assertions disabled. Shared server JSON payloads are validated rather than cast from unknown data. HSI-specific mobile table overflow is corrected. Database-backed review writes were not tested; all existing sign-in, role checks and human review gates remain.

The frozen lock's registry mirror is blocked in this cloud instance. Dependencies are installed through a disposable lock copy resolving identical integrity-pinned public packages at registry.npmjs.org. The repository lockfile and package manifest are unchanged. The tested helper is `/workspace/install-immunecity.sh`, also captured in the cloud environment configuration draft.

See `hsi-core/docs/IMMUNECITY_PLATFORM_INTEGRATION.md` for the complete local startup, architecture and release notes. Do not merge HSI/ISI/Aksh databases, send patient records to HSI or treat a source locator as exact claim verification. No deployment or publication has occurred.

# Curator evidence queue

**Honest status:** Approved relationship-level claims remain **0 / 536** until a human assesses and approves them. This pack only creates an unreviewed draft queue.

## What shipped

| Artefact | Role |
|----------|------|
| `src/data/relationship-evidence-queue.json` | Importable manifest: **40** candidate slots on **37** KG-cited links; **17** PMIDs resolved via PubMed agreement |
| `src/lib/immune/relationshipEvidenceQueue.ts` | Pure builder (never auto-approves) |
| `bun run evidence:queue` / `evidence:queue:resolve` | Rebuild queue; optional PubMed PMID resolve |
| `/curation` → **Load relationship queue** | Admin import into `evidence_records` (`curation=unreviewed`, `claim_support=unassessed`) |

## Curator steps (admin)

1. Sign in → `/curation` (Neon Auth; default role is `user` until admin is granted via SQL).
2. Click **Load relationship queue**.
3. **Check** identifiers for slots that have PMIDs/DOIs.
4. Open **Details** → confirm the mapped relationship → set **claim support** (`supports` / `partial` / …).
5. **Approve** only when the source truly supports that directional claim (server rejects approve without `relationship_id` + assessed `claim_support`).
6. Public pages only see `curation=approved` (`citations.functions.ts` SQL filter on Neon).

## Demo pathway priority (honest scaffolding)

Approval requires: identifier **verified or matched**, mapped `relationship_id`, and assessed `claim_support`. Source edits clear approval. Each successful update appends an `evidence_audit_events` row.

Prioritise claim review for these three exemplar pathways (do **not** invent PMIDs or bulk-approve):

1. **TNF → rheumatoid arthritis** (`ex-tnf-ra`)
2. **PD-1 / PD-L1 → cancer immunotherapy** (`ex-pd1-io`)
3. **Type-I interferon → SLE** (`ex-ifn-sle`)

Use `exemplarQueueFocus()` / curation UI callout for the graph `relId`s on those chains. Maturity stays `scaffold` until approved + supports cites exist.

## What not to do

- Do not bulk-approve identifier-verified rows without claim assessment (UI + server block this).
- Do not invent PMIDs or set `supports` without reading the source.
- Do not expect Gate C to pass from the queue alone — approval is the scientific step.

## Coverage math

- Runtime links: **536**
- Queue mapped (candidates): **37** (~6.9%)
- Remaining without a KG bibliographic cite: **499** (need literature workflow / SME)
- Approved claim links: **0** until step 5 above

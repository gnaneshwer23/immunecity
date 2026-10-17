# Curator evidence queue

**Honest status (2026-10-17 Ask Immune refresh):** Production Neon still has sparse approved+supports claim links vs ~549 runtime edges. Wrong-PMID Stohl/Groom mappings remain rejected/unrelated. Queue pack itself only creates unreviewed candidates — approvals are human-only.

Gate C is **not** done. Do not market Ask Immune or exemplars as fully evidence-grounded until broader claim-linked coverage lands and SME gold-set is signed.

## Ask Immune vs Gate C (human path)

Ask Immune can surface **provisional** PubMed / Europe PMC hits when graph matches but Gate C cites are empty (or on `source_lookup`). Those hits are **unreviewed literature only** — they never auto-upgrade to `approved` / `supports`.

**P0 edges unlock “evidence-backed” more than new APIs.** Curator claim-linked approvals on the exemplar matrix below are what move Ask from “graph-retrieved + provisional lit” toward reviewed support in the UI. Prefer finishing those human Gate C actions over inventing PMIDs or mass-approving.

## What shipped

| Artefact | Role |
|----------|------|
| `src/data/relationship-evidence-queue.json` | Importable manifest: **40** candidate slots on **37** KG-cited links; **17** PMIDs resolved via PubMed agreement |
| `src/lib/immune/relationshipEvidenceQueue.ts` | Pure builder (never auto-approves) |
| `src/lib/immune/exemplarPathways.ts` | Exemplar waypoints + `EXEMPLAR_CURATOR_TARGETS` PubMed search hints |
| `bun run evidence:queue` / `evidence:queue:resolve` | Rebuild queue; optional PubMed PMID resolve |
| `/curation` → **Load relationship queue** | Admin import into `evidence_records` (`curation=unreviewed`, `claim_support=unassessed`) |
| `/reasoning` Exemplar cards | Live maturity + per-edge review badges from approved cites |

## Curator steps (admin)

1. Sign in → `/curation` (Neon Auth; default role is `user` until admin is granted via SQL).
2. Click **Load relationship queue**.
3. **Check** identifiers for slots that have PMIDs/DOIs.
4. Open **Details** → confirm the mapped relationship → set **claim support** (`supports` / `partial` / …).
5. **Approve** only when the source truly supports that directional claim (server rejects approve without `relationship_id` + `claim_support=supports`).
6. Public pages only see `curation=approved` (`citations.functions.ts` SQL filter on Neon).

## P0 exemplar Gate C matrix (production, 2026-10-16)

Approval requires: identifier **verified or matched**, mapped `relationship_id`, and assessed `claim_support=supports`. Source edits clear approval. Each successful update appends an `evidence_audit_events` row.

Unique on-path edges from `exemplarQueueFocus()` / `reportExemplar` (shortest undirected stitches between waypoints).

### 1. TNF → rheumatoid arthritis (`ex-tnf-ra`) — **on-path reviewed**

| relId | Live Gate C | Notes |
|-------|-------------|-------|
| `REL-C003-produces-M001` | **approved+supports** | Chu 1991 (PMID 1930331) |
| `REL-M001-contributes_to-D001` | **approved+supports** | Feldmann & Maini 2008 (PMID 18613827) |
| `REL-I001-targets-M001` | **approved+supports** | Lipsky 2000 ATTRACT (PMID 11096166) |

Teaching caveat remains: whole RA biology is not evidence-complete. No further P0 pubmed targets for these three edges.

### 2. PD-1 / PD-L1 → cancer immunotherapy (`ex-pd1-io`) — **partial**

| relId | Live Gate C | Next curator action |
|-------|-------------|---------------------|
| `REL-C015-expresses-R011` | **approved+supports** | Barber 2006 (PMID 16382236) — done |
| `REL-R012-suppresses-C015` | verified, `claim_support=partial` (Chemnitz 2004) | **Re-read** Chemnitz; set `supports` only if the paper supports this directional claim, else keep partial / find a better cite. PubMed: `PD-L1 PD-1 CD8 T cell suppression OR Chemnitz PD-L1 2004` |
| `REL-B011-measures-R012` | **none** | Import/map a verified assay/companion-diagnostic cite. PubMed: `PD-L1 immunohistochemistry companion diagnostic assay measures expression` |
| `REL-B011-predicts_response_to-I008` | **none** | Map a biomarker–response cite to **this** relId (KEYNOTE-006 is already approved on `REL-I008-blocks-R011`, which is **off** this shortest path). PubMed: `PD-L1 expression predicts pembrolizumab response KEYNOTE biomarker` |

### 3. Type-I interferon → SLE (`ex-ifn-sle`) — **scaffold**

Shortest path Type-I IFN → SLE currently detours via BAFF / belimumab. Those detour edges already have approvals; they do **not** close IFN / IFNAR / anifrolumab Gate C.

| relId | Live Gate C | Next curator action |
|-------|-------------|---------------------|
| `REL-C005-produces-P004` | **none** | PubMed: `plasmacytoid dendritic cell type I interferon production TLR7 TLR9` |
| `REL-R018-signals_through-P004` | **none** | PubMed: `IFNAR1 type I interferon receptor signalling pathway` |
| `REL-M018-binds-R018` | **none** | PubMed: `type I interferon IFN-alpha IFNAR1 binding receptor` |
| `REL-M018-induces-M016` | **approved+supports** | Lopez 2014 — on detour; done |
| `REL-I018-neutralises-M016` | **approved+supports** | Shin 2018 — on detour; Stohl wrong-map remains rejected |
| `REL-I018-treats-D007` | **approved+supports** | Navarra 2011 BLISS-52 — on detour; done |
| `REL-I015-treats-D007` | **none** | PubMed: `anifrolumab systemic lupus erythematosus TULIP randomised trial` |

Also approved off-exemplar-path (counts toward Gate C numerator, not these waypoint stitches): `REL-I008-blocks-R011` (KEYNOTE-006), `REL-T008-requires-M001` (Keane 2001).

## Exact next human actions (ordered)

1. **PD-1 Chemnitz reassessment** — open `RELQ-REL-R012-suppresses-C015-C1` on `/curation`; decide `supports` vs leave `partial`.
2. **PD-1 biomarker edges** — literature workflow / PubMed for `REL-B011-measures-R012` and `REL-B011-predicts_response_to-I008`; Check → claim_support → Approve.
3. **IFN scaffold spine** — same for `REL-C005-produces-P004`, `REL-R018-signals_through-P004`, `REL-M018-binds-R018`, `REL-I015-treats-D007`.
4. Do **not** invent PMIDs, mass-approve, or mark Ask Immune “evidence-grounded” / fully evidence-backed until these land (and SME gold-set is signed). Provisional lit in Ask does **not** substitute for Gate C.

Use `EXEMPLAR_CURATOR_TARGETS` / curation UI callout for the same hints. Maturity stays `scaffold` / `partially-reviewed` until live approved+supports cover unique on-path edges.

## What not to do

- Do not bulk-approve identifier-verified rows without claim assessment (UI + server block this).
- Do not invent PMIDs or set `supports` without reading the source.
- Do not expect Gate C to pass from the queue alone — approval is the scientific step.
- Do not treat BAFF/belimumab approvals as completing the IFN→SLE exemplar.

## Coverage math

- Runtime links: **~549**
- Queue mapped (candidates): **37** (~6.9%)
- Remaining without a KG bibliographic cite: **~499** (need literature workflow / SME)
- Approved claim links (prod): **9** (not 549 — do not overclaim)
- Exemplar unique on-path edges: **14**; P0 open targets listed above: **7**

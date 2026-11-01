# Curator evidence queue

**Honest status (2026-10-21 science-first refresh):** Production Neon (MCP) still shows **9** approved+supports distinct relationship claims vs **~549** runtime edges; **0** `contradicts`; **3** `partial` (incl. Chemnitz on `REL-R012-suppresses-C015`). Wrong-PMID Stohl/Groom mappings remain rejected/unrelated. Queue pack and P0 PubMed seed create **unreviewed** candidates only — approvals are human-only.

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
| `/curation` → **Preview P0 PubMed** / **Seed P0 unreviewed drafts** | Live E-utilities search for `EXEMPLAR_CURATOR_TARGETS`; inserts only when title heuristic matches a real PMID — still unreviewed/unassessed |
| `src/lib/immune/p0ExemplarPubmed.ts` + `p0ExemplarDrafts.server.ts` | Title heuristics + server preview/seed (never auto-approve) |
| `/reasoning` Exemplar cards | Live maturity + per-edge review badges from approved cites |

## Curator steps (admin)

1. Sign in → `/curation` (Neon Auth; default role is `user` until admin is granted via SQL).
2. Click **Load relationship queue**.
3. Use **P0 page filter** / per-edge **Filter** chips (PD-1 Chemnitz, PD-1 biomarkers, IFN spine) — chips copy the PubMed search start and filter the loaded page by `relId`.
4. Optional eng assist: **Preview P0 PubMed** (read-only), then **Seed P0 unreviewed drafts** only if you accept the heuristic matches. Prefer skip when titles look off-claim.
5. **Check** identifiers for slots that have PMIDs/DOIs.
6. Open **Details** → confirm the mapped relationship → set **claim support** (`supports` / `partial` / `contradicts` / …).
7. **Approve** only when the source truly supports that directional claim (server rejects approve without `relationship_id` + `claim_support=supports`).
8. Public Gate C reads require approved + supports + verified identifier (`citations.functions.ts`). Counterevidence (contradicts/partial) is a separate path — never invent PMIDs or auto-approve.

## P0 exemplar Gate C matrix (production, 2026-10-21 Neon MCP)

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
| `REL-R011-drives-P015` | **none** (HSI bridge: evidence-linked · Gate C pending) | HSI seed `HSI-E-IO-001` carries real PMID **16382236** (Barber 2006 Nature; PubMed-verified) as `source-verified` only — **not** Neon approved. Same PMID is already on `expresses-R011`; re-read for drives→P015 S-P-O before Check → claim_support → Approve. Do not invent a second PMID. |
| `REL-R012-suppresses-C015` | verified, `claim_support=partial` (Chemnitz PMID 15240681) | **Re-read** Chemnitz; set `supports` only if the paper supports this directional claim, else keep partial. PubMed: `Chemnitz PD-L1 PD-1 CD8 T cell 2004` |
| `REL-B011-measures-R012` | **none** | Manual pick — auto-seed blocked (noisy ranking). PubMed: `PD-L1 immunohistochemistry companion diagnostic 22C3 OR SP263 assay` |
| `REL-B011-predicts_response_to-I008` | **none** | Map a biomarker–response cite to **this** relId (KEYNOTE-006 is on `REL-I008-blocks-R011`, off this path). PubMed: `pembrolizumab PD-L1 biomarker KEYNOTE-001 Garon` |

### 3. Type-I interferon → SLE (`ex-ifn-sle`) — **scaffold**

Shortest path Type-I IFN → SLE currently detours via BAFF / belimumab. Those detour edges already have approvals; they do **not** close IFN / IFNAR / anifrolumab Gate C.

| relId | Live Gate C | Next curator action |
|-------|-------------|---------------------|
| `REL-C005-produces-P004` | **none** | PubMed: `plasmacytoid dendritic cells natural interferon-producing cells Siegal` (Siegal 1999 often ranks; seed heuristic may offer unreviewed draft) |
| `REL-R018-signals_through-P004` | **none** | PubMed: `IFNAR1 interferon receptor signalling JAK STAT pathway review` — usually needs manual pick |
| `REL-M018-binds-R018` | **none** | PubMed: `IFNAR1 interferon-beta binding hot spot receptor interaction` |
| `REL-M018-induces-M016` | **approved+supports** | Lopez 2014 — on detour; done |
| `REL-I018-neutralises-M016` | **approved+supports** | Shin 2018 — on detour; Stohl wrong-map remains rejected |
| `REL-I018-treats-D007` | **approved+supports** | Navarra 2011 BLISS-52 — on detour; done |
| `REL-I015-treats-D007` | **none** | PubMed: `anifrolumab TULIP-2 Morand NEJM` (Morand 2020 often ranks; seed heuristic may offer unreviewed draft) |

Also approved off-exemplar-path (counts toward Gate C numerator, not these waypoint stitches): `REL-I008-blocks-R011` (KEYNOTE-006), `REL-T008-requires-M001` (Keane 2001).

## Exact next human actions (ordered)

1. **PD-1 Chemnitz reassessment** — on `/curation`, use the P0 filter chip for `REL-R012-suppresses-C015` (or search that `relId`); decide `supports` vs leave `partial`.
2. **PD-1 biomarker edges** — literature workflow / PubMed for `REL-B011-measures-R012` and `REL-B011-predicts_response_to-I008`; Check → claim_support → Approve.
3. **IFN scaffold spine** — same for `REL-C005-produces-P004`, `REL-R018-signals_through-P004`, `REL-M018-binds-R018`, `REL-I015-treats-D007` (filter chips on `/curation` help jump to each `relId`).
4. Do **not** invent PMIDs, mass-approve, or mark Ask Immune “evidence-grounded” / fully evidence-backed until these land (and SME gold-set is signed). Provisional lit in Ask does **not** substitute for Gate C.

Use `EXEMPLAR_CURATOR_TARGETS` / curation UI callout for the same hints. Maturity stays `scaffold` / `partially-reviewed` until live approved+supports cover unique on-path edges.

---

## Sprint: human Neon Gate C on curated HSI REL maps

**Filter (HSI bridge panel + queue helper):** evidence-linked · Gate C pending · has real PMID · mapped `REL-*` in live KG · HSI suggestion `curated` · **`autoApprove=false` always**.

**UI:** `/curation` → **HSI bridge → REL map** → **Gate C ready only**. Per row: REL id, S-P-O re-read, PMID/DOI link, steps **Check → claim_support=supports → Approve**. Deep link: `/curation?q=<REL-*>&hsi=ready#import`.

**Warnings (do not skip):**

- Re-read S-P-O — paper must support **this** directional claim (related-axis maps are bridges, not T2D/CDS proof).
- HSI `source-verified` / curated ≠ Neon Gate C approved.
- Never invent PMIDs; never auto-approve into the live KG; not CDS.
- Axes stay separate: `teachingStatus` ≠ `hsiGrade` ≠ Neon Gate C ≠ CDS.

### How a human runs Gate C (this sprint)

1. Sign in as admin/reviewer → `/curation`.
2. Open **HSI bridge → REL map**; leave **Gate C ready only** on (or use **HSI Gate C filter** on the import toolbar).
3. For each ready row: open the PMID, re-read the listed S-P-O, then **Open in evidence queue**.
4. **Check** identifiers → set `relationship_id` to the suggested REL → set `claim_support=supports` only if the source truly supports that S-P-O → **Approve**.
5. Stop if the paper is off-claim (`partial` / `contradicts` / leave unassessed). Do **not** call Neon APIs to bulk-approve.

### Curated REL queue (ready for human review)

| Priority | HSI seed | REL id | S-P-O (ISI) | PMID | Match | Curator note |
|----------|----------|--------|-------------|------|-------|--------------|
| **P0** | `HSI-E-IO-001` | `REL-R011-drives-P015` | PD-1 —drives→ T-cell exhaustion programme | [16382236](https://pubmed.ncbi.nlm.nih.gov/16382236/) | exact | Same PMID already on `REL-C015-expresses-R011` — re-read for **drives→P015** before supports |
| P1 | `HSI-E-IM-006` | `REL-R004-activates-P003` | NLRP3 —activates→ NLRP3 inflammasome | [15030775](https://pubmed.ncbi.nlm.nih.gov/15030775/) | related_axis | Metabolic-inflammation object is not a KG node — not T2D proof |
| P1 | `HSI-E-IM-004` | `REL-P021-produces-B001` | Acute-phase response —produces→ CRP | [12813013](https://pubmed.ncbi.nlm.nih.gov/12813013/) | related_axis | Marker-axis bridge; not a T2D edge |
| P1 | `HSI-E-IM-010` | `REL-I023-targets-M002` | Canakinumab —targets→ IL-1β | [28845751](https://pubmed.ncbi.nlm.nih.gov/28845751/) | related_axis | Discovery only — not CDS |
| P1 | `HSI-E-AU-001` | `REL-B015-predicts_eligibility_for-I013` | Islet autoantibodies —predicts_eligibility_for→ Teplizumab | [31180194](https://pubmed.ncbi.nlm.nih.gov/31180194/) | related_axis | T1D contrast with T2D clinics |
| P2 | `HSI-E-IM-002` | `REL-M001-contributes_to-D001` | TNF —contributes_to→ RA | [11244034](https://pubmed.ncbi.nlm.nih.gov/11244034/) | related_axis | May already have Gate C on TNF→RA exemplar — do not double-approve blindly; HSI insulin-resistance object absent |
| P2 | `HSI-E-IM-003` | `REL-M003-contributes_to-D001` | IL-6 —contributes_to→ RA | [18625622](https://pubmed.ncbi.nlm.nih.gov/18625622/) | related_axis | Related-axis; no T2D node |
| P2 | `HSI-E-IM-005` | `REL-C003-produces-M001` | Macrophage —produces→ TNF | [2993897](https://pubmed.ncbi.nlm.nih.gov/2993897/) | related_axis | May already be approved on TNF→RA path — verify claim match |
| P2 | `HSI-E-T2D-010` | `REL-I010-suppresses-P001` | Corticosteroid —suppresses→ NF-κB signalling | [7569976](https://pubmed.ncbi.nlm.nih.gov/7569976/) | related_axis | Hyperglycemia consequence is **not** this paper |

**Count:** 9 Gate C–ready curated maps from `listNeonGateCReadyItems()` / `buildHsiBridgeCurationQueue().summary.neonGateCReady`. Export sync: `bun run hsi:sync-export` (symlink `node_modules/hsi-core` → `~/Projects/hsi-core`).

## What not to do

- Do not bulk-approve identifier-verified rows without claim assessment (UI + server block this).
- Do not invent PMIDs or set `supports` without reading the source.
- Do not expect Gate C to pass from the queue alone — approval is the scientific step.
- Do not treat BAFF/belimumab approvals as completing the IFN→SLE exemplar.

## Coverage math

- Runtime links: **~549**
- Queue mapped (candidates): **37** (~6.9%)
- Remaining without a KG bibliographic cite: **~499** (need literature workflow / SME)
- Approved claim links (prod): **9** distinct rels (not 549 — do not overclaim)
- Exemplar unique on-path edges: **14**; P0 open targets listed above: **7** (1 partial Chemnitz; 6 none)
- Eng assist: P0 PubMed preview/seed may add unreviewed rows — **does not** raise Gate C numerator until human approve+supports

---

## REL121 hygiene (do not market)

| Item | Detail |
|------|--------|
| Edge | `REL121` / runtime id `REL-T003-harbours-M022` |
| Subject | `T003` Gut mucosa |
| Object | `M022` **TSLP** (epithelial alarmin — wrong for this claim) |
| Written claim | Microbiota / SCFA → Treg; Routy 2018 ICI microbiome consequence |
| Decision | **Document + exclude from marketing.** Object–claim mismatch; do not invent a retarget PMID. Teaching fibre → butyrate → Treg → IBD uses draft `EM*` edges / `EXT_ROUTES`, not REL121. |
| Queue slot | `RELQ-REL-T003-harbours-M022-C1` carries Routy PMID **29097494** — that paper supports microbiome–ICI biology, **not** “gut mucosa harbours TSLP”. Do **not** approve this slot against the current object. |

---

## Draft microbiome (EM) Gate C targets — PubMed queries only

Educational scaffold in `src/data/extensions.ts` (introduced in `draft-ext-4`; current release `draft-ext-5`). Marketing may **surface** the draft pathway with a Draft badge; claim-level review is incomplete. Queries are search starting points — **never invent PMIDs**; verify before approve.

| Priority | relId | Soft claim (teaching) | PubMed query |
|----------|-------|----------------------|--------------|
| 1 | `REL-EM02-promotes-EM03` | Butyrate / SCFA promotes colonic peripheral Treg induction (HDAC / Foxp3 axis) | `butyrate HDAC Foxp3 colonic Treg induction` |
| 2 | `REL-EM03-expands-C014` | Peripheral Treg induction expands Treg (FOXP3+) populations in gut mucosa | `RORgt FOXP3 colonic Treg microbiota induced` |
| 3 | `REL-EM01-produces-EM02` | Gut microbiota / fibre fermentation produces SCFA (butyrate) | `dietary fibre fermentation butyrate Clostridia Bacteroides` |
| 4 | `REL-EM04-contributes_to-D004` | Epithelial barrier breach contributes to IBD (soft; causality nuanced) | `intestinal epithelial barrier defect inflammatory bowel disease tight junction` |
| 5 | `REL-C018-produces-EM06` | Lamina propria plasma cells produce secretory IgA (dimeric IgA) | `plasma cell secretory IgA polymeric Ig receptor gut mucosa` |

Optional follow-ups (same rules): `REL-EM05-contributes_to-D004` (dysbiosis–IBD association), `REL-EM06-contains-EM01` (sIgA coats commensals). Keep evidence_status / draft labels honest; do not promote EM edges as reviewed exemplars until Gate C lands.

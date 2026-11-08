# Gate C curator operator path (ISI)

**Status:** Operator-ready checklist — **human only** for Approve / Reject  
**Product Neon:** `autumn-snow` only (`ep-blue-salad…`)  
**HSI substrate Neon:** `red-wave` only — **never** for Gate C / cite writes  
**Honesty:** `autoApprove=false` · never invent `claim_support=supports` · never flip `hsiGrade` · **not CDS**

This is the concrete curator path after Discovery consume wiring. It does **not** auto-approve evidence into the public cite graph.

### Live snapshot

| Metric | 2026-11-02 (`--neon`) | 2026-11-08 (pin / Audit #3) |
|--------|----------------------:|----------------------------:|
| Discovery Gate C `human_approved` (pin) | 13 | 13 |
| Cite candidates `hsi-gate-c-cite-*` | 13 | 13 |
| Identifier **verified** | **13** | **13** |
| `claim_support=unassessed` | **13** | **13** |
| Approve-eligible (`verified` + mapped REL + `claim_support=supports`) | **0** | **0** |
| `publicCiteApproved` / Neon `publicApprovedSupports` | **0** | **0** |

**Remeasure (2026-11-02 later):** Founder reported cite `claim_support`/Approve done → `bun run hsi:curator-status -- --neon` still **13 verified / 13 unassessed / 0 supports / 0 publicCiteApproved** (all `hsi-gate-c-cite-*` rows unchanged since Check). Before = after. Do **not** invent counts; human S-P-O → `claim_support=supports` → Approve still required on `/curation?hsi=cite` (**Claim support** is on the row Check column; Approve stays replaced by “Set supports first” until supports).

**Audit #3 (2026-11-08):** Engineering path re-verified ENG CLEARED (seed → Check → inline Claim support → Approve UX + server invariants + dry-run status). Pin remeasure still **0** supports / **0** publicCiteApproved. Agent host lacked `.env.local` `DATABASE_URL` (`neon_skip`); operator should re-run `--neon` on autumn-snow before claiming live clears. Receipt: [`docs/engineering/AUDIT_3_ISI_CITE_HITL_2026-11-08.md`](./engineering/AUDIT_3_ISI_CITE_HITL_2026-11-08.md).

**Founder authorization (2026-11-02):** public cite **Approve** is authorized **only** for rows that already meet eligibility (verified + mapped + `claim_support=supports`). That does **not** authorize inventing `supports` or bulk-approving the 13 verified-but-unassessed rows. Agent/script path: none that can write Approve without Neon Auth reviewer session — use `/curation?hsi=cite` after human S-P-O assess.

**Dry-run status (no writes):**

```bash
cd ~/Desktop/immune-city
bun run hsi:curator-status
bun run hsi:curator-status -- --json
bun run hsi:curator-status -- --neon   # optional read-only autumn-snow counts
```

**Verify helpers:** `bun test src/test/hsi-gate-c-curator-status.test.ts`

---

## Inventory

### UI routes

| Route | Role |
|-------|------|
| `/hsi/discovery` | ASK → MAP → **REVIEW** — Discovery Gate C queue (`HsiGateCQueuePanel`) |
| `/hsi-consume` | Load-order / honesty pin; Gate C stays pending banner |
| `/curation?hsi=ready` | Mapped REL handoffs awaiting Discovery Gate C |
| `/curation?hsi=cite` | Cite candidates after Discovery `human_approved` — **Check → supports → Approve** |
| `/curation?hsi=cite#import` | Deep-link handoff for cite import / worksheet |

Auth: Neon Auth + reviewer / admin for Gate C decisions and evidence Approve (`assertCanReview` / curation powers).

### Scripts (immune-city)

| Command | What it does | Writes Approve? |
|---------|----------------|-----------------|
| `bun run scripts/record-operator-gate-c-decisions.ts <json>` | Persist operator-authorized Discovery Gate C decisions → autumn-snow | No public cite Approve |
| `bun run scripts/seed-cite-candidates-from-gate-c.ts` | Insert `hsi-gate-c-cite-*` rows: `curation=unreviewed`, `claim_support=unassessed` | **Never** |
| `bun run hsi:cite-check` | PubMed/Crossref identifier Check; writes `cite-check-worksheet.json` | **Never** sets supports/approved |
| `bun run hsi:curator-status` | Dry-run pending counts from pins (+ optional `--neon` SELECT) | **No writes** |
| `bun run db:hsi-gate-c-decisions` | Migration for `hsi_gate_c_decisions` | Schema only |

### Pins / artifacts

| Path | Role |
|------|------|
| `public/hsi-discovery/gate-c-checklist.json` | Published pending mapped handoffs from hsi-core |
| `public/hsi-discovery/gate-c-decisions.json` | Operator-authorized Discovery Gate C decisions pin |
| `public/hsi-discovery/cite-check-worksheet.json` | Identifier Check results; still unassessed/unreviewed |

### Code modules

| Module | Role |
|--------|------|
| `src/lib/hsi/gateCQueue.ts` | Queue merge, `applyGateCDecision`, `assertIsiNeonHostForGateC` |
| `src/lib/hsi/gateC.functions.ts` | Server: list / record Discovery Gate C (reviewer-gated) |
| `src/lib/hsi/bridgeCurationQueue.ts` | Bridge → `neonGateCReady` / `citeReadyAfterGateC` |
| `src/lib/hsi/gateCCuratorStatus.ts` | Dry-run status + inventory constants |

### hsi-core (substrate — separate Neon)

| Item | Role |
|------|------|
| `bun run outputs` | Regenerates `gate-c-checklist` into Discovery / dist |
| `docs/IMMUNECITY_GATE_C_COMMIT_MANUAL.md` | Verified PMID ↔ REL map checklist |
| `docs/ISI_IMMUNICITY_WIRING_PLAYBOOK.md` §4 / P2.2–P2.3 | Consume + cite path contract |
| `src/db/gateCLocal.ts` / `bun run db:gate-c-local` | **red-wave only** local placeholders — not ISI Approve |

---

## Two gates (do not collapse)

| Gate | Where | Outcome | Public cite? |
|------|-------|---------|--------------|
| **1. Discovery Gate C** | `/hsi/discovery` REVIEW (or operator decisions script) | `human_approved` / `human_rejected` / `deferred` on HSI edge → REL handoff | **No** |
| **2. Cite path** | `/curation?hsi=cite` | Identifier Check → `claim_support` → `curation=approved` **only if supports** | **Yes** (approved cites only) |

Discovery `human_approved` ≠ public citation. Source-verified / curated HSI maps ≠ Gate C ≠ public cite.

---

## Step-by-step operator path

### A. Discovery Gate C (if actionable rows remain)

1. Confirm `DATABASE_URL` is **autumn-snow** (script/UI refuse red-wave via `assertIsiNeonHostForGateC`).
2. Open `/hsi/discovery` → REVIEW (or use operator-authorized decisions JSON — never forge partner signatures).
3. For each mapped pending row: re-read S-P-O vs PMID rationale → **Approve / Reject / Defer**.
4. Honesty: `autoApprove` stays false; decision must **not** flip `hsiGrade`; not CDS.

### B. Seed cite candidates (engineering / operator once)

```bash
bun run scripts/seed-cite-candidates-from-gate-c.ts
```

Inserts `hsi-gate-c-cite-*` evidence rows only. Leaves `claim_support=unassessed`, `curation=unreviewed`.

### C. Identifier Check

```bash
bun run hsi:cite-check
```

Runs PubMed/Crossref metadata checks. May set `check_status=verified|…` and enrich `source_ref`.  
**Does not** set `claim_support=supports` or `curation=approved`.

### D. Assess supports (human)

1. Open `/curation?hsi=cite`.
2. For each verified row: open the paper; compare to mapped REL S-P-O.
3. Set `claim_support` to `supports` **only** when the paper supports that directional claim; otherwise `partial`, `contradicts`, or leave unassessed / Reject path.
4. Partial / contradicts **block** Approve in UI.

### E. Approve or Reject (human — public cite)

1. **Approve** only when: identifier verified + relationship mapped + `claim_support=supports`.
2. **Reject** (or leave unreviewed) when the paper does not support the claim — do not invent supports to clear the queue.
3. Re-run `bun run hsi:curator-status` — `publicCiteApproved` / Neon `publicApprovedSupports` should rise only after real human Approves.

#### Exact curator clicks (after Check)

1. Sign in as **scientific reviewer** or **administrator** (Neon Auth). Member-only shows read-only decisions — no Approve.
2. Open **`/curation?hsi=cite`** → scroll to **Evidence records** (HSI cite callout explains the path).
3. For each row: open PubMed → re-read paper vs mapped REL S-P-O → in the **Check** column set the visible **Claim support** dropdown to **Supports** (also available under **Details** → Claim mapping). Until then Decision shows **Set supports first**, not Approve.
4. Once `claim_support=supports` (and ID verified + mapped), Decision shows **Approve**. Or use page **Approve N supports-assessed**. Server still enforces `evidenceInvariants` — no auto-approve.
5. Confirm with `bun run hsi:curator-status -- --neon` — counters must move from live Neon, never by editing worksheet JSON.

#### Rows ready for human **supports assess** (not yet Approve)

All 13 are identifier-verified + REL-mapped; **none** have `claim_support=supports` yet:

| evidence_id | REL | PMID | PubMed |
|-------------|-----|------|--------|
| `hsi-gate-c-cite-HSI-E-AU-001` | `REL-B015-predicts_eligibility_for-I013` | 31180194 | https://pubmed.ncbi.nlm.nih.gov/31180194/ |
| `hsi-gate-c-cite-HSI-E-IM-002` | `REL-M001-contributes_to-D001` | 11244034 | https://pubmed.ncbi.nlm.nih.gov/11244034/ |
| `hsi-gate-c-cite-HSI-E-IM-003` | `REL-M003-contributes_to-D001` | 18625622 | https://pubmed.ncbi.nlm.nih.gov/18625622/ |
| `hsi-gate-c-cite-HSI-E-IM-004` | `REL-P021-produces-B001` | 12813013 | https://pubmed.ncbi.nlm.nih.gov/12813013/ |
| `hsi-gate-c-cite-HSI-E-IM-005` | `REL-C003-produces-M001` | 2993897 | https://pubmed.ncbi.nlm.nih.gov/2993897/ |
| `hsi-gate-c-cite-HSI-E-IM-006` | `REL-R004-activates-P003` | 15030775 | https://pubmed.ncbi.nlm.nih.gov/15030775/ |
| `hsi-gate-c-cite-HSI-E-IM-010` | `REL-I023-targets-M002` | 28845751 | https://pubmed.ncbi.nlm.nih.gov/28845751/ |
| `hsi-gate-c-cite-HSI-E-IO-001` | `REL-R011-drives-P015` | 16382236 | https://pubmed.ncbi.nlm.nih.gov/16382236/ |
| `hsi-gate-c-cite-HSI-E-RA-001` | `REL-M001-contributes_to-D001` | 11244034 | https://pubmed.ncbi.nlm.nih.gov/11244034/ |
| `hsi-gate-c-cite-HSI-E-RA-004` | `REL-M003-contributes_to-D001` | 18625622 | https://pubmed.ncbi.nlm.nih.gov/18625622/ |
| `hsi-gate-c-cite-HSI-E-RA-005` | `REL-M003-contributes_to-D001` | 18625622 | https://pubmed.ncbi.nlm.nih.gov/18625622/ |
| `hsi-gate-c-cite-HSI-E-RA-006` | `REL-C003-produces-M001` | 2993897 | https://pubmed.ncbi.nlm.nih.gov/2993897/ |
| `hsi-gate-c-cite-HSI-E-T2D-010` | `REL-I010-suppresses-P001` | 7569976 | https://pubmed.ncbi.nlm.nih.gov/7569976/ |

**Note:** several PMIDs map to more than one REL (e.g. 18625622 → IM-003 / RA-004 / RA-005). Re-assess S-P-O **per row** — shared PMID ≠ multi-REL supports.

---

## Neon isolation

| Project | Use |
|---------|-----|
| **autumn-snow** (`67879321`) | ISI product evidence + Discovery Gate C decisions + cite Approve |
| **red-wave** (`06625195`) | HSI substrate / packs / local Gate C placeholders only |
| Shared evidence DB | **Forbidden** |

Refuse pointing immunecity Gate C / cite scripts at red-wave. Refuse pointing hsi-core migrations at autumn-snow.

---

## Honesty asserts (engineering)

- Consume contract / Discovery: `statusOnPublish === "pending"`, `autoApprove === false`, `mayFlipHsiGradeFromChecklist === false`.
- `applyGateCDecision` rejects `autoApprove` and `flipHsiGrade`.
- Seed / Check scripts never write `supports` or `approved`.
- `summarizeGateCCuratorPath` / `hsi:curator-status` never write decisions.
- Ask / M1 gold-set sign-off ≠ Gate C evidence completeness.

Tests: `src/test/hsi-gate-c-queue.test.ts`, `src/test/hsi-gate-c-curator-status.test.ts`, `src/test/hsi-phase0.test.ts`.

---

## Related human gates (separate)

| Gate | Doc | Status note |
|------|-----|-------------|
| Ask-edu-gold-v0 SME | `docs/ASK_EDUCATIONAL_GOLD_SET.md`, `docs/SME_GOLD_SET_SIGNOFF.md` | `founder_sme_interim` (protocol); named SME still open for `signed_off` |
| M1 G-Ask/G-Mech | `docs/M1_GOLDEN_EVAL_SME_SIGNOFF.md` | Founder interim for protocol; external SME open |
| **This path** | Cite Approve on autumn-snow | Audit #3 eng CLEARED (2026-11-08); Check done (13/13); still **0** supports / **0** publicCiteApproved — **blocked** on human `claim_support` then Approve |
| Partner lock | hsi-core partner fixture | No invented MoU |

Upstream map checklist (hsi-core checkout `~/Projects/hsi-core`): `docs/IMMUNECITY_GATE_C_COMMIT_MANUAL.md` · `docs/ISI_IMMUNICITY_WIRING_PLAYBOOK.md` (§4, P2.2–P2.3).

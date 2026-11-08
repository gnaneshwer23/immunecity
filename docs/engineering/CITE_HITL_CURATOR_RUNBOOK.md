# Cite HITL curator runbook (Audit #3 residual)

**Status:** Engineering path **CLEARED** · HITL **BLOCKED** (0 supports / 0 publicCiteApproved)  
**Neon:** autumn-snow only (`ep-blue-salad…`) — never red-wave for cite writes  
**Honesty:** `autoApprove=false` · never invent `claim_support=supports` · never flip `hsiGrade` · **not CDS**

Companion to [`../GATE_C_CURATOR_PATH.md`](../GATE_C_CURATOR_PATH.md) and [`AUDIT_3_ISI_CITE_HITL_2026-11-08.md`](./AUDIT_3_ISI_CITE_HITL_2026-11-08.md).

## What eng already cleared

| Step | Command / surface | Writes Approve? |
|------|-------------------|-----------------|
| Seed cite candidates | `bun run scripts/seed-cite-candidates-from-gate-c.ts` | No |
| Identifier Check | `bun run hsi:cite-check` | No |
| Dry-run status | `bun run hsi:curator-status` (+ optional `--neon`) | No |
| Residual honesty | `bun run hsi:cite-hitl:check` | No |
| UI path | `/curation?hsi=cite` Claim support → Approve | Human only |

Pin / residual worksheets stay **unassessed**:

- `public/hsi-discovery/cite-check-worksheet.json`
- `public/hsi-discovery/cite-hitl-residual-worksheet.json` (empty assess log)

## Human session (required)

1. Confirm `.env.local` `DATABASE_URL` → **autumn-snow** (scripts refuse red-wave).
2. Sign in as **scientific reviewer** or **administrator** (Neon Auth).
3. Open **`/curation?hsi=cite`**.
4. For each of the **13** verified rows (table in Gate C curator path):
   - Open PubMed → re-read paper vs mapped REL S-P-O.
   - Set **Claim support** (`supports` / `partial` / `contradicts` / leave unassessed).
   - Shared PMIDs must be assessed **per evidence row**.
5. **Approve** only when verified + mapped + `claim_support=supports`. Otherwise Reject / leave unreviewed.
6. Remeasure: `bun run hsi:curator-status -- --neon` — counters must move from live Neon, **never** by editing worksheet JSON.
7. Optionally stamp private notes (principal / assessedAt) outside git; do **not** invent assess fields into the residual worksheet to “clear” HITL.

## STOP — eng must never

- Invent `claim_support=supports` or bulk Approve
- Edit worksheet JSON to bump `publicCiteApproved`
- Gate C / cite auto-approve or `hsiGrade` flips
- Point cite writes at HSI red-wave
- Live CDS / PHI / invented MoU

## Verify (offline)

```sh
bun run hsi:cite-hitl:check
bun run hsi:curator-status
bun test src/test/hsi-gate-c-curator-status.test.ts src/test/curation-claim-support-ux.test.ts
```

Expected: `hitlAcceptance=BLOCKED`, `claimSupportSupports=0`, `publicCiteApproved=0`, `readyForHumanSupportsAssess=13`.

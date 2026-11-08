# Audit #3 — ISI cite HITL (claim_support → Approve)

**Date:** 2026-11-08  
**Source:** hsi-core `docs/engineering/PRODUCTION_READINESS_AUDIT_2026-11-08.md` next-build #3  
**Product Neon:** autumn-snow only (`ep-blue-salad…`)  
**HSI substrate Neon:** red-wave — never used for cite writes  
**Honesty:** `autoApprove=false` · never invent `claim_support=supports` · never flip `hsiGrade` · **not CDS** · no MoU

## Verdict

| Plane | State |
|-------|--------|
| Engineering path (queue → Check → inline Claim support → Approve UX + server invariants) | **ENG CLEARED** |
| Live public cite counts (`supports` / `publicCiteApproved`) | **HITL BLOCKED** (still 0 / 0 on pin; live Neon SELECT skipped — no local `DATABASE_URL`) |
| Gate C auto-approve / invent supports | **Forbidden** (unchanged) |

This receipt is **not** scientific acceptance, Gate C clearance, or production cite launch.

## Remeasure (2026-11-08)

```bash
bun run hsi:curator-status
bun run hsi:curator-status -- --neon   # requires .env.local DATABASE_URL → autumn-snow
```

**Pin / worksheet (this checkout):**

| Metric | Count |
|--------|------:|
| Discovery Gate C `human_approved` (pin) | 13 |
| Cite candidates `hsi-gate-c-cite-*` | 13 |
| Identifier verified / matched | 13 |
| `claim_support=unassessed` | 13 |
| `readyForHumanSupportsAssess` | 13 |
| `publicCiteApproved` (approved + supports) | **0** |
| `autoApprove` | false |

`--neon` on this agent host: `neon_skip: missing DATABASE_URL` — pin-only status still valid. Operator with autumn-snow `.env.local` should re-run `--neon` and stamp live counts; do not edit worksheet JSON to invent supports.

## Engineering path inventory (already shipped)

| Piece | Location |
|-------|----------|
| Operator checklist | [`docs/GATE_C_CURATOR_PATH.md`](../GATE_C_CURATOR_PATH.md) |
| Dry-run status | `bun run hsi:curator-status` · `src/lib/hsi/gateCCuratorStatus.ts` |
| Seed (unreviewed only) | `scripts/seed-cite-candidates-from-gate-c.ts` |
| Identifier Check | `bun run hsi:cite-check` → `public/hsi-discovery/cite-check-worksheet.json` |
| UI | `/curation?hsi=cite` — inline Claim support; Approve disabled until `isReadyForSupportsApproval` |
| Server invariants | `src/lib/immune/evidenceInvariants.ts` (`computeEvidenceUpdate` / supports-only approve) |
| Honesty tests | `src/test/curation-claim-support-ux.test.ts`, `src/test/hsi-gate-c-curator-status.test.ts`, `src/test/evidence-invariants.test.ts` |

No missing script invents `supports` or `curation=approved`. No agent Auth bypass for Approve.

## Residual human HITL (required)

1. Sign in as **scientific reviewer** or **administrator** (Neon Auth) against **autumn-snow**.
2. Open **`/curation?hsi=cite`**.
3. For each of the **13** verified rows: open PubMed → re-read paper vs mapped REL S-P-O → set **Claim support** (`supports` / `partial` / `contradicts` / leave unassessed). Shared PMIDs must be assessed **per row**.
4. **Approve** only when verified + mapped + `claim_support=supports`. Reject / leave unreviewed otherwise — do **not** invent supports to clear the queue.
5. Confirm with `bun run hsi:curator-status -- --neon` — `publicCiteApproved` / Neon `publicApprovedSupports` must move from live SELECT only.

Row table: [`GATE_C_CURATOR_PATH.md`](../GATE_C_CURATOR_PATH.md) § “Rows ready for human supports assess”.

## Explicit non-goals

- Bulk invent `claim_support=supports`
- Gate C / cite auto-approve
- Flipping `hsiGrade` from checklist
- Pointing cite writes at red-wave or HSI migrations at autumn-snow
- Live CDS / PHI / invented MoU / DeliverX

## HUMAN QUEUE deepen (2026-11-08)

Eng-safe residual surfaces (still HITL BLOCKED / 0/0):

| Artifact | Role |
|----------|------|
| [`CITE_HITL_CURATOR_RUNBOOK.md`](./CITE_HITL_CURATOR_RUNBOOK.md) | Operator runbook for Claim support → Approve |
| `public/hsi-discovery/cite-hitl-residual-worksheet.json` | Empty assess log (13 rows; all `humanAssess` null) |
| `bun run hsi:cite-hitl:check` | Offline honesty — refuses invented supports/Approve |

No claim_support invent · no Approve invent · autumn-snow only.

## Next audit item (recommended)

hsi-core HUMAN QUEUE residuals remain parallel: N1 rights (#2), N3 SMEs (#4), staging two-account (#5), founder MoU (#8). Cite HITL residual stays human-only on this path.

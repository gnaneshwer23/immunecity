# Remaining after post–A–F engineering fix-pass

**Date:** 2026-10-30  
**Scope:** Items intentionally left incomplete — SME / ops / credentials — not engineering-fixable without invention.

| Item | Why left incomplete |
| --- | --- |
| SME gold-set / Gate C human approvals | Approving melanoma pilot claims (including KEYNOTE-006 rematch of PMID `25891173` onto `REL-I008-demonstrates_in-TR003`, and S-P-O rewrite of `REL-R011-drives_immune_exhaustion_in-D012`) requires human scientific review. No bulk or auto-approve. |
| Filling `ontology_mappings` with real crosswalks | Table exists (0017); seed stays empty. External ontology IDs must be curator-supplied — fabricating crosswalks is forbidden. |
| Assay cut-offs / companion-diagnostic thresholds | `biomarkerContext` remains an empty stub by design. Inventing TPS/CPS cut-offs would be scientific fabrication. |
| Trial Intelligence production enable | Product flag stays **off**. Enabling TI in prod is an explicit ops decision, not part of this fix-pass. |
| Vercel deploy | Explicitly out of scope (Hobby 402 / deploy triggers). |
| Live multi-account Playwright E2E | Specs are structured and skip clearly without `E2E_USER_A_*` / `E2E_USER_B_*`. Running isolation + collection CRUD needs real credentials. |

Engineering honesty demotions, Ask v12 guardrails, workbench→curation wired handoff (no auto-approve), `db:hardening:verify` for 0017/0018, and Playwright CLI/IA harness updates shipped separately.

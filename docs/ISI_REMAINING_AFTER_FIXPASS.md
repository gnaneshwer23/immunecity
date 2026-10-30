# Remaining after post–A–F engineering fix-pass (+ 2026-10-30 audit response)

**Date:** 2026-10-30  
**Scope:** Items intentionally left incomplete — SME / ops / credentials — not engineering-fixable without invention.  
**See also:** `docs/ISI_AUDIT_RESPONSE_2026-10-30.md` for audit → done/remaining mapping.

| Item | Why left incomplete |
| --- | --- |
| SME gold-set / Gate C human approvals | Approving melanoma pilot claims (including KEYNOTE-006 rematch of PMID `25891173` onto `REL-I008-demonstrates_in-TR003`, and S-P-O rewrite of `REL-R011-drives_immune_exhaustion_in-D012`) requires human scientific review. No bulk or auto-approve. **Engineering aid shipped:** `/sme` workspace + priority `pending_sme` queues + rematch requiring PMID+DOI+passage + gold harness (`docs/ISI_SME_WORKSPACE.md`) — decisions still human-only. |
| Filling `ontology_mappings` with real crosswalks | Table + curator entry UI exist; seed stays empty. External ontology IDs must be curator-supplied — fabricating crosswalks is forbidden. |
| Assay cut-offs / companion-diagnostic thresholds | `biomarkerContext` remains an empty stub by design. Inventing TPS/CPS cut-offs would be scientific fabrication. |
| Trial Intelligence production enable | Product flag stays **off**. Enabling TI in prod is an explicit ops decision, not part of this fix-pass. |
| Vercel deploy | Explicitly out of scope (Hobby 402 / deploy triggers). |
| Live multi-account Playwright E2E | Specs implement sign-in / CRUD / isolation / export when `E2E_USER_A_*` / `E2E_USER_B_*` exist. Without credentials tests **skip with explicit reason** and must not be counted as passes (`e2e/README.md`). |
| Discovery Radar `reviewed_gap` promotions | Detection may only emit `candidate` / `coverage_insufficient`. Human review mandatory — see `docs/ISI_DISCOVERY_REMAINING.md`. |
| Neon apply of Discovery migrations 0019/0020 | **Applied** on ep-blue-salad — see `docs/ISI_NEON_0019_0020_APPLY.md`. |
| Live PubMed/CT.gov continuous Discovery ingest; email alerts; Stripe | Explicitly deferred — adapter/entitlement stubs only. |

## Engineering closed in audit response (not SME-blocked)

- Claim review kinds (`literature_candidate` / `extracted_claim` / `reviewed_claim`); pilot = literature_candidate; source-backed ≠ verified.
- Persistent scientific review queue + audit trail + decision recording (no auto-approve); `wired` = real importManifest path.
- Ask live-answer verification unit tests (v12).
- Melanoma validation matrix TS + curator checklist UI.
- Ontology draft entry UI (empty seed OK).

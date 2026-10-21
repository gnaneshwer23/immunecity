/**
 * P0 exemplar PubMed helpers — search queries + title heuristics only.
 * Never invent PMIDs; never auto-approve. Inserts stay unreviewed/unassessed.
 */
import { EXEMPLAR_CURATOR_TARGETS, type ExemplarCuratorTarget } from "@/lib/immune/exemplarPathways";

export type P0PubmedHit = {
  pmid: string;
  title: string;
  journal: string;
  year: string;
};

/** Title must match before an unreviewed draft may be offered for insert. */
export function titleMatchesP0Claim(target: ExemplarCuratorTarget, title: string): boolean {
  const t = title.toLowerCase();
  switch (target.relId) {
    case "REL-C005-produces-P004":
      return (
        (/plasmacytoid|interferon-producing cell/.test(t) || /principal type 1 interferon-producing/.test(t)) &&
        /interferon/.test(t)
      );
    case "REL-I015-treats-D007":
      return /anifrolumab/.test(t) && (/lupus|sle/.test(t) || /tulip/.test(t));
    case "REL-M018-binds-R018":
      return /ifnar1|interferon.*receptor|receptor subunit 1/.test(t) && /bind|interaction|hot spot/.test(t);
    case "REL-B011-predicts_response_to-I008":
      return /pembrolizumab/.test(t) && (/pd-l1|programmed|biomarker|non-small-cell|nsclc/.test(t));
    case "REL-B011-measures-R012":
      // Companion-diagnostic / assay papers are noisy in default ranking — require human pick.
      return false;
    case "REL-R018-signals_through-P004":
      return /ifnar1|interferon receptor/.test(t) && /signall?ing|stat|jak/.test(t);
    case "REL-R012-suppresses-C015":
      // Chemnitz already mapped partial in Neon — do not auto-seed duplicates.
      return false;
    default:
      return false;
  }
}

export function p0TargetsNeedingDrafts(existingRelIds: Set<string>): ExemplarCuratorTarget[] {
  return EXEMPLAR_CURATOR_TARGETS.filter((t) => !existingRelIds.has(t.relId));
}

export function evidenceIdForP0Draft(relId: string, pmid: string): string {
  return `P0DRAFT-${relId}-${pmid}`;
}

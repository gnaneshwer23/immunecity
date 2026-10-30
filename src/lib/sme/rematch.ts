/**
 * Citation rematch rules for SME workspace.
 * Rematch requires PMID + DOI + passage locator; never auto-approves Gate C.
 */
export type SmeRematchInput = {
  evidenceUuid: string;
  relationshipId: string;
  pmid: string;
  doi: string;
  /** Source passage / page locator the claim rests on. */
  passageLocator: string;
  notes?: string | null;
};

export type SmeRematchValidation =
  | { ok: true; normalised: { pmid: string; doi: string; passageLocator: string; notes: string } }
  | { ok: false; reason: string };

const PMID_RE = /^\d{6,9}$/;
const DOI_RE = /^10\.\d{4,9}\/\S+$/i;

/**
 * Validate a human rematch payload. Fails closed on missing locator fields.
 * Does not look up PubMed — identifier verification stays a separate check step.
 */
export function validateSmeCitationRematch(input: Partial<SmeRematchInput>): SmeRematchValidation {
  const pmid = String(input.pmid ?? "").trim();
  const doi = String(input.doi ?? "").trim();
  const passageLocator = String(input.passageLocator ?? "").trim();
  const relationshipId = String(input.relationshipId ?? "").trim();
  const evidenceUuid = String(input.evidenceUuid ?? "").trim();

  if (!evidenceUuid) return { ok: false, reason: "evidenceUuid required" };
  if (!relationshipId) return { ok: false, reason: "relationshipId required" };
  if (!PMID_RE.test(pmid)) return { ok: false, reason: "pmid must be 6–9 digits" };
  if (!DOI_RE.test(doi)) return { ok: false, reason: "doi must look like 10.xxxx/…" };
  if (passageLocator.length < 12) {
    return { ok: false, reason: "passageLocator required (≥12 chars — quote or page/section locator)" };
  }
  if (passageLocator.length > 4000) return { ok: false, reason: "passageLocator too long" };

  const notesBase = String(input.notes ?? "").trim();
  const notes = [
    `[passage_locator] ${passageLocator}`,
    notesBase ? `[sme_rematch_notes] ${notesBase}` : null,
    "[sme_policy] rematch does not approve Gate C; identifier check required before human approve",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    ok: true,
    normalised: { pmid, doi, passageLocator, notes },
  };
}

export type SmeDecisionAction = "approve" | "reject" | "request_changes" | "rematch_citation";

export function smeDecisionAuditReason(action: SmeDecisionAction): string {
  return `sme_workspace:${action}`;
}

/**
 * Claim-level provenance for melanoma pilot Trial Intelligence endpoints.
 * Exit gate (Phase 1): every published pilot endpoint is traceable to an approved source
 * (PMID/DOI when a numeric is shown; honest null + unverified when not).
 * Never invents numerics or PMIDs.
 */
import type { EndpointResultRecord, VerificationState } from "@/data/trialIntelligence";
import { MELANOMA_PILOT_TRIALS } from "@/data/trialIntelligence";

export const VERIFICATION_LABEL: Record<
  VerificationState,
  { label: string; short: string; desc: string }
> = {
  verified: {
    label: "Verified source",
    short: "verified",
    desc: "Numeric taken from a cited primary publication (PubMed abstract / DOI).",
  },
  partial: {
    label: "Partially verified",
    short: "partial",
    desc: "Source linked but verification is incomplete — see endpoint notes.",
  },
  unverified: {
    label: "Unverified",
    short: "unverified",
    desc: "No verified numeric in curated abstracts — left null; never invented.",
  },
};

export interface EndpointProvenanceView {
  resultId: string;
  verification: VerificationState;
  verificationLabel: string;
  verificationDesc: string;
  sourcePmid: string | null;
  sourceDoi: string | null;
  analysisSet: string | null;
  followUp: string | null;
  timepoint: string | null;
  /** True when a published numeric is backed by PMID (exit-gate for values). */
  numericTraceable: boolean;
  /** True when the endpoint row itself satisfies the Phase 1 exit gate. */
  exitGateOk: boolean;
}

/** Reject invented numerics: any stored number must be verified with a PMID. */
export function endpointPassesHonesty(ep: EndpointResultRecord): boolean {
  if (ep.valueNum != null) {
    if (ep.verificationState !== "verified") return false;
    if (!ep.sourcePmid || !/^\d+$/.test(ep.sourcePmid)) return false;
  }
  if (ep.verificationState === "unverified" && ep.valueNum != null) return false;
  return true;
}

/**
 * Phase 1 exit gate for one endpoint:
 * - Published numerics require verified + PMID (+ honesty).
 * - Null / unverified rows are allowed when they honestly disclose the gap.
 */
export function endpointMeetsExitGate(ep: EndpointResultRecord): boolean {
  if (!endpointPassesHonesty(ep)) return false;
  if (ep.valueNum != null) {
    return (
      ep.verificationState === "verified" &&
      !!ep.sourcePmid &&
      /^\d+$/.test(ep.sourcePmid) &&
      !!ep.analysisSet
    );
  }
  // Honest gap: no invented number.
  return ep.verificationState === "unverified" || ep.verificationState === "partial";
}

export function endpointProvenanceView(ep: EndpointResultRecord): EndpointProvenanceView {
  const meta = VERIFICATION_LABEL[ep.verificationState];
  const numericTraceable =
    ep.valueNum != null &&
    ep.verificationState === "verified" &&
    !!ep.sourcePmid &&
    /^\d+$/.test(ep.sourcePmid);
  return {
    resultId: ep.resultId,
    verification: ep.verificationState,
    verificationLabel: meta.label,
    verificationDesc: meta.desc,
    sourcePmid: ep.sourcePmid,
    sourceDoi: ep.sourceDoi,
    analysisSet: ep.analysisSet || null,
    followUp: ep.followUp,
    timepoint: ep.timepoint,
    numericTraceable,
    exitGateOk: endpointMeetsExitGate(ep),
  };
}

/** Audit all melanoma pilot endpoints against the Phase 1 exit gate. */
export function melanomaPilotExitGateReport(): {
  ok: boolean;
  total: number;
  failing: string[];
} {
  const failing: string[] = [];
  let total = 0;
  for (const trial of MELANOMA_PILOT_TRIALS) {
    for (const arm of trial.arms) {
      for (const ep of arm.endpoints) {
        total += 1;
        if (!endpointMeetsExitGate(ep)) failing.push(ep.resultId);
      }
    }
  }
  return { ok: failing.length === 0, total, failing };
}

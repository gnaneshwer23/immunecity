/* Verified ClinicalTrials.gov registrations for curated TRIAL concepts.
   Each NCT ID was fetched from the ClinicalTrials.gov v2 API on the date below and
   checked against the trial's acronym, intervention and condition. Live status is
   only ever fetched by these exact IDs — never by free-text name search, which
   returns unrelated studies for acronyms such as ATTRACT or RECOVERY.
   A trial with no registry record says so explicitly rather than guessing. */

export interface RegisteredStudy {
  nctId: string;
  /** Registry acronym or short label, as recorded by ClinicalTrials.gov. */
  label: string;
}

export interface TrialRegistration {
  studies: RegisteredStudy[];
  /** Why no registry record exists (pre-registry or non-US first-in-human). */
  unregisteredReason?: string;
  note?: string;
}

export const TRIAL_REGISTRY_PROVENANCE = {
  verifiedOn: "2026-10-21",
  method: "ClinicalTrials.gov API v2 /studies/{nctId}; acronym, intervention and condition checked against the graph trial.",
};

export const TRIAL_REGISTRY: Record<string, TrialRegistration> = {
  TR001: { studies: [], unregisteredReason: "Completed 1997–1999, before trial-registry mandates; no ClinicalTrials.gov record." },
  TR002: { studies: [{ nctId: "NCT01327846", label: "CANTOS" }] },
  TR003: { studies: [{ nctId: "NCT01866319", label: "KEYNOTE-006" }] },
  TR004: { studies: [{ nctId: "NCT01365455", label: "ERASURE" }] },
  TR005: { studies: [{ nctId: "NCT02277743", label: "SOLO 1" }, { nctId: "NCT02277769", label: "SOLO 2" }], note: "LIBERTY AD is a programme; the pivotal monotherapy trials SOLO 1 and SOLO 2 are listed." },
  TR006: { studies: [{ nctId: "NCT00104299", label: "RAVE" }] },
  TR007: { studies: [{ nctId: "NCT01194570", label: "ORATORIO" }] },
  TR008: { studies: [{ nctId: "NCT01030861", label: "TN10 Teplizumab" }] },
  TR009: { studies: [{ nctId: "NCT04381936", label: "RECOVERY" }] },
  TR010: { studies: [{ nctId: "NCT04181827", label: "CARTITUDE-4" }] },
  TR011: { studies: [{ nctId: "NCT02414854", label: "LIBERTY ASTHMA QUEST" }] },
  TR012: { studies: [{ nctId: "NCT02551094", label: "COLCOT" }] },
  TR013: { studies: [], unregisteredReason: "Reported 1999, before trial-registry mandates; no ClinicalTrials.gov record." },
  TR014: { studies: [{ nctId: "NCT01009281", label: "Secukinumab in Crohn disease" }], note: "Registration number taken from the trial publication (PubMed 22595313); the registry title describes it as a safety and tolerability study." },
  TR015: { studies: [], unregisteredReason: "Run 2000–2001, before trial-registry mandates; no ClinicalTrials.gov record." },
  TR016: { studies: [{ nctId: "NCT01691521", label: "MENSA" }] },
  TR017: { studies: [{ nctId: "NCT02013167", label: "TOWER" }] },
  TR018: { studies: [{ nctId: "NCT02200770", label: "N-MOmentum" }] },
  TR019: { studies: [{ nctId: "NCT00783718", label: "GEMINI I" }] },
  TR020: { studies: [{ nctId: "NCT01844505", label: "CheckMate 067" }] },
  TR021: { studies: [{ nctId: "NCT02446899", label: "TULIP-2" }] },
  TR022: { studies: [{ nctId: "NCT00424476", label: "BLISS-52" }] },
  TR023: { studies: [{ nctId: "NCT03347279", label: "NAVIGATOR" }] },
  TR024: { studies: [{ nctId: "NCT03624127", label: "POETYK-PSO-1" }] },
  TR025: { studies: [{ nctId: "NCT00122330", label: "PNH eculizumab (TRIUMPH)" }] },
  TR026: { studies: [], unregisteredReason: "UK first-in-human study (2006); no ClinicalTrials.gov record." },
};

export const NCT_PATTERN = /^NCT\d{8}$/;

export function trialRegistration(nodeId: string): TrialRegistration | undefined {
  return TRIAL_REGISTRY[nodeId];
}

export const ctgStudyUrl = (nctId: string) => `https://clinicaltrials.gov/study/${nctId}`;

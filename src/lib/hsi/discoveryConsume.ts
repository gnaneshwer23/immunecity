/**
 * HSI Discovery JSON consumer for ISI / immunecity.
 * Mirrors hsi-core `examples/isi-consumer/` — fetch GitHub raw or local vendor.
 * Never auto-approves Gate C; never treats hypothetical partner as production.
 */

export type HsiGradeBand = "established" | "uncertain" | "unexplored";

export type HonestyFlags = {
  notCds?: boolean;
  autoApproveIntoKg?: boolean;
  partnerSigned?: boolean;
  containsPhi?: boolean;
  isHypothetical?: boolean;
  legalBinding?: boolean;
  notALegalAgreement?: boolean;
  agreementKind?: string;
  productionPartnerSigned?: boolean;
  lockedPilot?: boolean;
};

export type IsiConsumeContractArtifact = {
  manifestKey: string;
  fileName: string;
  loadPriority: string;
  autoApproveIntoKg: false;
  notes?: string;
};

export type IsiConsumeContract = HonestyFlags & {
  schemaVersion: string;
  contractVersion?: string;
  autoApproveIntoKg: false;
  notCds: true;
  partnerSigned: boolean;
  artifacts: IsiConsumeContractArtifact[];
  grades: { hsiGrades: HsiGradeBand[]; rules?: string[] };
  gateC: {
    statusOnPublish: string;
    autoApprove: boolean;
    mayFlipHsiGradeFromChecklist: boolean;
  };
  vertical?: { activeScope?: string; askStaysRa?: boolean };
};

export type DiscoveryIndex = HonestyFlags & {
  schemaVersion: string;
  files: string[];
};

export type GateCChecklist = {
  schemaVersion?: string;
  pending?: unknown[];
  items?: unknown[];
  modelProposals?: unknown[];
};

export type PartnerLock = HonestyFlags & {
  schemaVersion?: string;
  agreementKind?: string;
  lockedPilot?: boolean;
  scopeLocked?: boolean;
  activeScope?: string;
  researchQuestion?: string;
  honesty?: string[];
  disease?: { id?: string; label?: string; shortLabel?: string };
  partner?: { id?: string; label?: string; type?: string; outreachStatus?: string };
  seedPathway?: {
    id?: string;
    label?: string;
    rationale?: string;
    primaryClaimIds?: string[];
    primaryEdgeIds?: string[];
    primaryPmids?: string[];
  };
  status?: string;
};

export type PilotEvidencePack = {
  schemaVersion?: string;
  notCds?: boolean;
  disease?: string;
  researchQuestion?: string;
  ask?: unknown;
  evidenceMap?: unknown;
  competingExplanations?: unknown;
  expertShortlist?: unknown;
  entitySlice?: unknown;
  partnerScopedEntitySlice?: unknown;
  partnerLock?: unknown;
  uncertainties?: unknown;
  summary?: unknown;
};

const LOAD_PRIORITY_ORDER = [
  "required_core",
  "required_pilot",
  "recommended_secondary",
  "optional_proposal",
  "optional_aksh",
] as const;

/** Default: committed Discovery copies on hsi-core main. */
export const DEFAULT_HSI_ARTIFACT_BASE_URL =
  "https://raw.githubusercontent.com/gnaneshwer23/hsi-core/main/site/public/discovery";

/** Local vendor path (public/) — offline / SSR fallback. */
export const LOCAL_HSI_DISCOVERY_BASE = "/hsi-discovery";

const CORE_FILES = [
  "index.json",
  "hsi-isi-consume-contract.json",
  "hsi-partner-lock.json",
  "hsi-pilot-evidence-pack.json",
  "gate-c-checklist.json",
  "hsi-vertical-decision.json",
  "hsi-partner-flip-readiness.json",
  "hsi-source-licensing-stub.json",
  "hsi-r2-validation.json",
] as const;

export function allowHypotheticalPartner(): boolean {
  if (typeof process === "undefined") return false;
  const v =
    process.env.ALLOW_HYPOTHETICAL_PARTNER ??
    process.env.VITE_ALLOW_HYPOTHETICAL_PARTNER;
  return v === "1" || v === "true";
}

export function hsiArtifactBaseUrl(): string {
  if (typeof process !== "undefined") {
    const fromEnv =
      process.env.HSI_ARTIFACT_BASE_URL ??
      process.env.VITE_HSI_ARTIFACT_BASE_URL;
    if (fromEnv && fromEnv.trim()) return fromEnv.replace(/\/$/, "");
  }
  return DEFAULT_HSI_ARTIFACT_BASE_URL;
}

export function assertHonestyFlags(
  doc: HonestyFlags,
  label: string,
  opts?: {
    allowHypothetical?: boolean;
    /** Default true. Partner-lock JSON may omit notCds — set false for that doc. */
    requireNotCds?: boolean;
  },
): void {
  const requireNotCds = opts?.requireNotCds !== false;
  if (requireNotCds && doc.notCds !== true) {
    throw new Error(`${label}: expected notCds=true`);
  }
  if (doc.notCds === false) {
    throw new Error(`${label}: notCds must not be false`);
  }
  if (doc.autoApproveIntoKg !== false && doc.autoApproveIntoKg !== undefined) {
    throw new Error(`${label}: expected autoApproveIntoKg=false`);
  }
  if (doc.containsPhi === true) {
    throw new Error(`${label}: containsPhi must not be true`);
  }
  if (doc.partnerSigned === true) {
    const allow = opts?.allowHypothetical ?? allowHypotheticalPartner();
    const fixtureOk =
      doc.isHypothetical === true &&
      doc.legalBinding === false &&
      (doc.notALegalAgreement === true ||
        doc.agreementKind === "hypothetical_test_only") &&
      doc.productionPartnerSigned !== true &&
      doc.lockedPilot !== true;
    const namedOk =
      doc.isHypothetical === false &&
      doc.legalBinding === true &&
      (doc.agreementKind === "written_confirm" ||
        doc.agreementKind === "legal_mou") &&
      // Named partner may set lockedPilot; still never CDS / never auto Gate C.
      (doc.lockedPilot === true || doc.lockedPilot === false);
    if (!fixtureOk && !namedOk && !allow) {
      throw new Error(
        `${label}: partnerSigned=true requires hypothetical_test_only fixture (legalBinding=false), a named_partner legalBinding path (written_confirm|legal_mou), or ALLOW_HYPOTHETICAL_PARTNER=1`,
      );
    }
    // Reject fake MoU: legalBinding with hypothetical fixture still on.
    if (doc.legalBinding === true && doc.isHypothetical === true) {
      throw new Error(
        `${label}: legalBinding=true with isHypothetical=true is not accepted (no fake MoU)`,
      );
    }
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`fetch ${url} → HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export type ConsumeLoadResult = {
  source: "remote" | "local";
  baseUrl: string;
  index: DiscoveryIndex;
  contract: IsiConsumeContract;
  partnerLock: PartnerLock;
  pilotPack: PilotEvidencePack;
  gateC: GateCChecklist;
  vertical?: Record<string, unknown>;
  licensing?: Record<string, unknown>;
  flipReadiness?: Record<string, unknown>;
  r2?: Record<string, unknown>;
  /** Optional VALIDATE/TRANSLATE packs — absent must not block ASK→MAP→REVIEW. */
  translation?: Record<string, unknown>;
  loadedFiles: string[];
  askStaysRa: boolean;
  honesty: {
    notCds: true;
    autoApproveIntoKg: false;
    gateCPending: true;
    /** True only for named legalBinding partners — never for hypothetical fixture. Still not CDS. */
    partnerSignedProduction: boolean;
  };
};

async function tryLoadFromBase(
  base: string,
  origin?: string,
): Promise<ConsumeLoadResult> {
  const abs = (file: string) => {
    if (base.startsWith("http")) return `${base}/${file}`;
    const root = origin?.replace(/\/$/, "") ?? "";
    return `${root}${base}/${file}`;
  };

  const index = await fetchJson<DiscoveryIndex>(abs("index.json"));
  assertHonestyFlags(index, "discovery-index");

  const contract = await fetchJson<IsiConsumeContract>(
    abs("hsi-isi-consume-contract.json"),
  );
  assertHonestyFlags(contract, "consume-contract");
  if (contract.gateC.autoApprove !== false) {
    throw new Error("consume-contract: gateC.autoApprove must be false");
  }
  if (contract.gateC.statusOnPublish !== "pending") {
    throw new Error("consume-contract: Gate C statusOnPublish must be pending");
  }
  if (contract.gateC.mayFlipHsiGradeFromChecklist !== false) {
    throw new Error(
      "consume-contract: mayFlipHsiGradeFromChecklist must be false",
    );
  }
  for (const a of contract.artifacts) {
    if (a.autoApproveIntoKg !== false) {
      throw new Error(
        `artifact ${a.manifestKey}: autoApproveIntoKg must be false`,
      );
    }
  }

  const partnerLock = await fetchJson<PartnerLock>(
    abs("hsi-partner-lock.json"),
  );
  assertHonestyFlags(partnerLock, "partner-lock", { requireNotCds: false });

  const pilotPack = await fetchJson<PilotEvidencePack>(
    abs("hsi-pilot-evidence-pack.json"),
  );
  if (pilotPack.notCds === false) {
    throw new Error("pilot-pack: notCds must not be false");
  }

  const gateC = await fetchJson<GateCChecklist>(abs("gate-c-checklist.json"));

  const byPriority = new Map<string, number>(
    LOAD_PRIORITY_ORDER.map((p, i) => [p, i]),
  );
  const loadable = [...contract.artifacts]
    .filter((a) => CORE_FILES.includes(a.fileName as (typeof CORE_FILES)[number]))
    .sort(
      (a, b) =>
        (byPriority.get(a.loadPriority as (typeof LOAD_PRIORITY_ORDER)[number]) ??
          99) -
        (byPriority.get(b.loadPriority as (typeof LOAD_PRIORITY_ORDER)[number]) ??
          99),
    );

  const [vertical, licensing, flipReadiness, r2, translation] = await Promise.all([
    fetchJson<Record<string, unknown>>(abs("hsi-vertical-decision.json")).catch(
      () => undefined,
    ),
    fetchJson<Record<string, unknown>>(
      abs("hsi-source-licensing-stub.json"),
    ).catch(() => undefined),
    fetchJson<Record<string, unknown>>(
      abs("hsi-partner-flip-readiness.json"),
    ).catch(() => undefined),
    fetchJson<Record<string, unknown>>(abs("hsi-r2-validation.json")).catch(
      () => undefined,
    ),
    fetchJson<Record<string, unknown>>(
      abs("hsi-translation-handoff.json"),
    ).catch(() => undefined),
  ]);

  const askStaysRa =
    contract.vertical?.askStaysRa === true ||
    contract.vertical?.activeScope === "ra-tnf" ||
    partnerLock.activeScope === "ra-tnf";

  if (!askStaysRa) {
    throw new Error("vertical: ASK must stay RA (activeScope=ra-tnf)");
  }

  return {
    source: base.startsWith("http") ? "remote" : "local",
    baseUrl: base,
    index,
    contract,
    partnerLock,
    pilotPack,
    gateC,
    vertical,
    licensing,
    flipReadiness,
    r2,
    translation,
    loadedFiles: loadable.map((a) => a.fileName),
    askStaysRa: true,
    honesty: {
      notCds: true,
      autoApproveIntoKg: false,
      gateCPending: true,
      partnerSignedProduction:
        partnerLock.partnerSigned === true &&
        partnerLock.legalBinding === true &&
        partnerLock.isHypothetical === false &&
        (partnerLock.agreementKind === "written_confirm" ||
          partnerLock.agreementKind === "legal_mou"),
    },
  };
}

/**
 * Load HSI Discovery artifacts: prefer remote base URL, fall back to local vendor.
 * @param origin Absolute site origin for resolving `/hsi-discovery/*` in SSR/loaders.
 */
export async function loadHsiDiscoveryConsume(opts?: {
  origin?: string;
  preferLocal?: boolean;
}): Promise<ConsumeLoadResult> {
  const remote = hsiArtifactBaseUrl();
  const local = LOCAL_HSI_DISCOVERY_BASE;
  const origin = opts?.origin;

  if (opts?.preferLocal) {
    try {
      return await tryLoadFromBase(local, origin);
    } catch {
      return await tryLoadFromBase(remote, origin);
    }
  }

  try {
    return await tryLoadFromBase(remote, origin);
  } catch (remoteErr) {
    try {
      return await tryLoadFromBase(local, origin);
    } catch {
      throw remoteErr instanceof Error
        ? remoteErr
        : new Error(String(remoteErr));
    }
  }
}

export function summarizeConsume(result: ConsumeLoadResult): {
  source: string;
  artifactCount: number;
  grades: HsiGradeBand[];
  gateCPending: true;
  partnerAgreementKind: string;
  licensingSummary: Record<string, unknown> | null;
  askScope: string;
} {
  const lic = result.licensing?.summary as Record<string, unknown> | undefined;
  return {
    source: `${result.source}:${result.baseUrl}`,
    artifactCount: result.loadedFiles.length,
    grades: [...result.contract.grades.hsiGrades],
    gateCPending: true,
    partnerAgreementKind: String(
      result.partnerLock.agreementKind ?? "unset",
    ),
    licensingSummary: lic ?? null,
    askScope: String(
      result.contract.vertical?.activeScope ??
        result.partnerLock.activeScope ??
        "ra-tnf",
    ),
  };
}

/** Explicit demo/fixture RA evidence corpus. Never a rights-verified publication release. */
import { createHash } from "node:crypto";
import {
  parseResearchBundle,
  type ResearchBundle,
  type ResearchEntity,
  type ResearchPassage,
  type ResearchRelationship,
  type ResearchSource,
} from "./researchContracts";

export const RA_DEMO_EVIDENCE_RELEASE_VERSION = "hsi-ra-demo-evidence-release-1" as const;
export const RA_DEMO_RELEASE_ID = "ra-anti-tnf-demo";
export const RA_DEMO_QUESTION =
  "DEMO WORKFLOW ONLY — How should RF/anti-CCP serostatus evidence be interpreted in rheumatoid arthritis anti-TNF response research? (synthetic fixture; not_for_scientific_claim)";
/** Human-facing fixture labels; contract IDs use the SYN-DEMO-PMID-* form required for synthetic dataClass. */
export const RA_DEMO_SOURCE_LABELS = ["DEMO-PMID-0001", "DEMO-PMID-0002"] as const;
export const RA_DEMO_SOURCE_IDS = ["SYN-DEMO-PMID-0001", "SYN-DEMO-PMID-0002"] as const;
export const RA_DEMO_DATASET_ID = "ra-anti-tnf-demo-fixture";
export const RA_DEMO_CONCEPT_IDS = ["SYN-D001", "SYN-I032", "SYN-M001"] as const;
export const RA_DEMO_RELATIONSHIP_IDS = [
  "SYN-REL-I032-treats-D001",
  "SYN-REL-I032-targets-M001",
  "SYN-REL-M001-contributes_to-D001",
] as const;
/** Original ISI KG identifiers mirrored by the demo SYN-* nodes (Inspector still uses these on the core corpus). */
export const RA_DEMO_MIRROR_OF = {
  "SYN-D001": "D001",
  "SYN-I032": "I032",
  "SYN-M001": "M001",
  "SYN-REL-I032-treats-D001": "REL-I032-treats-D001",
  "SYN-REL-I032-targets-M001": "REL-I032-targets-M001",
  "SYN-REL-M001-contributes_to-D001": "REL-M001-contributes_to-D001",
} as const;

export type RaDemoSourceRole = "cohort_candidate" | "meta_analysis_candidate";

export interface RaDemoReviewCandidate {
  sourceId: string;
  passageIds: string[];
  plannedRole: RaDemoSourceRole;
  studyDesign: "unassessed";
  claimSupport: "unassessed";
  scientificReview: "unreviewed";
  graphMapping: "related_context_only";
}

export interface RaDemoEvidenceRelease {
  schemaVersion: typeof RA_DEMO_EVIDENCE_RELEASE_VERSION;
  protocolId: "ra-anti-tnf-response-demo";
  protocolVersion: "1";
  version: string;
  releaseId: typeof RA_DEMO_RELEASE_ID;
  corpusKind: "demo_fixture";
  status: "available_demo_only";
  notForScientificClaim: true;
  question: typeof RA_DEMO_QUESTION;
  containsPhi: false;
  clinicalAdvice: false;
  kgWrite: false;
  scientificReview: "unreviewed";
  sources: ResearchSource[];
  passages: ResearchPassage[];
  entities: ResearchEntity[];
  relationships: ResearchRelationship[];
  candidates: RaDemoReviewCandidate[];
  honesty: string[];
}

export class RaDemoEvidenceError extends Error {
  constructor(message = "Invalid RA demo evidence release") {
    super(message);
  }
}

function requireValue(condition: unknown): asserts condition {
  if (!condition) throw new RaDemoEvidenceError();
}

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const canonical = (value: unknown) =>
  JSON.stringify(value, (_key, row: unknown) =>
    row && typeof row === "object" && !Array.isArray(row)
      ? Object.fromEntries(Object.entries(row).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : row,
  );

function exact(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  requireValue(value && typeof value === "object" && !Array.isArray(value));
  requireValue(Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key)));
}

const text = (value: unknown, max = 4000): value is string => typeof value === "string" && !!value.trim() && value.length <= max;
const sha = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

export type RaDemoEvidenceReadiness = {
  available: boolean;
  sources: number;
  passages: number;
  version: string | null;
  scientificReview: "unreviewed";
  reason: string | null;
  corpusKind: "demo_fixture";
  notForScientificClaim: true;
};

export function parseRaDemoEvidenceRelease(input: unknown): RaDemoEvidenceRelease {
  const encoded = typeof input === "string" ? input : JSON.stringify(input);
  requireValue(typeof encoded === "string" && Buffer.byteLength(encoded) <= 500_000);
  const value: unknown = typeof input === "string" ? JSON.parse(input) : input;
  exact(value, [
    "schemaVersion",
    "protocolId",
    "protocolVersion",
    "version",
    "releaseId",
    "corpusKind",
    "status",
    "notForScientificClaim",
    "question",
    "containsPhi",
    "clinicalAdvice",
    "kgWrite",
    "scientificReview",
    "sources",
    "passages",
    "entities",
    "relationships",
    "candidates",
    "honesty",
  ]);
  requireValue(value.schemaVersion === RA_DEMO_EVIDENCE_RELEASE_VERSION);
  requireValue(value.protocolId === "ra-anti-tnf-response-demo" && value.protocolVersion === "1");
  requireValue(value.releaseId === RA_DEMO_RELEASE_ID && value.corpusKind === "demo_fixture" && value.status === "available_demo_only");
  requireValue(value.notForScientificClaim === true && value.question === RA_DEMO_QUESTION);
  requireValue(value.containsPhi === false && value.clinicalAdvice === false && value.kgWrite === false && value.scientificReview === "unreviewed");
  requireValue(Array.isArray(value.honesty) && value.honesty.length >= 3 && value.honesty.every((line) => text(line, 500)));
  requireValue(value.honesty.some((line) => String(line).includes("not_for_scientific_claim")));
  requireValue(value.honesty.some((line) => String(line).includes("DEMO-PMID")));
  requireValue(value.honesty.some((line) => String(line).includes("SYN-")));
  const { version, ...content } = value;
  requireValue(sha(version) && version === hash(canonical(content)));
  requireValue(Array.isArray(value.sources) && value.sources.length === 2);
  requireValue(Array.isArray(value.passages) && value.passages.length >= 2 && value.passages.length <= 12);
  requireValue(Array.isArray(value.entities) && value.entities.length === 3);
  requireValue(Array.isArray(value.relationships) && value.relationships.length === 3);
  requireValue(Array.isArray(value.candidates) && value.candidates.length === 2);

  const release = value as unknown as RaDemoEvidenceRelease;
  for (const conceptId of RA_DEMO_CONCEPT_IDS) {
    const entity = release.entities.find((row) => row.id === conceptId);
    requireValue(entity && entity.dataClass === "synthetic" && entity.provenance.datasetId === RA_DEMO_DATASET_ID);
  }
  const expectedRels: Array<[string, string, string, string]> = [
    ["SYN-REL-I032-treats-D001", "SYN-I032", "treats", "SYN-D001"],
    ["SYN-REL-I032-targets-M001", "SYN-I032", "targets", "SYN-M001"],
    ["SYN-REL-M001-contributes_to-D001", "SYN-M001", "contributes_to", "SYN-D001"],
  ];
  for (const [id, subject, predicate, object] of expectedRels) {
    requireValue(
      release.relationships.some(
        (row) =>
          row.id === id &&
          row.subjectId === subject &&
          row.predicate === predicate &&
          row.objectId === object &&
          row.dataClass === "synthetic" &&
          row.context.species === null,
      ),
    );
  }

  const roles: RaDemoSourceRole[] = ["cohort_candidate", "meta_analysis_candidate"];
  for (let index = 0; index < RA_DEMO_SOURCE_IDS.length; index++) {
    const sourceId = RA_DEMO_SOURCE_IDS[index]!;
    const label = RA_DEMO_SOURCE_LABELS[index]!;
    const source = release.sources.find((row) => row.id === sourceId);
    const candidate = release.candidates.find((row) => row.sourceId === sourceId);
    requireValue(source && candidate);
    requireValue(source.kind === "synthetic_fixture" && source.dataClass === "synthetic");
    requireValue(source.pmid === null && source.doi === null && source.url === null);
    requireValue(source.licence.status === "permitted" && source.licence.passageUsePermitted === true);
    requireValue(source.licence.identifier === "https://creativecommons.org/publicdomain/zero/1.0/");
    requireValue(source.provenance.product === "hsi" && source.provenance.datasetId === RA_DEMO_DATASET_ID);
    requireValue(text(source.title) && source.title.includes(label) && /DEMO|fixture|not a real publication/i.test(source.title));
    requireValue(!/\b18375541\b|\b24586782\b|\bPMC2596303\b|\bPMC3937352\b/.test(source.title));
    const passages = release.passages.filter((passage) => passage.sourceId === sourceId);
    requireValue(passages.length >= 1 && passages.length <= 6);
    requireValue(candidate.plannedRole === roles[index]);
    requireValue(candidate.studyDesign === "unassessed" && candidate.claimSupport === "unassessed");
    requireValue(candidate.scientificReview === "unreviewed" && candidate.graphMapping === "related_context_only");
    requireValue(Array.isArray(candidate.passageIds) && new Set(candidate.passageIds).size === passages.length);
    requireValue(candidate.passageIds.every((id) => passages.some((passage) => passage.id === id)));
    for (const passage of passages) {
      requireValue(passage.dataClass === "synthetic" && passage.sourceVersion === source.provenance.version);
      requireValue(passage.sha256 === hash(passage.text));
      requireValue(/^DEMO-FIXTURE\/abstract\/p\[\d+\]$/.test(passage.locator));
      requireValue(/fixture|DEMO|not_for_scientific_claim|synthetic/i.test(passage.text));
      requireValue(!/\b18375541\b|\b24586782\b/.test(passage.text));
      requireValue(passage.id.startsWith("SYN-"));
    }
  }

  parseResearchBundle({
    schemaVersion: "hsi-research-contract-1",
    containsPhi: false,
    clinicalAdvice: false,
    kgWrite: false,
    context: {
      id: "SYN-RA-DEMO-RELEASE-CHECK",
      question: RA_DEMO_QUESTION,
      conceptIds: [...RA_DEMO_CONCEPT_IDS],
      dataClass: "synthetic",
      purpose: "research_only",
      containsPhi: false,
      provenance: {
        product: "hsi",
        datasetId: RA_DEMO_DATASET_ID,
        version: release.version,
        retrievedAt: release.sources[0]!.provenance.retrievedAt,
      },
    },
    sources: release.sources,
    passages: release.passages,
    entities: release.entities,
    relationships: release.relationships,
    claims: [],
    runs: [],
  });
  return release;
}

/** Self-contained synthetic working set. Mirrors D001/I032/M001 as SYN-* only — never invents real PMID rights. */
export function buildRaDemoEvidenceBundle(input: unknown): ResearchBundle {
  const release = parseRaDemoEvidenceRelease(input);
  return parseResearchBundle({
    schemaVersion: "hsi-research-contract-1",
    containsPhi: false,
    clinicalAdvice: false,
    kgWrite: false,
    context: {
      id: "SYN-RA-DEMO-EVIDENCE-CONTEXT",
      question: RA_DEMO_QUESTION,
      conceptIds: [...RA_DEMO_CONCEPT_IDS],
      dataClass: "synthetic",
      purpose: "research_only",
      containsPhi: false,
      provenance: {
        product: "hsi",
        datasetId: RA_DEMO_DATASET_ID,
        version: release.version,
        retrievedAt: release.sources[0]!.provenance.retrievedAt,
      },
    },
    sources: structuredClone(release.sources),
    passages: structuredClone(release.passages),
    entities: structuredClone(release.entities),
    relationships: structuredClone(release.relationships),
    claims: [],
    runs: [],
  });
}

export function raDemoEvidenceReadiness(input: unknown): RaDemoEvidenceReadiness {
  try {
    const release = parseRaDemoEvidenceRelease(input);
    return {
      available: true,
      sources: release.sources.length,
      passages: release.passages.length,
      version: release.version,
      scientificReview: "unreviewed",
      reason: "Demo/fixture corpus only — not_for_scientific_claim; scientific validation deferred.",
      corpusKind: "demo_fixture",
      notForScientificClaim: true,
    };
  } catch (error) {
    return {
      available: false,
      sources: 0,
      passages: 0,
      version: null,
      scientificReview: "unreviewed",
      reason: error instanceof Error ? error.message : "RA demo evidence release failed validation",
      corpusKind: "demo_fixture",
      notForScientificClaim: true,
    };
  }
}

/** Product corpus listing metadata. Never claims scientific approval or licence clearance of real PMIDs. */
export function raDemoEvidenceReleaseListing(input: unknown) {
  const readiness = raDemoEvidenceReadiness(input);
  return {
    id: RA_DEMO_RELEASE_ID,
    title: "DEMO — RA / anti-TNF fixture (not for scientific claim)",
    description: readiness.available
      ? `Synthetic DEMO-PMID fixture passages (${readiness.passages} passages, version ${readiness.version}). Contract IDs use SYN-DEMO-PMID-* / SYN-D001 mirrors. Marked demo_fixture / not_for_scientific_claim. Cannot substitute for the pending rights-verified RA release. Scientific validation deferred.`
      : `Demo corpus failed validation: ${readiness.reason ?? "invalid"}.`,
    readiness: {
      available: readiness.available,
      sources: readiness.sources,
      passages: readiness.passages,
      version: readiness.version,
      scientificReview: "unreviewed" as const,
      reason: readiness.reason,
    },
  };
}

/** Helper to seal a demo release content object with an integrity version hash. */
export function sealRaDemoEvidenceRelease(content: Omit<RaDemoEvidenceRelease, "version">): RaDemoEvidenceRelease {
  const version = hash(canonical(content));
  return parseRaDemoEvidenceRelease({ ...content, version });
}

/** RA / anti-TNF research working-set corpus. Never a rights-verified publication release. */
import { createHash } from "node:crypto";
import {
  parseResearchBundle,
  type ResearchBundle,
  type ResearchEntity,
  type ResearchPassage,
  type ResearchRelationship,
  type ResearchSource,
} from "./researchContracts";

export const RA_RESEARCH_EVIDENCE_RELEASE_VERSION = "hsi-ra-research-evidence-release-1" as const;
export const RA_RESEARCH_RELEASE_ID = "ra-anti-tnf-research";
export const RA_RESEARCH_QUESTION =
  "How should RF/anti-CCP serostatus evidence be interpreted in rheumatoid arthritis anti-TNF response research? (research working set; scientific claim support unreviewed)";
/** Human-facing source labels; contract IDs use the SYN-RA-SRC-* form required for synthetic dataClass. */
export const RA_RESEARCH_SOURCE_LABELS = ["RS-0001", "RS-0002"] as const;
export const RA_RESEARCH_SOURCE_IDS = ["SYN-RA-SRC-0001", "SYN-RA-SRC-0002"] as const;
export const RA_RESEARCH_DATASET_ID = "ra-anti-tnf-research-working-set";
export const RA_RESEARCH_CONCEPT_IDS = ["SYN-D001", "SYN-I032", "SYN-M001"] as const;
export const RA_RESEARCH_RELATIONSHIP_IDS = [
  "SYN-REL-I032-treats-D001",
  "SYN-REL-I032-targets-M001",
  "SYN-REL-M001-contributes_to-D001",
] as const;
/** Original ISI KG identifiers mirrored by the research SYN-* nodes (Inspector still uses these on the core corpus). */
export const RA_RESEARCH_MIRROR_OF = {
  "SYN-D001": "D001",
  "SYN-I032": "I032",
  "SYN-M001": "M001",
  "SYN-REL-I032-treats-D001": "REL-I032-treats-D001",
  "SYN-REL-I032-targets-M001": "REL-I032-targets-M001",
  "SYN-REL-M001-contributes_to-D001": "REL-M001-contributes_to-D001",
} as const;

export type RaResearchSourceRole = "cohort_candidate" | "meta_analysis_candidate";

export interface RaResearchReviewCandidate {
  sourceId: string;
  passageIds: string[];
  plannedRole: RaResearchSourceRole;
  studyDesign: "unassessed";
  claimSupport: "unassessed";
  scientificReview: "unreviewed";
  graphMapping: "related_context_only";
}

export interface RaResearchEvidenceRelease {
  schemaVersion: typeof RA_RESEARCH_EVIDENCE_RELEASE_VERSION;
  protocolId: "ra-anti-tnf-response-research";
  protocolVersion: "1";
  version: string;
  releaseId: typeof RA_RESEARCH_RELEASE_ID;
  corpusKind: "research_working_set";
  status: "available_working_set";
  notForScientificClaim: true;
  question: typeof RA_RESEARCH_QUESTION;
  containsPhi: false;
  clinicalAdvice: false;
  kgWrite: false;
  scientificReview: "unreviewed";
  sources: ResearchSource[];
  passages: ResearchPassage[];
  entities: ResearchEntity[];
  relationships: ResearchRelationship[];
  candidates: RaResearchReviewCandidate[];
  honesty: string[];
}

export class RaResearchEvidenceError extends Error {
  constructor(message = "Invalid RA research evidence release") {
    super(message);
  }
}

function requireValue(condition: unknown): asserts condition {
  if (!condition) throw new RaResearchEvidenceError();
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

export type RaResearchEvidenceReadiness = {
  available: boolean;
  sources: number;
  passages: number;
  version: string | null;
  scientificReview: "unreviewed";
  reason: string | null;
  corpusKind: "research_working_set";
  notForScientificClaim: true;
};

export function parseRaResearchEvidenceRelease(input: unknown): RaResearchEvidenceRelease {
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
  requireValue(value.schemaVersion === RA_RESEARCH_EVIDENCE_RELEASE_VERSION);
  requireValue(value.protocolId === "ra-anti-tnf-response-research" && value.protocolVersion === "1");
  requireValue(value.releaseId === RA_RESEARCH_RELEASE_ID && value.corpusKind === "research_working_set" && value.status === "available_working_set");
  requireValue(value.notForScientificClaim === true && value.question === RA_RESEARCH_QUESTION);
  requireValue(value.containsPhi === false && value.clinicalAdvice === false && value.kgWrite === false && value.scientificReview === "unreviewed");
  requireValue(Array.isArray(value.honesty) && value.honesty.length >= 3 && value.honesty.every((line) => text(line, 500)));
  requireValue(value.honesty.some((line) => String(line).includes("notForScientificClaim") || String(line).includes("not_for_scientific_claim")));
  requireValue(value.honesty.some((line) => String(line).includes("SYN-RA-SRC") || String(line).includes("RS-000")));
  requireValue(value.honesty.some((line) => String(line).includes("SYN-")));
  const { version, ...content } = value;
  requireValue(sha(version) && version === hash(canonical(content)));
  requireValue(Array.isArray(value.sources) && value.sources.length === 2);
  requireValue(Array.isArray(value.passages) && value.passages.length >= 2 && value.passages.length <= 12);
  requireValue(Array.isArray(value.entities) && value.entities.length === 3);
  requireValue(Array.isArray(value.relationships) && value.relationships.length === 3);
  requireValue(Array.isArray(value.candidates) && value.candidates.length === 2);

  const release = value as unknown as RaResearchEvidenceRelease;
  for (const conceptId of RA_RESEARCH_CONCEPT_IDS) {
    const entity = release.entities.find((row) => row.id === conceptId);
    requireValue(entity && entity.dataClass === "synthetic" && entity.provenance.datasetId === RA_RESEARCH_DATASET_ID);
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

  const roles: RaResearchSourceRole[] = ["cohort_candidate", "meta_analysis_candidate"];
  for (let index = 0; index < RA_RESEARCH_SOURCE_IDS.length; index++) {
    const sourceId = RA_RESEARCH_SOURCE_IDS[index]!;
    const label = RA_RESEARCH_SOURCE_LABELS[index]!;
    const source = release.sources.find((row) => row.id === sourceId);
    const candidate = release.candidates.find((row) => row.sourceId === sourceId);
    requireValue(source && candidate);
    requireValue(source.kind === "synthetic_fixture" && source.dataClass === "synthetic");
    requireValue(source.pmid === null && source.doi === null && source.url === null);
    requireValue(source.licence.status === "permitted" && source.licence.passageUsePermitted === true);
    requireValue(source.licence.identifier === "https://creativecommons.org/publicdomain/zero/1.0/");
    requireValue(source.provenance.product === "hsi" && source.provenance.datasetId === RA_RESEARCH_DATASET_ID);
    requireValue(text(source.title) && source.title.includes(label) && /research working.?set|synthetic research source/i.test(source.title));
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
      requireValue(/^RESEARCH\/abstract\/p\[\d+\]$/.test(passage.locator));
      requireValue(/research working.?set|synthetic|unreviewed|must not be cited/i.test(passage.text));
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
      id: "SYN-RA-RESEARCH-RELEASE-CHECK",
      question: RA_RESEARCH_QUESTION,
      conceptIds: [...RA_RESEARCH_CONCEPT_IDS],
      dataClass: "synthetic",
      purpose: "research_only",
      containsPhi: false,
      provenance: {
        product: "hsi",
        datasetId: RA_RESEARCH_DATASET_ID,
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
export function buildRaResearchEvidenceBundle(input: unknown): ResearchBundle {
  const release = parseRaResearchEvidenceRelease(input);
  return parseResearchBundle({
    schemaVersion: "hsi-research-contract-1",
    containsPhi: false,
    clinicalAdvice: false,
    kgWrite: false,
    context: {
      id: "SYN-RA-RESEARCH-EVIDENCE-CONTEXT",
      question: RA_RESEARCH_QUESTION,
      conceptIds: [...RA_RESEARCH_CONCEPT_IDS],
      dataClass: "synthetic",
      purpose: "research_only",
      containsPhi: false,
      provenance: {
        product: "hsi",
        datasetId: RA_RESEARCH_DATASET_ID,
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

export function raResearchEvidenceReadiness(input: unknown): RaResearchEvidenceReadiness {
  try {
    const release = parseRaResearchEvidenceRelease(input);
    return {
      available: true,
      sources: release.sources.length,
      passages: release.passages.length,
      version: release.version,
      scientificReview: "unreviewed",
      reason: "Research working set — scientific claim support unreviewed; workflow acceptance is not Gate C approval.",
      corpusKind: "research_working_set",
      notForScientificClaim: true,
    };
  } catch (error) {
    return {
      available: false,
      sources: 0,
      passages: 0,
      version: null,
      scientificReview: "unreviewed",
      reason: error instanceof Error ? error.message : "RA research evidence release failed validation",
      corpusKind: "research_working_set",
      notForScientificClaim: true,
    };
  }
}

/** Product corpus listing metadata. Never claims scientific approval or licence clearance of real PMIDs. */
export function raResearchEvidenceReleaseListing(input: unknown) {
  const readiness = raResearchEvidenceReadiness(input);
  return {
    id: RA_RESEARCH_RELEASE_ID,
    title: "RA / anti-TNF research corpus",
    description: readiness.available
      ? `Bounded research working set for internal investigation workflows (${readiness.passages} passages, version ${readiness.version}). Scientific claim support remains unreviewed; workflow acceptance is not Gate C approval. Does not substitute for the pending rights-verified RA release.`
      : `Research corpus failed validation: ${readiness.reason ?? "invalid"}.`,
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

/** Helper to seal a research release content object with an integrity version hash. */
export function sealRaResearchEvidenceRelease(content: Omit<RaResearchEvidenceRelease, "version">): RaResearchEvidenceRelease {
  const version = hash(canonical(content));
  return parseRaResearchEvidenceRelease({ ...content, version });
}

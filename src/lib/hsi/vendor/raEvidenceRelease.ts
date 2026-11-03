/** Rights-screened source passages for the bounded RA benchmark. Never a scientific approval or KG write. */
import { createHash } from "node:crypto";
import { parseResearchBundle, type ResearchBundle, type ResearchSource, type ResearchPassage } from "./researchContracts";
export const RA_EVIDENCE_RELEASE_VERSION = "hsi-ra-evidence-release-1" as const;
export const RA_RELEASE_ID = "ra-anti-tnf-evidence";
export const RA_QUESTION = "How should RF/anti-CCP serostatus evidence be interpreted in rheumatoid arthritis anti-TNF response research?";
export const RA_SOURCE_IDENTITIES = [
  { pmid: "18375541", pmcid: "PMC2596303", doi: "10.1136/ard.2007.084715", role: "cohort_candidate" },
  { pmid: "24586782", pmcid: "PMC3937352", doi: "10.1371/journal.pone.0089442", role: "meta_analysis_candidate" },
] as const;
export interface RaSourceReceipt {
  sourceId: string; pmcid: string;
  metadata: { url: string; responseUrl: string; status: 200; sha256: string; retrievedAt: string };
  articleXml: { url: string; responseUrl: string; status: 200; sha256: string; retrievedAt: string };
  authors: string[]; articleTitle: string; licenceUrl: string; licenceNotice: string; normalization: "xml_itertext_whitespace_collapse";
}
export interface RaReviewCandidate {
  sourceId: string; passageIds: string[]; plannedRole: "cohort_candidate" | "meta_analysis_candidate";
  studyDesign: "unassessed"; claimSupport: "unassessed"; scientificReview: "unreviewed"; graphMapping: "related_context_only";
}
export interface RaEvidenceRelease {
  schemaVersion: typeof RA_EVIDENCE_RELEASE_VERSION; protocolId: "ra-anti-tnf-response"; protocolVersion: "1";
  version: string; question: typeof RA_QUESTION; containsPhi: false; clinicalAdvice: false; kgWrite: false;
  scientificReview: "unreviewed"; sources: ResearchSource[]; passages: ResearchPassage[];
  receipts: RaSourceReceipt[]; candidates: RaReviewCandidate[];
}
export class RaEvidenceUnavailableError extends Error { constructor() { super("RA evidence release requires a verified source import"); } }
function requireValue(condition: unknown): asserts condition { if (!condition) throw new Error("Invalid RA evidence release"); }
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const canonical = (value: unknown) => JSON.stringify(value, (_key, row: unknown) => row && typeof row === "object" && !Array.isArray(row) ? Object.fromEntries(Object.entries(row).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : row);
function exact(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  requireValue(value && typeof value === "object" && !Array.isArray(value));
  requireValue(Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key)));
}
const text = (value: unknown, max = 4000): value is string => typeof value === "string" && !!value.trim() && value.length <= max;
const sha = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
function stamp(value: unknown): asserts value is string {
  requireValue(typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 19) + "Z" === value && Date.parse(value) <= Date.now());
}
export function parseRaEvidenceRelease(input: unknown): RaEvidenceRelease {
  if ((input as { status?: unknown } | null)?.status === "awaiting_verified_source_import") throw new RaEvidenceUnavailableError();
  const encoded = typeof input === "string" ? input : JSON.stringify(input);
  requireValue(typeof encoded === "string" && Buffer.byteLength(encoded) <= 500_000);
  const value: unknown = typeof input === "string" ? JSON.parse(input) : input;
  exact(value, ["schemaVersion", "protocolId", "protocolVersion", "version", "question", "containsPhi", "clinicalAdvice", "kgWrite", "scientificReview", "sources", "passages", "receipts", "candidates"]);
  requireValue(value.schemaVersion === RA_EVIDENCE_RELEASE_VERSION && value.protocolId === "ra-anti-tnf-response" && value.protocolVersion === "1" && value.question === RA_QUESTION);
  requireValue(value.containsPhi === false && value.clinicalAdvice === false && value.kgWrite === false && value.scientificReview === "unreviewed");
  const { version, ...content } = value;
  requireValue(sha(version) && version === hash(canonical(content)));
  requireValue(Array.isArray(value.sources) && value.sources.length === 2 && Array.isArray(value.passages) && value.passages.length >= 2 && value.passages.length <= 40 && Array.isArray(value.receipts) && value.receipts.length === 2 && Array.isArray(value.candidates) && value.candidates.length === 2);
  const release = value as unknown as RaEvidenceRelease;
  const selected = new Set<string>();
  for (const expected of RA_SOURCE_IDENTITIES) {
    const sourceId = `PMID-${expected.pmid}`;
    const source = release.sources.find((s) => s.id === sourceId), receipt = release.receipts.find((r) => r.sourceId === sourceId), candidate = release.candidates.find((c) => c.sourceId === sourceId);
    requireValue(source && receipt && candidate && !selected.has(sourceId)); selected.add(sourceId);
    requireValue(source.pmid === expected.pmid && source.doi === expected.doi && source.url === `https://europepmc.org/articles/${expected.pmcid}` && source.kind === "publication" && source.dataClass === "public_real");
    requireValue(source.licence.status === "permitted" && source.licence.passageUsePermitted === true && /^https:\/\/creativecommons\.org\/(?:licenses\/by\/(?:1\.0|2\.0|2\.5|3\.0|4\.0)|publicdomain\/zero\/1\.0)\/$/.test(source.licence.identifier ?? ""));
    exact(receipt, ["sourceId", "pmcid", "metadata", "articleXml", "authors", "articleTitle", "licenceUrl", "licenceNotice", "normalization"]);
    requireValue(receipt.pmcid === expected.pmcid && receipt.licenceUrl === source.licence.identifier && text(receipt.licenceNotice, 20000) && !/non[ -]?commercial|no derivatives|all rights reserved/i.test(receipt.licenceNotice) && receipt.normalization === "xml_itertext_whitespace_collapse");
    requireValue(Array.isArray(receipt.authors) && receipt.authors.length > 0 && receipt.authors.length <= 500 && receipt.authors.every((a) => text(a, 256)));
    requireValue(text(receipt.articleTitle) && source.title === `${receipt.authors.join(", ")} — ${receipt.articleTitle}`);
    for (const [kind, proof] of [["metadata", receipt.metadata], ["articleXml", receipt.articleXml]] as const) {
      exact(proof, ["url", "responseUrl", "status", "sha256", "retrievedAt"]); stamp(proof.retrievedAt);
      requireValue(proof.status === 200 && sha(proof.sha256) && proof.url === proof.responseUrl);
      const url = new URL(proof.url);
      requireValue(url.origin === "https://www.ebi.ac.uk" && !url.username && !url.password && !url.hash);
      if (kind === "articleXml") requireValue(url.pathname === `/europepmc/webservices/rest/${expected.pmcid}/fullTextXML` && !url.search);
      else requireValue(url.pathname === "/europepmc/webservices/rest/search" && url.searchParams.get("query") === `EXT_ID:${expected.pmid} AND SRC:MED` && url.searchParams.get("format") === "json" && url.searchParams.get("resultType") === "core" && url.searchParams.get("pageSize") === "2" && [...url.searchParams].length === 4);
    }
    requireValue(source.provenance.product === "hsi" && source.provenance.datasetId === "ra-anti-tnf-source-release" && source.provenance.version === receipt.articleXml.sha256 && source.provenance.retrievedAt === receipt.articleXml.retrievedAt);
    exact(candidate, ["sourceId", "passageIds", "plannedRole", "studyDesign", "claimSupport", "scientificReview", "graphMapping"]);
    const passages = release.passages.filter((p) => p.sourceId === sourceId);
    requireValue(passages.length >= 1 && passages.length <= 20 && candidate.plannedRole === expected.role && candidate.studyDesign === "unassessed" && candidate.claimSupport === "unassessed" && candidate.scientificReview === "unreviewed" && candidate.graphMapping === "related_context_only");
    requireValue(Array.isArray(candidate.passageIds) && new Set(candidate.passageIds).size === passages.length && candidate.passageIds.length === passages.length && candidate.passageIds.every((id) => passages.some((p) => p.id === id)));
    for (const passage of passages) requireValue(passage.sourceVersion === receipt.articleXml.sha256 && passage.sha256 === hash(passage.text) && /^\/article\/front\/article-meta\/abstract\[\d+\]\/(?:sec\[\d+\]\/)*p\[\d+\]; XML itertext with whitespace collapsed$/.test(passage.locator));
  }
  // Reuse the shared strict source/passage boundary and join checks without inventing graph claims.
  parseResearchBundle({ schemaVersion: "hsi-research-contract-1", containsPhi: false, clinicalAdvice: false, kgWrite: false,
    context: { id: "RA-RELEASE-CHECK", question: RA_QUESTION, conceptIds: [], dataClass: "public_real", purpose: "research_only", containsPhi: false, provenance: { product: "hsi", datasetId: "ra-anti-tnf-source-release", version, retrievedAt: release.receipts[0]!.articleXml.retrievedAt } },
    sources: release.sources, passages: release.passages, entities: [], relationships: [], claims: [], runs: [],
  });
  return release;
}
/** A working-set view of the existing KG, with context links only. Serology-response is not falsely mapped as anti-TNF efficacy. */
export function buildRaEvidenceBundle(graph: ResearchBundle, input: unknown): ResearchBundle {
  const base = parseResearchBundle(graph), release = parseRaEvidenceRelease(input);
  const anchors = [ ["REL-I032-treats-D001", "I032", "treats", "D001"], ["REL-I032-targets-M001", "I032", "targets", "M001"], ["REL-M001-contributes_to-D001", "M001", "contributes_to", "D001"] ];
  for (const [id, subject, predicate, object] of anchors) requireValue(base.relationships.some((r) => r.id === id && r.subjectId === subject && r.predicate === predicate && r.objectId === object));
  return parseResearchBundle({ ...structuredClone(base), context: { ...base.context, id: "RA-EVIDENCE-CONTEXT", question: RA_QUESTION, conceptIds: ["D001", "I032", "M001"], dataClass: "public_real", provenance: { product: "hsi", datasetId: "ra-anti-tnf-source-release", version: release.version, retrievedAt: release.receipts[0]!.articleXml.retrievedAt } }, sources: structuredClone(release.sources), passages: structuredClone(release.passages), claims: [], runs: [] });
}
export type RaEvidenceReadiness = {
  available: boolean;
  sources: number;
  passages: number;
  version: string | null;
  scientificReview: "unreviewed";
  reason: string | null;
};

export function raEvidenceReadiness(input: unknown): RaEvidenceReadiness {
  if (input && typeof input === "object" && !Array.isArray(input) && (input as { status?: unknown }).status === "awaiting_verified_source_import") {
    const reason = (input as { reason?: unknown }).reason;
    return {
      available: false,
      sources: 0,
      passages: 0,
      version: null,
      scientificReview: "unreviewed",
      reason: typeof reason === "string" && reason.trim() ? reason.trim().slice(0, 2000) : "awaiting_verified_source_import",
    };
  }
  try {
    const r = parseRaEvidenceRelease(input);
    return { available: true, sources: r.sources.length, passages: r.passages.length, version: r.version, scientificReview: "unreviewed", reason: null };
  } catch (error) {
    return {
      available: false,
      sources: 0,
      passages: 0,
      version: null,
      scientificReview: "unreviewed",
      reason: error instanceof RaEvidenceUnavailableError ? error.message : "RA evidence release failed validation",
    };
  }
}

/** Product corpus listing metadata. Never claims scientific approval. */
export function raEvidenceReleaseListing(input: unknown) {
  const readiness = raEvidenceReadiness(input);
  return {
    id: RA_RELEASE_ID,
    title: "RA / anti-TNF evidence (rights-verified)",
    description: readiness.available
      ? `Two rights-verified abstract sources (${readiness.passages} passages, version ${readiness.version}). Graph anchors are related context only; serology-response is not mapped as anti-TNF efficacy. Scientific support remains unreviewed; workflow acceptance is not Gate C approval.`
      : `Not ready for investigation start: ${readiness.reason ?? "awaiting verified source import"}. Keep existing corpora usable; do not treat this as an empty successful search.`,
    readiness,
  };
}

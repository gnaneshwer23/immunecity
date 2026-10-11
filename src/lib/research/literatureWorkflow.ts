/* Literature intelligence workflow (PRD FR-036/037).
   Explicit step machine: source identification → metadata validation → candidate
   claims → map to graph → conflict flags → human claim approval.
   No PubMed/DOI identifiers are invented — only optional user-supplied values.
   Candidates never write approved claims into the curated graph. */

import { byId, edgeByRel, KG, type KGNode } from "@/lib/immune/engine";

export type LitStep =
  | "source_identification"
  | "metadata_validation"
  | "candidate_claims"
  | "map_concepts"
  | "conflict_flags"
  | "claim_approval";

/** Human review disposition — separate from claim_support on the mapped edge. */
export type ClaimReviewStatus = "queued" | "accepted_for_curation" | "rejected" | "needs_edit";

/** Aligns with evidence_records.claim_support / evidenceStatus vocabulary. */
export type ClaimSupport = "unassessed" | "supports" | "partial" | "contradicts" | "unrelated";

export type MetadataCheckStatus =
  | "unchecked"
  | "format_ok"
  | "format_issue"
  | "incomplete"
  /** Live PubMed/Crossref checks stay on the curation server path — not this scaffold. */
  | "live_check_deferred";

export type ConflictSeverity = "info" | "warning" | "blocking";
export type ConflictCode =
  | "unknown_concept"
  | "unknown_relationship"
  | "intra_project_disagreement"
  | "contradicts_established"
  | "unmapped_acceptance"
  | "missing_identifier"
  | "unassessed_support";

export interface SearchMetadata {
  query: string;
  retrievedAt: string;
  source: "manual_entry" | "paste_metadata";
  /** Optional user-supplied identifier — never auto-generated. */
  pmid?: string;
  doi?: string;
  title?: string;
  journal?: string;
  year?: string;
  notes?: string;
  metadataCheck: MetadataCheckStatus;
  metadataNotes: string[];
}

export interface ConflictFlag {
  flag_id: string;
  claim_id: string;
  relationship_id?: string;
  severity: ConflictSeverity;
  code: ConflictCode;
  message: string;
}

export interface CandidateClaim {
  claim_id: string;
  text: string;
  excerpt: string;
  subjectHint: string;
  predicateHint: string;
  objectHint: string;
  context: string;
  mappedConceptIds: string[];
  mappedRelationshipIds: string[];
  /** Proposed support for mapped relationship(s); curator must confirm in curation. */
  claimSupport: ClaimSupport;
  reviewStatus: ClaimReviewStatus;
  reviewNotes: string;
  conflictFlags: ConflictFlag[];
}

export interface LiteratureProject {
  project_id: string;
  step: LitStep;
  search: SearchMetadata;
  claims: CandidateClaim[];
  graphVersion: string;
  extensionsVersion: string;
  createdAt: string;
  updatedAt: string;
  /** Always a draft scaffold — never an approved graph mutation. */
  status: "draft_scaffold";
}

/** Manifest shape compatible with importManifest (evidence.functions) — curation stays unreviewed. */
export interface CurationManifestExport {
  meta: {
    kind: "literature_candidate_export";
    project_id: string;
    graphVersion: string;
    extensionsVersion: string;
    exportedAt: string;
    curation: "unreviewed";
    note: string;
  };
  evidence_records: Array<{
    node_id: string;
    node_type: string;
    node_name: string;
    evidence: Array<{
      evidence_id: string;
      source_ref: string | null;
      status: "candidate";
      source_type: "literature_workflow";
      search_query?: string;
      pmid?: string;
      doi?: string;
      relationship_id?: string | null;
      claim_support?: ClaimSupport;
      claim_text?: string;
    }>;
  }>;
}

const STEPS: LitStep[] = [
  "source_identification",
  "metadata_validation",
  "candidate_claims",
  "map_concepts",
  "conflict_flags",
  "claim_approval",
];

export const STEP_LABEL: Record<LitStep, string> = {
  source_identification: "1. Source identification",
  metadata_validation: "2. Metadata validation",
  candidate_claims: "3. Candidate claims",
  map_concepts: "4. Map to graph",
  conflict_flags: "5. Conflict flags",
  claim_approval: "6. Claim approval",
};

export const CLAIM_SUPPORT_LABEL: Record<ClaimSupport, string> = {
  unassessed: "Not assessed",
  supports: "Supports the claim",
  partial: "Partially supports",
  contradicts: "Contradicts the claim",
  unrelated: "Does not address it",
};

export function createLiteratureProject(
  graphVersion: string,
  extensionsVersion: string,
  partial?: Partial<SearchMetadata>,
): LiteratureProject {
  const now = new Date().toISOString();
  const search = applyMetadataValidation({
    query: partial?.query ?? "",
    retrievedAt: now,
    source: partial?.source ?? "manual_entry",
    pmid: normaliseOptionalId(partial?.pmid),
    doi: normaliseOptionalId(partial?.doi),
    title: partial?.title?.trim() || undefined,
    journal: partial?.journal?.trim() || undefined,
    year: partial?.year?.trim() || undefined,
    notes: partial?.notes?.trim() || undefined,
    metadataCheck: "unchecked",
    metadataNotes: [],
  });
  return {
    project_id: `LIT-DRAFT-${Date.now().toString(36)}`,
    step: "source_identification",
    search,
    claims: [],
    graphVersion,
    extensionsVersion,
    createdAt: now,
    updatedAt: now,
    status: "draft_scaffold",
  };
}

/** Reject placeholder / fabricated-looking empty IDs; allow real user input only. */
export function normaliseOptionalId(raw?: string): string | undefined {
  const v = (raw ?? "").trim();
  if (!v) return undefined;
  if (/^(tbd|n\/?a|none|null|fake|placeholder|xxx+)$/i.test(v)) return undefined;
  return v;
}

export function isPlausiblePmid(pmid?: string): boolean {
  return !!pmid && /^\d{6,9}$/.test(pmid);
}

export function isPlausibleDoi(doi?: string): boolean {
  if (!doi) return false;
  const v = doi.replace(/^doi:\s*/i, "").trim();
  return /^10\.\d{4,9}\/\S+$/.test(v);
}

export function searchMetadataComplete(s: SearchMetadata): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!s.query.trim()) missing.push("query");
  if (!s.title?.trim() && !s.pmid && !s.doi) missing.push("title|pmid|doi");
  return { ok: missing.length === 0, missing };
}

/** Local format/completeness checks only — does not call PubMed or invent IDs. */
export function validateMetadata(s: SearchMetadata): {
  ok: boolean;
  status: MetadataCheckStatus;
  notes: string[];
} {
  const notes: string[] = [];
  const complete = searchMetadataComplete(s);
  if (!complete.ok) {
    notes.push(`Incomplete source metadata: missing ${complete.missing.join(", ")}.`);
    return { ok: false, status: "incomplete", notes };
  }

  let formatIssue = false;
  if (s.pmid) {
    if (isPlausiblePmid(s.pmid)) notes.push(`PMID format looks plausible (${s.pmid}); live PubMed verification is deferred to curation.`);
    else {
      formatIssue = true;
      notes.push(`PMID "${s.pmid}" is not a plausible PubMed ID (expect 6–9 digits). Nothing was invented to replace it.`);
    }
  }
  if (s.doi) {
    const doi = s.doi.replace(/^doi:\s*/i, "").trim();
    if (isPlausibleDoi(doi)) notes.push(`DOI format looks plausible; live Crossref verification is deferred to curation.`);
    else {
      formatIssue = true;
      notes.push(`DOI "${s.doi}" is not a plausible DOI (expect 10.xxxx/…). Nothing was invented to replace it.`);
    }
  }
  if (!s.pmid && !s.doi) {
    notes.push("No PMID/DOI supplied — title/query-only source. Identifier lookup stays optional until a curator adds one.");
  }

  if (formatIssue) return { ok: false, status: "format_issue", notes };
  const status: MetadataCheckStatus = s.pmid || s.doi ? "live_check_deferred" : "format_ok";
  notes.push("Metadata validation is local only; scientific claim approval is a later human step.");
  return { ok: true, status, notes };
}

function applyMetadataValidation(s: SearchMetadata): SearchMetadata {
  const v = validateMetadata({ ...s, pmid: normaliseOptionalId(s.pmid), doi: normaliseOptionalId(s.doi) });
  return {
    ...s,
    pmid: normaliseOptionalId(s.pmid),
    doi: normaliseOptionalId(s.doi),
    metadataCheck: v.status,
    metadataNotes: v.notes,
  };
}

export function updateSearch(
  project: LiteratureProject,
  patch: Partial<Omit<SearchMetadata, "metadataCheck" | "metadataNotes" | "retrievedAt">>,
): LiteratureProject {
  const search = applyMetadataValidation({
    ...project.search,
    ...patch,
    query: patch.query !== undefined ? patch.query : project.search.query,
  });
  return touch({ ...project, search });
}

export function runMetadataValidation(project: LiteratureProject): LiteratureProject {
  const search = applyMetadataValidation(project.search);
  const step: LitStep = validateMetadata(search).ok ? "metadata_validation" : "source_identification";
  return touch({ ...project, search, step });
}

export function addCandidateClaim(
  project: LiteratureProject,
  partial: Pick<CandidateClaim, "text"> & Partial<CandidateClaim>,
): LiteratureProject {
  const claim: CandidateClaim = {
    claim_id: `CLAIM-CAND-${Date.now().toString(36)}-${project.claims.length + 1}`,
    text: partial.text.trim(),
    excerpt: (partial.excerpt ?? "").trim(),
    subjectHint: (partial.subjectHint ?? "").trim(),
    predicateHint: (partial.predicateHint ?? "").trim(),
    objectHint: (partial.objectHint ?? "").trim(),
    context: (partial.context ?? "").trim(),
    mappedConceptIds: partial.mappedConceptIds ?? [],
    mappedRelationshipIds: partial.mappedRelationshipIds ?? [],
    claimSupport: partial.claimSupport ?? "unassessed",
    reviewStatus: "queued",
    reviewNotes: "",
    conflictFlags: [],
  };
  const next = touch({ ...project, claims: [...project.claims, claim], step: "candidate_claims" });
  return refreshConflicts(next);
}

export function mapClaim(
  project: LiteratureProject,
  claimId: string,
  conceptIds: string[],
  relationshipIds: string[],
): LiteratureProject {
  const claims = project.claims.map((c) =>
    c.claim_id === claimId
      ? {
          ...c,
          mappedConceptIds: conceptIds.map((x) => x.trim()).filter(Boolean),
          mappedRelationshipIds: relationshipIds.map((x) => x.trim()).filter(Boolean),
        }
      : c,
  );
  return refreshConflicts(touch({ ...project, claims, step: "map_concepts" }));
}

export function setClaimSupport(
  project: LiteratureProject,
  claimId: string,
  claimSupport: ClaimSupport,
): LiteratureProject {
  const claims = project.claims.map((c) => (c.claim_id === claimId ? { ...c, claimSupport } : c));
  return refreshConflicts(touch({ ...project, claims }));
}

export function reviewClaim(
  project: LiteratureProject,
  claimId: string,
  reviewStatus: ClaimReviewStatus,
  reviewNotes = "",
): LiteratureProject {
  const claims = project.claims.map((c) =>
    c.claim_id === claimId ? { ...c, reviewStatus, reviewNotes: reviewNotes.trim() } : c,
  );
  return refreshConflicts(touch({ ...project, claims, step: "claim_approval" }));
}

export function suggestConceptMatches(hint: string, limit = 6): Array<{ id: string; name: string; score: number }> {
  const q = hint.trim().toLowerCase();
  if (q.length < 2) return [];
  const scored: Array<{ id: string; name: string; score: number }> = [];
  for (const n of KG.nodes) {
    const name = n.name.toLowerCase();
    const id = n.id.toLowerCase();
    let score = 0;
    if (id === q || name === q) score = 100;
    else if (id.startsWith(q) || name.startsWith(q)) score = 80;
    else if (name.includes(q) || id.includes(q)) score = 50;
    else if (q.split(/\s+/).every((w) => w.length > 1 && name.includes(w))) score = 40;
    if (score > 0) scored.push({ id: n.id, name: n.name, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, limit);
}

export function suggestRelationshipMatches(
  conceptIds: string[],
  limit = 8,
): Array<{ relId: string; label: string }> {
  const set = new Set(conceptIds.filter(Boolean));
  if (!set.size) return [];
  const out: Array<{ relId: string; label: string }> = [];
  for (const e of KG.relationships) {
    if (!set.has(e.subject_id) && !set.has(e.object_id)) continue;
    const id = `REL-${e.subject_id}-${e.relation}-${e.object_id}`;
    const sub = byId[e.subject_id]?.name ?? e.subject_id;
    const obj = byId[e.object_id]?.name ?? e.object_id;
    out.push({ relId: id, label: `${sub} ${e.relation.replace(/_/g, " ")} ${obj}` });
    if (out.length >= limit) break;
  }
  return out;
}

export function validateMappedIds(claim: CandidateClaim): {
  conceptOk: string[];
  conceptBad: string[];
  relOk: string[];
  relBad: string[];
} {
  const conceptOk: string[] = [];
  const conceptBad: string[] = [];
  for (const id of claim.mappedConceptIds) {
    if (byId[id]) conceptOk.push(id);
    else conceptBad.push(id);
  }
  const relOk: string[] = [];
  const relBad: string[] = [];
  for (const id of claim.mappedRelationshipIds) {
    if (edgeByRel[id]) relOk.push(id);
    else relBad.push(id);
  }
  return { conceptOk, conceptBad, relOk, relBad };
}

export function detectConflicts(project: LiteratureProject): ConflictFlag[] {
  const flags: ConflictFlag[] = [];
  let n = 0;
  const push = (f: Omit<ConflictFlag, "flag_id">) => {
    n += 1;
    flags.push({ ...f, flag_id: `CF-${project.project_id}-${n}` });
  };

  if (!project.search.pmid && !project.search.doi) {
    for (const c of project.claims) {
      if (c.reviewStatus === "accepted_for_curation") {
        push({
          claim_id: c.claim_id,
          severity: "info",
          code: "missing_identifier",
          message: "Accepted without PMID/DOI — curator must supply a verified identifier before approval.",
        });
      }
    }
  }

  const supportByRel = new Map<string, Array<{ claim_id: string; support: ClaimSupport }>>();

  for (const c of project.claims) {
    const v = validateMappedIds(c);
    for (const id of v.conceptBad) {
      push({
        claim_id: c.claim_id,
        severity: "blocking",
        code: "unknown_concept",
        message: `Unknown concept ID "${id}" — not in the current graph.`,
      });
    }
    for (const id of v.relBad) {
      push({
        claim_id: c.claim_id,
        severity: "blocking",
        code: "unknown_relationship",
        relationship_id: id,
        message: `Unknown relationship ID "${id}" — expected REL-subject-relation-object.`,
      });
    }
    for (const rid of v.relOk) {
      const edge = edgeByRel[rid]!;
      const list = supportByRel.get(rid) ?? [];
      list.push({ claim_id: c.claim_id, support: c.claimSupport });
      supportByRel.set(rid, list);
      if (c.claimSupport === "contradicts" && /ESTABLISHED|EVIDENCE-SUPPORTED/i.test(edge.evidence_status)) {
        push({
          claim_id: c.claim_id,
          relationship_id: rid,
          severity: "warning",
          code: "contradicts_established",
          message: `Claim proposes contradiction of ${rid} (graph evidence_status=${edge.evidence_status}). Human review required.`,
        });
      }
    }
    if (
      c.reviewStatus === "accepted_for_curation" &&
      !c.mappedConceptIds.length &&
      !c.mappedRelationshipIds.length
    ) {
      push({
        claim_id: c.claim_id,
        severity: "blocking",
        code: "unmapped_acceptance",
        message: "Accepted for curation but not mapped to any concept or relationship.",
      });
    }
    if (c.reviewStatus === "accepted_for_curation" && c.claimSupport === "unassessed" && c.mappedRelationshipIds.length) {
      push({
        claim_id: c.claim_id,
        severity: "warning",
        code: "unassessed_support",
        message: "Accepted with claim_support still unassessed — set supports/partial/contradicts/unrelated before curator handoff.",
      });
    }
  }

  for (const [rid, entries] of supportByRel) {
    const assessed = entries.filter((e) => e.support !== "unassessed");
    const supports = assessed.some((e) => e.support === "supports" || e.support === "partial");
    const contradicts = assessed.some((e) => e.support === "contradicts");
    if (supports && contradicts) {
      for (const e of assessed) {
        push({
          claim_id: e.claim_id,
          relationship_id: rid,
          severity: "warning",
          code: "intra_project_disagreement",
          message: `Intra-project disagreement on ${rid}: mixed supports/partial vs contradicts.`,
        });
      }
    }
  }

  return flags;
}

export function refreshConflicts(project: LiteratureProject): LiteratureProject {
  const all = detectConflicts(project);
  const byClaim = new Map<string, ConflictFlag[]>();
  for (const f of all) {
    const list = byClaim.get(f.claim_id) ?? [];
    list.push(f);
    byClaim.set(f.claim_id, list);
  }
  const claims = project.claims.map((c) => ({ ...c, conflictFlags: byClaim.get(c.claim_id) ?? [] }));
  return { ...project, claims };
}

export function projectConflictSummary(project: LiteratureProject) {
  const flags = project.claims.flatMap((c) => c.conflictFlags);
  return {
    total: flags.length,
    blocking: flags.filter((f) => f.severity === "blocking").length,
    warning: flags.filter((f) => f.severity === "warning").length,
    info: flags.filter((f) => f.severity === "info").length,
  };
}

export function canAdvance(project: LiteratureProject): { ok: boolean; reason?: string } {
  switch (project.step) {
    case "source_identification": {
      const s = searchMetadataComplete(project.search);
      return s.ok ? { ok: true } : { ok: false, reason: `Need ${s.missing.join(", ")}` };
    }
    case "metadata_validation": {
      const v = validateMetadata(project.search);
      return v.ok ? { ok: true } : { ok: false, reason: v.notes[0] ?? "Fix metadata issues" };
    }
    case "candidate_claims":
      return project.claims.length > 0
        ? { ok: true }
        : { ok: false, reason: "Add at least one candidate claim" };
    case "map_concepts": {
      const unmapped = project.claims.filter(
        (c) => !c.mappedConceptIds.length && !c.mappedRelationshipIds.length,
      );
      return unmapped.length === 0
        ? { ok: true }
        : { ok: false, reason: `${unmapped.length} claim(s) still unmapped` };
    }
    case "conflict_flags": {
      const blocking = projectConflictSummary(project).blocking;
      return blocking === 0
        ? { ok: true }
        : { ok: false, reason: `${blocking} blocking conflict(s) — resolve mappings before approval` };
    }
    case "claim_approval":
      return { ok: false, reason: "Terminal step" };
    default:
      return { ok: false, reason: "Unknown step" };
  }
}

export function advanceStep(project: LiteratureProject): LiteratureProject {
  const i = STEPS.indexOf(project.step);
  if (i < 0 || i >= STEPS.length - 1) return project;
  let p = project;
  if (p.step === "source_identification") p = runMetadataValidation(p);
  if (p.step === "map_concepts" || p.step === "conflict_flags" || p.step === "candidate_claims") {
    p = refreshConflicts(p);
  }
  const gate = canAdvance(p);
  if (!gate.ok) return p;
  return touch({ ...p, step: STEPS[i + 1]! });
}

export function goToStep(project: LiteratureProject, step: LitStep): LiteratureProject {
  const target = STEPS.indexOf(step);
  const current = STEPS.indexOf(project.step);
  if (target < 0) return project;
  if (target <= current) return touch({ ...project, step });
  let p = project;
  while (STEPS.indexOf(p.step) < target) {
    const next = advanceStep(p);
    if (next.step === p.step) break;
    p = next;
  }
  return p;
}

export function stepIndex(step: LitStep): number {
  return STEPS.indexOf(step);
}

export function litSteps(): readonly LitStep[] {
  return STEPS;
}

export function queueStats(project: LiteratureProject) {
  const queued = project.claims.filter((c) => c.reviewStatus === "queued").length;
  const accepted = project.claims.filter((c) => c.reviewStatus === "accepted_for_curation").length;
  const rejected = project.claims.filter((c) => c.reviewStatus === "rejected").length;
  const needsEdit = project.claims.filter((c) => c.reviewStatus === "needs_edit").length;
  const conflicts = projectConflictSummary(project);
  return { total: project.claims.length, queued, accepted, rejected, needsEdit, conflicts };
}

/**
 * Build a curation-importable manifest from accepted claims only.
 * Records are always candidates with curation=unreviewed in meta — never auto-approved.
 */
export function exportCurationManifest(project: LiteratureProject): CurationManifestExport {
  const accepted = project.claims.filter((c) => c.reviewStatus === "accepted_for_curation");
  const groups = new Map<string, CurationManifestExport["evidence_records"][number]>();

  for (const c of accepted) {
    const conceptIds =
      c.mappedConceptIds.filter((id) => byId[id]).length > 0
        ? c.mappedConceptIds.filter((id) => byId[id])
        : c.mappedRelationshipIds
            .map((rid) => edgeByRel[rid])
            .filter(Boolean)
            .flatMap((e) => [e!.subject_id, e!.object_id]);

    const uniqueConcepts = [...new Set(conceptIds)];
    const nodeId = uniqueConcepts[0];
    if (!nodeId || !byId[nodeId]) continue;
    const node = byId[nodeId] as KGNode;

    const primaryRel = c.mappedRelationshipIds.find((rid) => edgeByRel[rid]) ?? null;
    const sourceRef =
      project.search.title?.trim() ||
      (project.search.pmid ? `PMID ${project.search.pmid}` : null) ||
      (project.search.doi ? `DOI ${project.search.doi}` : null);

    const evidenceId = `LIT-${project.project_id}-${c.claim_id}`.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);

    if (!groups.has(nodeId)) {
      groups.set(nodeId, {
        node_id: nodeId,
        node_type: node.node_type,
        node_name: node.name,
        evidence: [],
      });
    }
    groups.get(nodeId)!.evidence.push({
      evidence_id: evidenceId,
      source_ref: sourceRef,
      status: "candidate",
      source_type: "literature_workflow",
      search_query: project.search.query || undefined,
      pmid: project.search.pmid,
      doi: project.search.doi?.replace(/^doi:\s*/i, "").trim(),
      relationship_id: primaryRel,
      claim_support: c.claimSupport,
      claim_text: c.text,
    });
  }

  return {
    meta: {
      kind: "literature_candidate_export",
      project_id: project.project_id,
      graphVersion: project.graphVersion,
      extensionsVersion: project.extensionsVersion,
      exportedAt: new Date().toISOString(),
      curation: "unreviewed",
      note: "Candidate evidence for human review in /curation. Import does not approve claims. Live PubMed/Crossref checks run server-side after import.",
    },
    evidence_records: [...groups.values()],
  };
}

export function exportProjectJson(project: LiteratureProject): string {
  const refreshed = refreshConflicts(project);
  return JSON.stringify(
    {
      ...refreshed,
      export: {
        curationManifest: exportCurationManifest(refreshed),
        disclaimer: "Draft scaffold only — no approved graph writes.",
      },
    },
    null,
    2,
  );
}

function touch(p: LiteratureProject): LiteratureProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

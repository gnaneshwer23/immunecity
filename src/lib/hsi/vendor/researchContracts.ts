/** Shared research boundary. No database, credentials, identity verification or clinical transport. */
export const RESEARCH_CONTRACT_VERSION = "hsi-research-contract-1" as const;
export const RESEARCH_STAGES = ["context", "retrieval", "graph", "contradictions", "hypothesis", "review", "dossier"] as const;
export type ResearchStage = typeof RESEARCH_STAGES[number];
export type ResearchDataClass = "synthetic" | "public_real" | "licensed_real";
export type ResearchProduct = "aksh" | "isi" | "hsi";
export interface ResearchProvenance { product: ResearchProduct; datasetId: string; version: string; retrievedAt: string }
export interface ResearchContext {
  id: string; question: string; conceptIds: string[]; dataClass: ResearchDataClass;
  purpose: "research_only"; containsPhi: false; provenance: ResearchProvenance;
}
export interface ResearchSource {
  id: string; title: string; kind: "publication" | "dataset" | "registry" | "synthetic_fixture";
  dataClass: ResearchDataClass; pmid: string | null; doi: string | null; url: string | null;
  licence: { status: "permitted" | "unknown" | "restricted"; identifier: string | null; passageUsePermitted: boolean };
  provenance: ResearchProvenance;
}
export interface ResearchPassage {
  id: string; sourceId: string; sourceVersion: string; text: string; locator: string;
  dataClass: ResearchDataClass; sha256: string | null;
}
export interface ResearchEntity {
  id: string; label: string; type: "cell" | "molecule" | "receptor" | "pathway" | "tissue" | "disease" | "biomarker" | "intervention" | "trial" | "other";
  dataClass: ResearchDataClass; provenance: ResearchProvenance;
}
export interface ResearchRelationship {
  id: string; subjectId: string; predicate: string; objectId: string; dataClass: ResearchDataClass;
  context: { species: "human" | "mouse" | "other" | null; experimentalSystem: "in_vitro" | "in_vivo" | "ex_vivo" | "in_silico" | null; tissueId: string | null; assay: string | null; timepoint: string | null };
  provenance: ResearchProvenance;
}
export interface ResearchClaim {
  id: string; statement: string; relationshipId: string; passageIds: string[]; dataClass: ResearchDataClass;
  support: "unassessed" | "supports" | "partial" | "contradicts" | "unrelated";
  assessmentKind: "unassessed" | "model_draft" | "human";
  curation: "unreviewed" | "approved" | "rejected";
  review: { decisionId: string; reviewerRef: string; role: "reviewer" | "admin"; reviewedAt: string; rationale: string } | null;
}
export interface ResearchRunEvent {
  id: string; sequence: number; stage: ResearchStage; status: "started" | "completed" | "failed" | "skipped";
  at: string; provider: { id: string; version: string }; execution: "deterministic" | "model" | "human" | "not_executed";
  actorRef: string | null; modelRef: string | null; inputRefs: string[]; outputRefs: string[]; reason: string | null;
}
export interface ResearchRun {
  id: string; contextId: string; dataClass: ResearchDataClass; createdAt: string;
  artifacts: Array<{ id: string; kind: "retrieval_result" | "graph_context" | "contradiction_report" | "hypothesis" | "review_decision" | "dossier" | "context_snapshot"; version: string; sha256: string | null; producedByEventId: string }>;
  history: ResearchRunEvent[];
}
export interface ResearchBundle {
  schemaVersion: typeof RESEARCH_CONTRACT_VERSION; containsPhi: false; clinicalAdvice: false; kgWrite: false;
  context: ResearchContext; sources: ResearchSource[]; passages: ResearchPassage[]; entities: ResearchEntity[];
  relationships: ResearchRelationship[]; claims: ResearchClaim[]; runs: ResearchRun[];
}

const classes = ["synthetic", "public_real", "licensed_real"] as const;
const idPattern = /^[A-Za-z0-9][A-Za-z0-9:_.-]{0,127}$/;
function fail(path: string): never { throw new Error(`Invalid research contract: ${path}`); }
function object(value: unknown, fields: string[], path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(path);
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => !fields.includes(key)) || fields.some((key) => !Object.hasOwn(row, key))) fail(`${path}.fields`);
  return row;
}
function text(value: unknown, path: string, max = 4000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) fail(path);
  return value;
}
function id(value: unknown, path: string): string { const result = text(value, path, 128); if (!idPattern.test(result)) fail(path); return result; }
function choice(value: unknown, values: readonly string[], path: string) { if (typeof value !== "string" || !values.includes(value)) fail(path); }
function literal(value: unknown, expected: unknown, path: string) { if (value !== expected) fail(path); }
function optionalText(value: unknown, path: string, max = 4000) { if (value !== null) text(value, path, max); }
function array(value: unknown, path: string, max = 2000): unknown[] { if (!Array.isArray(value) || value.length > max) fail(path); return value; }
function refs(value: unknown, path: string, max = 2000): string[] { const list = array(value, path, max).map((v) => id(v, path)); if (new Set(list).size !== list.length) fail(`${path}.duplicates`); return list; }
function time(value: unknown, path: string): string {
  const t = text(value, path, 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(t) || !Number.isFinite(Date.parse(t))) fail(path);
  if (new Date(t.slice(0, 10)).toISOString().slice(0, 10) !== t.slice(0, 10)) fail(path);
  return t;
}
function hash(value: unknown, path: string) { if (value !== null && (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value))) fail(path); }
function provenance(value: unknown, path: string) {
  const p = object(value, ["product", "datasetId", "version", "retrievedAt"], path);
  choice(p.product, ["aksh", "isi", "hsi"], path); id(p.datasetId, path); text(p.version, path, 128); time(p.retrievedAt, path);
}
function dataClass(value: unknown, path: string) { choice(value, classes, path); }

export function parseResearchContext(value: unknown): ResearchContext {
  const c = object(value, ["id", "question", "conceptIds", "dataClass", "purpose", "containsPhi", "provenance"], "context");
  id(c.id, "context.id"); text(c.question, "context.question"); refs(c.conceptIds, "context.conceptIds", 100);
  dataClass(c.dataClass, "context.dataClass"); literal(c.purpose, "research_only", "context.purpose"); literal(c.containsPhi, false, "context.containsPhi"); provenance(c.provenance, "context.provenance");
  return value as ResearchContext;
}

/** Derives execution state, never an evidence approval or scientific validity score. */
export function researchRunState(run: ResearchRun): "pending" | "running" | "failed" | "awaiting_human_review" | "partial" | "completed" {
  run = parseResearchRun(run);
  if (!run.history.length) return "pending";
  if (run.history.some((e) => e.status === "failed")) return "failed";
  const last = run.history[run.history.length - 1]!;
  if (last.stage === "review" && last.status === "started") return "awaiting_human_review";
  const terminal = run.history.filter((e) => e.status === "completed" || e.status === "skipped");
  if (terminal.length === RESEARCH_STAGES.length) return terminal.some((e) => e.status === "skipped") ? "partial" : "completed";
  return "running";
}

export function parseResearchRun(value: unknown): ResearchRun {
  const r = object(value, ["id", "contextId", "dataClass", "createdAt", "artifacts", "history"], "run");
  id(r.id, "run.id"); id(r.contextId, "run.contextId"); dataClass(r.dataClass, "run.dataClass"); const created = time(r.createdAt, "run.createdAt");
  const artifacts = array(r.artifacts, "run.artifacts", 100).map((a) => {
    const row = object(a, ["id", "kind", "version", "sha256", "producedByEventId"], "artifact");
    id(row.id, "artifact.id"); choice(row.kind, ["retrieval_result", "graph_context", "contradiction_report", "hypothesis", "review_decision", "dossier", "context_snapshot"], "artifact.kind"); text(row.version, "artifact.version", 128); hash(row.sha256, "artifact.sha256"); id(row.producedByEventId, "artifact.producedByEventId");
    return row;
  });
  let stageIndex = 0, active = false, failed = false, previous = Date.parse(created), activeExecution: unknown, activeProvider = "", activeModel: unknown, activeActor: unknown;
  const history = array(r.history, "run.history", 14).map((entry, index) => {
    const e = object(entry, ["id", "sequence", "stage", "status", "at", "provider", "execution", "actorRef", "modelRef", "inputRefs", "outputRefs", "reason"], "event");
    id(e.id, "event.id"); literal(e.sequence, index + 1, "event.sequence"); choice(e.stage, RESEARCH_STAGES, "event.stage"); choice(e.status, ["started", "completed", "failed", "skipped"], "event.status");
    const at = Date.parse(time(e.at, "event.at")); if (at < previous || failed || e.stage !== RESEARCH_STAGES[stageIndex]) fail("event.order"); previous = at;
    const p = object(e.provider, ["id", "version"], "event.provider"); id(p.id, "event.provider.id"); text(p.version, "event.provider.version", 128);
    choice(e.execution, ["deterministic", "model", "human", "not_executed"], "event.execution");
    if (e.actorRef !== null) id(e.actorRef, "event.actorRef"); optionalText(e.modelRef, "event.modelRef", 256); optionalText(e.reason, "event.reason");
    const inputs = refs(e.inputRefs, "event.inputRefs", 100), outputs = refs(e.outputRefs, "event.outputRefs", 100);
    if (outputs.some((ref) => inputs.includes(ref))) fail("event.overwritten_input");
    if (e.execution === "model" ? e.modelRef === null : e.modelRef !== null) fail("event.modelRef");
    if (e.execution === "human" && e.actorRef === null) fail("event.actorRef");
    if (e.status === "skipped") {
      if (active || e.execution !== "not_executed" || e.reason === null || outputs.length) fail("event.skipped"); stageIndex++;
    } else {
      if (e.execution === "not_executed") fail("event.execution");
      if (e.status === "started") { if (active || outputs.length) fail("event.started"); active = true; activeExecution = e.execution; activeProvider = `${p.id}@${p.version}`; activeModel = e.modelRef; activeActor = e.actorRef; }
      else {
        if (!active || e.execution !== activeExecution || `${p.id}@${p.version}` !== activeProvider || e.modelRef !== activeModel || e.actorRef !== activeActor) fail("event.not_started_or_provider_changed");
        if (e.status === "failed") { if (e.reason === null || outputs.length) fail("event.failed"); failed = true; }
        else { if (!outputs.length || (e.stage === "review" && e.execution !== "human")) fail("event.completed"); stageIndex++; }
        active = false;
      }
    }
    return e;
  });
  const ids = [...artifacts.map((a) => a.id), ...history.map((e) => e.id)]; if (new Set(ids).size !== ids.length) fail("run.duplicate_ids");
  const artifactKinds: Record<ResearchStage, string> = { context: "context_snapshot", retrieval: "retrieval_result", graph: "graph_context", contradictions: "contradiction_report", hypothesis: "hypothesis", review: "review_decision", dossier: "dossier" };
  for (const a of artifacts) if (!history.some((e) => e.id === a.producedByEventId && e.status === "completed" && (e.outputRefs as string[]).includes(a.id as string) && a.kind === artifactKinds[e.stage as ResearchStage])) fail("artifact.producer_or_kind");
  for (const e of history) for (const ref of e.outputRefs as string[]) if (!artifacts.some((a) => a.id === ref && a.producedByEventId === e.id)) fail("event.output_artifact");
  return value as ResearchRun;
}

/** Appends history without mutating the caller; validates lifecycle, never runs a stage. */
export function appendResearchRunEvent(run: ResearchRun, event: ResearchRunEvent, artifacts: ResearchRun["artifacts"] = []): ResearchRun {
  return parseResearchRun({ ...run, artifacts: [...run.artifacts, ...artifacts], history: [...run.history, event] });
}

export function parseResearchBundle(input: unknown): ResearchBundle {
  const encoded = typeof input === "string" ? input : JSON.stringify(input);
  if (typeof encoded !== "string" || new TextEncoder().encode(encoded).byteLength > 1_000_000) fail("size");
  const value: unknown = typeof input === "string" ? JSON.parse(input) : input;
  const b = object(value, ["schemaVersion", "containsPhi", "clinicalAdvice", "kgWrite", "context", "sources", "passages", "entities", "relationships", "claims", "runs"], "bundle");
  literal(b.schemaVersion, RESEARCH_CONTRACT_VERSION, "schemaVersion"); for (const key of ["containsPhi", "clinicalAdvice", "kgWrite"]) literal(b[key], false, key);
  const context = parseResearchContext(b.context);
  const sources = array(b.sources, "sources", 500).map((v) => {
    const s = object(v, ["id", "title", "kind", "dataClass", "pmid", "doi", "url", "licence", "provenance"], "source");
    id(s.id, "source.id"); text(s.title, "source.title"); dataClass(s.dataClass, "source.dataClass"); choice(s.kind, ["publication", "dataset", "registry", "synthetic_fixture"], "source.kind"); provenance(s.provenance, "source.provenance");
    if (s.pmid !== null && (typeof s.pmid !== "string" || !/^[1-9]\d{0,8}$/.test(s.pmid))) fail("source.pmid");
    if (s.doi !== null && (typeof s.doi !== "string" || !/^10\.\d{4,9}\/\S+$/.test(s.doi))) fail("source.doi");
    if (s.url !== null) { const u = new URL(text(s.url, "source.url", 2048)); if (u.protocol !== "https:" || u.username || u.password) fail("source.url"); }
    const l = object(s.licence, ["status", "identifier", "passageUsePermitted"], "source.licence"); choice(l.status, ["permitted", "unknown", "restricted"], "source.licence.status"); optionalText(l.identifier, "source.licence.identifier", 256); if (typeof l.passageUsePermitted !== "boolean") fail("source.licence.passageUsePermitted");
    if (l.passageUsePermitted && (l.status !== "permitted" || l.identifier === null)) fail("source.licence.permission");
    if (l.status === "permitted" && l.identifier === null) fail("source.licence.identifier");
    if (s.dataClass === "synthetic" ? s.kind !== "synthetic_fixture" || s.pmid !== null || s.doi !== null || s.url !== null : s.kind === "synthetic_fixture" || (s.pmid === null && s.doi === null && s.url === null)) fail("source.identity");
    return s as unknown as ResearchSource;
  });
  const passages = array(b.passages, "passages").map((v) => {
    const p = object(v, ["id", "sourceId", "sourceVersion", "text", "locator", "dataClass", "sha256"], "passage");
    id(p.id, "passage.id"); id(p.sourceId, "passage.sourceId"); text(p.sourceVersion, "passage.sourceVersion", 128); text(p.text, "passage.text", 20000); text(p.locator, "passage.locator"); dataClass(p.dataClass, "passage.dataClass"); hash(p.sha256, "passage.sha256");
    const source = sources.find((s) => s.id === p.sourceId);
    if (!source || source.provenance.version !== p.sourceVersion || source.dataClass !== p.dataClass || !source.licence.passageUsePermitted) fail("passage.source_or_permission");
    return p as unknown as ResearchPassage;
  });
  const entities = array(b.entities, "entities").map((v) => {
    const e = object(v, ["id", "label", "type", "dataClass", "provenance"], "entity");
    id(e.id, "entity.id"); text(e.label, "entity.label"); choice(e.type, ["cell", "molecule", "receptor", "pathway", "tissue", "disease", "biomarker", "intervention", "trial", "other"], "entity.type"); dataClass(e.dataClass, "entity.dataClass"); provenance(e.provenance, "entity.provenance"); return e as unknown as ResearchEntity;
  });
  const relationships = array(b.relationships, "relationships").map((v) => {
    const r = object(v, ["id", "subjectId", "predicate", "objectId", "dataClass", "context", "provenance"], "relationship");
    for (const key of ["id", "subjectId", "objectId"]) id(r[key], `relationship.${key}`); text(r.predicate, "relationship.predicate", 128); dataClass(r.dataClass, "relationship.dataClass"); provenance(r.provenance, "relationship.provenance");
    if (![r.subjectId, r.objectId].every((ref) => entities.some((e) => e.id === ref))) fail("relationship.endpoint");
    const c = object(r.context, ["species", "experimentalSystem", "tissueId", "assay", "timepoint"], "relationship.context");
    if (c.species !== null) choice(c.species, ["human", "mouse", "other"], "relationship.species");
    if (c.experimentalSystem !== null) choice(c.experimentalSystem, ["in_vitro", "in_vivo", "ex_vivo", "in_silico"], "relationship.experimentalSystem");
    if (c.tissueId !== null && !entities.some((e) => e.id === c.tissueId && e.type === "tissue")) fail("relationship.tissue"); optionalText(c.assay, "relationship.assay"); optionalText(c.timepoint, "relationship.timepoint");
    return r as unknown as ResearchRelationship;
  });
  const claims = array(b.claims, "claims").map((v) => {
    const c = object(v, ["id", "statement", "relationshipId", "passageIds", "dataClass", "support", "assessmentKind", "curation", "review"], "claim");
    id(c.id, "claim.id"); text(c.statement, "claim.statement"); id(c.relationshipId, "claim.relationshipId"); const passageIds = refs(c.passageIds, "claim.passageIds", 100); dataClass(c.dataClass, "claim.dataClass");
    if (!relationships.some((r) => r.id === c.relationshipId) || passageIds.some((ref) => !passages.some((p) => p.id === ref))) fail("claim.reference");
    choice(c.support, ["unassessed", "supports", "partial", "contradicts", "unrelated"], "claim.support"); choice(c.assessmentKind, ["unassessed", "model_draft", "human"], "claim.assessmentKind"); choice(c.curation, ["unreviewed", "approved", "rejected"], "claim.curation");
    if (c.assessmentKind === "unassessed" && c.support !== "unassessed") fail("claim.assessment");
    if (c.support !== "unassessed" && !passageIds.length) fail("claim.assessment_without_passage");
    if (c.review !== null) { const r = object(c.review, ["decisionId", "reviewerRef", "role", "reviewedAt", "rationale"], "claim.review"); id(r.decisionId, "claim.review.decisionId"); id(r.reviewerRef, "claim.review.reviewerRef"); choice(r.role, ["reviewer", "admin"], "claim.review.role"); time(r.reviewedAt, "claim.review.reviewedAt"); text(r.rationale, "claim.review.rationale"); }
    if (c.curation !== "unreviewed" && (c.review === null || c.assessmentKind !== "human")) fail("claim.human_review");
    if ((c.assessmentKind === "human") !== (c.review !== null)) fail("claim.assessor_provenance");
    if (c.curation === "approved" && (c.support !== "supports" || !passageIds.length)) fail("claim.approval");
    if (c.dataClass === "synthetic" && (c.curation !== "unreviewed" || c.support !== "unassessed" || c.assessmentKind !== "unassessed" || c.review !== null)) fail("claim.synthetic_promotion");
    return c as unknown as ResearchClaim;
  });
  const runs = array(b.runs, "runs", 100).map(parseResearchRun);
  const records = [context, ...sources, ...passages, ...entities, ...relationships, ...claims, ...runs];
  if (new Set(records.map((r) => r.id)).size !== records.length) fail("duplicate_ids");
  const allIds = [...records.map((r) => r.id), ...runs.flatMap((r) => [...r.artifacts.map((a) => a.id), ...r.history.map((e) => e.id)])];
  if (new Set(allIds).size !== allIds.length) fail("duplicate_artifact_or_event_ids");
  for (const r of records) {
    if ((r.dataClass === "synthetic") !== (context.dataClass === "synthetic")) fail("mixed_synthetic_and_real");
    if (context.dataClass === "public_real" && r.dataClass === "licensed_real") fail("licensed_data_in_public_context");
    if ((r.dataClass === "synthetic") !== /^SYN[-:]/i.test(r.id)) fail("data_class_namespace");
  }
  // Derived records cannot downgrade the declared rights classification of their inputs.
  for (const relationship of relationships) {
    const inputs = entities.filter((e) => [relationship.subjectId, relationship.objectId, relationship.context.tissueId].includes(e.id));
    if (relationship.dataClass === "public_real" && inputs.some((e) => e.dataClass === "licensed_real")) fail("relationship.licensed_input");
  }
  for (const claim of claims) {
    const inputs = [...relationships.filter((r) => r.id === claim.relationshipId), ...passages.filter((p) => claim.passageIds.includes(p.id))];
    if (claim.dataClass === "public_real" && inputs.some((r) => r.dataClass === "licensed_real")) fail("claim.licensed_input");
  }
  if (context.conceptIds.some((ref) => !entities.some((e) => e.id === ref))) fail("context.conceptIds");
  const known = new Set(records.map((r) => r.id));
  for (const run of runs) {
    if (run.contextId !== context.id) fail("run.contextId");
    for (const child of [...run.artifacts, ...run.history]) if ((run.dataClass === "synthetic") !== /^SYN[-:]/i.test(child.id)) fail("run.data_class_namespace");
    const available = new Set(known);
    for (const event of run.history) {
      if (event.inputRefs.some((ref) => !available.has(ref))) fail("event.input_reference");
      for (const ref of event.outputRefs) { if (available.has(ref)) fail("event.output_collision"); available.add(ref); }
    }
  }
  return value as ResearchBundle;
}

/** Server-side research orchestration. No public route, clinical transport or product database. */
import { createHash, randomUUID } from "node:crypto";
import { parseResearchBundle, appendResearchRunEvent, researchRunState, type ResearchBundle, type ResearchRunEvent, type ResearchStage } from "./researchContracts";
import { retrieveSharedNeighbourhood } from "./sharedTechnology";

export const INVESTIGATION_SERVICE_VERSION = "hsi-investigation-1" as const;
export interface ResearchActor { id: string; role: "researcher" | "reviewer" | "admin" }
export type InvestigationAction = "start" | "read" | "resume" | "review" | "export" | "recover";
/** Must authenticate the credential AND authorise the action on this product/tenant-owned key. */
export type InvestigationAuthorizer = (credential: unknown, action: InvestigationAction, key: string) => Promise<ResearchActor>;
export interface RetrievalResult { passageIds: string[]; scope: string; truncated: boolean }
export interface GraphResult { nodeIds: string[]; relationshipIds: string[]; truncated: boolean }
export interface ConflictGroup {
  relationshipId: string; supportingClaimIds: string[]; opposingClaimIds: string[];
  partialClaimIds: string[]; unassessedClaimIds: string[];
}
export interface ContradictionResult { scope: string; groups: ConflictGroup[]; noMappedOpposingEvidence: boolean }
export interface HypothesisResult {
  status: "unvalidated";
  candidates: Array<{ question: string; relationshipId: string; passageIds: string[] }>;
  limitations: string[];
}
export interface ReviewResult { decision: "accept_for_research" | "request_revision"; reviewerRef: string; reviewedAt: string; rationale: string }
export interface DossierResult {
  version: typeof INVESTIGATION_SERVICE_VERSION; runId: string; question: string; dataClass: ResearchBundle["context"]["dataClass"];
  passageIds: string[]; relationshipIds: string[]; contradictions: ContradictionResult; hypothesis: HypothesisResult;
  review: ReviewResult; limitations: string[]; kgWrite: false; clinicalAdvice: false;
}
export interface InvestigationPayloads {
  context?: ResearchBundle["context"]; retrieval?: RetrievalResult; graph?: GraphResult;
  contradictions?: ContradictionResult; hypothesis?: HypothesisResult; review?: ReviewResult; dossier?: DossierResult;
}
export interface StoredInvestigation {
  version: typeof INVESTIGATION_SERVICE_VERSION; revision: number; bundle: ResearchBundle; payloads: InvestigationPayloads;
}
/** Implement atomic compare-and-swap; expectedRevision=null means create only. Return isolated copies. */
export interface InvestigationStore {
  load(key: string): Promise<StoredInvestigation | null>;
  save(key: string, expectedRevision: number | null, snapshot: StoredInvestigation): Promise<void>;
}
export class InvestigationConflictError extends Error { constructor() { super("Investigation revision conflict"); } }
export class InvestigationAccessError extends Error { constructor() { super("Investigation access denied"); } }
export interface ProviderDescriptor { id: string; version: string; execution: "deterministic" | "model"; modelRef: string | null }
export interface InvestigationProvider<Result> {
  descriptor: ProviderDescriptor;
  execute(bundle: ResearchBundle, payloads: InvestigationPayloads, signal: AbortSignal): Promise<Result>;
}
export interface InvestigationProviders {
  retrieval: InvestigationProvider<RetrievalResult>;
  hypothesis?: InvestigationProvider<HypothesisResult>;
}
const clone = <T>(value: T): T => structuredClone(value);
// Stable across JSON/JSONB stores that reorder object keys; array order stays meaningful.
const canonicalJson = (value: unknown): string => JSON.stringify(value, (_key, row: unknown) => {
  if (row && typeof row === "object" && !Array.isArray(row)) return Object.fromEntries(Object.entries(row).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
  return row;
});
const digest = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");
const nonempty = (value: unknown, max = 4000): value is string => typeof value === "string" && !!value.trim() && value.length <= max;
const validId = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9:_.-]{0,127}$/.test(value);
function assert(condition: unknown): asserts condition { if (!condition) throw new Error("Invalid investigation state or provider output"); }
function exact(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  assert(value && typeof value === "object" && !Array.isArray(value));
  assert(Object.keys(value).length === keys.length && keys.every((k) => Object.prototype.hasOwnProperty.call(value, k)));
}
function ids(value: unknown, allowed: string[], max = 120): asserts value is string[] {
  assert(Array.isArray(value) && value.length <= max && new Set(value).size === value.length && value.every((id) => allowed.includes(id)));
}
const descriptor = (id: string): ProviderDescriptor => ({ id, version: INVESTIGATION_SERVICE_VERSION, execution: "deterministic", modelRef: null });
function validateDescriptor(provider: ProviderDescriptor) {
  assert(validId(provider.id) && nonempty(provider.version, 128) && ["deterministic", "model"].includes(provider.execution));
  assert(provider.execution === "model" ? nonempty(provider.modelRef, 256) : provider.modelRef === null);
}
const kinds = { context: "context_snapshot", retrieval: "retrieval_result", graph: "graph_context", contradictions: "contradiction_report", hypothesis: "hypothesis", review: "review_decision", dossier: "dossier" } as const;

/** Reference provider: bounded lexical/explicit-concept retrieval over the caller's permitted corpus only. */
export function createCorpusRetrievalProvider(): InvestigationProvider<RetrievalResult> {
  return { descriptor: descriptor("hsi-corpus-retrieval"), async execute(bundle, _payloads, signal) {
    signal.throwIfAborted();
    const words = new Set(bundle.context.question.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);
    const related = new Set(bundle.relationships.filter((r) => bundle.context.conceptIds.includes(r.subjectId) || bundle.context.conceptIds.includes(r.objectId)).map((r) => r.id));
    const linked = new Set(bundle.claims.filter((c) => related.has(c.relationshipId)).flatMap((c) => c.passageIds));
    const ranked = bundle.passages.map((p, index) => ({ id: p.id, index, score: (linked.has(p.id) ? 10 : 0) + [...words].filter((w) => p.text.toLowerCase().includes(w)).length }))
      .filter((p) => p.score > 0).sort((a, b) => b.score - a.score || a.index - b.index);
    return { passageIds: ranked.slice(0, 40).map((p) => p.id), scope: `Supplied corpus ${bundle.context.provenance.datasetId}@${bundle.context.provenance.version}; lexical and explicit concept/claim links only; no external literature search.`, truncated: ranked.length > 40 };
  } };
}
function graphContext(bundle: ResearchBundle): GraphResult {
  const relationships = new Map<string, ResearchBundle["relationships"][number]>();
  const nodes = new Set(bundle.context.conceptIds); let truncated = false;
  const adapter = {
    getNode: (id: string) => bundle.entities.find((n) => n.id === id), nodeId: (n: ResearchBundle["entities"][number]) => n.id,
    outgoing: (id: string) => bundle.relationships.filter((r) => r.subjectId === id),
    incoming: (id: string) => bundle.relationships.filter((r) => r.objectId === id),
    edgeId: (r: ResearchBundle["relationships"][number]) => r.id,
    subjectId: (r: ResearchBundle["relationships"][number]) => r.subjectId,
    objectId: (r: ResearchBundle["relationships"][number]) => r.objectId, isDraft: () => false,
  };
  for (const seed of bundle.context.conceptIds) {
    const result = retrieveSharedNeighbourhood(adapter, seed, { depth: 1, maxEdges: 120 });
    truncated ||= result?.truncated ?? false;
    for (const { edge } of result?.edges ?? []) {
      if (!relationships.has(edge.id) && relationships.size >= 120) { truncated = true; continue; }
      relationships.set(edge.id, edge); nodes.add(edge.subjectId); nodes.add(edge.objectId);
    }
  }
  return { nodeIds: [...nodes], relationshipIds: [...relationships.keys()], truncated };
}
function contradictions(bundle: ResearchBundle, payloads: InvestigationPayloads): ContradictionResult {
  const relevant = bundle.claims.filter((c) => payloads.graph!.relationshipIds.includes(c.relationshipId) && c.passageIds.some((id) => payloads.retrieval!.passageIds.includes(id)));
  const groups = payloads.graph!.relationshipIds.map((relationshipId) => {
    const claims = relevant.filter((c) => c.relationshipId === relationshipId);
    return { relationshipId, supportingClaimIds: claims.filter((c) => c.support === "supports").map((c) => c.id),
      opposingClaimIds: claims.filter((c) => c.support === "contradicts").map((c) => c.id), partialClaimIds: claims.filter((c) => c.support === "partial").map((c) => c.id),
      unassessedClaimIds: claims.filter((c) => c.support === "unassessed").map((c) => c.id) };
  });
  return { scope: "Explicit assessments on retrieved passages and exact graph relationships only; retains source claims and biological context; no majority vote or new semantic contradiction inference.", groups, noMappedOpposingEvidence: !groups.some((g) => g.opposingClaimIds.length) };
}
function draftQuestions(bundle: ResearchBundle, payloads: InvestigationPayloads): HypothesisResult {
  const candidates = payloads.graph!.relationshipIds.flatMap((relationshipId) => {
    const relation = bundle.relationships.find((r) => r.id === relationshipId)!;
    const passages = [...new Set(bundle.claims.filter((c) => c.relationshipId === relationshipId).flatMap((c) => c.passageIds))].filter((id) => payloads.retrieval!.passageIds.includes(id));
    if (!passages.length) return [];
    const subject = bundle.entities.find((n) => n.id === relation.subjectId)!, object = bundle.entities.find((n) => n.id === relation.objectId)!;
    return [{ question: `What additional evidence would test the recorded relationship: ${subject.label} ${relation.predicate} ${object.label}?`, relationshipId, passageIds: passages.slice(0, 40) }];
  }).slice(0, 10);
  return { status: "unvalidated", candidates, limitations: ["Deterministic research-question templates; no model or biological discovery was executed.", "Questions are not findings, treatment recommendations or validated hypotheses."] };
}
function validateRetrieval(value: unknown, bundle: ResearchBundle): asserts value is RetrievalResult {
  exact(value, ["passageIds", "scope", "truncated"]); ids(value.passageIds, bundle.passages.map((p) => p.id), 40);
  assert(nonempty(value.scope) && typeof value.truncated === "boolean");
}
function validateHypothesis(value: unknown, payloads: InvestigationPayloads, bundle: ResearchBundle): asserts value is HypothesisResult {
  exact(value, ["status", "candidates", "limitations"]); assert(value.status === "unvalidated" && Array.isArray(value.candidates) && value.candidates.length <= 10);
  assert(Array.isArray(value.limitations) && value.limitations.length > 0 && value.limitations.length <= 20 && value.limitations.every((v) => nonempty(v)));
  for (const c of value.candidates) {
    exact(c, ["question", "relationshipId", "passageIds"]); assert(nonempty(c.question) && payloads.graph!.relationshipIds.includes(c.relationshipId as string));
    ids(c.passageIds, payloads.retrieval!.passageIds, 40); assert(c.passageIds.length);
    const linked = bundle.claims.filter((claim) => claim.relationshipId === c.relationshipId).flatMap((claim) => claim.passageIds);
    assert(c.passageIds.every((id) => linked.includes(id)));
  }
}
function buildDossier(s: StoredInvestigation): DossierResult {
  return {
    version: INVESTIGATION_SERVICE_VERSION, runId: s.bundle.runs[0]!.id, question: s.bundle.context.question, dataClass: s.bundle.context.dataClass,
    passageIds: s.payloads.retrieval!.passageIds, relationshipIds: s.payloads.graph!.relationshipIds,
    contradictions: s.payloads.contradictions!, hypothesis: s.payloads.hypothesis!, review: s.payloads.review!,
    limitations: [s.payloads.retrieval!.scope, "No mapped opposing evidence does not establish agreement or worldwide literature absence.",
      "Human acceptance applies to this dossier workflow; source claims are unchanged and no KG approval is written.",
      ...(s.payloads.retrieval!.truncated || s.payloads.graph!.truncated ? ["Retrieval or graph context was truncated."] : []), ...s.payloads.hypothesis!.limitations],
    kgWrite: false, clinicalAdvice: false,
  };
}
/** Validates persisted payload hashes as well as the shared record/run contract. */
export function validateInvestigationSnapshot(value: StoredInvestigation): StoredInvestigation {
  exact(value, ["version", "revision", "bundle", "payloads"]);
  assert(value.version === INVESTIGATION_SERVICE_VERSION && Number.isSafeInteger(value.revision) && (value.revision as number) >= 1);
  const s = value as unknown as StoredInvestigation;
  parseResearchBundle(s.bundle); assert(s.bundle.runs.length === 1);
  for (const passage of s.bundle.passages) if (passage.sha256 !== null) {
    assert(passage.sha256 === createHash("sha256").update(passage.text).digest("hex"));
  }
  assert(s.payloads && typeof s.payloads === "object" && !Array.isArray(s.payloads));
  const run = s.bundle.runs[0]!;
  assert(Object.keys(s.payloads).length === run.artifacts.length);
  for (const a of run.artifacts) {
    const stage = Object.entries(kinds).find(([, kind]) => kind === a.kind)?.[0] as ResearchStage;
    assert(stage && Object.prototype.hasOwnProperty.call(s.payloads, stage) && a.sha256 === digest(s.payloads[stage]));
  }
  if (s.payloads.context) assert(digest(s.payloads.context) === digest(s.bundle.context));
  if (s.payloads.retrieval) validateRetrieval(s.payloads.retrieval, s.bundle);
  if (s.payloads.graph) assert(digest(s.payloads.graph) === digest(graphContext(s.bundle)));
  if (s.payloads.contradictions) assert(digest(s.payloads.contradictions) === digest(contradictions(s.bundle, s.payloads)));
  if (s.payloads.hypothesis) validateHypothesis(s.payloads.hypothesis, s.payloads, s.bundle);
  if (s.payloads.review) {
    const review = s.payloads.review;
    exact(review, ["decision", "reviewerRef", "reviewedAt", "rationale"]);
    const event = run.history.find((e) => e.stage === "review" && e.status === "completed");
    assert(event && event.actorRef === review.reviewerRef && ["accept_for_research", "request_revision"].includes(review.decision as string) && nonempty(review.rationale));
    assert(typeof review.reviewedAt === "string" && Number.isFinite(Date.parse(review.reviewedAt)) && Date.parse(review.reviewedAt) <= Date.parse(event.at));
  }
  if (s.payloads.dossier) assert(digest(s.payloads.dossier) === digest(buildDossier(s)));
  return s;
}
/** Test/local runner store. Ephemeral; production adapters must provide durable, tenant-isolated CAS. */
export function createMemoryInvestigationStore(): InvestigationStore {
  const rows = new Map<string, StoredInvestigation>();
  return { async load(key) { return clone(rows.get(key) ?? null); }, async save(key, expected, snapshot) {
    const current = rows.get(key); if ((current?.revision ?? null) !== expected || snapshot.revision !== (expected ?? 0) + 1) throw new InvestigationConflictError();
    rows.set(key, clone(validateInvestigationSnapshot(snapshot)));
  } };
}

export function createInvestigationService(options: {
  store: InvestigationStore; authorize: InvestigationAuthorizer; providers: InvestigationProviders;
  timeoutMs?: number; now?: () => string;
}) {
  const now = options.now ?? (() => new Date().toISOString());
  const timeoutMs = options.timeoutMs ?? 30_000;
  assert(Number.isFinite(timeoutMs) && timeoutMs >= 1 && timeoutMs <= 120_000);
  validateDescriptor(options.providers.retrieval.descriptor);
  if (options.providers.hypothesis) validateDescriptor(options.providers.hypothesis.descriptor);
  async function access(credential: unknown, action: InvestigationAction, key: string) {
    if (!validId(key)) throw new InvestigationAccessError();
    const actor = await options.authorize(credential, action, key);
    if (!actor || !validId(actor.id) || !["researcher", "reviewer", "admin"].includes(actor.role)) throw new InvestigationAccessError();
    if (action === "review" && actor.role !== "reviewer" && actor.role !== "admin") throw new InvestigationAccessError();
    if (action === "recover" && actor.role !== "admin") throw new InvestigationAccessError();
    return clone(actor);
  }
  async function load(key: string) {
    const row = await options.store.load(key); if (!row) throw new Error("Investigation not found");
    return clone(validateInvestigationSnapshot(row));
  }
  async function save(key: string, s: StoredInvestigation, expected: number | null) {
    s.revision = (expected ?? 0) + 1; validateInvestigationSnapshot(s);
    await options.store.save(key, expected, clone(s));
  }
  function uid(s: StoredInvestigation, kind: string) { return `${s.bundle.context.dataClass === "synthetic" ? "SYN-" : ""}${kind}-${randomUUID()}`; }
  function append(s: StoredInvestigation, stage: ResearchStage, status: ResearchRunEvent["status"], provider: ProviderDescriptor, actorRef: string | null, payload?: unknown, reason: string | null = null) {
    const run = s.bundle.runs[0]!, id = uid(s, "EVENT"), artifactId = uid(s, "ARTIFACT");
    const previousArtifact = run.artifacts.at(-1)?.id;
    const event: ResearchRunEvent = { id, sequence: run.history.length + 1, stage, status, at: now(), provider: { id: provider.id, version: provider.version }, execution: stage === "review" ? "human" : provider.execution,
      actorRef, modelRef: provider.modelRef, inputRefs: [previousArtifact ?? s.bundle.context.id], outputRefs: payload === undefined ? [] : [artifactId], reason };
    s.bundle.runs = [appendResearchRunEvent(run, event, payload === undefined ? [] : [{ id: artifactId, kind: kinds[stage], version: INVESTIGATION_SERVICE_VERSION, sha256: digest(payload), producedByEventId: id }])];
    if (payload !== undefined) (s.payloads as Record<string, unknown>)[stage] = clone(payload);
  }
  async function stage(key: string, s: StoredInvestigation, name: ResearchStage, provider: ProviderDescriptor, compute: (signal: AbortSignal) => Promise<unknown>) {
    validateDescriptor(provider);
    append(s, name, "started", provider, null); await save(key, s, s.revision);
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
    let result: unknown; let failure: string | null = null;
    try {
      result = await Promise.race([compute(controller.signal), new Promise<never>((_resolve, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error("timeout")); }, timeoutMs); })]);
      controller.signal.throwIfAborted();
      if (name === "retrieval") validateRetrieval(result, s.bundle);
      if (name === "hypothesis") validateHypothesis(result, s.payloads, s.bundle);
      assert(result !== undefined && new TextEncoder().encode(JSON.stringify(result)).byteLength <= 250_000);
      // Provider objects are detached before returning across the trust boundary.
      result = clone(result);
    } catch { failure = controller.signal.aborted ? "provider_timeout" : "provider_failed_or_invalid_output"; }
    finally { if (timer) clearTimeout(timer); }
    append(s, name, failure ? "failed" : "completed", provider, null, failure ? undefined : result, failure);
    await save(key, s, s.revision);
    return failure === null;
  }
  async function dossier(key: string, s: StoredInvestigation) {
    await stage(key, s, "dossier", descriptor("hsi-dossier"), async () => buildDossier(s));
  }
  async function advance(key: string, s: StoredInvestigation) {
    const run = s.bundle.runs[0]!;
    assert(researchRunState(run) !== "failed" && run.history.at(-1)?.status !== "started");
    const steps: Array<[ResearchStage, ProviderDescriptor, (signal: AbortSignal) => Promise<unknown>]> = [
      ["context", descriptor("hsi-context"), async () => clone(s.bundle.context)],
      ["retrieval", clone(options.providers.retrieval.descriptor), (signal) => options.providers.retrieval.execute(clone(s.bundle), clone(s.payloads), signal)],
      ["graph", descriptor("hsi-graph-context"), async () => graphContext(s.bundle)],
      ["contradictions", descriptor("hsi-contradiction-index"), async () => contradictions(s.bundle, s.payloads)],
      ["hypothesis", clone(options.providers.hypothesis?.descriptor ?? descriptor("hsi-research-questions")), (signal) => options.providers.hypothesis ? options.providers.hypothesis.execute(clone(s.bundle), clone(s.payloads), signal) : Promise.resolve(draftQuestions(s.bundle, s.payloads))],
    ];
    for (const [name, provider, compute] of steps) {
      if (s.payloads[name] !== undefined) continue;
      if (!await stage(key, s, name, provider, compute)) return;
    }
    if (s.payloads.review && !s.payloads.dossier) await dossier(key, s);
  }
  return {
    async start(key: string, input: unknown, credential: unknown) {
      await access(credential, "start", key);
      const bundle = clone(parseResearchBundle(input)); assert(bundle.runs.length === 0);
      const s: StoredInvestigation = { version: INVESTIGATION_SERVICE_VERSION, revision: 1, bundle, payloads: {} };
      s.bundle.runs = [{ id: uid(s, "RUN"), contextId: bundle.context.id, dataClass: bundle.context.dataClass, createdAt: now(), artifacts: [], history: [] }];
      await save(key, s, null);
      await advance(key, s);
      return clone(s);
    },
    async get(key: string, credential: unknown) { await access(credential, "read", key); return load(key); },
    async resume(key: string, expectedRevision: number, credential: unknown) {
      await access(credential, "resume", key); const s = await load(key);
      if (s.revision !== expectedRevision) throw new InvestigationConflictError();
      await advance(key, s); return clone(s);
    },
    async review(key: string, expectedRevision: number, decision: ReviewResult["decision"], rationale: string, credential: unknown) {
      const actor = await access(credential, "review", key); const s = await load(key);
      if (s.revision !== expectedRevision) throw new InvestigationConflictError();
      assert(researchRunState(s.bundle.runs[0]!) === "awaiting_human_review" && !s.payloads.review);
      assert(["accept_for_research", "request_revision"].includes(decision) && nonempty(rationale));
      const provider = descriptor("hsi-human-review");
      append(s, "review", "started", provider, actor.id);
      append(s, "review", "completed", provider, actor.id, { decision, reviewerRef: actor.id, reviewedAt: now(), rationale } satisfies ReviewResult);
      await save(key, s, expectedRevision);
      // Requesting revision is still a recorded human decision; the dossier explicitly retains it.
      await dossier(key, s); return clone(s);
    },
    async recoverInterrupted(key: string, expectedRevision: number, credential: unknown) {
      const actor = await access(credential, "recover", key); const s = await load(key);
      if (s.revision !== expectedRevision) throw new InvestigationConflictError();
      const last = s.bundle.runs[0]!.history.at(-1); assert(last?.status === "started");
      append(s, last.stage, "failed", { ...last.provider, execution: last.execution as "deterministic" | "model", modelRef: last.modelRef }, last.actorRef, undefined, `execution_interrupted_by:${actor.id};start_new_run`);
      await save(key, s, expectedRevision); return clone(s);
    },
    async exportDossier(key: string, credential: unknown) {
      await access(credential, "export", key); const s = await load(key); assert(s.payloads.dossier);
      return { json: JSON.stringify(s, null, 2), markdown: renderInvestigationDossier(s) };
    },
  };
}

/** Markdown is a text export. Renderers must sanitise raw HTML and enforce safe links. */
export function renderInvestigationDossier(snapshot: StoredInvestigation): string {
  const s = validateInvestigationSnapshot(snapshot), d = s.payloads.dossier; assert(d);
  const lines = ["# Research investigation dossier", "", `Version: ${d.version}; run: ${d.runId}; data: ${d.dataClass}`, "", d.question,
    "", `Human decision: ${d.review.decision} by ${d.review.reviewerRef} at ${d.review.reviewedAt}`, d.review.rationale,
    "", "## Research questions (unvalidated)", ...d.hypothesis.candidates.map((c) => `- ${c.question} [${c.relationshipId}; ${c.passageIds.join(", ")}]`),
    "", "## Opposing and supporting assessments", d.contradictions.scope,
    ...d.contradictions.groups.map((g) => `- ${g.relationshipId}: supporting=${g.supportingClaimIds.join(", ") || "none mapped"}; opposing=${g.opposingClaimIds.join(", ") || "none mapped"}; partial=${g.partialClaimIds.join(", ") || "none mapped"}; unassessed=${g.unassessedClaimIds.join(", ") || "none mapped"}`),
    "", "## Exact retrieved passages"];
  for (const id of d.passageIds) {
    const p = s.bundle.passages.find((p) => p.id === id)!, source = s.bundle.sources.find((source) => source.id === p.sourceId)!;
    lines.push(`### ${p.id}`, `${source.title} [${source.id}@${p.sourceVersion}] — ${p.locator}`, `Source locator: ${source.pmid ? "PMID " + source.pmid : source.doi ?? source.url ?? "synthetic fixture; no publication locator"}`, `Article URL: ${source.url ?? "not supplied"}`, `Reuse licence: ${source.licence.identifier ?? "not supplied"}`, p.text, "");
  }
  lines.push("## Limitations", ...d.limitations.map((l) => `- ${l}`), "", "Research only. No clinical advice or KG write.");
  return lines.join("\n");
}

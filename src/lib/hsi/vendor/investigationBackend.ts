/** Product-owned authenticated persistence and bounded HTTP protocol. No product credentials or data live here. */
import { randomUUID } from "node:crypto";
import { createInvestigationService, createCorpusRetrievalProvider, validateInvestigationSnapshot, InvestigationAccessError, InvestigationConflictError, type ResearchActor, type StoredInvestigation, type InvestigationStore } from "./investigationService";
import { researchRunState, type ResearchBundle } from "./researchContracts";
export const INVESTIGATION_BACKEND_VERSION = "hsi-investigation-backend-1" as const;
export interface InvestigationSql { query(text: string, parameters: unknown[]): Promise<Array<Record<string, unknown>>> }
export interface InvestigationDatabase extends InvestigationSql { transaction<T>(work: (sql: InvestigationSql) => Promise<T>): Promise<T> }
export interface InvestigationPrincipal { ownerId: string; actor: ResearchActor }
export interface InvestigationRelease { id: string; title: string; description: string }
export interface InvestigationCursor { createdAt: string; key: string }
export type InvestigationCommand =
  | { action: "list"; cursor: InvestigationCursor | null }
  | { action: "start"; releaseId: string; conceptId: string | null }
  | { action: "get"; key: string }
  | { action: "resume" | "recover"; key: string; revision: number }
  | { action: "review"; key: string; revision: number; decision: "accept_for_research" | "request_revision"; rationale: string }
  | { action: "export"; key: string; format: "json" | "markdown" };
export class InvestigationRequestError extends Error { constructor(public status: number, public code: string) { super(code); } }
const keyPattern = /^INV-[a-f0-9-]{36}$/;
function bad(): never { throw new InvestigationRequestError(400, "invalid_request"); }
function fields(value: unknown, names: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) bad();
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== names.length || names.some((n) => !Object.hasOwn(row, n))) bad();
  return row;
}
export function parseInvestigationCommand(value: unknown): InvestigationCommand {
  const action = (value as Record<string, unknown> | null)?.action;
  if (action === "list") {
    const row = fields(value, ["action", "cursor"]);
    if (row.cursor !== null) {
      const cursor = fields(row.cursor, ["createdAt", "key"]);
      if (typeof cursor.createdAt !== "string" || cursor.createdAt.length > 40 || !/^\d{4}-\d\d-\d\dT/.test(cursor.createdAt) || !Number.isFinite(Date.parse(cursor.createdAt)) || typeof cursor.key !== "string" || !keyPattern.test(cursor.key)) bad();
    }
  } else if (action === "start") {
    const row = fields(value, ["action", "releaseId", "conceptId"]);
    if (typeof row.releaseId !== "string" || !/^[a-z0-9-]{1,80}$/.test(row.releaseId)) bad();
    if (row.conceptId !== null && (typeof row.conceptId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9:_.-]{0,127}$/.test(row.conceptId))) bad();
  } else {
    const names = action === "get" ? ["action", "key"] : action === "export" ? ["action", "key", "format"] : action === "review" ? ["action", "key", "revision", "decision", "rationale"] : action === "resume" || action === "recover" ? ["action", "key", "revision"] : bad();
    const row = fields(value, names);
    if (typeof row.key !== "string" || !keyPattern.test(row.key)) bad();
    if (names.includes("revision") && (!Number.isSafeInteger(row.revision) || (row.revision as number) < 1)) bad();
    if (action === "export" && !["json", "markdown"].includes(row.format as string)) bad();
    if (action === "review" && (!["accept_for_research", "request_revision"].includes(row.decision as string) || typeof row.rationale !== "string" || !row.rationale.trim() || row.rationale.length > 2000)) bad();
  }
  return value as InvestigationCommand;
}
export function createOwnedInvestigationBackend(options: {
  database: InvestigationDatabase; schema: "public" | "aksh"; principal: InvestigationPrincipal;
  releases: InvestigationRelease[]; loadRelease(id: string, conceptId: string | null): Promise<ResearchBundle>;
}) {
  const { database: db, principal } = options;
  if (!["public", "aksh"].includes(options.schema) || !principal.ownerId || principal.ownerId.length > 128 || !/^[A-Za-z0-9][A-Za-z0-9:_.-]{0,127}$/.test(principal.actor.id) || !["researcher", "reviewer", "admin"].includes(principal.actor.role)) throw new InvestigationAccessError();
  const table = `${options.schema}.hsi_investigations`, audit = `${options.schema}.hsi_investigation_audit`, limits = `${options.schema}.hsi_investigation_limits`;
  const owner = principal.ownerId, token = Symbol("server-verified-investigation-principal");
  const store: InvestigationStore = {
    async load(key) {
      const [row] = await db.query(`SELECT snapshot FROM ${table} WHERE owner_id=$1 AND investigation_key=$2`, [owner, key]);
      return row ? validateInvestigationSnapshot(row.snapshot as StoredInvestigation) : null;
    },
    async save(key, expected, snapshot) {
      validateInvestigationSnapshot(snapshot);
      if (snapshot.revision !== (expected ?? 0) + 1) throw new InvestigationConflictError();
      const state = researchRunState(snapshot.bundle.runs[0]!);
      await db.transaction(async (tx) => {
        let rows: Array<Record<string, unknown>>;
        if (expected === null) {
          // Separate statements inside READ COMMITTED: count sees commits made while waiting for the lock.
          await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`hsi-start:${owner}`]);
          const [count] = await tx.query(`SELECT count(*) AS total, count(*) FILTER (WHERE created_at>now()-interval '10 minutes') AS recent FROM ${table} WHERE owner_id=$1`, [owner]);
          if (Number(count?.total) >= 200 || Number(count?.recent) >= 5) throw new InvestigationRequestError(429, "investigation_start_limit");
          rows = await tx.query(`INSERT INTO ${table} (owner_id,investigation_key,revision,state,data_class,question,snapshot) VALUES ($1,$2,$3,$4,$5,$6,$7::text::jsonb) ON CONFLICT (owner_id,investigation_key) DO NOTHING RETURNING revision`, [owner, key, snapshot.revision, state, snapshot.bundle.context.dataClass, snapshot.bundle.context.question, JSON.stringify(snapshot)]);
        } else {
          rows = await tx.query(`UPDATE ${table} SET revision=$3,state=$4,snapshot=$5::text::jsonb,updated_at=now() WHERE owner_id=$1 AND investigation_key=$2 AND revision=$6 RETURNING revision`, [owner, key, snapshot.revision, state, JSON.stringify(snapshot), expected]);
        }
        if (rows.length !== 1) throw new InvestigationConflictError();
        await tx.query(`INSERT INTO ${audit} (owner_id,investigation_key,revision,actor_id,operation,run_state) VALUES ($1,$2,$3,$4,$5,$6)`, [owner, key, snapshot.revision, principal.actor.id, snapshot.bundle.runs[0]!.history.at(-1)?.status ?? "created", state]);
      });
    },
  };
  const service = createInvestigationService({ store, providers: { retrieval: createCorpusRetrievalProvider() },
    authorize: async (credential, _action, key) => {
      if (credential !== token || !keyPattern.test(key)) throw new InvestigationAccessError();
      return structuredClone(principal.actor);
    },
  });
  return {
    async execute(input: unknown): Promise<unknown> {
      const command = parseInvestigationCommand(input);
      // Durable, per-owner, per-minute request budget shared across workers. No memory fallback.
      const allowed = await db.query(`INSERT INTO ${limits} AS limiter (owner_id,bucket,requests) VALUES ($1,date_trunc('minute',now()),1) ON CONFLICT (owner_id) DO UPDATE SET bucket=EXCLUDED.bucket, requests=CASE WHEN limiter.bucket=EXCLUDED.bucket THEN limiter.requests+1 ELSE 1 END WHERE limiter.bucket<>EXCLUDED.bucket OR limiter.requests<60 RETURNING requests`, [owner]);
      if (!allowed.length) throw new InvestigationRequestError(429, "investigation_request_limit");
      if (command.action === "list") {
        const cursor = command.cursor;
        const rows = await db.query(`SELECT investigation_key AS key,revision,state,data_class AS "dataClass",question,to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "createdAt",updated_at AS "updatedAt" FROM ${table} WHERE owner_id=$1 AND ($2::text::timestamptz IS NULL OR (created_at,investigation_key)<($2::text::timestamptz,$3::text)) ORDER BY created_at DESC,investigation_key DESC LIMIT 21`, [owner, cursor?.createdAt ?? null, cursor?.key ?? null]);
        const items = rows.slice(0, 20).map((row) => ({ ...row, key: String(row.key), createdAt: String(row.createdAt), updatedAt: new Date(row.updatedAt as string).toISOString() }));
        const last = items.at(-1);
        return { items, nextCursor: rows.length > 20 && last ? { key: last.key, createdAt: last.createdAt } : null, releases: options.releases, role: principal.actor.role };
      }
      if (command.action === "start") {
        if (!options.releases.some((r) => r.id === command.releaseId)) throw new InvestigationRequestError(400, "unknown_research_release");
        const bundle = await options.loadRelease(command.releaseId, command.conceptId);
        const key = `INV-${randomUUID()}`;
        const snapshot = await service.start(key, bundle, token);
        return { key, snapshot };
      }
      const [existing] = await db.query(`SELECT state,updated_at FROM ${table} WHERE owner_id=$1 AND investigation_key=$2`, [owner, command.key]);
      if (!existing) throw new InvestigationRequestError(404, "investigation_not_found");
      if (command.action === "get") return { key: command.key, snapshot: await service.get(command.key, token) };
      if (command.action === "review" && existing.state !== "awaiting_human_review") throw new InvestigationRequestError(409, "investigation_not_awaiting_review");
      if (command.action === "review") return { key: command.key, snapshot: await service.review(command.key, command.revision, command.decision, command.rationale, token) };
      if (command.action === "resume") return { key: command.key, snapshot: await service.resume(command.key, command.revision!, token) };
      if (command.action === "recover") {
        if (Date.now() - new Date(existing.updated_at as string).getTime() < 10 * 60_000) throw new InvestigationRequestError(409, "investigation_worker_not_stale");
        return { key: command.key, snapshot: await service.recoverInterrupted(command.key, command.revision!, token) };
      }
      if (command.action !== "export") bad();
      if (existing.state !== "completed") throw new InvestigationRequestError(409, "investigation_dossier_not_ready");
      const dossier = await service.exportDossier(command.key, token);
      return { key: command.key, format: command.format, content: command.format === "json" ? dossier.json : dossier.markdown };
    },
  };
}
/** Invoke only after real product authentication/authorisation. Bounds bytes before parsing JSON. */
export async function readInvestigationRequest(request: Request): Promise<InvestigationCommand> {
  if (request.method !== "POST") throw new InvestigationRequestError(405, "method_not_allowed");
  // Next.js may reconstruct its URL with an internal hostname. Host is the browser's
  // request authority (browsers cannot set it via fetch); never trust a client-selected forwarded host.
  const url = new URL(request.url), authority = request.headers.get("host") ?? url.host;
  if (!authority || /[\s/@\\?#]/.test(authority)) throw new InvestigationRequestError(403, "request_origin_denied");
  const expectedOrigin = new URL(`${url.protocol}//${authority}`).origin;
  if (request.headers.get("origin") !== expectedOrigin || request.headers.get("sec-fetch-site") === "cross-site") throw new InvestigationRequestError(403, "request_origin_denied");
  if (request.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json") throw new InvestigationRequestError(415, "json_required");
  const maximum = 8192;
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maximum)) throw new InvestigationRequestError(413, "request_too_large");
  const reader = request.body?.getReader(); if (!reader) bad();
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.byteLength; if (length > maximum) { await reader.cancel(); throw new InvestigationRequestError(413, "request_too_large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let value: unknown; try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { bad(); }
  return parseInvestigationCommand(value);
}
export function investigationJson(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "Vary": "Cookie, Authorization", "X-Content-Type-Options": "nosniff" } });
}
export function investigationError(error: unknown) {
  if (error instanceof InvestigationRequestError) return investigationJson({ error: error.code }, error.status);
  if (error instanceof InvestigationAccessError) return investigationJson({ error: "investigation_access_denied" }, 403);
  if (error instanceof InvestigationConflictError) return investigationJson({ error: "investigation_revision_conflict" }, 409);
  return investigationJson({ error: "investigation_unavailable" }, 503);
}

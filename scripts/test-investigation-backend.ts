/** Disposable local DB + real signed Neon JWT verification. Never uses a deployment DATABASE_URL. */
import assert from "node:assert/strict";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
const local = process.env.HSI_TEST_DB_URL;
if (!local) throw new Error("HSI_TEST_DB_URL must name a disposable local test database");
const target = new URL(local);
if (!["127.0.0.1", "localhost"].includes(target.hostname) || target.pathname !== "/hsi_step3_test") throw new Error("Refusing non-local investigation test database");
process.env.DATABASE_URL = local; delete process.env.DATABASE_URL_UNPOOLED;
const { privateKey, publicKey } = await generateKeyPair("EdDSA");
const jwk = await exportJWK(publicKey); jwk.kid = "hsi-test-signing-key"; jwk.alg = "EdDSA";
const issuer = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => Response.json({ keys: [jwk] }) });
process.env.NEON_AUTH_BASE_URL = issuer.url.origin;
delete process.env.NEON_AUTH_JWKS_URL;
const { handleIsiInvestigationRequest } = await import("../src/lib/hsi/investigation.api.server");
const { isiInvestigationDatabase } = await import("../src/lib/hsi/investigation-db.server");
const { getSqlClient } = await import("../src/lib/db.server");
const alice = "11111111-1111-4111-8111-111111111111", bob = "22222222-2222-4222-8222-222222222222", member = "33333333-3333-4333-8333-333333333333";
async function token(id: string, expiry = "2m", issuedBy = issuer.url.origin) {
  return new SignJWT({ role: "admin" }).setProtectedHeader({ alg: "EdDSA", kid: jwk.kid }).setSubject(id).setIssuer(issuedBy).setIssuedAt().setExpirationTime(expiry).sign(privateKey);
}
const tokens = { alice: await token(alice), bob: await token(bob), member: await token(member) };
async function call(jwt: string | null, body: unknown, headers: Record<string,string> = {}) {
  return handleIsiInvestigationRequest(new Request("https://isi.test/api/internal/investigations", { method: "POST", headers: { origin: "https://isi.test", "content-type": "application/json", ...(jwt ? { authorization: `Bearer ${jwt}` } : {}), ...headers }, body: JSON.stringify(body) }));
}
const list = { action: "list", cursor: null };
try {
  assert.equal((await call(null, list)).status, 401);
  assert.equal((await call(await token(alice, "-1m"), list)).status, 401);
  assert.equal((await call(await token(alice, "2m", "https://forged.example"), list)).status, 401);
  assert.equal((await call(tokens.member, list)).status, 403); // A JWT role claim is never a stored admin grant.
  assert.equal((await call(tokens.alice, list, { origin: "https://attacker.example" })).status, 403);
  assert.equal((await call(tokens.alice, list, { "content-length": "9000" })).status, 413);
  assert.equal((await call(tokens.alice, { action: "start", releaseId: "isi-core-graph", conceptId: "D012", patient: {} })).status, 400);
  const started = await call(tokens.alice, { action: "start", releaseId: "isi-core-graph", conceptId: "D012" });
  assert.equal(started.status, 200); const run = await started.json();
  assert.equal(run.snapshot.bundle.context.provenance.product, "isi"); assert.ok(run.snapshot.bundle.relationships.length > 0);
  assert.equal(run.snapshot.payloads.retrieval.passageIds.length, 0); assert.equal(run.snapshot.payloads.dossier, undefined);
  const reopened = await (await call(tokens.alice, { action: "get", key: run.key })).json();
  assert.deepEqual(reopened.snapshot, run.snapshot); // JSONB reorder + separate DB transaction.
  for (const action of [{ action: "get", key: run.key }, { action: "export", key: run.key, format: "json" }, { action: "review", key: run.key, revision: run.snapshot.revision, decision: "accept_for_research", rationale: "wrong owner" }]) assert.equal((await call(tokens.bob, action)).status, 404);
  assert.equal((await (await call(tokens.bob, list)).json()).items.length, 0);
  const reviews = await Promise.all([
    call(tokens.alice, { action: "review", key: run.key, revision: run.snapshot.revision, decision: "request_revision", rationale: "Verified source passages are needed." }),
    call(tokens.alice, { action: "review", key: run.key, revision: run.snapshot.revision, decision: "accept_for_research", rationale: "Concurrent fixture decision." }),
  ]);
  assert.deepEqual(reviews.map((r) => r.status).sort(), [200,409]);
  const current = await (await call(tokens.alice, { action: "get", key: run.key })).json();
  const exportResponse = await call(tokens.alice, { action: "export", key: run.key, format: "markdown" });
  assert.equal(exportResponse.headers.get("cache-control"), "private, no-store");
  assert.match((await exportResponse.json()).content, /Research only/);
  const dbA = isiInvestigationDatabase(alice), dbB = isiInvestigationDatabase(bob);
  const audits = await dbA.query("SELECT * FROM public.hsi_investigation_audit WHERE owner_id=$1 AND investigation_key=$2 ORDER BY revision", [alice,run.key]);
  assert.equal(audits.length, current.snapshot.revision); assert.ok(audits.every((r) => r.actor_id === alice));
  // RLS works even if an application query accidentally omits its owner predicate.
  assert.equal((await dbB.query("SELECT * FROM public.hsi_investigations WHERE investigation_key=$1", [run.key])).length, 0);
  await assert.rejects(() => dbB.query("UPDATE public.hsi_investigations SET revision=revision+1 WHERE investigation_key=$1 RETURNING revision", [run.key]).then((rows) => { assert.equal(rows.length, 1); }));
  // Microsecond-separated rows prove keyset cursors do not skip records on JSON/Date conversion.
  await dbA.query(`INSERT INTO public.hsi_investigations(owner_id,investigation_key,revision,state,data_class,question,snapshot,created_at)
    SELECT owner_id,'INV-'||gen_random_uuid()::text,revision,state,data_class,question,snapshot,
    date_trunc('second',now())-interval '1 day'+g*interval '1 microsecond'
    FROM public.hsi_investigations CROSS JOIN generate_series(1,24) AS g WHERE owner_id=$1 AND investigation_key=$2`, [alice,run.key]);
  const firstPage = await (await call(tokens.alice, list)).json();
  const secondPage = await (await call(tokens.alice, { action: "list", cursor: firstPage.nextCursor })).json();
  assert.equal(firstPage.items.length,20); assert.equal(secondPage.items.length,5);
  assert.equal(new Set([...firstPage.items,...secondPage.items].map((r: {key:string})=>r.key)).size,25);
  for (let i=0;i<4;i++) assert.equal((await call(tokens.alice, { action: "start", releaseId: "isi-core-graph", conceptId: "D012" })).status, 200);
  assert.equal((await call(tokens.alice, { action: "start", releaseId: "isi-core-graph", conceptId: "D012" })).status, 429);
  console.log("PASS: ISI signed JWT/stored-role authorization, real graph adapter, PostgreSQL persistence/RLS/CAS/audit, quotas and dossier export");
} finally { issuer.stop(true); await getSqlClient().end({ timeout: 2 }); }

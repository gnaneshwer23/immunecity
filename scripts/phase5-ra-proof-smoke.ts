/**
 * Phase 5 proof-point smoke (ISI): authenticated start → passages → reload → review → export,
 * rights-verified evidence corpus start, and cross-owner denial. Disposable local DB only.
 */
import assert from "node:assert/strict";
import { generateKeyPair, exportJWK, SignJWT } from "jose";

const local = process.env.HSI_TEST_DB_URL;
if (!local) throw new Error("HSI_TEST_DB_URL must name a disposable local test database");
const target = new URL(local);
if (!["127.0.0.1", "localhost"].includes(target.hostname) || target.pathname !== "/hsi_step3_test") {
  throw new Error("Refusing non-local investigation test database");
}
process.env.DATABASE_URL = local;
delete process.env.DATABASE_URL_UNPOOLED;

const { privateKey, publicKey } = await generateKeyPair("EdDSA");
const jwk = await exportJWK(publicKey);
jwk.kid = "hsi-phase5-signing-key";
jwk.alg = "EdDSA";
const issuer = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch: () => Response.json({ keys: [jwk] }),
});
process.env.NEON_AUTH_BASE_URL = issuer.url.origin;
delete process.env.NEON_AUTH_JWKS_URL;

const { handleIsiInvestigationRequest } = await import("../src/lib/hsi/investigation.api.server");
const { getSqlClient } = await import("../src/lib/db.server");
const { RA_RELEASE_ID } = await import("../src/lib/hsi/vendor/raEvidenceRelease");
const { RA_RESEARCH_RELEASE_ID } = await import("../src/lib/hsi/vendor/raResearchEvidenceRelease");

const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";

async function token(id: string) {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "EdDSA", kid: jwk.kid })
    .setSubject(id)
    .setIssuer(issuer.url.origin)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

async function call(jwt: string, body: unknown) {
  return handleIsiInvestigationRequest(
    new Request("https://isi.test/api/internal/investigations", {
      method: "POST",
      headers: {
        origin: "https://isi.test",
        "content-type": "application/json",
        authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(body),
    }),
  );
}

const checks: string[] = [];
try {
  const aliceTok = await token(alice);
  const bobTok = await token(bob);

  const evidenceStarted = await call(aliceTok, { action: "start", releaseId: RA_RELEASE_ID, conceptId: null });
  assert.equal(evidenceStarted.status, 200);
  const evidenceRun = await evidenceStarted.json();
  assert.ok((evidenceRun.snapshot.payloads.retrieval?.passageIds?.length ?? 0) >= 2);
  assert.equal(evidenceRun.snapshot.bundle.claims.length, 0);
  assert.equal(evidenceRun.snapshot.bundle.context.dataClass, "public_real");
  assert.ok(evidenceRun.snapshot.bundle.sources.every((s: { kind: string; pmid: string | null }) => s.kind === "publication" && s.pmid));
  checks.push("evidence_start_passages");

  const started = await call(aliceTok, { action: "start", releaseId: RA_RESEARCH_RELEASE_ID, conceptId: null });
  assert.equal(started.status, 200);
  const run = await started.json();
  assert.ok((run.snapshot.payloads.retrieval?.passageIds?.length ?? 0) >= 2);
  assert.equal(run.snapshot.bundle.claims.length, 0);
  assert.equal(run.snapshot.bundle.context.dataClass, "synthetic");
  assert.ok(run.snapshot.bundle.sources.every((s: { kind: string }) => s.kind === "synthetic_fixture"));
  checks.push("research_start_passages");

  const reloaded = await (await call(aliceTok, { action: "get", key: run.key })).json();
  assert.deepEqual(reloaded.snapshot, run.snapshot);
  checks.push("reload");

  assert.equal((await call(bobTok, { action: "get", key: run.key })).status, 404);
  assert.equal(
    (
      await call(bobTok, {
        action: "review",
        key: run.key,
        revision: run.snapshot.revision,
        decision: "accept_for_research",
        rationale: "cross-owner must fail",
      })
    ).status,
    404,
  );
  checks.push("cross_owner_denied");

  const reviewed = await call(aliceTok, {
    action: "review",
    key: run.key,
    revision: run.snapshot.revision,
    decision: "accept_for_research",
    rationale: "Workflow acceptance only — not scientific claim approval or Gate C.",
  });
  assert.equal(reviewed.status, 200);
  const afterReview = await reviewed.json();
  assert.equal(afterReview.snapshot.bundle.claims.length, 0);
  checks.push("review_without_claim_promotion");

  const exported = await call(aliceTok, { action: "export", key: run.key, format: "markdown" });
  assert.equal(exported.status, 200);
  assert.equal(exported.headers.get("cache-control"), "private, no-store");
  const dossier = await exported.json();
  assert.match(String(dossier.content), /Research only|research|synthetic|RS-000|SYN-/i);
  checks.push("export_markdown");

  console.log(
    JSON.stringify(
      {
        ok: true,
        product: "isi",
        phase: 5,
        checks,
        note: "Engineering proof-point only — not scientific validation. Live /internal-research still requires an ISI admin session.",
      },
      null,
      2,
    ),
  );
} finally {
  issuer.stop(true);
  await getSqlClient().end({ timeout: 2 });
}

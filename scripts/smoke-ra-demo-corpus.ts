/** Corpus-level smoke: pending evidence_not_ready + demo fixture loads. No Neon required. */
import { isiInvestigationReleases, loadIsiInvestigationRelease } from "../src/lib/hsi/investigation-corpus.server";
import { InvestigationRequestError } from "../src/lib/hsi/vendor/investigationBackend";
import { RA_RELEASE_ID } from "../src/lib/hsi/vendor/raEvidenceRelease";
import { RA_DEMO_RELEASE_ID } from "../src/lib/hsi/vendor/raDemoEvidenceRelease";

const pending = isiInvestigationReleases.find((r) => r.id === RA_RELEASE_ID);
if (!pending || pending.readiness?.available !== false) throw new Error("pending RA must stay unavailable");
try {
  await loadIsiInvestigationRelease(RA_RELEASE_ID, null);
  throw new Error("expected evidence_not_ready");
} catch (error) {
  if (!(error instanceof InvestigationRequestError) || error.code !== "evidence_not_ready") throw error;
}

const demoListing = isiInvestigationReleases.find((r) => r.id === RA_DEMO_RELEASE_ID);
if (!demoListing?.readiness?.available) throw new Error("demo corpus must be available");
const demo = await loadIsiInvestigationRelease(RA_DEMO_RELEASE_ID, null);
if (demo.context.dataClass !== "synthetic" || demo.passages.length < 2) throw new Error("demo passages missing");

console.log(
  JSON.stringify(
    {
      ok: true,
      product: "isi",
      pending: RA_RELEASE_ID,
      demo: RA_DEMO_RELEASE_ID,
      demoPassages: demo.passages.length,
      note: "Apply drizzle/migrations/0029_hsi_investigations.sql with ISI .env.local before live UI smoke.",
    },
    null,
    2,
  ),
);

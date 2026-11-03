/** Corpus-level verification: pending evidence_not_ready + research working set loads. No Neon required. */
import { isiInvestigationReleases, loadIsiInvestigationRelease } from "../src/lib/hsi/investigation-corpus.server";
import { InvestigationRequestError } from "../src/lib/hsi/vendor/investigationBackend";
import { RA_RELEASE_ID } from "../src/lib/hsi/vendor/raEvidenceRelease";
import { RA_RESEARCH_RELEASE_ID } from "../src/lib/hsi/vendor/raResearchEvidenceRelease";

const pending = isiInvestigationReleases.find((r) => r.id === RA_RELEASE_ID);
if (!pending || pending.readiness?.available !== false) throw new Error("pending RA must stay unavailable");
try {
  await loadIsiInvestigationRelease(RA_RELEASE_ID, null);
  throw new Error("expected evidence_not_ready");
} catch (error) {
  if (!(error instanceof InvestigationRequestError) || error.code !== "evidence_not_ready") throw error;
}

const researchListing = isiInvestigationReleases.find((r) => r.id === RA_RESEARCH_RELEASE_ID);
if (!researchListing?.readiness?.available) throw new Error("research corpus must be available");
if (/demo|fixture|smoke/i.test(researchListing.title) || /demo|fixture|smoke/i.test(researchListing.description ?? "")) {
  throw new Error("research corpus listing must stay professional");
}
const research = await loadIsiInvestigationRelease(RA_RESEARCH_RELEASE_ID, null);
if (research.context.dataClass !== "synthetic" || research.passages.length < 2) throw new Error("research passages missing");

console.log(
  JSON.stringify(
    {
      ok: true,
      product: "isi",
      pending: RA_RELEASE_ID,
      research: RA_RESEARCH_RELEASE_ID,
      researchPassages: research.passages.length,
      note: "Apply drizzle/migrations/0029_hsi_investigations.sql with ISI .env.local before live UI verification.",
    },
    null,
    2,
  ),
);

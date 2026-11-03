/** Corpus-level verification: rights-verified evidence + research working set. No Neon required. */
import { isiInvestigationReleases, loadIsiInvestigationRelease } from "../src/lib/hsi/investigation-corpus.server";
import { RA_RELEASE_ID } from "../src/lib/hsi/vendor/raEvidenceRelease";
import { RA_RESEARCH_RELEASE_ID } from "../src/lib/hsi/vendor/raResearchEvidenceRelease";

const evidenceListing = isiInvestigationReleases.find((r) => r.id === RA_RELEASE_ID);
if (!evidenceListing?.readiness?.available) throw new Error("rights-verified RA evidence must be available");
if (evidenceListing.readiness.scientificReview !== "unreviewed") throw new Error("evidence must stay unreviewed");
const evidence = await loadIsiInvestigationRelease(RA_RELEASE_ID, null);
if (evidence.context.dataClass !== "public_real" || evidence.passages.length < 2) throw new Error("evidence passages missing");
if (evidence.claims.length !== 0) throw new Error("evidence must not invent claims");
if (!evidence.sources.every((s) => s.kind === "publication" && s.pmid)) throw new Error("evidence sources must be real publications");

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
      evidence: RA_RELEASE_ID,
      evidencePassages: evidence.passages.length,
      research: RA_RESEARCH_RELEASE_ID,
      researchPassages: research.passages.length,
      scientificReview: "unreviewed",
      note: "Apply drizzle/migrations/0029_hsi_investigations.sql with ISI .env.local before live UI verification.",
    },
    null,
    2,
  ),
);

/**
 * Bounded Discovery 3.0 retrieval pilots A/B.
 * Opt-in live: DISCOVERY_LIVE_PUBMED=1 DISCOVERY_LIVE_EUROPE_PMC=1 DISCOVERY_LIVE_CTGOV=1
 * Never invents studies. Failed queries ≠ zero evidence.
 * Writes JSON report under docs/ (measurements only).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { detectDiscoveryCandidates, PILOT_B_SEED_CONCEPTS } from "@/lib/discovery/detect";
import { planRetrievalQueries, runBoundedRetrieval, resolveRetrievalAdapters } from "@/lib/discovery/retrieve";
import { runGapAssessmentPipeline } from "@/lib/discovery/pipeline";

function loadEnvLocal() {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let val = m[2]!.trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[m[1]!]) process.env[m[1]!] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

async function main() {
  const adapters = resolveRetrievalAdapters();
  const candidates = detectDiscoveryCandidates({
    conceptIds: PILOT_B_SEED_CONCEPTS,
    includeMatrix: true,
  });
  const pilotA = candidates.filter((c) => c.pilot === "melanoma_a").slice(0, 3);
  const pilotB = candidates.filter((c) => c.pilot === "coverage_b").slice(0, 3);

  const pilotReports = [];
  for (const label of [
    { name: "A", gaps: pilotA },
    { name: "B", gaps: pilotB },
  ] as const) {
    for (const gap of label.gaps) {
      const plan = planRetrievalQueries(gap);
      const report = await runBoundedRetrieval(plan, adapters, { limitPerQuery: 5 });
      pilotReports.push({
        pilot: label.name,
        gapKey: gap.gapKey,
        gapClass: gap.gapClass ?? null,
        found: report.found,
        assessed: report.assessed,
        linked: report.linked,
        excluded: report.excluded,
        failedQueries: report.failedQueries,
        hitCountKnown: report.hitCountKnown,
        inventedStudies: report.inventedStudies,
        mode: adapters.mode,
        sampleIds: report.works.slice(0, 5).map((w) => ({
          pmid: w.pmid,
          doi: w.doi,
          nctId: w.nctId,
          source: w.source,
        })),
      });
    }
  }

  const dryPipeline = await runGapAssessmentPipeline({
    runRetrieval: false,
    maxGaps: 12,
  });

  const out = {
    generatedAt: new Date().toISOString(),
    adapterMode: adapters.mode,
    liveFlags: {
      pubmed: process.env.DISCOVERY_LIVE_PUBMED === "1",
      europePmc: process.env.DISCOVERY_LIVE_EUROPE_PMC === "1",
      ctgov: process.env.DISCOVERY_LIVE_CTGOV === "1",
    },
    honesty:
      "Failed or stubbed queries do not mean zero evidence. Counts are from real adapter responses only; no invented studies.",
    pilotReports,
    totals: {
      gapsRun: pilotReports.length,
      found: pilotReports.reduce((s, r) => s + r.found, 0),
      assessed: pilotReports.reduce((s, r) => s + r.assessed, 0),
      linked: pilotReports.reduce((s, r) => s + r.linked, 0),
      excluded: pilotReports.reduce((s, r) => s + r.excluded, 0),
      failedQueries: pilotReports.reduce((s, r) => s + r.failedQueries, 0),
    },
    dryPipelineCounts: dryPipeline.counts,
    gapClassMix: dryPipeline.gaps.reduce(
      (acc, g) => {
        acc[g.gapClass] = (acc[g.gapClass] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
  };

  const path = resolve(process.cwd(), "docs/ISI_DISCOVERY_3_RETRIEVAL_PILOT_REPORT.json");
  writeFileSync(path, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ wrote: path, ...out.totals, mode: adapters.mode }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

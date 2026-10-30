/**
 * Evidence Intel 4.0 — Phase 8 offline reassess of five Discovery 3.0 dossiers.
 * Uses passages from ISI_DISCOVERY_3_APPRAISAL_SPRINT_REPORT.json (no unbounded live scrape).
 * Writes docs/ISI_EVIDENCE_INTEL_4_VALIDATION.{json,md}
 * Honesty: accuracyVsGold = null (no SME gold labels).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { runIntel4FiveDossiers, INTEL4_VERSION } from "@/lib/discovery/intel4";
import type { RetrievedWork } from "@/lib/discovery/retrieve";

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

type SprintCitation = {
  pmid?: string | null;
  doi?: string | null;
  title?: string | null;
  scientificRelation?: string | null;
  supportingPassage?: string | null;
};

type SprintDossier = {
  gapKey: string;
  researchQuestion: string;
  citations: SprintCitation[];
};

type SprintReport = {
  baselineTip?: string;
  dossiers: SprintDossier[];
  candidateRegister?: Array<{ gapKey: string; support: number; scientificallyAppraised: number }>;
};

const sprintPath = resolve(process.cwd(), "docs/ISI_DISCOVERY_3_APPRAISAL_SPRINT_REPORT.json");
const sprint = JSON.parse(readFileSync(sprintPath, "utf8")) as SprintReport;

const dossierWorks: Record<
  string,
  Array<RetrievedWork & { abstractText?: string | null; priorAppraisalRelation?: string | null }>
> = {};

for (const d of sprint.dossiers) {
  dossierWorks[d.gapKey] = (d.citations ?? []).map((c) => ({
    pmid: c.pmid ?? null,
    doi: c.doi ?? null,
    nctId: null,
    title: c.title ?? null,
    source: "europe_pmc" as const,
    abstractAvailable: Boolean(c.supportingPassage),
    fullTextAvailable: null,
    year: null,
    excluded: false,
    exclusionReason: null,
    provenance: { from: "appraisal_sprint_report", priorRelation: c.scientificRelation },
    abstractText: c.supportingPassage ?? null,
    priorAppraisalRelation: c.scientificRelation ?? null,
  }));
}

const tip = (() => {
  try {
    return readFileSync(resolve(process.cwd(), ".git/refs/heads/main"), "utf8").trim().slice(0, 40);
  } catch {
    return "unknown";
  }
})();

const result = runIntel4FiveDossiers(dossierWorks, {
  nowIso: new Date().toISOString(),
});

const perGap = result.gaps.map((g) => {
  const prior = sprint.candidateRegister?.find((c) => c.gapKey === g.gapKey);
  return {
    gapKey: g.gapKey,
    priorAppraisalSupport: prior?.support ?? null,
    priorScientificallyAppraised: prior?.scientificallyAppraised ?? null,
    intel4: {
      support: g.verification.counts.support,
      contradict: g.verification.counts.contradict,
      background: g.verification.counts.background,
      insufficient: g.verification.counts.insufficient,
      abstained: g.verification.counts.abstained,
      demotedFromPriorSupport: g.verification.counts.demotedFromPriorSupport,
      identifierValidated: g.verification.counts.identifierValidated,
    },
    falseSupportRisk:
      (prior?.support ?? 0) > 0 && g.verification.counts.demotedFromPriorSupport > 0
        ? "flagged"
        : g.verification.counts.support === 0 && (prior?.support ?? 0) > 5
          ? "high_demotion"
          : "review",
    route: {
      risk: g.route.risk,
      href: g.route.href,
      autoApprove: g.route.autoApprove,
      reason: g.route.reason,
    },
    opportunityEmit: g.opportunity.emit,
    opportunityReason: g.opportunity.reason,
    adjudicator: g.crossExam.adjudicator.uncertaintySummary,
    smeStillNeeded: true,
  };
});

const payload = {
  generatedAt: new Date().toISOString(),
  intel4Version: INTEL4_VERSION,
  baselineTip: tip,
  sprintBaselineTip: sprint.baselineTip ?? null,
  source: "docs/ISI_DISCOVERY_3_APPRAISAL_SPRINT_REPORT.json",
  policy: result.policy,
  metrics: result.metrics,
  perGap,
  monitoringLog: result.monitoringLog,
  whatStillNeedsSmeHumans: [
    "All five dossiers remain unreviewed scientifically — Intel 4.0 is engineering reassessment only.",
    "Gold-set expected labels / accuracy denominators stay null until SME fills them.",
    "Any remaining verifier support items need full-text SME confirmation of proposition directness.",
    "reviewed_opportunity / Gate C require human reviewer — never auto.",
    "Confirm whether demoted prior-support PMIDs should stay linked as background vs excluded.",
  ],
  honesty:
    "accuracyVsGold=null; accuracyDenominator=no_gold_labels. Counts are engineering screens on sprint passages (often truncated abstracts). Not clinical conclusions.",
};

const jsonPath = resolve(process.cwd(), "docs/ISI_EVIDENCE_INTEL_4_VALIDATION.json");
writeFileSync(jsonPath, JSON.stringify(payload, null, 2));

const md: string[] = [
  "# ISI Evidence Intel 4.0 — Phase 8 validation",
  "",
  `**Generated:** ${payload.generatedAt}`,
  `**Intel4 version:** ${INTEL4_VERSION}`,
  `**Repo tip (main ref):** \`${tip}\``,
  `**Sprint source tip:** \`${sprint.baselineTip ?? "n/a"}\``,
  `**Input:** \`${payload.source}\` (offline passages — no unbounded live scrape)`,
  "",
  "## Verdict",
  "",
  `- Gaps run: **${result.metrics.gapsRun}**`,
  `- Verifier support total: **${result.metrics.supportTotal}** (was topical keyword support in 3.0 sprint)`,
  `- Demoted from prior support: **${result.metrics.demotedFromPriorSupportTotal}**`,
  `- Insufficient / abstained: **${result.metrics.insufficientTotal}** / **${result.metrics.abstainedTotal}**`,
  `- High-risk → SME: **${result.metrics.highRiskRoutedToSme}**`,
  `- Opportunities emitted (candidates only): **${result.metrics.opportunitiesEmitted}**`,
  `- Auto-approve count: **0**`,
  `- Accuracy vs gold: **null** (\`no_gold_labels\`) — never invent accuracy %`,
  "",
  "## Per-dossier findings",
  "",
];

for (const g of perGap) {
  md.push(`### ${g.gapKey}`);
  md.push("");
  md.push(
    `| Metric | Discovery 3.0 appraisal | Intel 4.0 verifier |`,
  );
  md.push(`| --- | --- | --- |`);
  md.push(`| support | ${g.priorAppraisalSupport ?? "n/a"} | ${g.intel4.support} |`);
  md.push(`| insufficient | n/a | ${g.intel4.insufficient} |`);
  md.push(`| abstained | n/a | ${g.intel4.abstained} |`);
  md.push(`| demotedFromPriorSupport | — | ${g.intel4.demotedFromPriorSupport} |`);
  md.push(`| false-support risk | — | **${g.falseSupportRisk}** |`);
  md.push(`| route | — | **${g.route.risk}** → ${g.route.href} |`);
  md.push(`| opportunity emit | — | ${g.opportunityEmit} |`);
  md.push("");
  md.push(`- Opportunity note: ${g.opportunityReason}`);
  md.push(`- Route: ${g.route.reason}`);
  md.push(`- Adjudicator: ${g.adjudicator.slice(0, 400)}…`);
  md.push(`- SME humans still required: **yes**`);
  md.push("");
}

md.push("## What still needs SME humans");
md.push("");
for (const w of payload.whatStillNeedsSmeHumans) {
  md.push(`- ${w}`);
}
md.push("");
md.push("## Honesty");
md.push("");
md.push(payload.honesty);
md.push("");
md.push("## Policy");
md.push("");
md.push("- No invented PMIDs / scores / conclusions");
md.push("- No auto Gate C / reviewed_opportunity");
md.push("- Title-only ≠ support; keyword hit ≠ support");
md.push("- High model confidence never overrides missing evidence");
md.push("- No silent KG write; TI flag-off");
md.push("");

const mdPath = resolve(process.cwd(), "docs/ISI_EVIDENCE_INTEL_4_VALIDATION.md");
writeFileSync(mdPath, md.join("\n"));

console.log(JSON.stringify({ ok: true, jsonPath, mdPath, metrics: result.metrics }, null, 2));

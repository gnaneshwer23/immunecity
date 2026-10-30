/**
 * Discovery 3.0 appraisal sprint — deep ≤5 research questions.
 * Live PubMed/Europe PMC when DISCOVERY_LIVE_*=1.
 * Per-question scientific appraisal; persist to Neon; never invent PMIDs / Gate C approve.
 * Writes docs/ISI_DISCOVERY_3_APPRAISAL_SPRINT_REPORT.{json,md}
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import {
  appraiseWorksForQuestion,
  type AppraisedWork,
} from "@/lib/discovery/appraise";
import {
  DEEP_RESEARCH_QUESTIONS,
  OPPORTUNITY_SPRINT_POLICY,
  buildOpportunityDossierSection,
  promoteFromAppraisal,
  type DossierSection,
} from "@/lib/discovery/opportunities";
import { appraisalEventDetail, planPersistRetrieval } from "@/lib/discovery/persistRetrieval";
import {
  createLiveEuropePmcAdapter,
  validatePmid,
  type RetrievedWork,
} from "@/lib/discovery/retrieve";
import {
  createLivePubmedAdapter,
  createRateLimitGate,
  withRetries,
} from "@/lib/discovery/adapters";

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

function normalizeUrl(raw: string): string {
  const u = new URL(raw);
  u.searchParams.delete("channel_binding");
  if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
  return u.toString();
}

function hostPrefix(hostname: string): string {
  if (hostname.startsWith("ep-blue-salad")) return "ep-blue-salad";
  if (hostname.startsWith("ep-cool-flower")) return "ep-cool-flower";
  const m = hostname.match(/^(ep-[a-z]+-[a-z]+)/);
  return m?.[1] ?? "other";
}

async function fetchAbstractsByPmid(
  pmids: string[],
): Promise<Map<string, { title: string | null; abstractText: string | null; doi: string | null }>> {
  const out = new Map<string, { title: string | null; abstractText: string | null; doi: string | null }>();
  const gate = createRateLimitGate(400);
  for (const pmid of pmids) {
    const v = validatePmid(pmid);
    if (!v) continue;
    await gate.waitTurn();
    try {
      const payload = await withRetries(async () => {
        const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(
          `EXT_ID:${v} AND SRC:MED`,
        )}&format=json&pageSize=1&resultType=core`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "ImmuneSuperIntelligence-DiscoveryAppraisal/1.0 (mailto:curation@immune-city.app)",
          },
        });
        if (!res.ok) throw new Error(`Europe PMC abstract HTTP ${res.status}`);
        return (await res.json()) as {
          resultList?: {
            result?: Array<{
              title?: string;
              abstractText?: string;
              doi?: string;
            }>;
          };
        };
      });
      const r = payload.resultList?.result?.[0];
      out.set(v, {
        title: r?.title ?? null,
        abstractText: r?.abstractText ?? null,
        doi: r?.doi ?? null,
      });
    } catch {
      out.set(v, { title: null, abstractText: null, doi: null });
    }
  }
  return out;
}

async function retrieveForQuestion(spec: (typeof DEEP_RESEARCH_QUESTIONS)[number]): Promise<{
  works: Array<RetrievedWork & { abstractText?: string | null }>;
  failedQueries: number;
  hitCountKnown: boolean;
  mode: string;
}> {
  const livePubmed =
    process.env.DISCOVERY_LIVE_PUBMED === "1" || process.env.DISCOVERY_LIVE_PUBMED === "true";
  const liveEpmc =
    process.env.DISCOVERY_LIVE_EUROPE_PMC === "1" || process.env.DISCOVERY_LIVE_EUROPE_PMC === "true";
  const pubmed = createLivePubmedAdapter({
    enableLivePubmed: livePubmed,
    ncbiApiKey: process.env.NCBI_API_KEY ?? process.env.PUBMED_API_KEY ?? null,
  });
  const epmc = createLiveEuropePmcAdapter({ enableLiveEuropePmc: liveEpmc });
  let failedQueries = 0;
  let hitCountKnown = false;
  const works: Array<RetrievedWork & { abstractText?: string | null }> = [];
  const seen = new Set<string>();

  const pubmedRes = await pubmed.search(spec.pubmedQuery, { limit: 8 });
  if (pubmedRes.source === "fail_closed" || pubmedRes.source === "stub") failedQueries += 1;
  if (typeof pubmedRes.hitCount === "number") hitCountKnown = true;
  for (const pmid of pubmedRes.pmids ?? []) {
    const v = validatePmid(pmid);
    if (!v || seen.has(`pmid:${v}`)) continue;
    seen.add(`pmid:${v}`);
    works.push({
      pmid: v,
      doi: null,
      nctId: null,
      title: null,
      source: "pubmed",
      abstractAvailable: null,
      fullTextAvailable: null,
      year: null,
      excluded: false,
      exclusionReason: null,
      provenance: { query: spec.pubmedQuery, adapter: pubmedRes.source, hitCount: pubmedRes.hitCount },
    });
  }

  const detailed = epmc.searchDetailed
    ? await epmc.searchDetailed(spec.europePmcQuery, { limit: 8 })
    : { result: await epmc.search(spec.europePmcQuery, { limit: 8 }), hits: [] };
  if (detailed.result.source === "fail_closed" || detailed.result.source === "stub") failedQueries += 1;
  if (typeof detailed.result.hitCount === "number") hitCountKnown = true;
  for (const h of detailed.hits) {
    const key = h.pmid ? `pmid:${h.pmid}` : h.doi ? `doi:${h.doi.toLowerCase()}` : null;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    works.push({
      pmid: h.pmid,
      doi: h.doi,
      nctId: null,
      title: h.title,
      source: "europe_pmc",
      abstractAvailable: h.hasAbstract,
      fullTextAvailable: h.isOpenAccess,
      year: null,
      excluded: false,
      exclusionReason: null,
      provenance: {
        query: spec.europePmcQuery,
        adapter: detailed.result.source,
        hitCount: detailed.result.hitCount,
      },
      abstractText: null,
    });
  }

  const pmids = works.map((w) => w.pmid).filter(Boolean) as string[];
  if (liveEpmc || livePubmed) {
    const abs = await fetchAbstractsByPmid(pmids.slice(0, 12));
    for (const w of works) {
      if (!w.pmid) continue;
      const meta = abs.get(w.pmid);
      if (!meta) continue;
      if (!w.title && meta.title) w.title = meta.title;
      if (!w.doi && meta.doi) w.doi = meta.doi;
      w.abstractText = meta.abstractText;
      w.abstractAvailable = Boolean(meta.abstractText);
    }
  }

  const mode =
    livePubmed && liveEpmc ? "live" : livePubmed || liveEpmc ? "live_partial" : "stub";
  return { works, failedQueries, hitCountKnown, mode };
}

async function persistPlanToNeon(opts: {
  sql: postgres.Sql;
  gap: ReturnType<typeof promoteFromAppraisal> extends { qualify: true; candidate: infer C }
    ? C
    : never;
  works: AppraisedWork[];
  queryText: string;
  hitCount: number | null;
  evidenceBefore: number;
}): Promise<{ gapId: string; linksUpserted: number; evidenceAfter: number }> {
  const planned = planPersistRetrieval({
    gap: opts.gap,
    works: opts.works,
    queryText: opts.queryText,
    hitCount: opts.hitCount,
    sourceFallback: "appraisal_sprint",
  });
  if (!planned.ok) throw new Error(planned.error);
  const plan = planned.plan;
  const g = plan.gap;

  const existing = await opts.sql`
    select id, status, gap_class, opportunity_status from public.research_gaps
    where gap_key = ${g.gapKey} limit 1
  `;
  if (
    existing[0]?.status === "reviewed_gap" ||
    existing[0]?.opportunity_status === "reviewed_opportunity"
  ) {
    throw new Error(`refusing_overwrite_reviewed gap=${g.gapKey}`);
  }

  let gapId: string;
  if (existing[0]?.id) {
    gapId = String(existing[0].id);
    await opts.sql`
      update public.research_gaps set
        title = ${g.title},
        summary = ${g.summary},
        status = ${g.status},
        gap_class = ${g.gapClass ?? null},
        opportunity_status = ${g.opportunityStatus ?? "none"},
        opportunity_rationale = ${g.opportunityRationale ?? null},
        novelty_note = ${g.noveltyNote ?? null},
        feasibility_note = ${g.feasibilityNote ?? null},
        class_reason = ${g.classReason ?? null},
        class_assigned_at = now(),
        pilot = ${g.pilot},
        subject_id = ${g.subjectId},
        object_id = ${g.objectId},
        relationship_id = ${g.relationshipId},
        disease_id = ${g.diseaseId},
        why_it_matters = ${g.whyItMatters},
        search_scope_json = ${opts.sql.json(g.searchScope as never)},
        detection_source = ${g.detectionSource},
        detection_detail = ${opts.sql.json(g.detectionDetail as never)},
        coverage_label = ${g.coverageLabel},
        updated_at = now()
      where id = ${gapId}::uuid
    `;
  } else {
    const inserted = await opts.sql`
      insert into public.research_gaps (
        gap_key, title, summary, status, gap_class, opportunity_status,
        opportunity_rationale, novelty_note, feasibility_note, class_reason, class_assigned_at,
        pilot, subject_id, object_id, relationship_id, disease_id, why_it_matters,
        search_scope_json, detection_source, detection_detail, coverage_label, created_by
      ) values (
        ${g.gapKey}, ${g.title}, ${g.summary}, ${g.status}, ${g.gapClass ?? null},
        ${g.opportunityStatus ?? "none"}, ${g.opportunityRationale ?? null},
        ${g.noveltyNote ?? null}, ${g.feasibilityNote ?? null}, ${g.classReason ?? null}, now(),
        ${g.pilot}, ${g.subjectId}, ${g.objectId}, ${g.relationshipId}, ${g.diseaseId},
        ${g.whyItMatters}, ${opts.sql.json(g.searchScope as never)}, ${g.detectionSource},
        ${opts.sql.json(g.detectionDetail as never)}, ${g.coverageLabel}, 'appraisal_sprint'
      ) returning id
    `;
    gapId = String(inserted[0]!.id);
  }

  if (plan.classHistory) {
    await opts.sql`
      insert into public.research_gap_class_history (
        gap_id, gap_key, previous_class, new_class,
        previous_opportunity_status, new_opportunity_status, reason, actor, review_locked
      ) values (
        ${gapId}::uuid, ${g.gapKey}, ${plan.classHistory.previousClass},
        ${plan.classHistory.newClass}, ${plan.classHistory.previousOpportunityStatus},
        ${plan.classHistory.newOpportunityStatus}, ${plan.classHistory.reason},
        'appraisal_sprint', false
      )
    `;
  }

  await opts.sql`
    insert into public.research_search_coverage (
      gap_id, concept_id, relationship_id, search_attempted, hit_count, query_text, scope_note
    ) values (
      ${gapId}::uuid, ${g.subjectId}, ${g.relationshipId}, true,
      ${plan.coverage.hitCount}, ${plan.coverage.queryText}, ${plan.coverage.scopeNote}
    )
  `;

  let linksUpserted = 0;
  for (const link of plan.links) {
    if (link.pmid) {
      await opts.sql`
        insert into public.research_gap_evidence_links (
          gap_id, pmid, doi, nct_id, title, source, abstract_available, full_text_available,
          exclusion_reason, provenance_json, link_role,
          scientific_relation, screening_decision, supporting_passage, study_context,
          appraisal_limitations, question_key, identifier_validated
        ) values (
          ${gapId}::uuid, ${link.pmid}, ${link.doi}, ${link.nctId}, ${link.title}, ${link.source},
          ${link.abstractAvailable}, ${link.fullTextAvailable}, ${link.exclusionReason},
          ${opts.sql.json(link.provenanceJson as never)}, ${link.linkRole},
          ${link.scientificRelation ?? null}, ${link.screeningDecision ?? null},
          ${link.supportingPassage ?? null}, ${link.studyContext ?? null},
          ${link.appraisalLimitations ?? null}, ${link.questionKey ?? null},
          ${link.identifierValidated ?? null}
        )
        on conflict (gap_id, question_key, pmid) where pmid is not null and question_key is not null
        do update set
          doi = excluded.doi,
          title = excluded.title,
          source = excluded.source,
          abstract_available = excluded.abstract_available,
          exclusion_reason = excluded.exclusion_reason,
          provenance_json = excluded.provenance_json,
          link_role = excluded.link_role,
          scientific_relation = excluded.scientific_relation,
          screening_decision = excluded.screening_decision,
          supporting_passage = excluded.supporting_passage,
          study_context = excluded.study_context,
          appraisal_limitations = excluded.appraisal_limitations,
          identifier_validated = excluded.identifier_validated
      `;
      linksUpserted += 1;
    } else if (link.doi) {
      await opts.sql`
        insert into public.research_gap_evidence_links (
          gap_id, pmid, doi, nct_id, title, source, abstract_available, full_text_available,
          exclusion_reason, provenance_json, link_role,
          scientific_relation, screening_decision, supporting_passage, study_context,
          appraisal_limitations, question_key, identifier_validated
        ) values (
          ${gapId}::uuid, ${link.pmid}, ${link.doi}, ${link.nctId}, ${link.title}, ${link.source},
          ${link.abstractAvailable}, ${link.fullTextAvailable}, ${link.exclusionReason},
          ${opts.sql.json(link.provenanceJson as never)}, ${link.linkRole},
          ${link.scientificRelation ?? null}, ${link.screeningDecision ?? null},
          ${link.supportingPassage ?? null}, ${link.studyContext ?? null},
          ${link.appraisalLimitations ?? null}, ${link.questionKey ?? null},
          ${link.identifierValidated ?? null}
        )
        on conflict (gap_id, question_key, doi) where doi is not null and question_key is not null
        do update set
          pmid = excluded.pmid,
          title = excluded.title,
          provenance_json = excluded.provenance_json,
          link_role = excluded.link_role,
          scientific_relation = excluded.scientific_relation,
          screening_decision = excluded.screening_decision,
          supporting_passage = excluded.supporting_passage,
          identifier_validated = excluded.identifier_validated
      `;
      linksUpserted += 1;
    }
  }

  const sci = opts.works.map((w) => w.scientific).filter(Boolean);
  await opts.sql`
    insert into public.research_gap_change_events (gap_id, event_type, detail, actor)
    values (
      ${gapId}::uuid, 'appraisal_sprint_persist',
      ${opts.sql.json(appraisalEventDetail(sci as never) as never)},
      'appraisal_sprint'
    )
  `;

  const after = await opts.sql`select count(*)::int as n from public.evidence_records`;
  const evidenceAfter = after[0]?.n ?? -1;
  if (evidenceAfter !== opts.evidenceBefore) {
    throw new Error(`evidence_count_drift before=${opts.evidenceBefore} after=${evidenceAfter}`);
  }
  return { gapId, linksUpserted, evidenceAfter };
}

function renderMarkdown(report: Record<string, unknown>): string {
  const register = report.candidateRegister as Array<Record<string, unknown>>;
  const disqualified = report.disqualified as Array<Record<string, unknown>>;
  const dossiers = report.dossiers as DossierSection[];
  const lines: string[] = [
    "# Discovery 3.0 — appraisal sprint report",
    "",
    `**Date:** ${report.generatedAt}`,
    `**Baseline tip:** ${report.baselineTip}`,
    `**Adapter mode:** ${report.adapterMode}`,
    "",
    "## Verdict",
    "",
    `- scientific_evidence_gap created: **${report.scientificEvidenceGapCreated}**`,
    `- research_opportunity created: **${report.researchOpportunityCreated}**`,
    `- Neon persistence: **${report.neonPersistence}**`,
    `- evidence_records count unchanged: **${report.evidenceCount}**`,
    `- E2E auth: **${report.e2eAuthBlocker}**`,
    "",
    "## Candidate register (≤5)",
    "",
  ];
  if (!register.length) {
    lines.push("_None qualified — see disqualified reasons._", "");
  }
  for (const c of register) {
    lines.push(
      `### ${c.gapKey}`,
      "",
      `- Class: \`${c.gapClass}\` / opportunity_status=\`${c.opportunityStatus}\``,
      `- Pilot: ${c.pilot}`,
      `- SME: ${c.smeHref}`,
      `- Dossier: ${c.dossierHref}`,
      `- identifierValidated=${c.identifierValidated}; scientificallyAppraised=${c.scientificallyAppraised}`,
      `- support=${c.support}; contradict=${c.contradict}; background=${c.background}`,
      "",
    );
  }
  lines.push("## Disqualified / not forced", "");
  for (const d of disqualified) {
    lines.push(`- **${d.gapKey}**: ${d.reason}`);
  }
  lines.push("", "## Dossier sections", "");
  for (const d of dossiers) {
    lines.push(
      `### ${d.gapKey}`,
      "",
      d.researchQuestion,
      "",
      `Why it matters: ${d.whyItMatters}`,
      "",
      `Coverage: ${JSON.stringify(d.coverage)}`,
      "",
      "| PMID | Relation | Screening | Passage |",
      "| --- | --- | --- | --- |",
    );
    for (const c of d.citations.slice(0, 8)) {
      const passage = String(c.supportingPassage).replace(/\|/g, "/").slice(0, 120);
      lines.push(
        `| ${c.pmid ?? c.doi ?? "—"} | ${c.scientificRelation} | ${c.screeningDecision} | ${passage} |`,
      );
    }
    lines.push("", `Honesty: ${d.appraisalHonesty}`, "");
  }
  lines.push(
    "## Policy",
    "",
    "- No invented PMIDs",
    "- No auto reviewed_opportunity / Gate C",
    "- Same PMID re-appraised per question",
    `- Max deep slots: ${OPPORTUNITY_SPRINT_POLICY.maxDeepOpportunities}`,
    "",
  );
  return lines.join("\n");
}

async function main() {
  // Opt-in live for this sprint when not explicitly stubbed.
  if (process.env.DISCOVERY_APPRAISAL_STUB !== "1") {
    process.env.DISCOVERY_LIVE_PUBMED ??= "1";
    process.env.DISCOVERY_LIVE_EUROPE_PMC ??= "1";
  }

  const baselineTip = "e626370";
  const e2ePresent = Boolean(
    process.env.E2E_USER_A_EMAIL?.trim() &&
      process.env.E2E_USER_A_PASSWORD &&
      process.env.E2E_USER_B_EMAIL?.trim() &&
      process.env.E2E_USER_B_PASSWORD,
  );

  const register: Array<Record<string, unknown>> = [];
  const disqualified: Array<Record<string, unknown>> = [];
  const dossiers: DossierSection[] = [];
  let scientificEvidenceGapCreated = 0;
  let researchOpportunityCreated = 0;
  let adapterMode = "stub";
  let neonPersistence = "skipped";
  let evidenceCount: number | null = null;
  let linksTotal = 0;

  const rawDb = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
  let sql: postgres.Sql | null = null;
  if (rawDb) {
    try {
      const u = new URL(rawDb);
      const prefix = hostPrefix(u.hostname);
      if (prefix === "ep-blue-salad") {
        sql = postgres(normalizeUrl(rawDb), { prepare: false, max: 1 });
      } else {
        neonPersistence = `skipped_host_${prefix}`;
      }
    } catch {
      neonPersistence = "skipped_unparsed_url";
    }
  } else {
    neonPersistence = "skipped_missing_database_url";
  }

  for (const spec of DEEP_RESEARCH_QUESTIONS) {
    if (register.length >= OPPORTUNITY_SPRINT_POLICY.maxDeepOpportunities) break;
    const retrieval = await retrieveForQuestion(spec);
    adapterMode = retrieval.mode;
    const appraisal = appraiseWorksForQuestion({
      questionKey: spec.gapKey,
      researchQuestion: spec.researchQuestion,
      works: retrieval.works,
      lexicon: spec.lexicon,
    });
    // Prefer ≥1 scientific_evidence_gap (not only opportunities / not only isi_curation_gap).
    const wantScientificGapOnly =
      scientificEvidenceGapCreated === 0 && researchOpportunityCreated === 0;
    const promotion = promoteFromAppraisal({
      spec,
      appraisal,
      ...(wantScientificGapOnly
        ? { rationale: "", noveltyNote: "", feasibilityNote: "" }
        : {}),
    });
    if (!promotion.qualify) {
      disqualified.push({
        gapKey: spec.gapKey,
        reason: promotion.reason,
        appraisalCounts: promotion.appraisalCounts,
        failedQueries: retrieval.failedQueries,
        hitCountKnown: retrieval.hitCountKnown,
      });
      continue;
    }

    if (promotion.gapClass === "scientific_evidence_gap") scientificEvidenceGapCreated += 1;
    if (promotion.gapClass === "research_opportunity") {
      researchOpportunityCreated += 1;
      // research_opportunity implies prior scientific evidence assessment
      scientificEvidenceGapCreated += 0;
    }

    const dossier = buildOpportunityDossierSection(promotion, appraisal);
    dossiers.push(dossier);

    let persistMeta: Record<string, unknown> = { persisted: false };
    if (sql) {
      try {
        const before = await sql`select count(*)::int as n from public.evidence_records`;
        const evidenceBefore = before[0]?.n ?? -1;
        evidenceCount = evidenceBefore;
        const result = await persistPlanToNeon({
          sql,
          gap: promotion.candidate,
          works: appraisal.works,
          queryText: spec.pubmedQuery,
          hitCount: appraisal.counts.retrieved,
          evidenceBefore,
        });
        linksTotal += result.linksUpserted;
        evidenceCount = result.evidenceAfter;
        neonPersistence = "applied";
        persistMeta = {
          persisted: true,
          gapId: result.gapId,
          linksUpserted: result.linksUpserted,
          evidenceCount: result.evidenceAfter,
        };
      } catch (err) {
        neonPersistence = `error:${err instanceof Error ? err.message.slice(0, 120) : "persist_failed"}`;
        persistMeta = { persisted: false, error: neonPersistence };
      }
    }

    register.push({
      gapKey: promotion.candidate.gapKey,
      gapClass: promotion.gapClass,
      opportunityStatus: promotion.opportunityStatus,
      pilot: promotion.candidate.pilot,
      title: promotion.candidate.title,
      smeHref: dossier.smeHref,
      dossierHref: dossier.dossierHref,
      identifierValidated: appraisal.counts.identifierValidated,
      scientificallyAppraised: appraisal.counts.scientificallyAppraised,
      support: appraisal.counts.support,
      contradict: appraisal.counts.contradict,
      background: appraisal.counts.background,
      reason: promotion.reason,
      ...persistMeta,
    });
  }

  if (sql) await sql.end({ timeout: 5 });

  const report = {
    generatedAt: new Date().toISOString(),
    baselineTip,
    adapterMode,
    liveFlags: {
      pubmed: process.env.DISCOVERY_LIVE_PUBMED === "1",
      europePmc: process.env.DISCOVERY_LIVE_EUROPE_PMC === "1",
    },
    scientificEvidenceGapCreated,
    researchOpportunityCreated,
    neonPersistence,
    evidenceCount,
    linksTotal,
    e2eAuthBlocker: e2ePresent
      ? "credentials_present"
      : "SKIP (not a pass): E2E_USER_A_* / E2E_USER_B_* missing — auth E2E unproven",
    candidateRegister: register,
    disqualified,
    dossiers,
    smeQueueUrls: register.map((c) => c.smeHref),
    policy: OPPORTUNITY_SPRINT_POLICY,
    honesty:
      "identifierValidated ≠ scientificallyAppraised. Shared PMID ≠ multi-support. No Gate C mass-approve. Opportunities remain unreviewed until SME.",
  };

  const jsonPath = resolve(process.cwd(), "docs/ISI_DISCOVERY_3_APPRAISAL_SPRINT_REPORT.json");
  const mdPath = resolve(process.cwd(), "docs/ISI_DISCOVERY_3_APPRAISAL_SPRINT_REPORT.md");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(mdPath, renderMarkdown(report));
  console.log(
    JSON.stringify(
      {
        wrote: [jsonPath, mdPath],
        scientificEvidenceGapCreated,
        researchOpportunityCreated,
        neonPersistence,
        evidenceCount,
        qualified: register.length,
        disqualified: disqualified.length,
        mode: adapterMode,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

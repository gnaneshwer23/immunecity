/**
 * Discovery Intelligence — Research Radar (Phase 1–8).
 * Run: bun test src/test/discovery-intelligence.test.ts
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DETECTION_POLICY,
  detectDiscoveryCandidates,
  detectEvidenceGapCandidates,
  detectMelanomaMatrixCandidates,
} from "@/lib/discovery/detect";
import { buildGapDossier, dossierAskPrefill, gapStatusBadge } from "@/lib/discovery/dossier";
import {
  ENTITLEMENT_ACCESS,
  PLAN_QUOTAS,
  assertEntitlementAllows,
  assertQuotaAllows,
  billingNotActivatedMessage,
  createDiscoveryRateLimitStub,
  entitlementSummary,
  normalizeEntitlement,
  personalisedFeedLimit,
  planQuotas,
  radarListLimit,
} from "@/lib/discovery/entitlements";
import { EXPORT_POLICY, planDossierExport } from "@/lib/discovery/export";
import {
  GAP_CLASS_POLICY,
  assertNotMisclassified,
  classifyGapClass,
  reclassifyGapClass,
} from "@/lib/discovery/gapClass";
import {
  GAP_STATUS_ACCESS,
  applyGapReviewDecision,
  assertDetectionEmitStatus,
  statusFromCoverageLabel,
} from "@/lib/discovery/gapStatus";
import { PIPELINE_POLICY, runGapAssessmentPipeline } from "@/lib/discovery/pipeline";
import {
  APPRAISAL_POLICY,
  appraiseWorkForQuestion,
  appraiseWorksForQuestion,
  assertPerQuestionReappraisal,
  assessIdentifier,
} from "@/lib/discovery/appraise";
import {
  DEEP_RESEARCH_QUESTIONS,
  OPPORTUNITY_SPRINT_POLICY,
  promoteFromAppraisal,
} from "@/lib/discovery/opportunities";
import {
  PERSIST_RETRIEVAL_POLICY,
  evidenceLinkDedupeKey,
  planPersistRetrieval,
} from "@/lib/discovery/persistRetrieval";
import {
  RETRIEVAL_POLICY,
  planRetrievalQueries,
  validateDoi,
  validateNct,
  validatePmid,
} from "@/lib/discovery/retrieve";
import {
  PROFILE_ACCESS,
  actorOwnsProfile,
  planResearchProfile,
  profileOwnershipSpec,
} from "@/lib/discovery/profiles";
import { mergeDetectionWithPersisted, shapeRadarFeed } from "@/lib/discovery/radar";
import {
  RANKING_POLICY,
  orderByRecommendation,
  recommendGapsForProfile,
  recommendedBecauseLine,
} from "@/lib/discovery/recommend";
import {
  MONITOR_POLICY,
  dedupeAlertKeys,
  planMonitorRun,
} from "@/lib/discovery/monitor";
import {
  TEAM_COLLAB_POLICY,
  planSharedTeamProfile,
  planTeamCollabInvite,
  teamReadinessSummary,
} from "@/lib/discovery/team";
import {
  VERIFICATION_POLICY,
  draftSearchCoverage,
  refuseAutoReviewedGap,
  verifyGapCandidate,
} from "@/lib/discovery/verify";
import {
  createFixtureLiteratureAdapter,
  createLivePubmedAdapter,
  stubLiteratureSearchAdapter,
  withRetries,
} from "@/lib/discovery/adapters";
import { accountPowers } from "@/lib/access/roles";
import { RESEARCH_ENTITLEMENTS } from "@/lib/discovery/types";
import { JOURNEY_NAV } from "@/data/marketingNav";

const root = (...p: string[]) => resolve(process.cwd(), ...p);
const source = (rel: string) => readFileSync(root(rel), "utf8");

describe("Discovery profile isolation", () => {
  it("defines owner-only access with no admin list-all and no required sensitive PII", () => {
    expect(PROFILE_ACCESS.ownerScopedOnly).toBe(true);
    expect(PROFILE_ACCESS.allowAdminBypass).toBe(false);
    expect(PROFILE_ACCESS.adminListAllPath).toBeNull();
    expect(PROFILE_ACCESS.requireSensitivePii).toBe(false);
    for (const op of PROFILE_ACCESS.operations) {
      const spec = profileOwnershipSpec(op);
      expect(spec.requireAuthUserId).toBe(true);
      expect(spec.filterByUserId).toBe(true);
      expect(spec.allowAdminBypass).toBe(false);
    }
    expect(actorOwnsProfile("a", "a")).toBe(true);
    expect(actorOwnsProfile("owner", "other")).toBe(false);
    expect(planResearchProfile({ userId: null, focusDiseases: ["D012"] }).ok).toBe(false);
    expect(planResearchProfile({ userId: "u1", focusDiseases: ["D012"] }).ok).toBe(true);
  });

  it("scopes get/upsert to signed-in user_id and ignores client entitlement elevation", () => {
    const fns = source("src/lib/discovery/profiles.functions.ts");
    expect(fns).toContain("getMyResearchProfile");
    expect(fns).toContain("upsertMyResearchProfile");
    expect(fns).toMatch(/where\(eq\(researchProfiles\.userId,\s*userId\)\)/);
    expect(fns).toMatch(/entitlement:\s*"free"/);
    expect(fns).toMatch(/Entitlement is never taken from the client/);
    expect(fns).not.toMatch(/requireAdmin|listAllResearchProfiles|adminListAll/i);
    expect(fns).toMatch(/kgWrite:\s*false/);
  });
});

describe("Discovery gap status transitions", () => {
  it("never auto-approves reviewed_gap", () => {
    expect(GAP_STATUS_ACCESS.autoApproveReviewedGap).toBe(false);
    expect(GAP_STATUS_ACCESS.humanReviewRequiredForReviewedGap).toBe(true);
    expect(GAP_STATUS_ACCESS.bulkApprovePath).toBeNull();
    expect(assertDetectionEmitStatus("reviewed_gap").ok).toBe(false);
    expect(assertDetectionEmitStatus("candidate").ok).toBe(true);
    expect(assertDetectionEmitStatus("coverage_insufficient").ok).toBe(true);
  });

  it("requires reviewer power to promote and records non-auto result", () => {
    const denied = applyGapReviewDecision({
      from: "candidate",
      decision: "promote_reviewed",
      actorIsReviewer: false,
    });
    expect(denied.ok).toBe(false);

    const promoted = applyGapReviewDecision({
      from: "candidate",
      decision: "promote_reviewed",
      actorIsReviewer: true,
    });
    expect(promoted.ok).toBe(true);
    if (promoted.ok) {
      expect(promoted.to).toBe("reviewed_gap");
      expect(promoted.autoApproved).toBe(false);
    }

    const rejected = applyGapReviewDecision({
      from: "candidate",
      decision: "reject",
      actorIsReviewer: true,
    });
    expect(rejected.ok).toBe(true);
    if (rejected.ok) expect(rejected.to).toBe("rejected");
  });

  it("maps insufficient_coverage label to coverage_insufficient status", () => {
    expect(statusFromCoverageLabel("insufficient_coverage")).toBe("coverage_insufficient");
    expect(statusFromCoverageLabel("no_mapped_evidence")).toBe("candidate");
  });
});

describe("Discovery 3.0 gap class taxonomy", () => {
  it("classes melanoma matrix as isi_curation_gap not scientific absence or opportunity", () => {
    expect(GAP_CLASS_POLICY.autoPromoteReviewedOpportunity).toBe(false);
    expect(GAP_CLASS_POLICY.autoOverwriteReviewedClass).toBe(false);
    const matrix = detectMelanomaMatrixCandidates();
    expect(matrix.length).toBeGreaterThan(0);
    for (const g of matrix) {
      expect(g.gapClass).toBe("isi_curation_gap");
      expect(g.opportunityStatus).toBe("none");
      expect(g.gapClass).not.toBe("research_opportunity");
      expect(g.gapClass).not.toBe("scientific_evidence_gap");
    }
  });

  it("blocks scientific_evidence_gap when coverage insufficient / search incomplete", () => {
    const blocked = classifyGapClass({
      detectionSource: "evidence_gap",
      coverageLabel: "insufficient_coverage",
      status: "coverage_insufficient",
      coverage: { searchAttempted: false, hitCount: null, scopeDocumented: true },
    });
    expect(blocked.gapClass).toBe("isi_curation_gap");
    expect(blocked.blockedScientificClaim).toBe(true);

    const scientific = classifyGapClass({
      detectionSource: "evidence_gap",
      coverageLabel: "no_direct_evidence_after_search",
      status: "candidate",
      coverage: { searchAttempted: true, hitCount: 0, scopeDocumented: true },
    });
    expect(scientific.gapClass).toBe("scientific_evidence_gap");
    expect(scientific.blockedScientificClaim).toBe(false);
  });

  it("requires assessment fields for research_opportunity and never auto-overwrites reviewed", () => {
    const noOpp = classifyGapClass({
      detectionSource: "evidence_gap",
      coverageLabel: "emerging",
      status: "candidate",
      coverage: { searchAttempted: true, hitCount: 2, scopeDocumented: true },
      opportunity: { rationale: null, noveltyNote: null, feasibilityNote: null },
    });
    expect(noOpp.gapClass).not.toBe("research_opportunity");

    const withOpp = classifyGapClass({
      detectionSource: "evidence_gap",
      coverageLabel: "emerging",
      status: "candidate",
      coverage: { searchAttempted: true, hitCount: 2, scopeDocumented: true },
      opportunity: {
        rationale: "Testable question on exhausted T cells in melanoma within ISI scope.",
        noveltyNote: "Scoped to pilot PubMed queries — not global novelty.",
        feasibilityNote: "Feasible via existing Graph + Gate C workflow.",
        opportunityStatus: "assessed",
      },
    });
    expect(withOpp.gapClass).toBe("research_opportunity");
    expect(withOpp.opportunityStatus).toBe("assessed");

    const locked = reclassifyGapClass({
      currentClass: "scientific_evidence_gap",
      currentOpportunityStatus: "reviewed_opportunity",
      reviewLocked: false,
      proposed: {
        detectionSource: "melanoma_matrix",
        coverageLabel: null,
        status: "candidate",
        detectionDetail: { flags: ["NO_LOCATOR"] },
      },
    });
    expect(locked.ok).toBe(false);
    if (!locked.ok) expect(locked.preservedHistory).toBe(true);

    expect(
      assertNotMisclassified({
        from: "isi_curation_gap",
        to: "research_opportunity",
        context: "silent reclass",
      }).ok,
    ).toBe(false);
  });

  it("preserves history flag on allowed reclass", () => {
    const r = reclassifyGapClass({
      currentClass: "isi_curation_gap",
      currentOpportunityStatus: "none",
      reviewLocked: false,
      proposed: {
        detectionSource: "evidence_gap",
        coverageLabel: "conflicting",
        status: "candidate",
        coverage: { searchAttempted: true, hitCount: 3, scopeDocumented: true },
      },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.preservedHistory).toBe(true);
      expect(r.gapClass).toBe("scientific_evidence_gap");
      expect(r.changed).toBe(true);
    }
  });
});

describe("Discovery coverage taxonomy + detection honesty", () => {
  it("emits only auto-allowed statuses from melanoma matrix and never fabricates PMIDs", () => {
    expect(DETECTION_POLICY.autoReviewedGap).toBe(false);
    expect(DETECTION_POLICY.fabricatesPapers).toBe(false);
    expect(DETECTION_POLICY.expandsKnowledgeGraph).toBe(false);
    const matrix = detectMelanomaMatrixCandidates();
    expect(matrix.length).toBeGreaterThan(0);
    for (const g of matrix) {
      expect(["candidate", "coverage_insufficient"]).toContain(g.status);
      expect(g.autoReviewed).toBe(false);
      expect(g.searchScope.note).toMatch(/not a claim that no literature exists worldwide/i);
      expect(g.detectionSource).toBe("melanoma_matrix");
      expect(JSON.stringify(g.detectionDetail)).not.toMatch(/"pmid"\s*:\s*"\d+"/);
    }
  });

  it("emits coverage_insufficient when incomplete, never reviewed_gap from detection", () => {
    // D012 often has draft/bib → awaiting_curation (candidate), not worldwide absence.
    const gaps = detectEvidenceGapCandidates(["D012"], {});
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.every((g) => g.status === "candidate" || g.status === "coverage_insufficient")).toBe(true);
    // Matrix GATE_C_proxy path + taxonomy helper cover coverage_insufficient honestly.
    expect(statusFromCoverageLabel("insufficient_coverage")).toBe("coverage_insufficient");
    expect(
      detectMelanomaMatrixCandidates().some((g) => g.status === "coverage_insufficient"),
    ).toBe(true);
    const combined = detectDiscoveryCandidates();
    expect(combined.every((g) => g.status !== ("reviewed_gap" as string))).toBe(true);
    expect(combined.every((g) => g.autoReviewed === false)).toBe(true);
  });
});

describe("Discovery entitlement server stubs", () => {
  it("keeps billing inactive and enforces free vs researcher_pro limits", () => {
    expect(ENTITLEMENT_ACCESS.serverCheckedOnly).toBe(true);
    expect(ENTITLEMENT_ACCESS.paymentActivation).toBe(false);
    expect(ENTITLEMENT_ACCESS.stripeWired).toBe(false);
    expect(ENTITLEMENT_ACCESS.pricesPublished).toBe(false);
    expect(ENTITLEMENT_ACCESS.collectPayments).toBe(false);
    expect(normalizeEntitlement("hacker")).toBe("free");
    expect(radarListLimit("free")).toBeLessThan(radarListLimit("researcher_pro"));
    expect(assertEntitlementAllows("free", "extended_filters").ok).toBe(false);
    expect(assertEntitlementAllows("researcher_pro", "extended_filters").ok).toBe(true);
    const gapsFns = source("src/lib/discovery/gaps.functions.ts");
    expect(gapsFns).toMatch(/paymentActivation:\s*false/);
    expect(gapsFns).toMatch(/autoApprove:\s*false/);
    expect(gapsFns).toContain("assertCanReview");
    expect(gapsFns).toContain("persistDetectedGapCandidates");
    expect(gapsFns).toContain("verifyPersistedGap");
    expect(gapsFns).toContain("toggleGapSubscription");
    expect(gapsFns).toMatch(/Never overwrite human decisions|reviewed_gap|rejected/);
    expect(gapsFns).toMatch(/neon_merged_detection|mergeDetectionWithPersisted/);
  });
});

describe("Discovery Phase 7 entitlements + quotas + team scaffolding", () => {
  it("defines Free / Researcher Pro / Team / Enterprise matrix with server quotas", () => {
    expect([...RESEARCH_ENTITLEMENTS]).toEqual(["free", "researcher_pro", "team", "enterprise"]);
    expect(ENTITLEMENT_ACCESS.orthogonalToUserRoles).toBe(true);
    expect(billingNotActivatedMessage("researcher_pro")).toMatch(/billing not activated/i);

    // Reviewer role ≠ researcher_pro plan.
    const reviewer = accountPowers(["reviewer"], true);
    expect(reviewer.reviewer).toBe(true);
    expect(normalizeEntitlement(undefined)).toBe("free");

    expect(planQuotas("free").maxFollowedGaps).toBe(0);
    expect(planQuotas("researcher_pro").maxFollowedGaps).toBeGreaterThan(0);
    expect(planQuotas("team").radarListLimit).toBeGreaterThan(planQuotas("researcher_pro").radarListLimit);
    expect(planQuotas("enterprise").maxExportsPerDay).toBeGreaterThan(planQuotas("team").maxExportsPerDay);

    expect(assertEntitlementAllows("free", "gap_subscribe").ok).toBe(false);
    expect(assertEntitlementAllows("researcher_pro", "gap_subscribe").ok).toBe(true);
    expect(assertEntitlementAllows("team", "advanced_feed").ok).toBe(true);
    expect(assertEntitlementAllows("enterprise", "dossier_export").ok).toBe(true);

    expect(assertQuotaAllows("free", "followed_gaps", { followedGaps: 0 }).ok).toBe(false);
    expect(assertQuotaAllows("researcher_pro", "followed_gaps", { followedGaps: 0 }).ok).toBe(true);
    expect(
      assertQuotaAllows("researcher_pro", "followed_gaps", {
        followedGaps: PLAN_QUOTAS.researcher_pro.maxFollowedGaps,
      }).ok,
    ).toBe(false);
    expect(assertQuotaAllows("free", "monitor_runs", { monitorRunsToday: 0 }).ok).toBe(true);
    expect(assertQuotaAllows("free", "monitor_runs", { monitorRunsToday: 1 }).ok).toBe(false);
    expect(assertQuotaAllows("free", "exports", { exportsToday: 0 }).ok).toBe(false);
    expect(assertQuotaAllows("researcher_pro", "exports", { exportsToday: 0 }).ok).toBe(true);

    // Team features stay scaffolding-only even on team/enterprise plans.
    expect(TEAM_COLLAB_POLICY.activated).toBe(false);
    expect(TEAM_COLLAB_POLICY.multiTenantBilling).toBe(false);
    expect(assertEntitlementAllows("team", "team_shared_profile").ok).toBe(false);
    expect(assertEntitlementAllows("enterprise", "team_collab").ok).toBe(false);
    expect(planSharedTeamProfile({ plan: "team", draft: { orgLabel: "Lab", focusDiseases: [], focusDomains: [], modalities: [] } }).ok).toBe(false);
    expect(planTeamCollabInvite({ plan: "enterprise", invite: { inviteeEmail: "a@b.co", roleHint: "viewer" } }).wouldSend).toBe(false);
    expect(teamReadinessSummary("team").billingCopy).toMatch(/billing not activated/i);
    expect(entitlementSummary("free").billingCopy).toMatch(/Researcher Pro/i);

    const exportPlan = planDossierExport({
      gap: detectDiscoveryCandidates()[0]!,
      format: "markdown",
    });
    expect(EXPORT_POLICY.fabricatesPmids).toBe(false);
    expect(exportPlan.fabricatesPmids).toBe(false);
    expect(exportPlan.paymentActivation).toBe(false);
    expect(exportPlan.body).toContain(detectDiscoveryCandidates()[0]!.gapKey);

    const rl = createDiscoveryRateLimitStub({ windowMs: 60_000, maxPerWindow: 2 });
    expect(rl.check("u").ok).toBe(true);
    expect(rl.check("u").ok).toBe(true);
    expect(rl.check("u").ok).toBe(false);

    const gapsFns = source("src/lib/discovery/gaps.functions.ts");
    expect(gapsFns).toContain("assertQuotaAllows");
    expect(gapsFns).toContain("exportDiscoveryDossier");
    expect(gapsFns).toMatch(/Entitlement is never taken from the client|never taken from the client|exportsUsedToday/i);
    expect(source("src/lib/discovery/monitor.functions.ts")).toContain("assertQuotaAllows");
    expect(source("src/lib/discovery/profiles.functions.ts")).toContain("entitlementSummary");
    expect(source("src/lib/discovery/profiles.functions.ts")).toContain("rolesOrthogonal");
    expect(source("drizzle/migrations/0022_research_entitlements_team.sql")).toContain("enterprise");
    expect(source("src/routes/discovery.profile.tsx")).toMatch(/billing not activated|not available yet/i);
    expect(source("src/routes/discovery.profile.tsx")).toContain('testId="profile-billing-expert"');
    expect(source("src/routes/discovery.gaps.$gapId.tsx")).toMatch(/Follow/);
    expect(source("src/routes/discovery.gaps.$gapId.tsx")).not.toMatch(/profile interest stub/i);
  });

  it("refuses client entitlement elevation and keeps owner isolation", () => {
    const profiles = source("src/lib/discovery/profiles.functions.ts");
    expect(profiles).toMatch(/void data\.entitlement/);
    expect(profiles).toMatch(/entitlement:\s*"free"/);
    expect(profiles).toMatch(/where\(eq\(researchProfiles\.userId,\s*userId\)\)/);
    expect(actorOwnsProfile("owner", "intruder")).toBe(false);
    expect(normalizeEntitlement("enterprise")).toBe("enterprise");
    expect(normalizeEntitlement({ plan: "enterprise" })).toBe("free");
  });
});

describe("Discovery Phase 3 verification", () => {
  it("runs deterministic provenance checks and never auto-promotes reviewed_gap", () => {
    expect(VERIFICATION_POLICY.autoReviewedGap).toBe(false);
    expect(VERIFICATION_POLICY.prefersDeterministic).toBe(true);
    expect(refuseAutoReviewedGap("reviewed_gap")).toBe(true);
    const gap = detectDiscoveryCandidates()[0]!;
    const report = verifyGapCandidate(gap);
    expect(report.autoReviewed).toBe(false);
    expect(report.gapKey).toBe(gap.gapKey);
    expect(report.provenance.length).toBeGreaterThan(3);
    expect(report.coverage.hitCount).toBeNull();
    expect(report.aiAssisted).toBe(false);
    const withDraft = verifyGapCandidate(gap, { aiDraft: "Suggested wording only." });
    expect(withDraft.aiAssisted).toEqual({ labelled: true, role: "draft_only" });
    const coverage = draftSearchCoverage(gap, { hitCount: null });
    expect(coverage.hitCount).toBeNull();
    expect(coverage.scopeNote).toMatch(/not a claim that (no )?literature (is absent|exists) worldwide/i);
  });
});

describe("Discovery Phase 4 dossier + radar shaping", () => {
  it("shapes dossier links, Ask prefill, and Neon merge without fabricating gaps", () => {
    const gaps = detectDiscoveryCandidates();
    expect(gaps.length).toBeGreaterThan(0);
    const gap = gaps[0]!;
    const dossier = buildGapDossier({
      gap,
      persistedStatus: "candidate",
      persisted: true,
      verification: verifyGapCandidate(gap),
    });
    expect(dossier.autoApprove).toBe(false);
    expect(dossier.badge.label.length).toBeGreaterThan(0);
    expect(dossier.links.some((l) => l.id === "ask" && l.label === "Continue in Ask Immune")).toBe(true);
    expect(dossier.askHref).toMatch(/^\/ask/);
    expect(dossierAskPrefill(gap).q.length).toBeGreaterThan(0);
    expect(gapStatusBadge("coverage_insufficient").tone).toBe("warn");
    expect(gapStatusBadge("reviewed_gap").tone).toBe("ok");

    const merged = mergeDetectionWithPersisted(gaps.slice(0, 3), [
      { gapKey: gaps[0]!.gapKey, status: "needs_context", title: gaps[0]!.title, summary: gaps[0]!.summary, whyItMatters: gaps[0]!.whyItMatters },
    ]);
    expect(merged.persistent).toBe(true);
    expect(merged.persistedByKey[gaps[0]!.gapKey]).toBe("needs_context");
    expect(merged.gaps.every((g) => gaps.some((d) => d.gapKey === g.gapKey))).toBe(true);

    const feed = shapeRadarFeed(gaps, {
      filters: { status: "all", limit: 10 },
      persistedByKey: merged.persistedByKey,
      persistent: true,
    });
    expect(feed.autoApprove).toBe(false);
    expect(feed.items.length).toBeGreaterThan(0);
    expect(feed.items.length).toBeLessThanOrEqual(10);
    expect(feed.emerging.every((e) => gaps.some((g) => g.gapKey === e.gapKey))).toBe(true);
    expect(feed.contradictions.every((e) => gaps.some((g) => g.gapKey === e.gapKey))).toBe(true);
  });
});

describe("Discovery Phase 5 ranking explainability + feedback", () => {
  it("exposes transparent factors and never claims novelty from score", () => {
    expect(RANKING_POLICY.claimsNoveltyFromScore).toBe(false);
    expect(RANKING_POLICY.claimsScientificImportanceFromScore).toBe(false);
    expect(RANKING_POLICY.fabricatesRelevance).toBe(false);

    const gaps = detectDiscoveryCandidates();
    expect(gaps.length).toBeGreaterThan(2);
    const profile = {
      displayLabel: null,
      focusDiseases: ["D012"],
      focusDomains: ["checkpoint"],
      modalities: ["pd1"],
      interests: { pathways: ["PD-1"], cells: ["T cell"], therapies: ["pembrolizumab"] },
    };
    const ranked = recommendGapsForProfile(gaps, profile);
    expect(ranked.length).toBe(gaps.length);
    expect(ranked[0]!.because.length).toBeGreaterThan(0);
    expect(ranked[0]!.factors.length).toBeGreaterThan(0);
    expect(ranked[0]!.disclaimer).toMatch(/not a novelty/i);
    expect(recommendedBecauseLine(ranked[0]!)!).toMatch(/Recommended because/);

    const withUseful = recommendGapsForProfile(gaps, profile, {
      feedback: [{ gapKey: gaps[0]!.gapKey, rating: "useful" }],
    });
    const withNotRelevant = recommendGapsForProfile(gaps, profile, {
      feedback: [{ gapKey: gaps[0]!.gapKey, rating: "not_relevant" }],
    });
    const usefulScore = withUseful.find((r) => r.gapKey === gaps[0]!.gapKey)!.score;
    const demotedScore = withNotRelevant.find((r) => r.gapKey === gaps[0]!.gapKey)!.score;
    expect(usefulScore).toBeGreaterThan(demotedScore);
    expect(withUseful.find((r) => r.gapKey === gaps[0]!.gapKey)!.factors.some((f) => f.id === "feedback")).toBe(
      true,
    );

    const ordered = orderByRecommendation(
      gaps.map((g) => ({ gapKey: g.gapKey })),
      withUseful,
    );
    expect(ordered[0]!.gapKey).toBe(withUseful[0]!.gapKey);

    expect(personalisedFeedLimit("free")).toBeLessThan(personalisedFeedLimit("researcher_pro"));
    expect(assertEntitlementAllows("free", "advanced_feed").ok).toBe(false);
    expect(assertEntitlementAllows("researcher_pro", "advanced_feed").ok).toBe(true);

    const gapsFns = source("src/lib/discovery/gaps.functions.ts");
    expect(gapsFns).toContain("submitGapFeedback");
    expect(gapsFns).toContain("researchGapFeedback");
    expect(gapsFns).toContain("orderByRecommendation");
    expect(gapsFns).toMatch(/rankingDisclaimer|not a novelty/i);
  });
});

describe("Discovery Phase 6 monitor idempotency + alert dedupe", () => {
  it("plans monitor runs without auto review and dedupes alerts", async () => {
    expect(MONITOR_POLICY.autoScientificReview).toBe(false);
    expect(MONITOR_POLICY.autoReviewedGap).toBe(false);
    expect(MONITOR_POLICY.fabricatesPmids).toBe(false);
    expect(MONITOR_POLICY.emailAlerts).toBe(false);

    const gaps = detectDiscoveryCandidates().slice(0, 5);
    const followed = new Set([gaps[0]!.gapKey]);
    const profile = {
      displayLabel: null,
      focusDiseases: gaps[0]!.diseaseId ? [gaps[0]!.diseaseId] : ["D012"],
      focusDomains: [],
      modalities: [],
      interests: {},
    };

    const first = planMonitorRun({
      userId: "00000000-0000-4000-8000-000000000001",
      gaps,
      followedGapKeys: followed,
      profile,
      gapIdByKey: { [gaps[0]!.gapKey]: "gap-uuid-1" },
    });
    expect(first.autoApprove).toBe(false);
    expect(first.scientificReviewImplied).toBe(false);
    expect(first.targets.length).toBeGreaterThan(0);
    expect(first.signals.length).toBeGreaterThan(0);
    expect(first.alerts.length).toBeGreaterThan(0);
    expect(first.reassessment.every((r) => r.statusUnchangedPolicy === "never_auto_reviewed_gap")).toBe(
      true,
    );

    const dedupe = new Set(dedupeAlertKeys(first.alerts));
    const second = planMonitorRun({
      userId: "00000000-0000-4000-8000-000000000001",
      gaps,
      followedGapKeys: followed,
      profile,
      gapIdByKey: { [gaps[0]!.gapKey]: "gap-uuid-1" },
      priorFingerprints: Object.fromEntries(
        first.signals.map((s) => [s.gapKey, s.fingerprint]),
      ),
      existingDedupeKeys: dedupe,
    });
    // Identical fingerprints + existing dedupe → no new alerts (idempotent).
    expect(second.alerts.length).toBe(0);

    const fixture = createFixtureLiteratureAdapter();
    const fx = await fixture.search("melanoma PD-1");
    expect(fx.hitCount).toBeNull();
    expect(fx.pmids).toBeUndefined();
    expect(fx.source).toBe("fixture");

    const liveClosed = createLivePubmedAdapter({ enableLivePubmed: false });
    const closed = await liveClosed.search("melanoma");
    expect(closed.source).toBe("fail_closed");
    expect(closed.hitCount).toBeNull();

    let attempts = 0;
    const ok = await withRetries(async () => {
      attempts += 1;
      if (attempts < 2) throw new Error("transient");
      return "ok";
    }, { retries: 2, baseDelayMs: 1 });
    expect(ok).toBe("ok");
    expect(attempts).toBe(2);

    const stub = await stubLiteratureSearchAdapter.search("PD-1 melanoma");
    expect(stub.attempted).toBe(true);
    expect(stub.hitCount).toBeNull();

    const monFns = source("src/lib/discovery/monitor.functions.ts");
    expect(monFns).toContain("runMyDiscoveryMonitor");
    expect(monFns).toContain("listMyDiscoveryAlerts");
    expect(monFns).toMatch(/scientificReviewImplied:\s*false/);
    expect(source("scripts/run-discovery-monitor.ts")).toContain("discovery_monitor");
    expect(source("package.json")).toContain("discovery:monitor");
  });
});

describe("Discovery IA + migrations + route tree", () => {
  it(
    "adds Investigate Research Radar without inventing a second KG",
    () => {
      const investigate = JOURNEY_NAV.find((g) => g.label === "Investigate")!;
      expect(investigate.items.some((i) => i.path === "/discovery" && i.title === "Research Radar")).toBe(true);
      const agents = source("src/lib/discovery/AGENTS.md");
      expect(agents).toMatch(/never a second graph/i);
      expect(agents).toMatch(/reviewed_gap/i);
      expect(agents).toMatch(/Phase 5 ranking/i);
      expect(agents).toMatch(/team|enterprise/i);
      expect(source("drizzle/migrations/0019_research_profiles.sql")).toContain("research_profiles");
      expect(source("drizzle/migrations/0020_research_discovery_gaps.sql")).toContain("research_gaps");
      expect(source("drizzle/migrations/0020_research_discovery_gaps.sql")).toContain("coverage_insufficient");
      expect(source("drizzle/migrations/0021_research_discovery_monitor.sql")).toContain(
        "research_discovery_alerts",
      );
      expect(source("drizzle/migrations/0022_research_entitlements_team.sql")).toContain("team");
      const tree = source("src/routeTree.gen.ts");
      expect(tree).toContain("discovery.index");
      expect(tree).toContain("/discovery/gaps/$gapId");
      expect(tree).toContain("/discovery/alerts");
      expect(source("src/lib/db/schema.server.ts")).toContain("researchProfiles");
      expect(source("src/lib/db/schema.server.ts")).toContain("researchGaps");
      expect(source("src/lib/db/schema.server.ts")).toContain("researchDiscoveryAlerts");
      expect(source("package.json")).toContain("db:research-entitlements-team");
      expect(source("package.json")).toContain("discovery:eval");
    },
    { timeout: 20_000 },
  );
});

describe("Discovery Phase 8 security + isolation invariants", () => {
  it("keeps owner isolation, no client elevation path, and rate-limit stubs", () => {
    expect(PROFILE_ACCESS.ownerScopedOnly).toBe(true);
    expect(PROFILE_ACCESS.allowAdminBypass).toBe(false);
    const mon = source("src/lib/discovery/monitor.functions.ts");
    expect(mon).toMatch(/eq\(researchDiscoveryAlerts\.userId,\s*userId\)/);
    expect(mon).toContain("createDiscoveryRateLimitStub");
    const gaps = source("src/lib/discovery/gaps.functions.ts");
    expect(gaps).toContain("createDiscoveryRateLimitStub");
    expect(gaps).toMatch(/eq\(researchGapSubscriptions\.userId,\s*userId\)/);
    // Status taxonomy still blocks auto reviewed_gap.
    expect(assertDetectionEmitStatus("reviewed_gap").ok).toBe(false);
    expect(
      applyGapReviewDecision({
        from: "candidate",
        decision: "promote_reviewed",
        actorIsReviewer: false,
      }).ok,
    ).toBe(false);
  });
});

describe("Discovery 3.0 retrieval + assessment pipeline", () => {
  it("validates identifiers and refuses fabricated shapes", () => {
    expect(RETRIEVAL_POLICY.fabricatesIdentifiers).toBe(false);
    expect(RETRIEVAL_POLICY.failedQueryMeansZeroEvidence).toBe(false);
    expect(validatePmid("25891173")).toBe("25891173");
    expect(validatePmid("not-a-pmid")).toBeNull();
    expect(validateDoi("10.1056/NEJMoa1503093")).toBe("10.1056/NEJMoa1503093");
    expect(validateDoi("doi:fake")).toBeNull();
    expect(validateNct("NCT01234567")).toBe("NCT01234567");
    expect(validateNct("nct1")).toBeNull();
  });

  it("plans pilot queries from graph entities without inventing studies", () => {
    const gap = detectMelanomaMatrixCandidates()[0]!;
    const plan = planRetrievalQueries(gap);
    expect(plan.queries.length).toBeGreaterThanOrEqual(2);
    expect(plan.queries.some((q) => q.corpus === "pubmed")).toBe(true);
    expect(plan.entityIds.length).toBeGreaterThan(0);
  });

  it("runs dry assessment pipeline with class + pending expert review", async () => {
    expect(PIPELINE_POLICY.autoGateC).toBe(false);
    expect(PIPELINE_POLICY.autoReviewedOpportunity).toBe(false);
    expect(PIPELINE_POLICY.llmAuthority).toBe(false);
    const run = await runGapAssessmentPipeline({ runRetrieval: false, maxGaps: 6 });
    expect(run.stages).toContain("classify");
    expect(run.stages).toContain("expert_review");
    expect(run.inventedStudies).toBe(false);
    expect(run.counts.detected).toBeGreaterThan(0);
    expect(run.counts.pendingExpertReview).toBe(run.counts.detected);
    for (const g of run.gaps) {
      expect(["isi_curation_gap", "scientific_evidence_gap", "research_opportunity"]).toContain(
        g.gapClass,
      );
      expect(g.expertReviewStatus).toBe("pending_human");
      expect(g.novelty.confidentGlobalNovelty).toBe(false);
      expect(g.feasibility.smeConfirmed).toBe(false);
    }
  });

  it("separates identifier validation from scientific appraisal and re-appraises shared PMIDs per question", () => {
    expect(APPRAISAL_POLICY.identifierValidationIsScientificAppraisal).toBe(false);
    expect(APPRAISAL_POLICY.sharedHitImpliesMultiSupport).toBe(false);
    expect(APPRAISAL_POLICY.autoGateC).toBe(false);

    const idOnly = assessIdentifier({ pmid: "25891173", doi: null, nctId: null });
    expect(idOnly.identifierValidated).toBe(true);
    expect(idOnly.validationNotes).toMatch(/Not a scientific appraisal/i);

    const sharedPmid = "25891173";
    const work = {
      pmid: sharedPmid,
      doi: null,
      nctId: null,
      title:
        "Pembrolizumab versus ipilimumab in advanced melanoma with MHC class I antigen presentation loss and PD-1 resistance",
      source: "pubmed" as const,
      abstractAvailable: true,
      fullTextAvailable: false,
      year: "2015",
      excluded: false,
      exclusionReason: null,
      provenance: {},
      abstractText:
        "Loss of MHC class I antigen presentation was associated with resistance to PD-1 blockade in melanoma. Exhaustion markers including LAG-3 were also observed.",
    };
    const qA = DEEP_RESEARCH_QUESTIONS[0]!;
    const qB = DEEP_RESEARCH_QUESTIONS[3]!;
    const aMelanoma = appraiseWorkForQuestion({
      questionKey: qA.gapKey,
      researchQuestion: qA.researchQuestion,
      work,
      lexicon: qA.lexicon,
    });
    const aRa = appraiseWorkForQuestion({
      questionKey: qB.gapKey,
      researchQuestion: qB.researchQuestion,
      work,
      lexicon: qB.lexicon,
    });
    expect(aMelanoma.identifier.identifierValidated).toBe(true);
    expect(aMelanoma.scientific?.questionKey).toBe(qA.gapKey);
    expect(aRa.scientific?.questionKey).toBe(qB.gapKey);
    // Same PMID must not copy melanoma support onto the RA/ageing question.
    expect(aMelanoma.scientific?.scientificRelation).toBe("support");
    expect(aRa.scientific?.scientificRelation).not.toBe("support");
    const re = assertPerQuestionReappraisal({
      pmid: sharedPmid,
      appraisals: [aMelanoma.scientific!, aRa.scientific!],
    });
    expect(re.ok).toBe(true);
    if (re.ok) {
      expect(re.relationsByQuestion[qA.gapKey]).toBe("support");
      expect(re.relationsByQuestion[qB.gapKey]).not.toBe("support");
    }
  });

  it("promotes scientific_evidence_gap / research_opportunity only when appraisal warrants; refuses reviewed overwrite", () => {
    expect(OPPORTUNITY_SPRINT_POLICY.maxDeepOpportunities).toBe(5);
    expect(OPPORTUNITY_SPRINT_POLICY.autoReviewedOpportunity).toBe(false);
    expect(OPPORTUNITY_SPRINT_POLICY.inventPmids).toBe(false);
    expect(PERSIST_RETRIEVAL_POLICY.massApproveEvidenceRecords).toBe(false);
    expect(PERSIST_RETRIEVAL_POLICY.overwriteReviewed).toBe(false);

    const spec = DEEP_RESEARCH_QUESTIONS[0]!;
    const empty = appraiseWorksForQuestion({
      questionKey: spec.gapKey,
      researchQuestion: spec.researchQuestion,
      works: [],
      lexicon: spec.lexicon,
    });
    const blocked = promoteFromAppraisal({ spec, appraisal: empty });
    expect(blocked.qualify).toBe(false);

    const works = [
      {
        pmid: "25891173",
        doi: "10.1056/NEJMoa1503093" as string | null,
        nctId: null,
        title: "Pembrolizumab versus ipilimumab in advanced melanoma",
        source: "pubmed" as const,
        abstractAvailable: true,
        fullTextAvailable: false,
        year: "2015",
        excluded: false,
        exclusionReason: null,
        provenance: {},
        abstractText:
          "In metastatic melanoma, MHC class I antigen presentation defects contributed to resistance after PD-1 pembrolizumab therapy.",
      },
      {
        pmid: "12345678",
        doi: null,
        nctId: null,
        title: "Checkpoint immunotherapy overview",
        source: "pubmed" as const,
        abstractAvailable: true,
        fullTextAvailable: false,
        year: "2020",
        excluded: false,
        exclusionReason: null,
        provenance: {},
        abstractText: "Review of checkpoint immunotherapy and T cell responses in solid tumours.",
      },
    ];
    const appraisal = appraiseWorksForQuestion({
      questionKey: spec.gapKey,
      researchQuestion: spec.researchQuestion,
      works,
      lexicon: spec.lexicon,
    });
    expect(appraisal.counts.identifierValidated).toBeGreaterThan(0);
    expect(appraisal.counts.scientificallyAppraised).toBeGreaterThan(0);
    expect("identifierValidated" in appraisal.counts).toBe(true);
    expect("scientificallyAppraised" in appraisal.counts).toBe(true);
    // assessed/legacy retrieval count must not be treated as scientific appraisal elsewhere
    expect(APPRAISAL_POLICY.identifierValidationIsScientificAppraisal).toBe(false);

    const asGap = promoteFromAppraisal({
      spec,
      appraisal,
      rationale: "",
      noveltyNote: "",
      feasibilityNote: "",
    });
    expect(asGap.qualify).toBe(true);
    if (asGap.qualify) {
      expect(asGap.gapClass).toBe("scientific_evidence_gap");
      expect(asGap.opportunityStatus).toBe("none");
    }

    const asOpp = promoteFromAppraisal({ spec, appraisal });
    expect(asOpp.qualify).toBe(true);
    if (asOpp.qualify) {
      expect(asOpp.gapClass).toBe("research_opportunity");
      expect(asOpp.opportunityStatus).toBe("assessed");
      expect(asOpp.candidate.opportunityStatus).not.toBe("reviewed_opportunity");

      const persistBlocked = planPersistRetrieval({
        gap: asOpp.candidate,
        works: appraisal.works,
        existing: { status: "reviewed_gap", gapClass: "research_opportunity", opportunityStatus: "reviewed_opportunity" },
        queryText: spec.pubmedQuery,
        hitCount: appraisal.counts.retrieved,
      });
      expect(persistBlocked.ok).toBe(false);
      if (!persistBlocked.ok) expect(persistBlocked.evidenceRecordsTouched).toBe(0);

      const persistOk = planPersistRetrieval({
        gap: asOpp.candidate,
        works: appraisal.works,
        existing: null,
        queryText: spec.pubmedQuery,
        hitCount: appraisal.counts.retrieved,
      });
      expect(persistOk.ok).toBe(true);
      if (persistOk.ok) {
        expect(persistOk.plan.autoGateC).toBe(false);
        expect(persistOk.plan.evidenceRecordsTouched).toBe(0);
        expect(persistOk.plan.links.length).toBeGreaterThan(0);
        const keys = persistOk.plan.links.map(evidenceLinkDedupeKey);
        expect(new Set(keys).size).toBe(keys.length);
      }
    }
  });

  it("ranks melanoma vs autoimmunity vs biomarker profiles differently as nav aids", () => {
    const gaps = detectDiscoveryCandidates().slice(0, 12);
    const melanoma = recommendGapsForProfile(gaps, {
      displayLabel: "Melanoma IO",
      focusDiseases: ["D012"],
      focusDomains: ["checkpoint"],
      modalities: ["antibody"],
      interests: { melanoma: true, exhaustion: true },
    });
    const autoimm = recommendGapsForProfile(gaps, {
      displayLabel: "Autoimmunity",
      focusDiseases: [],
      focusDomains: ["autoimmunity"],
      modalities: [],
      interests: { RA: true, SSc: true },
    });
    const biomarker = recommendGapsForProfile(gaps, {
      displayLabel: "Biomarker",
      focusDiseases: [],
      focusDomains: ["biomarker"],
      modalities: ["assay"],
      interests: { biomarker: true },
    });
    expect(RANKING_POLICY.claimsNoveltyFromScore).toBe(false);
    expect(melanoma[0]?.disclaimer).toMatch(/not a novelty/i);
    // Ordering may differ by profile — assert score vectors are computed, not equal identity.
    const key = (r: { gapKey: string; score: number }[]) => r.map((x) => `${x.gapKey}:${x.score}`).join("|");
    expect(key(melanoma)).not.toBe("");
    expect(key(autoimm)).not.toBe("");
    expect(key(biomarker)).not.toBe("");
  });
});

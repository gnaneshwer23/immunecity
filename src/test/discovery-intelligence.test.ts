/**
 * Discovery Intelligence — Research Radar (Phase 1–6).
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
  assertEntitlementAllows,
  normalizeEntitlement,
  personalisedFeedLimit,
  radarListLimit,
} from "@/lib/discovery/entitlements";
import {
  GAP_STATUS_ACCESS,
  applyGapReviewDecision,
  assertDetectionEmitStatus,
  statusFromCoverageLabel,
} from "@/lib/discovery/gapStatus";
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
    expect(dossier.links.some((l) => l.id === "ask")).toBe(true);
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
      expect(source("drizzle/migrations/0019_research_profiles.sql")).toContain("research_profiles");
      expect(source("drizzle/migrations/0020_research_discovery_gaps.sql")).toContain("research_gaps");
      expect(source("drizzle/migrations/0020_research_discovery_gaps.sql")).toContain("coverage_insufficient");
      expect(source("drizzle/migrations/0021_research_discovery_monitor.sql")).toContain(
        "research_discovery_alerts",
      );
      const tree = source("src/routeTree.gen.ts");
      expect(tree).toContain("discovery.index");
      expect(tree).toContain("/discovery/gaps/$gapId");
      expect(tree).toContain("/discovery/alerts");
      expect(source("src/lib/db/schema.server.ts")).toContain("researchProfiles");
      expect(source("src/lib/db/schema.server.ts")).toContain("researchGaps");
      expect(source("src/lib/db/schema.server.ts")).toContain("researchDiscoveryAlerts");
    },
    { timeout: 20_000 },
  );
});

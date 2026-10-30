/**
 * Discovery Intelligence — Research Radar (Phase 1–2).
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
import {
  ENTITLEMENT_ACCESS,
  assertEntitlementAllows,
  normalizeEntitlement,
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
import { recommendGapsForProfile } from "@/lib/discovery/recommend";
import { stubLiteratureSearchAdapter } from "@/lib/discovery/adapters";
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
    expect(gapsFns).toMatch(/Never overwrite human decisions|Persist.*candidate/);
  });
});

describe("Discovery recommend stub + adapters", () => {
  it("explains recommendations without inventing novelty scores as science", async () => {
    const gaps = detectDiscoveryCandidates().slice(0, 3);
    const ranked = recommendGapsForProfile(gaps, {
      displayLabel: null,
      focusDiseases: ["D012"],
      focusDomains: ["checkpoint"],
      modalities: [],
      interests: {},
    });
    expect(ranked.length).toBe(gaps.length);
    expect(ranked[0]!.because.length).toBeGreaterThan(0);
    const stub = await stubLiteratureSearchAdapter.search("PD-1 melanoma");
    expect(stub.attempted).toBe(true);
    expect(stub.hitCount).toBeNull();
    expect(stub.scopeNote).toMatch(/deferred|unknown/i);
  });
});

describe("Discovery IA + migrations + route tree", () => {
  it("adds Investigate Research Radar without inventing a second KG", () => {
    const investigate = JOURNEY_NAV.find((g) => g.label === "Investigate")!;
    expect(investigate.items.some((i) => i.path === "/discovery" && i.title === "Research Radar")).toBe(true);
    const agents = source("src/lib/discovery/AGENTS.md");
    expect(agents).toMatch(/never a second graph/i);
    expect(agents).toMatch(/reviewed_gap/i);
    expect(source("drizzle/migrations/0019_research_profiles.sql")).toContain("research_profiles");
    expect(source("drizzle/migrations/0020_research_discovery_gaps.sql")).toContain("research_gaps");
    expect(source("drizzle/migrations/0020_research_discovery_gaps.sql")).toContain("coverage_insufficient");
    const tree = source("src/routeTree.gen.ts");
    expect(tree).toContain("discovery.index");
    expect(tree).toContain("/discovery/gaps/$gapId");
    expect(source("src/lib/db/schema.server.ts")).toContain("researchProfiles");
    expect(source("src/lib/db/schema.server.ts")).toContain("researchGaps");
  });
});

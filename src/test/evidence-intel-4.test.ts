/**
 * Evidence Intel 4.0 — verifier abstention, routing, no auto-approve, scout idempotency.
 * Run: bun test src/test/evidence-intel-4.test.ts
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CLAIM_VERIFIER_POLICY,
  DEEP_CLAIM_PROPOSITIONS,
  verifyClaimAgainstPassage,
  verifyClaimsForQuestion,
} from "@/lib/discovery/claimVerifier";
import {
  CROSS_EXAM_POLICY,
  runAdvocate,
  runAdjudicator,
  runCrossExamination,
  runMethodology,
  runSkeptic,
} from "@/lib/discovery/crossExamine";
import {
  INTEL4_POLICY,
  runIntel4OnWorks,
  intel4IdempotentReplay,
  intel4RetryAllowed,
} from "@/lib/discovery/intel4";
import {
  REVIEW_ROUTING_POLICY,
  assertNoAutoApprove,
  routeForReview,
} from "@/lib/discovery/reviewRouting";
import {
  SCOUT_POLICY,
  buildScoutStrategy,
  runLiteratureScout,
  scoutIdempotencyKey,
} from "@/lib/discovery/scout";
import {
  VERIFIED_GAP_POLICY,
  discoverOpportunityFromVerified,
} from "@/lib/discovery/verifiedGaps";

describe("Evidence Intel 4.0 policy locks", () => {
  it("forbids auto Gate C / reviewed_opportunity / consensus-as-truth / silent KG", () => {
    expect(CLAIM_VERIFIER_POLICY.autoGateC).toBe(false);
    expect(CLAIM_VERIFIER_POLICY.autoReviewedOpportunity).toBe(false);
    expect(CLAIM_VERIFIER_POLICY.titleOnlyMeansSupport).toBe(false);
    expect(CLAIM_VERIFIER_POLICY.keywordHitMeansSupport).toBe(false);
    expect(CLAIM_VERIFIER_POLICY.highConfidenceOverridesMissingEvidence).toBe(false);
    expect(CROSS_EXAM_POLICY.consensusIsTruth).toBe(false);
    expect(REVIEW_ROUTING_POLICY.autoApprove).toBe(false);
    expect(VERIFIED_GAP_POLICY.candidateMeansApproved).toBe(false);
    expect(INTEL4_POLICY.silentKgWrite).toBe(false);
    expect(INTEL4_POLICY.trialIntelligenceEnabled).toBe(false);
    expect(INTEL4_POLICY.fabricatesAccuracy).toBe(false);
    expect(SCOUT_POLICY.unboundedScraping).toBe(false);
  });
});

describe("Claim Verifier abstention", () => {
  const prop = DEEP_CLAIM_PROPOSITIONS["GAP-OPP-A-MHC-PD1-RESIST"]!;

  it("title-only cannot be support", () => {
    const v = verifyClaimAgainstPassage({
      proposition: prop,
      work: {
        pmid: "12345678",
        doi: null,
        nctId: null,
        title: "Melanoma MHC class I and PD-1 resistance study",
        source: "pubmed",
        abstractAvailable: false,
        fullTextAvailable: null,
        year: null,
        excluded: false,
        exclusionReason: null,
        provenance: {},
        abstractText: null,
      },
      priorAppraisalRelation: "support",
      modelConfidence: "high",
    });
    expect(v.classification).toBe("insufficient");
    expect(v.abstained).toBe(true);
    expect(v.demotedFromPriorSupport).toBe(true);
    expect(v.passage.source).toBe("title_only");
  });

  it("keyword topicality alone ≠ support (single facet)", () => {
    const v = verifyClaimAgainstPassage({
      proposition: prop,
      work: {
        pmid: "12345679",
        doi: null,
        nctId: null,
        title: "Nivolumab salvage in melanoma",
        source: "pubmed",
        abstractAvailable: true,
        fullTextAvailable: null,
        year: null,
        excluded: false,
        exclusionReason: null,
        provenance: {},
        abstractText:
          "Patients with metastatic melanoma who progress on standard of care therapy have limited treatment options with nivolumab salvage approaches under study.",
      },
      priorAppraisalRelation: "support",
      modelConfidence: "high",
    });
    expect(v.classification).not.toBe("support");
    expect(v.demotedFromPriorSupport).toBe(true);
  });

  it("abstains when only 2/3 facets present", () => {
    const v = verifyClaimAgainstPassage({
      proposition: prop,
      work: {
        pmid: "12345680",
        doi: null,
        nctId: null,
        title: "Antigen presentation and melanoma immunotherapy",
        source: "pubmed",
        abstractAvailable: true,
        fullTextAvailable: null,
        year: null,
        excluded: false,
        exclusionReason: null,
        provenance: {},
        abstractText:
          "In metastatic melanoma, antigen presentation defects are discussed in immunotherapy cohorts without a mapped clinical endpoint in this abstract passage alone.",
      },
    });
    expect(v.classification).toBe("insufficient");
    expect(v.abstained).toBe(true);
  });

  it("support requires population + intervention + outcome in abstract", () => {
    const v = verifyClaimAgainstPassage({
      proposition: prop,
      work: {
        pmid: "12345681",
        doi: null,
        nctId: null,
        title: "B2M loss and anti-PD-1 resistance in melanoma",
        source: "pubmed",
        abstractAvailable: true,
        fullTextAvailable: null,
        year: null,
        excluded: false,
        exclusionReason: null,
        provenance: {},
        abstractText:
          "In metastatic melanoma, loss of MHC class I / B2M antigen presentation was associated with anti-PD-1 resistance in a clinical cohort, suggesting a possible causal mediator of checkpoint failure.",
      },
    });
    expect(v.classification).toBe("support");
    expect(v.abstained).toBe(false);
    expect(v.identifierValidated).toBe(true);
    expect(v.scientificallyVerified).toBe(true);
  });

  it("high model confidence does not override invalid identifier", () => {
    const v = verifyClaimAgainstPassage({
      proposition: prop,
      work: {
        pmid: "not-a-pmid",
        doi: null,
        nctId: null,
        title: "Melanoma MHC PD-1 resistance",
        source: "unknown",
        abstractAvailable: true,
        fullTextAvailable: null,
        year: null,
        excluded: false,
        exclusionReason: null,
        provenance: {},
        abstractText:
          "In metastatic melanoma, MHC class I loss mediates anti-PD-1 resistance in human disease samples.",
      },
      modelConfidence: "high",
    });
    expect(v.identifierValidated).toBe(false);
    expect(v.classification).toBe("insufficient");
    expect(v.abstained).toBe(true);
  });

  it("separates identifierValidated from scientificallyVerified counts", () => {
    const bundle = verifyClaimsForQuestion({
      proposition: prop,
      works: [
        {
          pmid: "12345681",
          doi: null,
          nctId: null,
          title: "B2M loss and anti-PD-1 resistance in melanoma",
          source: "pubmed",
          abstractAvailable: true,
          fullTextAvailable: null,
          year: null,
          excluded: false,
          exclusionReason: null,
          provenance: {},
          abstractText:
            "In metastatic melanoma, loss of MHC class I / B2M antigen presentation was associated with anti-PD-1 resistance in a clinical cohort.",
        },
        {
          pmid: null,
          doi: null,
          nctId: null,
          title: "Untitled",
          source: "unknown",
          abstractAvailable: null,
          fullTextAvailable: null,
          year: null,
          excluded: false,
          exclusionReason: null,
          provenance: {},
        },
      ],
    });
    expect(bundle.counts.identifierValidated).toBe(1);
    expect(bundle.counts.scientificallyVerified).toBeGreaterThanOrEqual(1);
    expect(bundle.honesty).toContain("identifierValidated");
  });
});

describe("Review routing + no auto-approve", () => {
  it("routes high risk to SME when support present", () => {
    const prop = DEEP_CLAIM_PROPOSITIONS["GAP-OPP-A-MHC-PD1-RESIST"]!;
    const verification = verifyClaimsForQuestion({
      proposition: prop,
      works: [
        {
          pmid: "12345681",
          doi: null,
          nctId: null,
          title: "B2M loss and anti-PD-1 resistance in melanoma",
          source: "pubmed",
          abstractAvailable: true,
          fullTextAvailable: null,
          year: null,
          excluded: false,
          exclusionReason: null,
          provenance: {},
          abstractText:
            "In metastatic melanoma, loss of MHC class I / B2M antigen presentation was associated with anti-PD-1 resistance in a clinical cohort.",
        },
      ],
    });
    const crossExam = runCrossExamination(verification);
    const route = routeForReview({
      gapKey: prop.questionKey,
      verification,
      crossExam,
    });
    expect(route.risk).toBe("high");
    expect(route.destination).toBe("sme");
    expect(route.autoApprove).toBe(false);
    expect(assertNoAutoApprove(route).ok).toBe(true);
    expect(route.href).toContain("/sme?");
  });

  it("high model confidence with missing evidence still routes high to SME", () => {
    const prop = DEEP_CLAIM_PROPOSITIONS["GAP-OPP-B-CD28NULL-SSC"]!;
    const verification = verifyClaimsForQuestion({
      proposition: prop,
      works: [
        {
          pmid: "12345682",
          doi: null,
          nctId: null,
          title: "Systemic sclerosis overview",
          source: "pubmed",
          abstractAvailable: true,
          fullTextAvailable: null,
          year: null,
          excluded: false,
          exclusionReason: null,
          provenance: {},
          abstractText:
            "Systemic sclerosis is a heterogeneous autoimmune disease characterised by marked clinical variability without CD28-null discussion here.",
          priorAppraisalRelation: "support",
        },
      ],
      modelConfidence: "high",
    });
    const crossExam = runCrossExamination(verification);
    const route = routeForReview({
      gapKey: prop.questionKey,
      verification,
      crossExam,
      modelConfidence: "high",
    });
    expect(route.risk).toBe("high");
    expect(route.autoApprove).toBe(false);
    expect(REVIEW_ROUTING_POLICY.highConfidenceOverridesMissingEvidence).toBe(false);
  });

  it("runIntel4OnWorks never auto-approves", () => {
    const result = runIntel4OnWorks({
      gapKey: "GAP-OPP-A-MHC-PD1-RESIST",
      title: "Test",
      researchQuestion:
        "In metastatic melanoma, does MHC class I loss causally mediate anti-PD-1 resistance?",
      whyItMatters: "Test why",
      works: [],
    });
    expect(result.route.autoApprove).toBe(false);
    expect(result.decisions.every((d) => d.autoApprove === false)).toBe(true);
    expect(result.integration.kg.silentWrite).toBe(false);
    expect(result.integration.trialIntelligence.enabled).toBe(false);
  });
});

describe("Scout idempotency", () => {
  it("same strategy+budget yields same idempotency key and skips network on replay", async () => {
    const strategy = buildScoutStrategy({
      gap: {
        gapKey: "GAP-TEST-SCOUT",
        pilot: "melanoma_a",
        subjectId: "R011",
        objectId: "D012",
        title: "Scout idempotency test",
      },
      strategyId: "scout-test-1",
      nowIso: "2026-10-30T00:00:00.000Z",
    });
    const budget = {
      maxQueries: 9,
      maxWorksPerCorpus: 20,
      maxTotalWorks: 40,
      maxWallMs: 120_000,
    };
    const key1 = scoutIdempotencyKey(strategy, budget);
    const key2 = scoutIdempotencyKey(strategy, budget);
    expect(key1).toBe(key2);
    expect(intel4IdempotentReplay(key1, key2)).toBe(true);

    const first = await runLiteratureScout({ strategy, dryRun: true });
    const replay = await runLiteratureScout({
      strategy,
      dryRun: true,
      priorIdempotencyKey: first.idempotencyKey,
    });
    expect(replay.coverage.scopeNote).toContain("Idempotent replay");
    expect(replay.budget.queriesRun).toBe(0);
    expect(replay.inventedStudies).toBe(false);
  });

  it("retry budget is bounded", () => {
    expect(intel4RetryAllowed(0)).toBe(true);
    expect(intel4RetryAllowed(2)).toBe(true);
    expect(intel4RetryAllowed(3)).toBe(false);
  });
});

describe("Cross-examination independence + no consensus-as-truth", () => {
  it("roles are independently callable and adjudicator refuses consensus-as-truth", () => {
    const prop = DEEP_CLAIM_PROPOSITIONS["GAP-OPP-A-LAG3-TIM3-EXHAUST"]!;
    const verification = verifyClaimsForQuestion({
      proposition: prop,
      works: [
        {
          pmid: "12345683",
          doi: null,
          nctId: null,
          title: "Melanoma PD-1",
          source: "pubmed",
          abstractAvailable: true,
          fullTextAvailable: null,
          year: null,
          excluded: false,
          exclusionReason: null,
          provenance: {},
          abstractText: "Melanoma patients treated with PD-1 blockade show mixed exhaustion phenotypes.",
          priorAppraisalRelation: "support",
        },
      ],
    });
    const advocate = runAdvocate(verification);
    const skeptic = runSkeptic(verification);
    const methodology = runMethodology(verification);
    const adjudicator = runAdjudicator({ bundle: verification, advocate, skeptic, methodology });
    expect(advocate.role).toBe("advocate");
    expect(skeptic.role).toBe("skeptic");
    expect(methodology.role).toBe("methodology");
    expect(adjudicator.consensusAsTruth).toBe(false);
    expect(adjudicator.smeConfirmed).toBe(false);
  });
});

describe("Verified gap discovery", () => {
  it("candidate ≠ approved and refuses empty invent", () => {
    const prop = DEEP_CLAIM_PROPOSITIONS["GAP-OPP-A-AGPRES-UPSTREAM"]!;
    const verification = verifyClaimsForQuestion({ proposition: prop, works: [] });
    const crossExam = runCrossExamination(verification);
    const result = discoverOpportunityFromVerified({
      gapKey: prop.questionKey,
      title: "Upstream AP",
      researchQuestion: prop.proposition,
      whyItMatters: "Ordering matters",
      verification,
      crossExam,
    });
    expect(result.emit).toBe(false);
    expect(VERIFIED_GAP_POLICY.autoReviewedOpportunity).toBe(false);
  });
});

describe("Audit doc present", () => {
  it("ships ISI_EVIDENCE_INTEL_4_AUDIT.md at tip a6de865 baseline note", () => {
    const text = readFileSync(
      resolve(process.cwd(), "docs/ISI_EVIDENCE_INTEL_4_AUDIT.md"),
      "utf8",
    );
    expect(text).toContain("a6de865");
    expect(text).toContain("Claim Verifier");
    expect(text).toContain("false-support");
  });
});

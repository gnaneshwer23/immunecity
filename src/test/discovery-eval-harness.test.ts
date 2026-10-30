/**
 * Discovery gold-set harness scaffolding (Phase 8).
 * Asserts structure + honesty policy — never invents SME scores or performance metrics.
 * Run: bun test src/test/discovery-eval-harness.test.ts
 *   or: bun run discovery:eval
 */
import { describe, expect, it } from "bun:test";
import { detectDiscoveryCandidates } from "@/lib/discovery/detect";
import {
  DISCOVERY_GOLD_SET_POLICY,
  DISCOVERY_GOLD_SET_SCAFFOLD,
  bindGoldCasesToDetectedKeys,
  summariseDiscoveryGoldSet,
} from "@/lib/discovery/eval/goldSet";

describe("Discovery gold-set harness scaffolding", () => {
  it("exposes structure without inventing SME scores or metrics", () => {
    expect(DISCOVERY_GOLD_SET_POLICY.inventsPerformanceMetrics).toBe(false);
    expect(DISCOVERY_GOLD_SET_POLICY.inventsSmeScores).toBe(false);
    expect(DISCOVERY_GOLD_SET_POLICY.claimsNovelty).toBe(false);
    expect(DISCOVERY_GOLD_SET_POLICY.autoPromotesReviewedGap).toBe(false);

    const summary = summariseDiscoveryGoldSet();
    expect(summary.caseCount).toBeGreaterThan(0);
    expect(summary.withSmeScore).toBe(0);
    expect(summary.withExpectedStatus).toBe(0);
    expect(summary.pendingSme).toBeGreaterThan(0);
    expect(summary.note).toMatch(/human scientific review/i);

    for (const c of DISCOVERY_GOLD_SET_SCAFFOLD) {
      expect(c.smeScore).toBeNull();
      expect(c.expectedStatus).toBeNull();
      expect(c.status === "pending_sme" || c.status === "scaffolded").toBe(true);
    }
  });

  it("may bind real detection keys without inventing reviewed_gap or scores", () => {
    const detected = detectDiscoveryCandidates();
    const bound = bindGoldCasesToDetectedKeys(DISCOVERY_GOLD_SET_SCAFFOLD, detected);
    for (const c of bound) {
      expect(c.smeScore).toBeNull();
      expect(c.expectedStatus).toBeNull();
      if (c.gapKey) {
        expect(detected.some((d) => d.gapKey === c.gapKey)).toBe(true);
      }
    }
  });
});

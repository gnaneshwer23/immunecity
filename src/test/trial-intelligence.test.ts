import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  MELANOMA_PILOT_TRIALS,
  NON_CAUSAL_TRIAL_WARNING,
  formatEndpointValue,
  listMelanomaPilotTrials,
  trialIntelligenceByGraphNode,
  trialIntelligenceByNct,
} from "@/data/trialIntelligence";
import { TRIAL_INTELLIGENCE_FLAG, isTrialIntelligenceEnabled } from "@/lib/trialIntelligenceFlag";
import { byId } from "@/lib/immune/engine";
import { TRIAL_REGISTRY } from "@/data/trialRegistry";

const ENV_KEYS = ["VITE_TRIAL_INTELLIGENCE", "TRIAL_INTELLIGENCE"] as const;
const saved: Record<string, string | undefined> = {};

function setFlagEnv(vite: string | undefined, plain?: string | undefined) {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  if (vite === undefined) delete process.env.VITE_TRIAL_INTELLIGENCE;
  else process.env.VITE_TRIAL_INTELLIGENCE = vite;
  if (plain === undefined) delete process.env.TRIAL_INTELLIGENCE;
  else process.env.TRIAL_INTELLIGENCE = plain;
}

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("trial intelligence loaders", () => {
  it("links melanoma pilot trials to existing graph nodes TR003 and TR020", () => {
    const trials = listMelanomaPilotTrials();
    expect(trials).toHaveLength(2);
    expect(trialIntelligenceByGraphNode("TR003")?.acronym).toBe("KEYNOTE-006");
    expect(trialIntelligenceByGraphNode("TR020")?.acronym).toBe("CheckMate 067");
    expect(byId.TR003?.node_type).toBe("TRIAL");
    expect(byId.TR020?.node_type).toBe("TRIAL");
  });

  it("uses the verified KEYNOTE-006 NCT (not MASTERKEY-265)", () => {
    expect(trialIntelligenceByNct("NCT01866319")?.graphNodeId).toBe("TR003");
    expect(trialIntelligenceByNct("NCT02263508")).toBeUndefined();
    expect(TRIAL_REGISTRY.TR003?.studies[0]?.nctId).toBe("NCT01866319");
    expect(TRIAL_REGISTRY.TR020?.studies[0]?.nctId).toBe("NCT01844505");
  });

  it("never invents endpoint numerics without a source PMID", () => {
    for (const trial of MELANOMA_PILOT_TRIALS) {
      expect(trial.arms.length).toBeGreaterThanOrEqual(2);
      for (const arm of trial.arms) {
        for (const ep of arm.endpoints) {
          if (ep.valueNum != null) {
            expect(ep.verificationState).toBe("verified");
            expect(ep.sourcePmid).toMatch(/^\d+$/);
            expect(ep.analysisSet?.length).toBeGreaterThan(0);
          }
          if (ep.verificationState === "unverified") {
            expect(ep.valueNum).toBeNull();
            expect(formatEndpointValue(ep)).toMatch(/Not verified/i);
          }
        }
      }
    }
  });

  it("keeps CheckMate 067 ORR null until abstract-verified", () => {
    const cm = trialIntelligenceByGraphNode("TR020")!;
    const orrs = cm.arms.flatMap((a) => a.endpoints.filter((e) => e.endpointType === "orr"));
    expect(orrs.length).toBe(3);
    expect(orrs.every((e) => e.valueNum == null && e.verificationState === "unverified")).toBe(true);
  });
});

describe("trial intelligence feature flag and honesty", () => {
  it("is off by default", () => {
    setFlagEnv("", "");
    expect(isTrialIntelligenceEnabled()).toBe(false);
  });

  it("turns on with VITE_TRIAL_INTELLIGENCE=1", () => {
    setFlagEnv("1");
    expect(isTrialIntelligenceEnabled()).toBe(true);
    expect(TRIAL_INTELLIGENCE_FLAG).toBe("VITE_TRIAL_INTELLIGENCE");
  });

  it("panel early-returns when the flag is off (source contract)", () => {
    const src = readFileSync(resolve(process.cwd(), "src/components/immune/TrialIntelligence.tsx"), "utf8");
    expect(src).toMatch(/if\s*\(\s*!isTrialIntelligenceEnabled\(\)\s*\)\s*return\s+null/);
    expect(src).toContain('data-testid="trial-noncausal-warning"');
    expect(src).toContain("NON_CAUSAL_TRIAL_WARNING");
    setFlagEnv("");
    expect(isTrialIntelligenceEnabled()).toBe(false);
  });

  it("ships a non-causal comparison warning (association ≠ causation; not CDS)", () => {
    expect(NON_CAUSAL_TRIAL_WARNING).toMatch(/Association is not causation/i);
    expect(NON_CAUSAL_TRIAL_WARNING).toMatch(/Cross-trial comparisons are contextual/i);
    expect(NON_CAUSAL_TRIAL_WARNING).toMatch(/not clinical decision support/i);
    const methods = readFileSync(resolve(process.cwd(), "src/routes/methods.tsx"), "utf8");
    expect(methods).toContain("TrialIntelligenceMethodsNote");
    expect(methods).toContain("trial-intelligence");
  });
});

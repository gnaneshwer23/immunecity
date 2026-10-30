/**
 * UX language guardrails — eng tokens must not reappear in primary SME / dossier / collections copy.
 * Expert panels (ExpertDetails) may still mention infra terms.
 * Run: bun test src/test/ux-language.test.ts
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  detectionSourceLabel,
  opportunityStatusLabel,
  persistenceLabel,
  paidPlanAvailabilityCopy,
  reviewStatusUxLabel,
  sanitizeDiscoveryFeedNote,
  spineUserStatusLabel,
  UX_PRIMARY_FORBIDDEN_PHRASES,
  verificationProvenanceLabel,
} from "@/lib/uxLanguage";

function source(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

/** Strip expert/technical details blocks so primary JSX is what we assert against. */
function primaryCopy(src: string): string {
  return src.replace(/<ExpertDetails[\s\S]*?<\/ExpertDetails>/g, "");
}

describe("uxLanguage helpers", () => {
  it("maps detection / persistence / opportunity to researcher language", () => {
    expect(detectionSourceLabel("melanoma_matrix")).toBe("Identified from melanoma evidence analysis");
    expect(persistenceLabel(true)).toBe("Saved to your research workspace");
    expect(persistenceLabel(false)).toBe("New research candidate");
    expect(opportunityStatusLabel("assessed")).toBe("Evidence assessment completed");
    expect(reviewStatusUxLabel(null)).toMatch(/New research candidate/i);
    expect(paidPlanAvailabilityCopy()).toMatch(/not available yet/i);
  });

  it("maps verification provenance ids and sanitizes Radar notes", () => {
    expect(verificationProvenanceLabel("documented_search_scope")).toBe("Search scope documented");
    expect(spineUserStatusLabel("implemented")).toBe("Ready");
    expect(sanitizeDiscoveryFeedNote("researcher_pro stub — billing not activated")).toMatch(/not available yet/i);
    expect(sanitizeDiscoveryFeedNote("researcher_pro stub — billing not activated")).not.toMatch(/stub|billing not activated/i);
  });
});

describe("primary SME / dossier / collections copy", () => {
  it("keeps forbidden eng phrases out of primary SME page + workspace", () => {
    const page = primaryCopy(source("src/routes/_authenticated/sme.tsx"));
    const ui = primaryCopy(source("src/components/immune/SmeReviewWorkspace.tsx"));
    for (const phrase of UX_PRIMARY_FORBIDDEN_PHRASES) {
      expect(page.includes(phrase)).toBe(false);
      expect(ui.includes(phrase)).toBe(false);
    }
    expect(page).toMatch(/Scientific review workspace/);
    expect(ui).toContain('data-testid="sme-review-workspace"');
    expect(source("src/components/immune/SmeReviewWorkspace.tsx")).toContain(
      'testId="sme-expert-panel"',
    );
    expect(ui).toMatch(/Awaiting review|awaiting review/);
  });

  it("keeps forbidden eng phrases out of primary dossier; Intel 4 stays in expert panel", () => {
    const raw = source("src/routes/discovery.gaps.$gapId.tsx");
    const primary = primaryCopy(raw);
    for (const phrase of UX_PRIMARY_FORBIDDEN_PHRASES) {
      expect(primary.includes(phrase)).toBe(false);
    }
    expect(primary).toMatch(/Save research question|Verify evidence/);
    expect(raw).toContain('testId="intel4-expert-panel"');
    expect(raw).toContain("getMyResearchProfile");
    expect(raw).not.toMatch(/focusDiseases:\s*\["D012"\]/);
    expect(raw).not.toMatch(/profile interest stub/i);
  });

  it("collections prefer concept search; eng honesty only in expert panel", () => {
    const raw = source("src/components/immune/EvidenceCollectionsPanel.tsx");
    const primary = primaryCopy(raw);
    expect(raw).toContain("ConceptIdPicker");
    expect(primary.includes("R001, P001")).toBe(false);
    expect(primary.includes("kgWrite=")).toBe(false);
    expect(primary.includes("localStorage")).toBe(false);
    expect(raw).toContain('testId="collections-expert-panel"');
    expect(raw).toMatch(/localStorage/);
    expect(raw).toMatch(/kgWrite/);
  });

  it("onboarding does not hardcode D012/checkpoint/pd1 stubs", () => {
    const raw = source("src/routes/discovery.onboarding.tsx");
    expect(raw).not.toMatch(/useState\("D012"\)/);
    expect(raw).not.toMatch(/useState\("checkpoint"\)/);
    expect(raw).not.toMatch(/useState\("pd1"\)/);
    expect(raw).toContain("ConceptIdPicker");
  });

  it("keeps forbidden eng phrases out of primary Research hub + workbench + brief", () => {
    const researchRaw = source("src/routes/research.tsx");
    const workbenchRaw = source("src/components/immune/ScientificWorkbench.tsx");
    const briefRaw = source("src/components/immune/ResearchBriefPanel.tsx");
    const research = primaryCopy(researchRaw);
    const workbench = primaryCopy(workbenchRaw);
    const brief = primaryCopy(briefRaw);
    for (const phrase of UX_PRIMARY_FORBIDDEN_PHRASES) {
      expect(research.includes(phrase)).toBe(false);
      expect(workbench.includes(phrase)).toBe(false);
      expect(brief.includes(phrase)).toBe(false);
    }
    expect(research).toMatch(/Open Research Radar/);
    expect(workbenchRaw).toContain('testId="workbench-expert-panel"');
    expect(briefRaw).toContain("ConceptIdPicker");
    expect(briefRaw).toContain('testId="brief-expert-panel"');
  });

  it("dossier verification uses human provenance labels", () => {
    const raw = source("src/routes/discovery.gaps.$gapId.tsx");
    expect(raw).toContain("verificationProvenanceLabel");
    expect(raw).not.toMatch(/OK"\s*:\s*"Issue"\}\s*·\s*\{p\.id\}/);
    expect(raw).toMatch(/verificationProvenanceLabel\(p\.id\)/);
  });
});

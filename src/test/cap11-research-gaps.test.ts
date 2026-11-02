/**
 * Cap 11 — Research gaps with scope honesty (+ cap11-2 depth).
 * Run: bun test src/test/cap11-research-gaps.test.ts
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prepareAsk } from "@/lib/askGrounding";
import {
  buildResearchGapRegister,
  formatResearchGapRegisterMarkdown,
  groupResearchGapEntriesByPriority,
  RESEARCH_GAP_REGISTER_SCHEMA_VERSION,
} from "@/lib/research/researchGapRegister";
import { EVIDENCE_GAP_PROVENANCE_NOTE } from "@/lib/research/evidenceGap";
import { buildContradictionReport } from "@/lib/research/contradictionReport";
import { buildInvestigationBrief } from "@/lib/research/investigationBrief";

const root = (...p: string[]) => resolve(process.cwd(), ...p);

describe("Cap 11 Underexplored mechanisms / research gaps", () => {
  it("requires search-scope honesty and never equates KG absence with worldwide absence", () => {
    const q = "How does PD-1 blockade relate to melanoma?";
    const prepared = prepareAsk(q);
    const reg = buildResearchGapRegister({ question: q, grounding: prepared.grounding });
    expect(reg.schemaVersion).toBe(RESEARCH_GAP_REGISTER_SCHEMA_VERSION);
    expect(reg.schemaVersion).toBe("cap11-2");
    expect(reg.kgWrite).toBe(false);
    expect(reg.clinicalAdvice).toBe(false);
    expect(reg.scopeHonestyNote).toBe(EVIDENCE_GAP_PROVENANCE_NOTE);
    expect(reg.searchScope.note).toMatch(/not a claim that no literature exists worldwide/i);
    expect(reg.honesty.some((h) => /≠|not in the scientific literature/i.test(h))).toBe(true);

    for (const e of reg.entries) {
      expect(e.notWorldwideAbsence).toBe(true);
      expect(e.notCat2Absence).toBe(true);
      expect(e.searchScope.note).toMatch(/not a claim that no literature exists worldwide/i);
      expect(e.suggestedNextStep.length).toBeGreaterThan(10);
      expect(e.entryKind).toMatch(/concept_coverage|context_gap|mechanism_edge|contradiction_crosslink/);
      if (e.conceptId) {
        expect(e.atlasPath).toBe(`/atlas/${e.conceptId}`);
      } else {
        expect(e.atlasPath).toBeNull();
      }
    }

    const md = formatResearchGapRegisterMarkdown(reg);
    expect(md).toContain("## Search scope (mandatory)");
    expect(md).toMatch(/Cap 11/);
    expect(md).toContain("## Priority counts");
    expect(md).toContain("Next:");
  });

  it("treats missing Gate C counts as insufficient_coverage when applicable", () => {
    const q = "How does TNF relate to rheumatoid arthritis?";
    const prepared = prepareAsk(q);
    const reg = buildResearchGapRegister({ question: q, grounding: prepared.grounding });
    // Without explicit signals, concept gaps should be insufficient_coverage (unknown), not invented zero worldwide
    const conceptGaps = reg.entries.filter((e) => e.gapLabel === "insufficient_coverage");
    for (const e of conceptGaps) {
      expect(e.detail.toLowerCase()).toMatch(/not|unknown|incomplete|worldwide/i);
    }
  });

  it("groups by priority and exposes priorityCounts (cap11-2 depth)", () => {
    const q = "How does PD-1 blockade relate to melanoma?";
    const prepared = prepareAsk(q);
    const reg = buildResearchGapRegister({ question: q, grounding: prepared.grounding });
    expect(reg.honestEmpty).toBe(false);
    const sum = Object.values(reg.priorityCounts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(reg.entries.length);

    const groups = groupResearchGapEntriesByPriority(reg.entries);
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      expect(g.entries.every((e) => e.priority === g.priority)).toBe(true);
      expect(reg.priorityCounts[g.priority]).toBe(g.entries.length);
    }
  });

  it("cross-links Cap 10 unresolved contradictions into conflicting band", () => {
    const q = "How does IL-17A relate to IBD and Crohn disease?";
    const prepared = prepareAsk(q);
    const cx = buildContradictionReport({ question: q, grounding: prepared.grounding });
    const reg = buildResearchGapRegister({
      question: q,
      grounding: prepared.grounding,
      contradictionItems: cx.items,
    });

    const cross = reg.entries.filter((e) => e.entryKind === "contradiction_crosslink");
    if (cx.items.some((i) => i.resolution === "unresolved")) {
      expect(cross.length).toBeGreaterThan(0);
      expect(reg.priorityCounts.conflicting).toBeGreaterThanOrEqual(cross.length);
      for (const e of cross) {
        expect(e.priority).toBe("conflicting");
        expect(e.relatedContradictionIds.length).toBeGreaterThan(0);
        expect(e.suggestedNextStep).toMatch(/Cap 10|both sides|majority/i);
        expect(e.notWorldwideAbsence).toBe(true);
      }
    }

    // M1 brief wires Cap 10 → Cap 11
    const brief = buildInvestigationBrief({ question: q, grounding: prepared.grounding });
    expect(brief.ok).toBe(true);
    if (brief.ok) {
      expect(brief.brief.researchGaps.schemaVersion).toBe("cap11-2");
      const linked = brief.brief.researchGaps.entries.filter(
        (e) => e.entryKind === "contradiction_crosslink",
      );
      expect(linked.length).toBe(
        brief.brief.contradictions.items.filter((i) => i.resolution === "unresolved").length,
      );
    }
  });

  it("is wired into M1 brief + Ask UI", () => {
    expect(readFileSync(root("src/lib/research/investigationBrief.ts"), "utf8")).toContain(
      "buildResearchGapRegister",
    );
    expect(readFileSync(root("src/lib/research/investigationBrief.ts"), "utf8")).toContain(
      "contradictionItems",
    );
    expect(readFileSync(root("src/components/immune/InvestigationBriefView.tsx"), "utf8")).toContain(
      "Cap 11",
    );
    expect(readFileSync(root("src/components/immune/InvestigationBriefView.tsx"), "utf8")).toContain(
      "groupResearchGapEntriesByPriority",
    );
    expect(readFileSync(root("src/data/capabilityStatus.ts"), "utf8")).toContain("cap11-research-gaps");
  });
});

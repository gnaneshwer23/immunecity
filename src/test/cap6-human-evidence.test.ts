/**
 * Cap 6 — Human evidence prioritisation.
 * Run: bun test src/test/cap6-human-evidence.test.ts
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prepareAsk } from "@/lib/askGrounding";
import {
  buildHumanEvidenceComparison,
  classifyOrganismFromText,
  formatHumanEvidenceMarkdown,
  HUMAN_EVIDENCE_SCHEMA_VERSION,
  ORGANISM_CLASSES,
  PRESENTATION_GROUPS,
} from "@/lib/research/humanEvidencePrioritisation";

const root = (...p: string[]) => resolve(process.cwd(), ...p);

describe("Cap 6 Human evidence prioritisation", () => {
  it("classifies organism cues from text without inventing a species field", () => {
    expect(classifyOrganismFromText("randomized clinical trial in patients with melanoma").organismClass).toBe(
      "human_clinical",
    );
    expect(classifyOrganismFromText("murine in vivo blockade of PD-1").organismClass).toBe("preclinical_animal");
    expect(classifyOrganismFromText("in vitro cell line assay").organismClass).toBe("in_vitro");
    expect(classifyOrganismFromText("").organismClass).toBe("not_stated");
    expect(classifyOrganismFromText("patients and mouse models").organismClass).toBe("mixed_or_unclear");
    expect(ORGANISM_CLASSES).toHaveLength(5);
    expect(PRESENTATION_GROUPS).toHaveLength(4);
  });

  it("builds comparison table without species-superiority ranking", () => {
    const q = "How does PD-1 blockade relate to melanoma?";
    const prepared = prepareAsk(q);
    expect(prepared.grounding.coverage.matched).toBe(true);

    const table = buildHumanEvidenceComparison({ question: q, grounding: prepared.grounding });
    expect(table.schemaVersion).toBe(HUMAN_EVIDENCE_SCHEMA_VERSION);
    expect(table.kgWrite).toBe(false);
    expect(table.clinicalAdvice).toBe(false);
    expect(table.capabilityLabel).toBe("Available research capability");
    expect(table.honesty.some((h) => /not automatically superior|species/i.test(h))).toBe(true);

    // Human-cue Gate C rows may appear before others for navigation — but preclinical Gate C
    // must never be forced after human non-Gate-C solely by species.
    const humanTeaching = table.rows.filter((r) => r.presentationGroup === "graph_teaching_with_human_cues");
    const gateCOther = table.rows.filter((r) => r.presentationGroup === "gate_c_without_human_cues");
    if (humanTeaching.length && gateCOther.length) {
      const firstHumanTeaching = table.rows.findIndex((r) => r.presentationGroup === "graph_teaching_with_human_cues");
      const firstGateCOther = table.rows.findIndex((r) => r.presentationGroup === "gate_c_without_human_cues");
      // Gate C (any organism) navigation group precedes graph-teaching human cues
      expect(firstGateCOther).toBeLessThan(firstHumanTeaching);
    }

    for (const r of table.rows) {
      if (r.organismClass === "human_clinical" && !r.gateCSupport) {
        expect(r.limitations.some((l) => /does not upgrade Gate C/i.test(l))).toBe(true);
      }
    }

    const md = formatHumanEvidenceMarkdown(table);
    expect(md).toContain("Cap 6");
    expect(md).toMatch(/navigation groups|not a species rank/i);
  });

  it("is wired into M1 brief + Ask UI", () => {
    expect(readFileSync(root("src/lib/research/investigationBrief.ts"), "utf8")).toContain(
      "buildHumanEvidenceComparison",
    );
    expect(readFileSync(root("src/components/immune/InvestigationBriefView.tsx"), "utf8")).toContain("Cap 6");
    const cap = readFileSync(root("src/data/capabilityStatus.ts"), "utf8");
    expect(cap).toContain("cap6-human-evidence");
  });
});

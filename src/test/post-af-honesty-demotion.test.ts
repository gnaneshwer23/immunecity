/**
 * Post–A–F — melanoma pilot honesty demotions (no fabricated PMIDs / no Gate C auto-approve).
 */
import { describe, expect, it } from "bun:test";
import { edgeByRel } from "@/lib/immune/engine";
import {
  honestEvidenceStatus,
  lacksDurableLocator,
  REJECTED_SUPPORT_PMIDS,
  relationshipHonestyNote,
} from "@/lib/immune/evidenceStatus";
import { typeRelationshipById } from "@/lib/immune/typedRelations";
import { edgePanelFields } from "@/lib/immune/graphPhase2";
import { byId } from "@/lib/immune/engine";

describe("Post-AF honesty demotion", () => {
  it("demotes REL-R011 drives_immune_exhaustion_in D012 from ESTABLISHED causal display", () => {
    const id = "REL-R011-drives_immune_exhaustion_in-D012";
    const edge = edgeByRel[id];
    expect(edge).toBeTruthy();
    if (!edge) return;
    expect(edge.evidence_status).toBe("ESTABLISHED"); // raw kg unchanged
    expect(honestEvidenceStatus(edge)).toBe("HYPOTHESIS");
    expect(relationshipHonestyNote(id)).toMatch(/S-P-O|mismatch|Dong/i);
    const typed = typeRelationshipById(id);
    expect(typed?.evidenceStatus).toBe("HYPOTHESIS");
    const fields = edgePanelFields(edge, byId[edge.subject_id]!.name, byId[edge.object_id]!.name);
    expect(fields.evidenceStatus).toBe("HYPOTHESIS");
    expect(fields.honestyNote).toBeTruthy();
  });

  it("demotes KEYNOTE demonstrates_in after rejected PMID (no silent replacement)", () => {
    const id = "REL-I008-demonstrates_in-TR003";
    const edge = edgeByRel[id]!;
    expect(honestEvidenceStatus(edge)).toBe("EVIDENCE-SUPPORTED");
    expect(REJECTED_SUPPORT_PMIDS.has("31166680")).toBe(true);
    expect(relationshipHonestyNote(id)).toMatch(/31166680|rejected/i);
  });

  it("demotes TO_BE_CURATED ESTABLISHED melanoma seed edges", () => {
    const ids = [
      "REL-I009-blocks-R011",
      "REL-B011-measures-R012",
      "REL-B011-predicts_response_to-I008",
      "REL-TR003-evaluates-I008",
      "REL-I009-evaluates_in-TR020",
      "REL-TR020-evaluates-I009",
      "REL-TR020-evaluates-I025",
    ];
    for (const id of ids) {
      const edge = edgeByRel[id];
      expect(edge, id).toBeTruthy();
      if (!edge) continue;
      expect(lacksDurableLocator(edge), id).toBe(true);
      expect(honestEvidenceStatus(edge), id).not.toBe("ESTABLISHED");
      expect(honestEvidenceStatus(edge), id).toBe("HYPOTHESIS");
    }
  });

  it("draft melanoma treats / clinical_context edges are not ESTABLISHED", () => {
    for (const id of [
      "REL-I008-treats-D012",
      "REL-I009-treats-D012",
      "REL-I025-treats-D012",
      "REL-TR003-has_clinical_context-D012",
      "REL-TR020-has_clinical_context-D012",
    ]) {
      const edge = edgeByRel[id]!;
      expect(edge.draft).toBe(true);
      expect(honestEvidenceStatus(edge)).not.toBe("ESTABLISHED");
    }
  });
});

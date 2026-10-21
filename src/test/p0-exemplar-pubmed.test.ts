import { describe, expect, it } from "vitest";
import { EXEMPLAR_CURATOR_TARGETS } from "@/lib/immune/exemplarPathways";
import {
  evidenceIdForP0Draft,
  p0TargetsNeedingDrafts,
  titleMatchesP0Claim,
} from "@/lib/immune/p0ExemplarPubmed";

describe("p0 exemplar pubmed heuristics", () => {
  const byRel = (id: string) => EXEMPLAR_CURATOR_TARGETS.find((t) => t.relId === id)!;

  it("accepts classic Siegal / Morand / IFNAR titles and rejects noise", () => {
    expect(
      titleMatchesP0Claim(
        byRel("REL-C005-produces-P004"),
        "The nature of the principal type 1 interferon-producing cells in human blood.",
      ),
    ).toBe(true);
    expect(
      titleMatchesP0Claim(
        byRel("REL-I015-treats-D007"),
        "Trial of Anifrolumab in Active Systemic Lupus Erythematosus.",
      ),
    ).toBe(true);
    expect(
      titleMatchesP0Claim(
        byRel("REL-M018-binds-R018"),
        "A hot spot on interferon α/β receptor subunit 1 (IFNAR1) underpins its interaction with interferon-β",
      ),
    ).toBe(true);
    expect(
      titleMatchesP0Claim(
        byRel("REL-B011-measures-R012"),
        "Tumor-cell PD-L1 expression in colorectal carcinoma: a retrospective cohort study.",
      ),
    ).toBe(false);
    expect(titleMatchesP0Claim(byRel("REL-R012-suppresses-C015"), "Chemnitz PD-L1 2004")).toBe(false);
  });

  it("skips targets that already have mapped rows", () => {
    const open = p0TargetsNeedingDrafts(new Set(["REL-R012-suppresses-C015"]));
    expect(open.every((t) => t.relId !== "REL-R012-suppresses-C015")).toBe(true);
    expect(open.length).toBe(EXEMPLAR_CURATOR_TARGETS.length - 1);
  });

  it("builds deterministic draft evidence ids without inventing PMIDs", () => {
    expect(evidenceIdForP0Draft("REL-I015-treats-D007", "31851795")).toBe(
      "P0DRAFT-REL-I015-treats-D007-31851795",
    );
  });
});

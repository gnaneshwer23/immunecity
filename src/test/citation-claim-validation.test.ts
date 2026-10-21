import { describe, expect, it } from "vitest";
import {
  findUnaanchoredMaterialClaims,
  tokenOverlapRatio,
  windowMentionsEdgeEndpoints,
} from "@/lib/citationClaimValidation";

describe("citationClaimValidation helpers", () => {
  it("scores token overlap for passage windows", () => {
    expect(
      tokenOverlapRatio(
        "TNF contributes to synovial inflammation in rheumatoid arthritis",
        "TNF synovial inflammation rheumatoid arthritis",
      ),
    ).toBeGreaterThan(0.2);
    expect(tokenOverlapRatio("TNF synovial", "photosynthesis chlorophyll plant")).toBeLessThan(0.1);
  });

  it("detects unaanchored material assertions", () => {
    const gaps = findUnaanchoredMaterialClaims(
      "TNF drives rheumatoid arthritis through chronic synovitis. See Methods for trust.",
    );
    expect(gaps.length).toBeGreaterThan(0);
    expect(
      findUnaanchoredMaterialClaims(
        "TNF [TNF](concept:M001) drives [RA](concept:D001) via [e](edge:REL-M001-contributes_to-D001).",
      ),
    ).toHaveLength(0);
  });

  it("checks edge endpoint mentions in windows", () => {
    expect(
      windowMentionsEdgeEndpoints(
        "TNF contributes to rheumatoid arthritis via this link",
        "REL-M001-contributes_to-D001",
      ),
    ).toBe(true);
    expect(windowMentionsEdgeEndpoints("unrelated sentence about nothing", "REL-M001-contributes_to-D001")).toBe(
      false,
    );
  });
});

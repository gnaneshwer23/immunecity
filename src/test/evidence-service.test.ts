import { describe, expect, it } from "vitest";
import { EvidenceServiceError, isEvidenceServiceError } from "@/lib/citations.functions";

describe("evidence service failure typing", () => {
  it("exposes a stable EvidenceServiceError code for public citation reads", () => {
    const err = new EvidenceServiceError(
      "Evidence database query failed. Coverage and citations are temporarily unavailable — this is not an empty evidence set.",
    );
    expect(err.code).toBe("EVIDENCE_UNAVAILABLE");
    expect(err.message).toMatch(/not an empty evidence set/i);
    expect(isEvidenceServiceError(err)).toBe(true);
    expect(isEvidenceServiceError(new Error("other"))).toBe(false);
    expect(isEvidenceServiceError({ code: "EVIDENCE_UNAVAILABLE" })).toBe(true);
  });
});

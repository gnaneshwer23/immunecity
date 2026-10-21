import { describe, expect, it } from "vitest";
import { countReviewedPapers } from "@/lib/askGrounding";
import type { CitationLike } from "@/lib/immune/evidenceStatus";

const cite = (over: Partial<CitationLike>): CitationLike => ({
  evidence_id: Math.random().toString(36).slice(2),
  relationship_id: "REL-A",
  claim_support: "supports",
  curation: "approved",
  label: "x",
  url: "#",
  reviewed_at: null,
  pmid: null,
  doi: null,
  ...over,
});

describe("countReviewedPapers", () => {
  it("counts only supporting cites on this answer's links", () => {
    const cites = [
      cite({ pmid: "1" }),
      cite({ pmid: "2", relationship_id: "REL-OTHER" }),
      cite({ pmid: "3", claim_support: "contradicts" }),
      cite({ pmid: "4", curation: "pending" }),
    ];
    expect(countReviewedPapers(cites, ["REL-A"])).toBe(1);
  });

  it("merges rows for the same paper across PMID and DOI forms", () => {
    const cites = [
      cite({ pmid: "111" }),
      cite({ pmid: "PMID: 111", doi: "10.1000/ABC", relationship_id: "REL-B" }),
      cite({ doi: "https://doi.org/10.1000/abc", relationship_id: "REL-C" }),
      cite({ doi: "doi:10.2000/other" }),
    ];
    expect(countReviewedPapers(cites, ["REL-A", "REL-B", "REL-C"])).toBe(2);
  });

  it("falls back to evidence id when a row has no identifier", () => {
    expect(countReviewedPapers([cite({}), cite({})], ["REL-A"])).toBe(2);
    expect(
      countReviewedPapers(
        [cite({ pmid: "PMID: " }), cite({ doi: "  " }), cite({ doi: "https://doi.org/" })],
        ["REL-A"],
      ),
    ).toBe(3);
    expect(countReviewedPapers([], ["REL-A"])).toBe(0);
  });
});

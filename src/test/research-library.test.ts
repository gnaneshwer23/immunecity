import { describe, expect, it } from "vitest";
import {
  buildCrossrefUrl,
  dedupeByDoi,
  isOpenAccess,
  librarySearchSchema,
  normaliseDoi,
  parseCrossrefItem,
  parseCrossrefPage,
} from "@/lib/research/crossref";
import { createLiteratureProject } from "@/lib/research/literatureWorkflow";

const item = {
  DOI: "10.1038/S41590-024-01234-5",
  title: ["<i>Treg</i> cells in tissue repair"],
  author: [{ given: "Ada", family: "Lovelace" }],
  published: { "date-parts": [[2024, 3, 7]] },
  type: "journal-article",
  license: [{ URL: "https://www.springernature.com/gp/researchers/text-and-data-mining" }],
  abstract: "<jats:p>Regulatory T cells &amp; repair.</jats:p>",
  URL: "https://doi.org/10.1038/s41590-024-01234-5",
  "container-title": ["Nature Immunology"],
};

describe("Nature Immunology metadata parsing", () => {
  it("normalises DOIs and strips markup", () => {
    const a = parseCrossrefItem(item)!;
    expect(a.doi).toBe("10.1038/s41590-024-01234-5");
    expect(a.title).toBe("Treg cells in tissue repair");
    expect(a.abstract).toBe("Regulatory T cells & repair.");
    expect(a.published).toBe("2024-03-07");
    expect(a.authors).toEqual(["Ada Lovelace"]);
  });
  it("never fabricates a record without DOI or title", () => {
    expect(parseCrossrefItem({ ...item, DOI: undefined })).toBeNull();
    expect(parseCrossrefItem({ ...item, title: [] })).toBeNull();
  });
  it("leaves abstract empty when none was deposited", () => {
    expect(parseCrossrefItem({ ...item, abstract: undefined })!.abstract).toBeNull();
  });
  it("counts only Creative Commons licences as open access", () => {
    expect(isOpenAccess(["https://www.springernature.com/gp/researchers/text-and-data-mining"])).toBe(false);
    expect(isOpenAccess(["http://creativecommons.org/licenses/by/4.0/"])).toBe(true);
  });
  it("de-duplicates by DOI regardless of case or prefix", () => {
    const rows = [{ doi: "10.1038/ABC" }, { doi: "https://doi.org/10.1038/abc" }, { doi: "10.1038/xyz" }];
    expect(dedupeByDoi(rows)).toHaveLength(2);
    expect(normaliseDoi("doi:10.1038/ABC")).toBe("10.1038/abc");
  });
  it("targets the Nature Immunology ISSN and caps page size at 40", () => {
    const s = librarySearchSchema.parse({ q: "interferon", fromYear: 2020, journal: "1529-2908" });
    const url = buildCrossrefUrl(s);
    expect(url).toContain("/journals/1529-2908/works");
    expect(url).toContain("from-pub-date%3A2020");
    expect(librarySearchSchema.safeParse({ rows: 41 }).success).toBe(false);
  });
  it("applies the open-access filter and stops paging on a short page", () => {
    const s = librarySearchSchema.parse({ openAccessOnly: true, rows: 20 });
    const page = parseCrossrefPage({ message: { items: [item], "next-cursor": "abc", "total-results": 1 } }, s, "t");
    expect(page.articles).toHaveLength(0);
    expect(page.nextCursor).toBeNull();
  });
  it("advances by offset when a full page arrives", () => {
    const s = librarySearchSchema.parse({ rows: 1 });
    const page = parseCrossrefPage({ message: { items: [item], "total-results": 5 } }, s, "t");
    expect(page.nextCursor).toBe("1");
    expect(buildCrossrefUrl(s)).toContain("sort=published");
  });
});

describe("proposed articles stay candidates", () => {
  it("a library proposal creates an unreviewed draft, never an approval", () => {
    const p = createLiteratureProject("core", "ext", { source: "paste_metadata", doi: "10.1038/abc", title: "T" });
    expect(p.status).toBe("draft_scaffold");
    expect(p.claims).toHaveLength(0);
    expect(p.search.doi).toBe("10.1038/abc");
  });
});

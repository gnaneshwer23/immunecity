import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AUDIENCES } from "@/data/audiences";
import { CITY_CTA, CITY_PATH, COMMUNITY_PATH, HERO_HEADLINE } from "@/lib/brand";
import { accountLabel, accountPowers } from "@/lib/access/roles";
import { catalogGroups, searchConcepts, searchCourses, SEARCH_GROUP_ORDER } from "@/lib/siteSearch";
import { KG } from "@/lib/immune/engine";

describe("catalog search groups", () => {
  it("keeps concepts, publications, courses, and discussions in separate groups", () => {
    const concept = searchConcepts("TNF", 3)[0];
    expect(concept?.kind).toBe("concept");
    const groups = catalogGroups({
      concepts: concept ? [concept] : [],
      courses: searchCourses("innate", 2),
      publications: {
        state: "ready",
        items: [{ kind: "publication", id: "ev-1", title: "TNF — stored record", nodeId: "M001", status: "approved · supports" }],
      },
      discussions: { state: "empty", items: [] },
    });
    expect(groups.map((group) => group.id)).toEqual([...SEARCH_GROUP_ORDER]);
    expect(groups.find((group) => group.id === "concepts")?.items.every((item) => item.kind === "concept")).toBe(true);
    expect(groups.find((group) => group.id === "publications")?.items.every((item) => item.kind === "publication")).toBe(true);
    expect(groups.find((group) => group.id === "courses")?.items.every((item) => item.kind === "course")).toBe(true);
    expect(groups.find((group) => group.id === "discussions")?.note).toMatch(/No discussions match/);
    expect(groups.find((group) => group.id === "publications")?.items[0]?.status).toBe("approved · supports");
  });

  it("marks Academy scaffolds as not finished and leaves an empty publication bucket explicit", () => {
    const scaffolds = searchCourses("systems integration", 4);
    expect(scaffolds.length).toBeGreaterThan(0);
    expect(scaffolds.every((hit) => hit.status === "Not finished")).toBe(true);
    const foundation = searchCourses("TLR4", 4);
    expect(foundation.some((hit) => hit.status === "Navigable")).toBe(true);
    const empty = catalogGroups({
      concepts: [],
      courses: [],
      publications: { state: "empty", items: [] },
      discussions: { state: "unavailable", items: [] },
    });
    expect(empty.find((group) => group.id === "publications")?.note).toMatch(/does not use the open web/);
    expect(empty.find((group) => group.id === "discussions")?.note).toBe("Discussion search is unavailable.");
  });

  it("links concept hits to graph ids that exist", () => {
    const node = KG.nodes.find((item) => item.name.length > 3);
    expect(node).toBeTruthy();
    const hits = searchConcepts(node!.name.slice(0, 4), 8);
    expect(hits.some((hit) => hit.id === node!.id)).toBe(true);
    if (node!.draft) expect(hits.find((hit) => hit.id === node!.id)?.status).toBe("Draft");
  });
});

describe("homepage phase 1 routes", () => {
  it("uses the blueprint headline; Ask-first home keeps brand CTAs available", () => {
    expect(HERO_HEADLINE).toBe("Understand the Immune System Like Never Before");
    expect(CITY_CTA).toBe("Explore Immune City");
    expect(CITY_PATH).toBe("/graph");
    expect(COMMUNITY_PATH).toBe("/community");
    const home = readFileSync(resolve(process.cwd(), "src/routes/index.tsx"), "utf8");
    expect(home).toContain('to="/ask"');
    expect(home).toContain("EXPLORE_PATH");
    expect(AUDIENCES.map((item) => item.to)).toEqual([
      "/academy",
      "/learn",
      "/research",
      "/disclaimer",
      "/collaborate",
      "/atlas",
    ]);
    expect(AUDIENCES.find((item) => item.id === "clinician")?.note).toMatch(/Not clinical decision support/);
  });
});

describe("role powers", () => {
  it("keeps visitor, member, moderator, reviewer, and administrator distinct", () => {
    expect(accountPowers([], false)).toMatchObject({
      visitor: true,
      member: false,
      moderator: false,
      reviewer: false,
      administrator: false,
    });
    const member = accountPowers(["user"], true);
    expect(member).toMatchObject({ member: true, moderator: false, reviewer: false, administrator: false });
    expect(accountLabel(member)).toBe("member");
    expect(accountPowers(["moderator"], true).moderator).toBe(true);
    expect(accountPowers(["moderator"], true).reviewer).toBe(false);
    expect(accountPowers(["reviewer"], true)).toMatchObject({ reviewer: true, moderator: false, administrator: false });
    expect(accountLabel(accountPowers(["reviewer"], true))).toBe("scientific reviewer");
    expect(accountPowers(["admin"], true)).toMatchObject({
      administrator: true,
      moderator: true,
      reviewer: true,
    });
    expect(accountLabel(accountPowers(["admin"], true))).toBe("administrator");
  });

  it("runs the role query through the sql client instead of tagging getSqlClient", () => {
    const src = readFileSync(resolve(process.cwd(), "src/lib/access/roles.server.ts"), "utf8");
    expect(src).toContain("const sql = getSqlClient()");
    expect(src).toContain("await sql<");
    expect(src).not.toContain("await getSqlClient<");
  });

  it("does not grant moderator or reviewer in the signup SQL", () => {
    const neon = readFileSync(resolve(process.cwd(), "drizzle/neon/0000_immune_city_public_schema.sql"), "utf8");
    const signup = readFileSync(resolve(process.cwd(), "drizzle/migrations/0003_explicit_admin_provisioning.sql"), "utf8");
    expect(neon).toContain("VALUES (NEW.id, 'user')");
    expect(signup).toContain("VALUES (NEW.id, 'user')");
    expect(neon).not.toMatch(/VALUES \(NEW\.id, '(moderator|reviewer|admin)'\)/);
    expect(signup).not.toMatch(/VALUES \(NEW\.id, '(moderator|reviewer|admin)'\)/);
  });

  it("adds role labels without rewriting existing rows", () => {
    const sql = readFileSync(resolve(process.cwd(), "drizzle/migrations/0009_app_role_moderator_reviewer.sql"), "utf8");
    expect(sql).toContain("ADD VALUE IF NOT EXISTS 'moderator'");
    expect(sql).toContain("ADD VALUE IF NOT EXISTS 'reviewer'");
    expect(sql).not.toMatch(/\b(UPDATE|INSERT|DELETE)\b/);
    expect(sql).not.toContain("evidence_records");
  });
});

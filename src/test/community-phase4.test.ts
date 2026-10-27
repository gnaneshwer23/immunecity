import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "bun:test";
import { JOURNEY_PRIMARY } from "@/data/marketingNav";
import { byId } from "@/lib/immune/engine";
import {
  conceptIdsSavedBy,
  CONCEPT_SAVE_TABLE,
  planConceptSave,
  toggleMemberConceptSave,
  workspaceForMember,
  type WorkspaceConceptSave,
} from "@/lib/community/rules";

const known = new Set(Object.keys(byId));
const conceptId = Object.keys(byId)[0]!;

describe("concept save", () => {
  it("rejects an unknown concept id and does not add a graph node", () => {
    const before = known.size;
    const saves: WorkspaceConceptSave[] = [];
    const plan = planConceptSave({ userId: "member-a", conceptId: "NOT_A_CONCEPT", known });
    expect(plan.ok).toBe(false);
    const toggled = toggleMemberConceptSave(saves, { userId: "member-a", conceptId: "NOT_A_CONCEPT", known });
    expect(toggled.ok).toBe(false);
    if (!toggled.ok) expect(toggled.saves).toBe(saves);
    expect(known.size).toBe(before);
    expect(known.has("NOT_A_CONCEPT")).toBe(false);
    expect(planConceptSave({ userId: "", conceptId, known }).ok).toBe(false);
  });

  it("keeps a save on the member who made it", () => {
    const before = known.size;
    const first = toggleMemberConceptSave([], { userId: "member-a", conceptId, known });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.saved).toBe(true);
    expect(conceptIdsSavedBy(first.saves, "member-a")).toEqual([conceptId]);
    expect(conceptIdsSavedBy(first.saves, "member-b")).toEqual([]);
    const second = toggleMemberConceptSave(first.saves, { userId: "member-b", conceptId, known });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(conceptIdsSavedBy(second.saves, "member-a")).toEqual([conceptId]);
    expect(conceptIdsSavedBy(second.saves, "member-b")).toEqual([conceptId]);
    const cleared = toggleMemberConceptSave(second.saves, { userId: "member-a", conceptId, known });
    expect(cleared.ok).toBe(true);
    if (!cleared.ok) return;
    expect(cleared.saved).toBe(false);
    expect(conceptIdsSavedBy(cleared.saves, "member-a")).toEqual([]);
    expect(conceptIdsSavedBy(cleared.saves, "member-b")).toEqual([conceptId]);
    expect(known.size).toBe(before);
  });
});

describe("workspace", () => {
  it("lists only that member and does not write the graph", () => {
    const before = known.size;
    const otherId = Object.keys(byId)[1] ?? conceptId;
    const view = workspaceForMember({
      userId: "member-a",
      conceptSaves: [
        { userId: "member-a", conceptId },
        { userId: "member-b", conceptId: otherId },
        { userId: "member-a", conceptId: "NOT_A_CONCEPT" },
      ],
      topicFollows: [
        { userId: "member-a", slug: "methods", title: "Methods" },
        { userId: "member-b", slug: "other", title: "Other" },
      ],
      posts: [
        { id: "post-a", title: "Written by A", authorId: "member-a", status: "visible" },
        { id: "post-b", title: "Written by B", authorId: "member-b", status: "visible" },
        { id: "post-c", title: "Followed by A", authorId: "member-c", status: "visible" },
      ],
      postFollows: [
        { userId: "member-a", postId: "post-c" },
        { userId: "member-b", postId: "post-a" },
      ],
      known,
    });
    expect(view.concepts).toEqual([{ id: conceptId }]);
    expect(view.topics).toEqual([{ slug: "methods", title: "Methods" }]);
    expect(view.discussions.map((post) => post.id)).toEqual(["post-a", "post-c"]);
    expect(view.discussions.find((post) => post.id === "post-b")).toBeUndefined();
    expect(known.size).toBe(before);
    expect(known.has("NOT_A_CONCEPT")).toBe(false);

    const migration = readFileSync(resolve(process.cwd(), "drizzle/migrations/0012_concept_saves.sql"), "utf8");
    const server = readFileSync(resolve(process.cwd(), "src/lib/workspace.functions.ts"), "utf8");
    const panel = readFileSync(resolve(process.cwd(), "src/components/immune/EntityActions.tsx"), "utf8");
    const lessons = readFileSync(resolve(process.cwd(), "src/components/immune/LessonDiscussions.tsx"), "utf8");
    expect(migration).toContain(CONCEPT_SAVE_TABLE);
    expect(migration).not.toMatch(/\b(evidence_records|evidence_audit_events|claim_candidates|user_roles)\b/);
    expect(server).not.toMatch(/\b(evidence_records|evidence_audit_events|claim_candidates|user_roles)\b/);
    expect(server).not.toMatch(/kg\.json|writeFile/);
    expect(server).toMatch(/\.insert\(conceptSaves\)/);
    expect(server).not.toMatch(/\.insert\(community|\.update\(community|\.delete\(community/);
    expect(panel).toContain("Start a discussion");
    expect(panel).toContain('to="/community/new"');
    expect(panel).not.toContain("createCommunityPost");
    expect(lessons).toContain("Start a discussion");
    expect(lessons).toContain('to="/community/new"');
    expect(JOURNEY_PRIMARY.some((item) => item.label === "My Workspace" || item.path === "/workspace")).toBe(false);
    const community = readFileSync(resolve(process.cwd(), "src/routes/community.index.tsx"), "utf8");
    const workspace = readFileSync(resolve(process.cwd(), "src/routes/workspace.tsx"), "utf8");
    expect(community).toContain("Start a discussion");
    expect(community).toContain('redirect: "/community/new"');
    expect(community).not.toMatch(/>New post</);
    expect(workspace).toContain("personal dashboard");
    expect(workspace).toContain('to="/community/new"');
  });
});

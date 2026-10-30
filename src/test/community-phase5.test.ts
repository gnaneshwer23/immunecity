import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "bun:test";
import { SPECIALIST_DRAFTS, runSpecialistDraft } from "@/lib/ai/specialistDrafts";
import { ASK_EVALUATION_OUTCOMES, askEvaluationFromGate } from "@/lib/askEvaluation";
import { exportForMember, planMemberDeletion, type PrivacyBundle } from "@/lib/privacy";
import { RELEASE_LANDMARKS, WEB_VITAL_BUDGETS } from "@/lib/releaseBudgets";

const root = process.cwd();

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

const bundle: PrivacyBundle = {
  profiles: [
    { userId: "member-a", displayName: "Ada", bio: "Teacher", affiliation: "Lab", credential: "PhD", interests: ["methods"], visibility: "public" },
    { userId: "member-b", displayName: "Bea", bio: "Private bio", affiliation: null, credential: null, interests: [], visibility: "members" },
  ],
  posts: [
    { id: "post-a", authorId: "member-a", title: "Tolerance note", body: "Educational text.", status: "visible" },
    { id: "post-b", authorId: "member-b", title: "Other note", body: "Someone else's text.", status: "visible" },
  ],
  comments: [
    { id: "comment-a", authorId: "member-a", postId: "post-b", body: "A reply.", status: "visible" },
    { id: "comment-b", authorId: "member-b", postId: "post-a", body: "Another reply.", status: "visible" },
  ],
  saves: [
    { id: "save-a", userId: "member-a", targetType: "post", targetId: "post-b" },
    { id: "save-b", userId: "member-b", targetType: "post", targetId: "post-a" },
  ],
  follows: [
    { id: "follow-a", userId: "member-a", kind: "post", targetId: "post-b" },
    { id: "follow-b", userId: "member-b", kind: "topic", targetId: "topic-b" },
  ],
  notifications: [
    { id: "note-a", userId: "member-a", kind: "post_reply", body: "New reply" },
    { id: "note-b", userId: "member-b", kind: "post_reply", body: "Private notice" },
  ],
  conceptSaves: [
    { id: "concept-a", userId: "member-a", conceptId: "C001" },
    { id: "concept-b", userId: "member-b", conceptId: "C002" },
  ],
  evidenceIds: ["ev-1", "ev-2"],
};

describe("logout", () => {
  it("places Logout in the account menu and the compact menu", () => {
    const shell = readFileSync(resolve(root, "src/components/immune/Shell.tsx"), "utf8");
    const account = shell.slice(shell.indexOf("function HeaderAccount"), shell.indexOf("function PillarMenu"));
    const header = shell.slice(shell.indexOf("<header"), shell.indexOf("</header>"));
    expect(account.match(/>Logout</g)?.length).toBe(2);
    expect(account).toContain("neonAuth.signOut");
    expect(account).toContain('variant === "compact"');
    expect(account).toContain('window.location.assign("/")');
    expect(header).not.toContain("Logout");
    expect(header).not.toContain("SiteSearch");
    expect(shell).toContain('"Ask Immune"');
  });
});

describe("member export", () => {
  it("keeps the file to that member", () => {
    const mine = exportForMember("member-a", bundle);
    expect(mine.profile?.displayName).toBe("Ada");
    expect(mine.posts.map((row) => row.id)).toEqual(["post-a"]);
    expect(mine.comments.map((row) => row.id)).toEqual(["comment-a"]);
    expect(mine.saves.map((row) => row.id)).toEqual(["save-a"]);
    expect(mine.follows.map((row) => row.id)).toEqual(["follow-a"]);
    expect(mine.notifications.map((row) => row.id)).toEqual(["note-a"]);
    expect(mine.conceptSaves.map((row) => row.id)).toEqual(["concept-a"]);
    expect(JSON.stringify(mine)).not.toContain("member-b");
    expect(JSON.stringify(mine)).not.toContain("ev-1");
    const server = readFileSync(resolve(root, "src/lib/privacy.functions.ts"), "utf8");
    expect(server).not.toMatch(/\b(evidence_records|evidenceRecords|user_roles|userRoles|claim_candidates|claimCandidates)\b/);
  });
});

describe("member deletion", () => {
  it("anonymizes posts and leaves evidence ids untouched", () => {
    const plan = planMemberDeletion("member-a", bundle);
    expect(plan.anonymizedProfile?.displayName).toBe("Removed member");
    expect(plan.anonymizedProfile?.bio).toBeNull();
    expect(plan.anonymizedProfile?.credential).toBeNull();
    expect(plan.retainedPostIds).toEqual(["post-a"]);
    expect(plan.retainedCommentIds).toEqual(["comment-a"]);
    expect(plan.deleteNotificationIds).toEqual(["note-a"]);
    expect(plan.deleteSaveIds).toEqual(["save-a"]);
    expect(plan.deleteFollowIds).toEqual(["follow-a"]);
    expect(plan.deleteConceptSaveIds).toEqual(["concept-a"]);
    expect(plan.evidenceIds).toEqual(["ev-1", "ev-2"]);
    const deleted = [
      ...plan.deleteNotificationIds,
      ...plan.deleteSaveIds,
      ...plan.deleteFollowIds,
      ...plan.deleteConceptSaveIds,
    ];
    expect(deleted.some((id) => plan.evidenceIds.includes(id))).toBe(false);
    expect(plan.writesGraph).toBe(false);
    expect(plan.changesRoles).toBe(false);
    const server = readFileSync(resolve(root, "src/lib/privacy.functions.ts"), "utf8");
    expect(server).not.toMatch(/\.delete\(communityPosts|\.delete\(communityComments|\.delete\(evidence/);
    expect(server).toContain("REMOVED_MEMBER_NAME");
  });
});

describe("ask evaluation log", () => {
  it("records the existing gate reason codes and redacts a personal question", () => {
    expect(ASK_EVALUATION_OUTCOMES).toEqual([
      "allowed",
      "abstained",
      "citation_rejected",
      "conflict",
      "context_mismatch",
    ]);
    const personal = askEvaluationFromGate({
      callModel: false,
      abstentionReason: "clinical_personal",
      personalHealth: true,
      validation: null,
      promptVersion: "ask-grounding-v10",
    });
    expect(personal).toEqual({
      outcome: "abstained",
      reasonCode: "clinical_personal",
      questionRedacted: true,
      promptVersion: "ask-grounding-v10",
    });
    expect(Object.keys(personal).sort()).toEqual(
      ["outcome", "promptVersion", "questionRedacted", "reasonCode"].sort(),
    );
    expect(askEvaluationFromGate({
      callModel: false,
      abstentionReason: "no_graph_match",
      personalHealth: false,
      validation: null,
      promptVersion: "ask-grounding-v10",
    }).reasonCode).toBe("no_graph_match");
    expect(askEvaluationFromGate({
      callModel: true,
      abstentionReason: null,
      personalHealth: false,
      validation: { ok: false, contextMismatches: ["species"], conflictCollapses: ["conflict-not-surfaced"] },
      promptVersion: "ask-grounding-v10",
    })).toEqual({
      outcome: "context_mismatch",
      reasonCode: "context_mismatch",
      questionRedacted: false,
      promptVersion: "ask-grounding-v10",
    });
    expect(askEvaluationFromGate({
      callModel: true,
      abstentionReason: null,
      personalHealth: false,
      validation: { ok: false, contextMismatches: [], conflictCollapses: ["conflict-not-surfaced"] },
      promptVersion: "ask-grounding-v10",
    }).outcome).toBe("conflict");
    expect(askEvaluationFromGate({
      callModel: true,
      abstentionReason: null,
      personalHealth: false,
      validation: { ok: false, contextMismatches: [], conflictCollapses: [] },
      promptVersion: "ask-grounding-v10",
    }).outcome).toBe("citation_rejected");
    expect(askEvaluationFromGate({
      callModel: true,
      abstentionReason: null,
      personalHealth: false,
      validation: { ok: true, contextMismatches: [], conflictCollapses: [] },
      promptVersion: "ask-grounding-v10",
    })).toEqual({
      outcome: "allowed",
      reasonCode: "allowed",
      questionRedacted: false,
      promptVersion: "ask-grounding-v10",
    });
    const logger = readFileSync(resolve(root, "src/lib/askEvaluation.server.ts"), "utf8");
    expect(logger).not.toMatch(/questionText|confidence|apiKey|DATABASE_URL/);
    expect(logger).toContain("questionRedacted: record.questionRedacted");
    expect(logger).toContain("promptVersion: record.promptVersion");
    const sql = readFileSync(resolve(root, "drizzle/migrations/0013_ai_evaluation_runs.sql"), "utf8");
    expect(sql).toContain("ai_evaluation_runs");
    expect(sql).not.toMatch(/\b(evidence_records|question_text|confidence)\b/);
    const sql14 = readFileSync(resolve(root, "drizzle/migrations/0014_ai_evaluation_prompt_version.sql"), "utf8");
    expect(sql14).toContain("prompt_version");
  });
});

describe("release checks", () => {
  it("keeps the vital budgets and the main and header landmarks", () => {
    expect(WEB_VITAL_BUDGETS).toEqual({ lcpMs: 2500, inpMs: 200, cls: 0.1 });
    const budgets = readFileSync(resolve(root, "src/lib/releaseBudgets.ts"), "utf8");
    expect(budgets).toContain("lcpMs: 2500");
    expect(budgets).toContain("inpMs: 200");
    expect(budgets).toContain("cls: 0.1");
    const shell = readFileSync(resolve(root, "src/components/immune/Shell.tsx"), "utf8");
    const layout = readFileSync(resolve(root, "src/routes/__root.tsx"), "utf8");
    expect(shell).toContain(`<main id="${RELEASE_LANDMARKS.mainId}"`);
    expect(shell).toContain(`aria-label="${RELEASE_LANDMARKS.headerNavLabel}"`);
    expect(layout).toContain("<Shell>");
    expect(layout).toContain("<Outlet />");
    const routes = walk(resolve(root, "src/routes")).filter((path) => path.endsWith(".tsx") || path.endsWith(".ts"));
    expect(routes.length).toBeGreaterThan(20);
    expect(routes.some((path) => path.endsWith(`${join("src", "routes", "__root.tsx")}`))).toBe(true);
  });
});

describe("specialist drafts", () => {
  it("lists the four review drafts and refuses to run them", () => {
    expect(SPECIALIST_DRAFTS.map((draft) => draft.name)).toEqual([
      "Immune Tutor",
      "Mechanism Explorer",
      "Evidence Analyst",
      "Community Safety Assistant",
    ]);
    expect(SPECIALIST_DRAFTS.every((draft) => draft.status === "draft_pending_review")).toBe(true);
    for (const draft of SPECIALIST_DRAFTS) {
      expect(runSpecialistDraft(draft.id)).toEqual({
        ok: false,
        status: "draft_pending_review",
        publishes: false,
        writesGraph: false,
        medicalAdvice: false,
      });
    }
    const page = readFileSync(resolve(root, "src/components/immune/SpecialistDrafts.tsx"), "utf8");
    expect(page).toContain("Draft pending human review");
    expect(page).not.toMatch(/onClick|fetch\(|runSpecialistDraft/);
    const names = SPECIALIST_DRAFTS.map((draft) => draft.name).join(" ");
    expect(names).not.toMatch(/Journal Club Assistant|Knowledge Curator|Hypothesis Agent/);
  });
});

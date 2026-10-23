import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "bun:test";
import { JOURNEY_NAV, JOURNEY_PRIMARY } from "@/data/marketingNav";
import {
  appealDecisionRecipient,
  COMMUNITY_FORBIDDEN_WRITES,
  COMMUNITY_PHASE3_WRITE_TABLES,
  membershipRoleForNewMember,
  NOTIFICATION_KINDS,
  paperStatusForClub,
  planAppeal,
  planAppealDecision,
  planJournalClub,
  planPostEdit,
  planPostFollow,
  planSaveTarget,
  profileViewFor,
  replyNotificationRecipients,
  validateProfileDraft,
  type CommunityProfileFields,
} from "@/lib/community/rules";

const topics = new Set(["immunology-basics", "methods"]);

function profile(overrides: Partial<CommunityProfileFields> = {}): CommunityProfileFields {
  return {
    userId: "11111111-1111-4111-8111-111111111111",
    displayName: "Ada",
    bio: "Educational notes.",
    interests: ["methods"],
    affiliation: null,
    visibility: "public",
    credential: "Reader",
    credentialStatus: "unverified",
    notificationsPaused: false,
    ...overrides,
  };
}

describe("profile visibility", () => {
  it("shows a public profile to a visitor and hides a members-only profile", () => {
    const pub = profileViewFor(profile(), { signedIn: false, userId: null });
    expect(pub.access).toBe("full");
    if (pub.access === "full") {
      expect(pub.profile.bio).toBe("Educational notes.");
      expect(pub.profile.notificationsPaused).toBeUndefined();
      expect(pub.profile.credentialStatus).toBe("unverified");
    }
    const hidden = profileViewFor(profile({ visibility: "members" }), { signedIn: false, userId: null });
    expect(hidden).toEqual({ access: "restricted", visibility: "members" });
  });

  it("shows a members-only profile to a signed-in member and keeps pause state for the owner", () => {
    const member = profileViewFor(profile({ visibility: "members" }), { signedIn: true, userId: "other" });
    expect(member.access).toBe("full");
    if (member.access === "full") expect(member.owner).toBe(false);
    const owner = profileViewFor(profile({ visibility: "members", notificationsPaused: true }), {
      signedIn: true,
      userId: profile().userId,
    });
    expect(owner.access).toBe("full");
    if (owner.access === "full") expect(owner.profile.notificationsPaused).toBe(true);
  });

  it("accepts only existing topics and never marks a credential verified", () => {
    const bad = validateProfileDraft({
      displayName: "Ada",
      bio: "",
      interests: ["not-a-topic"],
      affiliation: "",
      visibility: "public",
      credential: "PhD",
      notificationsPaused: false,
      topicSlugs: topics,
    });
    expect(bad.ok).toBe(false);
    const ok = validateProfileDraft({
      displayName: "Ada",
      bio: "",
      interests: ["methods", "methods"],
      affiliation: "",
      visibility: "members",
      credential: "PhD",
      notificationsPaused: false,
      topicSlugs: topics,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.interests).toEqual(["methods"]);
      expect(ok.credentialStatus).toBe("unverified");
      expect(ok.notificationsPaused).toBe(false);
    }
  });
});

describe("header", () => {
  it("uses the reference row and keeps Ask inside Learn", () => {
    expect(JOURNEY_NAV.map((group) => group.label)).toEqual(["Learn", "Explore", "Investigate", "Trust"]);
    expect(JOURNEY_PRIMARY.map((item) => [item.label, item.path])).toEqual([
      ["Research", "/research"],
      ["Simulate", "/simulator"],
      ["Community", "/community"],
    ]);
    expect(JOURNEY_NAV.find((group) => group.label === "Learn")!.items.some((item) => item.path === "/ask")).toBe(true);
    const shell = readFileSync(resolve(process.cwd(), "src/components/immune/Shell.tsx"), "utf8");
    const header = shell.slice(shell.indexOf("<header"), shell.indexOf("</header>"));
    expect(header).not.toContain("Ask Immune");
    expect(header).toContain("HeaderAccount");
    expect(shell).toContain("header-signin");
    expect(shell).toContain("AskAtlas");
    expect(shell).not.toContain("SiteSearch");
    const account = shell.slice(shell.indexOf("function HeaderAccount"), shell.indexOf("function PillarMenu"));
    expect(account).toContain('to="/auth"');
    expect(account).toContain("header-signin");
    const db = readFileSync(resolve(process.cwd(), "src/lib/db.server.ts"), "utf8");
    const driver = readFileSync(resolve(process.cwd(), "src/lib/db/driver.server.ts"), "utf8");
    const clientDriver = readFileSync(resolve(process.cwd(), "src/lib/db/driver.client.ts"), "utf8");
    expect(db).not.toMatch(/from ["']postgres["']/);
    expect(db).not.toMatch(/from ["']drizzle-orm\/postgres-js["']/);
    expect(db).not.toContain("vite-ignore");
    expect(db).not.toContain("typeof window");
    expect(db).toContain('from "@/lib/db/driver.server"');
    expect(driver).toMatch(/from ["']postgres["']/);
    expect(driver).toMatch(/from ["']drizzle-orm\/postgres-js["']/);
    expect(driver).not.toContain("vite-ignore");
    expect(driver).not.toContain("typeof window");
    expect(driver).toContain("export function getDb()");
    expect(driver).toContain("export function getSqlClient()");
    expect(clientDriver).not.toContain("postgres");
    expect(shell).not.toContain("db.server");
    expect(shell).not.toContain('from "postgres"');
    expect(account).toContain("My Workspace");
    expect(account).toContain('to="/workspace"');
    expect(header).not.toContain("My Workspace");
    expect(header).not.toContain('to="/workspace"');
    for (const icon of ["BookOpen", "Network", "Search", "Shield", "FlaskConical", "Box", "Users"]) {
      expect(shell).toContain(icon);
    }
  });
});

describe("edit history", () => {
  it("lets only the author replace the body and keeps a hidden post hidden", () => {
    const stranger = planPostEdit({
      actorId: "b",
      authorId: "a",
      currentBody: "Original educational text about tolerance.",
      nextBody: "A revised educational note about tolerance.",
      status: "hidden",
    });
    expect(stranger.ok).toBe(false);
    const same = planPostEdit({
      actorId: "a",
      authorId: "a",
      currentBody: "Original educational text about tolerance.",
      nextBody: "Original educational text about tolerance.",
      status: "visible",
    });
    expect(same.ok).toBe(false);
    const edit = planPostEdit({
      actorId: "a",
      authorId: "a",
      currentBody: "Original educational text about tolerance.",
      nextBody: "Revised educational text about tolerance mechanisms.",
      status: "hidden",
    });
    expect(edit).toMatchObject({
      ok: true,
      previousBody: "Original educational text about tolerance.",
      status: "hidden",
    });
  });
});

describe("save and follow", () => {
  it("refuses visitors and does not grant a role for following a post", () => {
    expect(planSaveTarget({ signedIn: false, targetType: "post" }).ok).toBe(false);
    expect(planSaveTarget({ signedIn: false, targetType: "comment" }).ok).toBe(false);
    expect(planPostFollow({ signedIn: false }).ok).toBe(false);
    expect(planSaveTarget({ signedIn: true, targetType: "concept" }).ok).toBe(false);
    expect(planSaveTarget({ signedIn: true, targetType: "post" })).toEqual({ ok: true, targetType: "post" });
    expect(planPostFollow({ signedIn: true })).toEqual({ ok: true });
    expect(membershipRoleForNewMember()).toBe("member");
  });
});

describe("appeal permissions", () => {
  it("lets a member appeal only a hidden item and lets only a moderator decide", () => {
    expect(planAppeal({ signedIn: false, targetStatus: "hidden", reason: "Please review this hide.", openAppealExists: false }).ok).toBe(false);
    expect(planAppeal({ signedIn: true, targetStatus: "visible", reason: "Please review this hide.", openAppealExists: false }).ok).toBe(false);
    const appeal = planAppeal({ signedIn: true, targetStatus: "hidden", reason: "Please review this hide.", openAppealExists: false });
    expect(appeal).toEqual({ ok: true, reason: "Please review this hide." });
    expect(planAppealDecision({ actorCanModerate: false, decision: "restore", reason: "Restoring after review.", appealOpen: true }).ok).toBe(false);
    expect(planAppealDecision({ actorCanModerate: true, decision: "uphold", reason: "The hide still stands.", appealOpen: true })).toMatchObject({
      ok: true,
      decision: "uphold",
      nextStatus: "hidden",
    });
    expect(planAppealDecision({ actorCanModerate: true, decision: "restore", reason: "Restoring after review.", appealOpen: true })).toMatchObject({
      nextStatus: "visible",
    });
    expect(planAppealDecision({ actorCanModerate: true, decision: "restore", reason: "Restoring after review.", appealOpen: false }).ok).toBe(false);
  });
});

describe("notification creation", () => {
  it("notifies followers except the author and anyone who paused", () => {
    expect(NOTIFICATION_KINDS).toEqual(["post_reply", "appeal_decision"]);
    expect(replyNotificationRecipients({
      followerIds: ["author", "paused", "reader", "reader"],
      authorId: "author",
      pausedUserIds: new Set(["paused"]),
    })).toEqual(["reader"]);
    expect(appealDecisionRecipient({ appellantId: "author", paused: false })).toBe("author");
    expect(appealDecisionRecipient({ appellantId: "author", paused: true })).toBeNull();
  });
});

describe("journal clubs", () => {
  it("requires a moderator, keeps membership as member, and does not invent a paper title", () => {
    const refused = planJournalClub({
      actorCanModerate: false,
      actorId: "mod",
      title: "TNF journal club",
      agenda: "Discuss the educational pathway only. No treatment advice.",
      scheduledAt: "2026-11-02T18:00:00.000Z",
      requestedFacilitatorId: null,
      requestedFacilitatorCanModerate: false,
    });
    expect(refused.ok).toBe(false);
    const club = planJournalClub({
      actorCanModerate: true,
      actorId: "mod",
      title: "TNF journal club",
      agenda: "Discuss the educational pathway only. No treatment advice.",
      scheduledAt: "2026-11-02T18:00:00.000Z",
      requestedFacilitatorId: "other",
      requestedFacilitatorCanModerate: false,
    });
    expect(club.ok).toBe(false);
    const ok = planJournalClub({
      actorCanModerate: true,
      actorId: "mod",
      title: "TNF journal club",
      agenda: "Discuss the educational pathway only. No treatment advice.",
      scheduledAt: "2026-11-02T18:00:00.000Z",
      requestedFacilitatorId: null,
      requestedFacilitatorCanModerate: true,
      pmid: "12345",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.membershipRole).toBe("member");
      expect(ok.postKind).toBe("journal_club");
      expect(ok.facilitatorId).toBe("mod");
    }
    expect(paperStatusForClub({ pmid: "12345", doi: null, approvedMatch: false })).toMatchObject({
      paperStatus: "unverified",
      title: null,
    });
    expect(paperStatusForClub({ pmid: "12345", doi: null, approvedMatch: true })).toMatchObject({
      paperStatus: "matched",
      title: null,
    });
  });

  it("keeps the phase 3 migration off curated evidence and role tables", () => {
    const migration = readFileSync(resolve(process.cwd(), "drizzle/migrations/0011_community_phase3.sql"), "utf8");
    const server = readFileSync(resolve(process.cwd(), "src/lib/community/phase3.functions.ts"), "utf8");
    const reader = readFileSync(resolve(process.cwd(), "src/lib/community/approvedPaper.server.ts"), "utf8");
    for (const table of COMMUNITY_FORBIDDEN_WRITES) {
      expect(migration.includes(table), table).toBe(false);
      expect(server.includes(table), table).toBe(false);
    }
    for (const table of COMMUNITY_PHASE3_WRITE_TABLES) expect(migration.includes(table)).toBe(true);
    expect(reader).not.toMatch(/\.insert\(evidenceRecords|\.update\(evidenceRecords|\.delete\(evidenceRecords/);
    expect(server).not.toMatch(/user_roles|membershipRole:\s*"moderator"/);
    const shell = readFileSync(resolve(process.cwd(), "src/components/immune/Shell.tsx"), "utf8");
    const account = shell.slice(shell.indexOf("function HeaderAccount"), shell.indexOf("function PillarMenu"));
    const header = shell.slice(shell.indexOf("<header"), shell.indexOf("</header>"));
    expect(account).toContain("My Workspace");
    expect(header).not.toContain("My Workspace");
    expect(header).not.toContain('to="/workspace"');
  });
});

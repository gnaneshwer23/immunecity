import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { byId } from "@/lib/immune/engine";
import {
  COMMUNITY_FORBIDDEN_WRITES,
  COMMUNITY_WRITE_TABLES,
  decideReferenceStorage,
  membershipRoleForNewMember,
  parseCitationFields,
  planEntityLinks,
  planModeration,
  requireMember,
  validateCommentBody,
  validatePostDraft,
} from "@/lib/community/rules";

describe("community server rules", () => {
  it("refuses visitor writes and does not grant moderator on join", () => {
    expect(requireMember(null).ok).toBe(false);
    expect(requireMember("").ok).toBe(false);
    expect(requireMember("user-1").ok).toBe(true);
    expect(membershipRoleForNewMember()).toBe("member");
  });

  it("rejects personal medical advice and identifiable patient details", () => {
    const advice = validatePostDraft({
      kind: "question",
      title: "Dosing",
      body: "I should start prednisone for my arthritis this week.",
    });
    expect(advice.ok).toBe(false);
    const phi = validateCommentBody("The patient name is Jane and her NHS number is 123.");
    expect(phi.ok).toBe(false);
    const ok = validatePostDraft({
      kind: "discussion",
      title: "How does TNF signalling work?",
      body: "Looking for the educational pathway from TNF to inflammation, not a personal regimen.",
    });
    expect(ok.ok).toBe(true);
  });

  it("stores a failed lookup as unverified and does not invent a title or PMID", () => {
    const parsed = parseCitationFields({ pmid: "PMID 99999999", doi: "" });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const stored = decideReferenceStorage(parsed, { status: "not_found", detail: { reason: "PMID 99999999 not found" } });
    expect(stored.pmid).toBe("99999999");
    expect(stored.verificationStatus).toBe("unverified");
    expect(stored.title).toBeNull();
    expect(stored.doi).toBeNull();
    const failed = decideReferenceStorage(parsed, { failed: true });
    expect(failed.verificationStatus).toBe("unverified");
    expect(failed.title).toBeNull();
    expect(failed.pmid).toBe("99999999");
  });

  it("keeps resolved metadata only when the lookup confirms the supplied identifier", () => {
    const parsed = parseCitationFields({ pmid: "", doi: "https://doi.org/10.1038/nri1234" });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const stored = decideReferenceStorage(parsed, {
      status: "verified",
      detail: { candidate: { title: "A real paper", journal: "Nat Rev Immunol", year: "2020", doi: "10.1038/nri1234", pmid: "" } },
    });
    expect(stored.verificationStatus).toBe("verified");
    expect(stored.doi).toBe("10.1038/nri1234");
    expect(stored.title).toBe("A real paper");
    expect(stored.pmid).toBeNull();
  });

  it("rejects unknown concept ids and does not treat them as graph inserts", () => {
    const bad = planEntityLinks(["NOT_A_CONCEPT"], new Set(Object.keys(byId)));
    expect(bad.ok).toBe(false);
    const id = Object.keys(byId)[0]!;
    const good = planEntityLinks([id, id], new Set(Object.keys(byId)));
    expect(good.ok).toBe(true);
    if (good.ok) expect(good.ids).toEqual([id]);
  });

  it("requires an admin and a reason before hide or restore", () => {
    expect(planModeration({ actorIsAdmin: false, action: "hide", reason: "Spam and off topic." }).ok).toBe(false);
    expect(planModeration({ actorIsAdmin: true, action: "hide", reason: "short" }).ok).toBe(false);
    const ok = planModeration({ actorIsAdmin: true, action: "restore", reason: "Report was a duplicate." });
    expect(ok).toEqual({ ok: true, action: "restore", reason: "Report was a duplicate." });
  });

  it("keeps the migration and write module off curated evidence tables", () => {
    const migration = readFileSync(resolve(process.cwd(), "drizzle/migrations/0008_community.sql"), "utf8");
    const server = readFileSync(resolve(process.cwd(), "src/lib/community.functions.ts"), "utf8");
    for (const table of COMMUNITY_FORBIDDEN_WRITES) {
      expect(migration.includes(table), table).toBe(false);
      expect(server.includes(table), table).toBe(false);
    }
    for (const table of COMMUNITY_WRITE_TABLES) expect(migration.includes(table)).toBe(true);
    expect(server.includes("membershipRoleForNewMember")).toBe(true);
    expect(server).not.toMatch(/membershipRole:\s*"moderator"/);
  });
});

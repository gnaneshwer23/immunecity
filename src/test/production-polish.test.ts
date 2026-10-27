import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { EXEMPLAR_MATURITY_SHORT } from "@/lib/immune/exemplarPathways";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("production polish", () => {
  it("keeps Logout in the account menu and leaves search and Ask out of the header", () => {
    const shell = source("src/components/immune/Shell.tsx");
    const account = shell.slice(shell.indexOf("function HeaderAccount"), shell.indexOf("function PillarMenu"));
    const header = shell.slice(shell.indexOf("<header"), shell.indexOf("</header>"));
    expect(account.match(/>Logout</g)?.length).toBe(2);
    expect(account).toContain("Profile");
    expect(account).toContain("My Workspace");
    expect(header).not.toContain("Logout");
    expect(header).not.toContain("Ask Immune");
    expect(header).not.toContain("SiteSearch");
    expect(shell).toContain('className="nav-label"');
    expect(source("src/biotech.css")).toContain(".journey-main .nav-label");
  });

  it("shows the community Sign in action only while signed out", () => {
    const index = source("src/routes/community.index.tsx");
    const signIn = index.indexOf(">Sign in</Link>");
    expect(index.slice(0, signIn)).toContain("member === null");
  });

  it("uses plain language on public teaching surfaces", () => {
    expect(source("src/routes/index.tsx")).not.toContain("scaffolds");
    expect(source("src/components/immune/AcademyTrack.tsx")).not.toContain("Gate C");
    expect(source("src/components/immune/AcademyTrack.tsx")).not.toContain("navigable scaffold");
    expect(source("src/components/immune/GraphView.tsx")).not.toContain("Gate C");
    expect(source("src/components/immune/AskAtlas.tsx")).not.toContain("scaffold");
    expect(source("src/lib/ask.server.ts")).not.toMatch(/Gate C overclaim/);
    expect(source("src/routes/reasoning.tsx")).toContain("EXEMPLAR_MATURITY_SHORT[report.maturity]");
    expect(source("src/routes/reasoning.tsx")).not.toContain("{report.maturity}");
    expect(EXEMPLAR_MATURITY_SHORT.scaffold).toBe("Early");
    expect(source("src/routes/auth.tsx")).not.toContain("Curation · Access");
    expect(source("src/routes/auth.tsx")).toContain('fallback(z.string(), "/workspace")');
  });

  it("asks for a moderation reason before the action can be sent", () => {
    const page = source("src/routes/community.moderation.tsx");
    expect(page).toContain("reason.trim().length < 8");
    expect(source("src/routes/community.profile.index.tsx").indexOf("Appeal reason")).toBeLessThan(
      source("src/routes/community.profile.index.tsx").indexOf("Appeal this post"),
    );
  });
});

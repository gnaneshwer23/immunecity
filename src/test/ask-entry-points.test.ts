import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "bun:test";
import { JOURNEY_NAV } from "@/data/marketingNav";

const root = process.cwd();
const source = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("Ask Immune entry points", () => {
  it("keeps Ask Immune as the Learn journey chatbot route", () => {
    const learn = JOURNEY_NAV.find((g) => g.label === "Learn")!.items;
    expect(learn.some((i) => i.path === "/ask" && i.title === "Ask Immune")).toBe(true);
    const reasoning = JOURNEY_NAV.find((g) => g.label === "Investigate")!.items.find((i) => i.path === "/reasoning");
    expect(reasoning?.desc.toLowerCase()).toContain("ask immune");
    expect(reasoning?.title).toBe("Scientific reasoning");
  });

  it("hosts AskAtlas only on /ask and the Shell corner assistant", () => {
    expect(source("src/routes/ask.tsx")).toContain("AskAtlas");
    expect(source("src/routes/ask.tsx")).toContain('persistKey="isi-ask-conversation"');
    expect(source("src/components/immune/Shell.tsx")).toContain("AskAtlas");
    expect(source("src/components/immune/Shell.tsx")).toContain("showFullPageLink");
    expect(source("src/components/immune/Shell.tsx")).toContain('pathname !== "/ask"');

    expect(source("src/routes/reasoning.tsx")).not.toContain("AskAtlas");
    expect(source("src/routes/reasoning.tsx")).toContain("Continue in Ask Immune");
    expect(source("src/routes/discovery.index.tsx")).not.toContain("AskAtlas");
    expect(source("src/routes/discovery.index.tsx")).toContain("Continue in Ask Immune");
    expect(source("src/components/immune/ScientificWorkbench.tsx")).not.toContain("AskAtlas");
    expect(source("src/components/immune/ScientificWorkbench.tsx")).toContain('to="/ask"');
    expect(source("src/components/immune/ScientificWorkbench.tsx")).not.toMatch(/to="\/reasoning">Open Ask/);
  });

  it("routes dossier and gap CTAs to /ask without a second chat UI", () => {
    expect(source("src/lib/discovery/dossier.ts")).toContain('label: "Continue in Ask Immune"');
    expect(source("src/lib/discovery/dossier.ts")).toMatch(/href: qs \? `\/ask\?\$\{qs\}` : "\/ask"/);
    expect(source("src/routes/discovery.gaps.$gapId.tsx")).not.toContain("AskAtlas");
    expect(source("src/routes/discovery.gaps.$gapId.tsx")).toContain("Continue in Ask Immune");
  });

  it("documents the single-chatbot entry map", () => {
    const doc = source("docs/ASK_ENTRY_POINTS.md");
    expect(doc).toContain("/ask");
    expect(doc).toContain("Corner assistant");
    expect(doc).toContain("must not");
    expect(doc).toContain("AskAtlas");
  });
});

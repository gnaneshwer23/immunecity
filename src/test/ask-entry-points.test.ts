import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "bun:test";
import { JOURNEY_NAV } from "@/data/marketingNav";

const root = process.cwd();
const source = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("Ask Immune entry points", () => {
  it("elevates Ask Immune as a primary journey pillar (still one chatbot)", () => {
    const askPillar = JOURNEY_NAV.find((g) => g.label === "Ask Immune");
    expect(askPillar).toBeTruthy();
    expect(askPillar!.items.map((i) => i.path)).toEqual(["/ask"]);
    const paths = JOURNEY_NAV.flatMap((g) => g.items.map((i) => i.path));
    expect(paths.filter((p) => p === "/ask")).toHaveLength(1);
    const reasoning = JOURNEY_NAV.find((g) => g.label === "Research")!.items.find((i) => i.path === "/reasoning");
    expect(reasoning?.title).toBe("Scientific reasoning");
    expect(reasoning?.desc.toLowerCase()).not.toContain("ask immune");
  });

  it("hosts AskAtlas only on /ask and the Shell corner assistant", () => {
    expect(source("src/routes/ask.tsx")).toContain("AskAtlas");
    expect(source("src/routes/ask.tsx")).toContain('persistKey="isi-ask-conversation"');
    expect(source("src/components/immune/Shell.tsx")).toContain("AskAtlas");
    expect(source("src/components/immune/Shell.tsx")).toContain("showFullPageLink");
    expect(source("src/components/immune/Shell.tsx")).toContain('pathname !== "/ask"');

    expect(source("src/routes/reasoning.tsx")).not.toContain("AskAtlas");
    expect(source("src/routes/discovery.index.tsx")).not.toContain("AskAtlas");
    expect(source("src/components/immune/ScientificWorkbench.tsx")).not.toContain("AskAtlas");
    expect(source("src/components/immune/ScientificWorkbench.tsx")).toContain('to="/ask"');
  });

  it("features Ask Immune on the homepage as the intelligence gateway", () => {
    const home = source("src/routes/index.tsx");
    expect(home).toMatch(/to="\/ask"/);
    expect(home).toMatch(/Ask Immune/);
    expect(home).toContain("EXPLORE_PATH");
  });

  it("ships immune-cell voice command and speaker in the chatbot", () => {
    const ask = source("src/components/immune/AskAtlas.tsx");
    expect(ask).toContain("ImmuneCellSpeaker");
    expect(ask).toContain("toggleListen");
    expect(ask).toContain("speakAnswer");
    expect(ask).toContain("Voice command");
    expect(source("src/components/immune/ImmuneCellSpeaker.tsx")).toContain("ImmuneCellSpeaker");
  });

  it("documents Ask as primary destination with one chatbot transport", () => {
    const doc = source("docs/ASK_ENTRY_POINTS.md");
    expect(doc).toContain("primary");
    expect(doc).toContain("Corner assistant");
    expect(doc).toContain("Immune cell speaker");
    expect(doc).toContain("/ask");
  });
});

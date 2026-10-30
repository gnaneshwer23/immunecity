import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "bun:test";
import { JOURNEY_NAV } from "@/data/marketingNav";

const root = process.cwd();
const source = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("Ask Immune entry points", () => {
  it("keeps Ask Immune out of journey menus (chatbot-only)", () => {
    const paths = JOURNEY_NAV.flatMap((g) => g.items.map((i) => i.path));
    expect(paths).not.toContain("/ask");
    const learn = JOURNEY_NAV.find((g) => g.label === "Learn")!.items;
    expect(learn.some((i) => i.title === "Ask Immune")).toBe(false);
    const reasoning = JOURNEY_NAV.find((g) => g.label === "Investigate")!.items.find((i) => i.path === "/reasoning");
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

  it("does not feature Ask Immune on the homepage marketing surfaces", () => {
    const home = source("src/routes/index.tsx");
    expect(home).not.toMatch(/to="\/ask"/);
    expect(home).not.toMatch(/>Ask Immune</);
    expect(home).toContain('to="/atlas"');
    expect(home).toContain('to="/graph"');
  });

  it("ships immune-cell voice command and speaker in the chatbot", () => {
    const ask = source("src/components/immune/AskAtlas.tsx");
    expect(ask).toContain("ImmuneCellSpeaker");
    expect(ask).toContain("toggleListen");
    expect(ask).toContain("speakAnswer");
    expect(ask).toContain("Voice command");
    expect(source("src/components/immune/ImmuneCellSpeaker.tsx")).toContain("ImmuneCellSpeaker");
  });

  it("documents chatbot-only entry map", () => {
    const doc = source("docs/ASK_ENTRY_POINTS.md");
    expect(doc).toContain("only the chatbot");
    expect(doc).toContain("Corner assistant");
    expect(doc).toContain("Immune cell speaker");
    expect(doc).toContain("Not in journeys");
  });
});

import { describe, expect, it } from "vitest";
import { KG, SPINE_QUESTION, spineLabel } from "@/lib/immune/engine";

describe("causal spine", () => {
  it("has exactly 15 stages, each with a guiding question", () => {
    expect(KG.core_spine).toHaveLength(15);
    for (const s of KG.core_spine) expect(SPINE_QUESTION[s]).toBeTruthy();
  });
  it("shows MODEL as AI", () => {
    expect(spineLabel("MODEL")).toBe("AI");
  });
});

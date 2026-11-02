import { describe, expect, it } from "bun:test";
import { loadVendoredHsiDiscovery } from "../src/lib/hsi/vendoredDiscovery";
import { loadHsiDiscoveryConsume } from "../src/lib/hsi/discoveryConsume";
import { readFileSync } from "node:fs";

describe("bundled HSI integration", () => {
  it("loads the current research pack without any network or localhost origin", async () => {
    const previous = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (() => { calls++; throw new Error("Network unavailable"); }) as typeof fetch;
    try {
      const result = await loadVendoredHsiDiscovery();
      expect(calls).toBe(0);
      expect(result.source).toBe("local");
      expect(result.pilotPack.evidenceMap).toBeArray();
      expect(result.partnerLock.lockedPilot).toBe(false);
      expect(result.partnerLock.agreementKind).toBe("hypothetical_test_only");
      expect(result.honesty.partnerSignedProduction).toBe(false);
      expect(result.honesty.autoApproveIntoKg).toBe(false);
    } finally { globalThis.fetch = previous; }
  });

  it("rejects invalid bundled artifacts instead of switching silently to remote releases", async () => {
    const previous = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (() => { calls++; throw new Error("No remote fallback permitted"); }) as typeof fetch;
    try {
      await expect(loadHsiDiscoveryConsume({ preferLocal: true, readArtifact: async () => ({ notCds: false }) })).rejects.toThrow();
      expect(calls).toBe(0);
    } finally { globalThis.fetch = previous; }
  });

  it("rejects a pack that disagrees with the validated partner lock", async () => {
    await expect(loadHsiDiscoveryConsume({
      preferLocal: true,
      readArtifact: async (file) => {
        const data = JSON.parse(readFileSync(new URL(`../public/hsi-discovery/${file}`, import.meta.url), "utf8"));
        if (file === "hsi-pilot-evidence-pack.json") data.lockedPilot = true;
        return data;
      },
    })).rejects.toThrow("partner flags differ");
  });

  it("does not let a caller mutate the retained snapshot", async () => {
    const first = await loadVendoredHsiDiscovery();
    first.partnerLock.lockedPilot = true;
    const second = await loadVendoredHsiDiscovery();
    expect(second.partnerLock.lockedPilot).toBe(false);
  });
  it("rejects mixed releases even when each artifact has safe individual flags", async () => {
    await expect(loadHsiDiscoveryConsume({ preferLocal: true, readArtifact: async (file) => {
      const data = JSON.parse(readFileSync(new URL(`../public/hsi-discovery/${file}`, import.meta.url), "utf8"));
      if (file === "gate-c-checklist.json") data.generatedAt = "2000-01-01T00:00:00.000Z";
      return data;
    } })).rejects.toThrow("snapshot generation");
  });
});

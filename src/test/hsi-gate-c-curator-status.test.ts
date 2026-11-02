/**
 * Gate C curator path status helpers — dry-run only, never invent Approve.
 * Run: bun test src/test/hsi-gate-c-curator-status.test.ts
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GATE_C_CURATOR_INVENTORY,
  summarizeCiteCheckWorksheet,
  summarizeGateCCuratorPath,
} from "@/lib/hsi/gateCCuratorStatus";

const vendorDir = join(import.meta.dir, "../../public/hsi-discovery");

function loadVendor<T>(name: string): T {
  return JSON.parse(readFileSync(join(vendorDir, name), "utf8")) as T;
}

describe("GATE_C_CURATOR_INVENTORY", () => {
  it("lists cite UI and scripts without an invent-approve path", () => {
    expect(
      GATE_C_CURATOR_INVENTORY.uiRoutes.some((r) =>
        r.path.includes("hsi=cite"),
      ),
    ).toBe(true);
    expect(
      GATE_C_CURATOR_INVENTORY.scripts.every((s) => s.inventsApprove === false),
    ).toBe(true);
    expect(GATE_C_CURATOR_INVENTORY.neon.isiGateCWrites).toBe("autumn-snow");
    expect(GATE_C_CURATOR_INVENTORY.neon.hsiSubstrate).toBe("red-wave");
    expect(GATE_C_CURATOR_INVENTORY.neon.sharedEvidenceDb).toBe(false);
  });
});

describe("summarizeCiteCheckWorksheet", () => {
  it("counts vendored worksheet without inventing public approve", () => {
    const ws = loadVendor<unknown>("cite-check-worksheet.json");
    const s = summarizeCiteCheckWorksheet(ws);
    expect(s.rows).toBe(13);
    expect(s.verifiedOrMatched).toBe(13);
    expect(s.stillUnassessedClaimSupport).toBe(13);
    expect(s.stillUnreviewed).toBe(13);
    expect(s.readyForHumanSupportsAssess).toBe(13);
    expect(s.publicCiteApproved).toBe(0);
    expect(s.autoApprove).toBe(false);
    expect(s.productionApproved).toBe(false);
    expect(s.notCds).toBe(true);
    expect(s.neonTarget).toBe("autumn-snow");
  });

  it("only counts publicCiteApproved when approved+supports both set", () => {
    const s = summarizeCiteCheckWorksheet({
      summary: { rows: 1 },
      items: [
        {
          evidenceId: "hsi-gate-c-cite-X",
          checkStatus: "verified",
          curation: "approved",
          claimSupport: "unassessed",
        },
        {
          evidenceId: "hsi-gate-c-cite-Y",
          checkStatus: "verified",
          curation: "approved",
          claimSupport: "supports",
        },
      ],
    });
    expect(s.publicCiteApproved).toBe(1);
    expect(s.readyForHumanSupportsAssess).toBe(1);
  });
});

describe("summarizeGateCCuratorPath", () => {
  it("aggregates pins: Discovery decided, cite path awaits human supports", () => {
    const status = summarizeGateCCuratorPath({
      checklist: loadVendor("gate-c-checklist.json"),
      decisionsPin: loadVendor("gate-c-decisions.json"),
      citeWorksheet: loadVendor("cite-check-worksheet.json"),
    });
    expect(status.schemaVersion).toBe("hsi-gate-c-curator-status-1");
    expect(status.autoApprove).toBe(false);
    expect(status.mayFlipHsiGrade).toBe(false);
    expect(status.productionApproved).toBe(false);
    expect(status.notCds).toBe(true);
    expect(status.inventSupportsForbidden).toBe(true);
    expect(status.neonTarget).toBe("autumn-snow");
    expect(status.hsiNeonTarget).toBe("red-wave");
    expect(status.discoveryGateC.humanApproved).toBeGreaterThanOrEqual(9);
    expect(status.discoveryGateC.actionableRemaining).toBe(0);
    expect(status.bridge.citeReadyAfterGateC).toBeGreaterThanOrEqual(9);
    expect(status.citePath?.publicCiteApproved).toBe(0);
    expect(status.citePath?.readyForHumanSupportsAssess).toBe(13);
    expect(status.nextHumanStep.toLowerCase()).toContain("claim_support");
    expect(status.nextHumanStep.toLowerCase()).not.toMatch(/auto-?approve/);
  });

  it("does not invent Approve when worksheet omitted", () => {
    const status = summarizeGateCCuratorPath({
      checklist: loadVendor("gate-c-checklist.json"),
      decisionsPin: loadVendor("gate-c-decisions.json"),
      citeWorksheet: null,
    });
    expect(status.citePath).toBeNull();
    expect(status.autoApprove).toBe(false);
    expect(status.inventSupportsForbidden).toBe(true);
    expect(status.nextHumanStep.toLowerCase()).toMatch(/cite|check/);
  });
});

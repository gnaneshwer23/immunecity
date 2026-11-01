/**
 * HSI Discovery consume wiring — honesty + local vendor.
 * Run: bun test src/test/hsi-discovery-consume.test.ts
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertHonestyFlags,
  allowHypotheticalPartner,
  summarizeConsume,
  type ConsumeLoadResult,
  type IsiConsumeContract,
} from "@/lib/hsi/discoveryConsume";

const vendorDir = join(import.meta.dir, "../../public/hsi-discovery");

function loadVendor<T>(name: string): T {
  return JSON.parse(readFileSync(join(vendorDir, name), "utf8")) as T;
}

describe("HSI Discovery consume honesty", () => {
  it("rejects partnerSigned without hypothetical fixture / allow flag", () => {
    expect(() =>
      assertHonestyFlags(
        { notCds: true, autoApproveIntoKg: false, partnerSigned: true },
        "bad-lock",
        { allowHypothetical: false },
      ),
    ).toThrow(/ALLOW_HYPOTHETICAL_PARTNER|hypothetical/);
  });

  it("accepts hypothetical_test_only partnerSigned", () => {
    assertHonestyFlags(
      {
        notCds: true,
        autoApproveIntoKg: false,
        partnerSigned: true,
        isHypothetical: true,
        legalBinding: false,
        agreementKind: "hypothetical_test_only",
        lockedPilot: false,
      },
      "fixture-lock",
      { allowHypothetical: false },
    );
  });

  it("rejects legalBinding=true even with allow flag", () => {
    expect(() =>
      assertHonestyFlags(
        {
          notCds: true,
          autoApproveIntoKg: false,
          partnerSigned: true,
          isHypothetical: true,
          legalBinding: true,
          agreementKind: "hypothetical_test_only",
        },
        "fake-mou",
        { allowHypothetical: true },
      ),
    ).toThrow(/legalBinding/);
  });

  it("loads vendored consume contract with Gate C pending + no auto-approve", () => {
    const contract = loadVendor<IsiConsumeContract>(
      "hsi-isi-consume-contract.json",
    );
    assertHonestyFlags(contract, "vendored-contract");
    expect(contract.gateC.autoApprove).toBe(false);
    expect(contract.gateC.statusOnPublish).toBe("pending");
    expect(contract.gateC.mayFlipHsiGradeFromChecklist).toBe(false);
    expect(contract.grades.hsiGrades).toEqual([
      "established",
      "uncertain",
      "unexplored",
    ]);
    for (const a of contract.artifacts) {
      expect(a.autoApproveIntoKg).toBe(false);
    }
  });

  it("vendored index notCds; partner lock hypothetical fixture only", () => {
    const index = loadVendor<Record<string, unknown>>("index.json");
    const lock = loadVendor<Record<string, unknown>>("hsi-partner-lock.json");
    assertHonestyFlags(index as never, "index");
    assertHonestyFlags(lock as never, "lock", { requireNotCds: false });
    expect(lock.lockedPilot).not.toBe(true);
    expect(lock.legalBinding).toBe(false);
    expect(lock.agreementKind).toBe("hypothetical_test_only");
  });

  it("summarizeConsume reports licensing counts from vendor stub", () => {
    const licensing = loadVendor<Record<string, unknown>>(
      "hsi-source-licensing-stub.json",
    );
    const contract = loadVendor<IsiConsumeContract>(
      "hsi-isi-consume-contract.json",
    );
    const fake = {
      source: "local" as const,
      baseUrl: "/hsi-discovery",
      index: loadVendor("index.json"),
      contract,
      partnerLock: loadVendor("hsi-partner-lock.json"),
      pilotPack: loadVendor("hsi-pilot-evidence-pack.json"),
      gateC: loadVendor("gate-c-checklist.json"),
      licensing,
      loadedFiles: ["hsi-isi-consume-contract.json"],
      askStaysRa: true as const,
      honesty: {
        notCds: true as const,
        autoApproveIntoKg: false as const,
        gateCPending: true as const,
        partnerSignedProduction: false as const,
      },
    } satisfies ConsumeLoadResult;

    const summary = summarizeConsume(fake);
    expect(summary.gateCPending).toBe(true);
    expect(summary.licensingSummary?.pmidCount).toBeGreaterThan(20);
    expect(summary.licensingSummary?.needsReviewCount).toBe(0);
    expect(allowHypotheticalPartner()).toBe(false);
  });
});

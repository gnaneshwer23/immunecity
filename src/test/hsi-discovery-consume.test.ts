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
  it("rejects PHI payloads and live CDS surface claims", () => {
    expect(() =>
      assertHonestyFlags(
        { notCds: true, autoApproveIntoKg: false, containsPhi: true },
        "phi-payload",
      ),
    ).toThrow(/containsPhi/);
    expect(() =>
      assertHonestyFlags(
        { notCds: true, autoApproveIntoKg: false, mayUseLivePhi: true },
        "live-phi",
      ),
    ).toThrow(/mayUseLivePhi|PHI/);
    expect(() =>
      assertHonestyFlags(
        { notCds: true, autoApproveIntoKg: false, autoSurfaceCds: true },
        "live-cds",
      ),
    ).toThrow(/autoSurfaceCds|live CDS/);
    expect(() =>
      assertHonestyFlags(
        { notCds: false, autoApproveIntoKg: false },
        "cds-claim",
      ),
    ).toThrow(/notCds/);
    expect(() =>
      assertHonestyFlags(
        { notCds: true, autoApproveIntoKg: false, clinicalActive: true },
        "clinical-active",
      ),
    ).toThrow(/clinicalActive|live CDS/);
  });

  it("rejects partnerSigned without fixture / named / allow flag", () => {
    expect(() =>
      assertHonestyFlags(
        { notCds: true, autoApproveIntoKg: false, partnerSigned: true },
        "bad-lock",
        { allowHypothetical: false },
      ),
    ).toThrow(/ALLOW_HYPOTHETICAL_PARTNER|hypothetical|named_partner|legal_mou/);
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

  it("accepts named_partner legal_mou with lockedPilot (still not CDS)", () => {
    assertHonestyFlags(
      {
        notCds: true,
        autoApproveIntoKg: false,
        partnerSigned: true,
        isHypothetical: false,
        legalBinding: true,
        agreementKind: "legal_mou",
        lockedPilot: true,
        productionPartnerSigned: true,
      },
      "named-lock",
      { allowHypothetical: false },
    );
  });

  it("rejects legalBinding=true with isHypothetical=true (fake MoU)", () => {
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
    ).toThrow(/legalBinding|fake MoU|isHypothetical/);
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

  it("vendored index notCds; partner lock named Apolo Pharma OK", () => {
    const index = loadVendor<Record<string, unknown>>("index.json");
    const lock = loadVendor<Record<string, unknown>>("hsi-partner-lock.json");
    assertHonestyFlags(index as never, "index");
    assertHonestyFlags(lock as never, "lock", { requireNotCds: false });
    expect(lock.partnerSigned).toBe(true);
    expect(lock.legalBinding).toBe(true);
    expect(lock.lockedPilot).toBe(true);
    expect(lock.isHypothetical).toBe(false);
    expect(lock.agreementKind).toBe("legal_mou");
    expect((lock.partner as { id?: string } | undefined)?.id).toBe(
      "partner:apolo-pharma",
    );
  });

  it("summarizeConsume reports licensing counts from vendor stub", () => {
    const licensing = loadVendor<Record<string, unknown>>(
      "hsi-source-licensing-stub.json",
    );
    const contract = loadVendor<IsiConsumeContract>(
      "hsi-isi-consume-contract.json",
    );
    const lock = loadVendor<Record<string, unknown>>("hsi-partner-lock.json");
    const fake = {
      source: "local" as const,
      baseUrl: "/hsi-discovery",
      index: loadVendor("index.json"),
      contract,
      partnerLock: lock,
      pilotPack: loadVendor("hsi-pilot-evidence-pack.json"),
      gateC: loadVendor("gate-c-checklist.json"),
      licensing,
      loadedFiles: ["hsi-isi-consume-contract.json"],
      askStaysRa: true as const,
      honesty: {
        notCds: true as const,
        autoApproveIntoKg: false as const,
        gateCPending: true as const,
        partnerSignedProduction: Boolean(
          lock.legalBinding === true && lock.isHypothetical === false,
        ),
      },
    } satisfies ConsumeLoadResult;

    const summary = summarizeConsume(fake);
    expect(summary.gateCPending).toBe(true);
    expect(summary.licensingSummary?.pmidCount).toBeGreaterThan(20);
    expect(summary.licensingSummary?.needsReviewCount).toBe(0);
    expect(allowHypotheticalPartner()).toBe(false);
  });
});

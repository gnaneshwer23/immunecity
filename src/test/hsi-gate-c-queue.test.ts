/**
 * HSI Gate C human queue — honesty, role gate, pending-only.
 * Run: bun test src/test/hsi-gate-c-queue.test.ts
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { accountPowers } from "@/lib/access/roles";
import {
  applyGateCDecision,
  assertIsiNeonHostForGateC,
  buildGateCQueue,
  listPublishPendingRows,
  parseGateCChecklistRows,
} from "@/lib/hsi/gateCQueue";
import { gateCPendingCount } from "@/lib/hsi/discoveryLoopView";

const vendorDir = join(import.meta.dir, "../../public/hsi-discovery");

function loadVendor<T>(name: string): T {
  return JSON.parse(readFileSync(join(vendorDir, name), "utf8")) as T;
}

describe("HSI Gate C queue (ISI autumn-snow path)", () => {
  it("parses vendored checklist pending mapped rows with autoApprove=false", () => {
    const checklist = loadVendor<Record<string, unknown>>("gate-c-checklist.json");
    expect(checklist.notCds).toBe(true);
    expect(checklist.autoApproveIntoKg).toBe(false);
    const rows = parseGateCChecklistRows(checklist);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.autoApprove === false)).toBe(true);
    const pending = listPublishPendingRows(rows);
    expect(pending.length).toBeGreaterThanOrEqual(9);
    expect(pending.every((r) => r.gateCStatus === "pending")).toBe(true);
    expect(pending.every((r) => Boolean(r.isiRelationshipId))).toBe(true);
    expect(gateCPendingCount(checklist as never)).toBe(pending.length);
  });

  it("buildGateCQueue never sets autoApprove or mayFlipHsiGrade", () => {
    const checklist = loadVendor("gate-c-checklist.json");
    const queue = buildGateCQueue(checklist);
    expect(queue.autoApprove).toBe(false);
    expect(queue.mayFlipHsiGrade).toBe(false);
    expect(queue.notCds).toBe(true);
    expect(queue.neonTarget).toBe("autumn-snow");
    expect(queue.actionableCount).toBe(queue.pendingCount);
    expect(queue.items.every((i) => i.autoApprove === false)).toBe(true);
    expect(queue.items.every((i) => i.mayFlipHsiGrade === false)).toBe(true);
    expect(queue.items.every((i) => i.notCds === true)).toBe(true);
  });

  it("merges stored decisions and only pending stays actionable", () => {
    const checklist = loadVendor("gate-c-checklist.json");
    const base = buildGateCQueue(checklist);
    const first = base.items[0]!;
    const queue = buildGateCQueue(checklist, [
      {
        edgeId: first.edgeId,
        status: "human_approved",
        decision: "approve",
        reviewerNote: "ok",
        reviewedBy: "reviewer@example.com",
        reviewedAt: "2026-11-01T00:00:00.000Z",
        isiRelationshipId: first.isiRelationshipId,
        pmid: first.pmid,
        autoApprove: false,
        hsiGradeFlipped: false,
      },
    ]);
    const decided = queue.items.find((i) => i.edgeId === first.edgeId)!;
    expect(decided.actionable).toBe(false);
    expect(decided.effectiveStatus).toBe("human_approved");
    expect(decided.decision).toBe("approve");
    expect(queue.pendingCount).toBe(base.pendingCount - 1);
  });

  it("rejects auto-approve and hsiGrade flip transitions", () => {
    const reviewer = accountPowers(["reviewer"], true);
    expect(reviewer.reviewer).toBe(true);

    expect(
      applyGateCDecision({
        currentStatus: "pending",
        decision: "approve",
        actorIsReviewer: reviewer.reviewer,
        autoApprove: true,
      }).ok,
    ).toBe(false);

    expect(
      applyGateCDecision({
        currentStatus: "pending",
        decision: "approve",
        actorIsReviewer: reviewer.reviewer,
        flipHsiGrade: true,
      }).ok,
    ).toBe(false);

    const ok = applyGateCDecision({
      currentStatus: "pending",
      decision: "approve",
      actorIsReviewer: reviewer.reviewer,
      autoApprove: false,
      flipHsiGrade: false,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.autoApproved).toBe(false);
      expect(ok.hsiGradeFlipped).toBe(false);
      expect(ok.to).toBe("human_approved");
    }
  });

  it("role-gates decisions: member cannot approve; reviewer can", () => {
    const member = accountPowers(["user"], true);
    const admin = accountPowers(["admin"], true);
    expect(member.reviewer).toBe(false);
    expect(admin.reviewer).toBe(true);

    const denied = applyGateCDecision({
      currentStatus: "pending",
      decision: "reject",
      actorIsReviewer: member.reviewer,
    });
    expect(denied.ok).toBe(false);

    const allowed = applyGateCDecision({
      currentStatus: "pending",
      decision: "defer",
      actorIsReviewer: admin.reviewer,
    });
    expect(allowed.ok).toBe(true);
    if (allowed.ok) expect(allowed.to).toBe("deferred");
  });

  it("pending-only: already decided rows cannot be re-decided", () => {
    const reviewer = accountPowers(["reviewer"], true);
    for (const status of ["human_approved", "human_rejected", "deferred"] as const) {
      const res = applyGateCDecision({
        currentStatus: status,
        decision: "approve",
        actorIsReviewer: reviewer.reviewer,
      });
      expect(res.ok).toBe(false);
    }
  });

  it("refuses HSI red-wave Neon hosts for Gate C writes", () => {
    expect(() =>
      assertIsiNeonHostForGateC(
        "postgresql://u:p@ep-restless-dew-xxxx.eu-west-2.aws.neon.tech/neondb",
      ),
    ).toThrow(/red-wave|autumn-snow/i);
    expect(() =>
      assertIsiNeonHostForGateC(
        "postgresql://u:p@ep-red-wave-xxxx.eu-west-2.aws.neon.tech/neondb",
      ),
    ).toThrow(/red-wave/);
    expect(() =>
      assertIsiNeonHostForGateC(
        "postgresql://u:p@ep-blue-salad-xxxx.eu-west-2.aws.neon.tech/neondb",
      ),
    ).not.toThrow();
  });
});

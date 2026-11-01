/**
 * Neon Auth + reviewer-gated Gate C decisions for HSI Discovery consume.
 * Writes ISI autumn-snow only. Never auto-approves; never flips hsiGrade.
 */
import { createServerFn } from "@tanstack/react-start";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireNeonAuth } from "@/integrations/neon/auth-middleware";
import { assertCanReview, loadAccountPowers } from "@/lib/access/roles.server";
import { getDb } from "@/lib/db.server";
import { hsiGateCDecisions } from "@/lib/db/schema.server";
import { loadHsiDiscoveryConsume } from "@/lib/hsi/discoveryConsume";
import {
  GATE_C_DECISIONS,
  GATE_C_STATUSES,
  applyGateCDecision,
  assertIsiNeonHostForGateC,
  buildGateCQueue,
  type GateCStatus,
  type GateCStoredDecision,
} from "@/lib/hsi/gateCQueue";

function missingRelation(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /relation .* does not exist|hsi_gate_c_decisions/i.test(msg);
}

function toStored(row: typeof hsiGateCDecisions.$inferSelect): GateCStoredDecision {
  const status = (GATE_C_STATUSES.includes(row.status as GateCStatus)
    ? row.status
    : "pending") as GateCStatus;
  const decision =
    row.decision && GATE_C_DECISIONS.includes(row.decision as (typeof GATE_C_DECISIONS)[number])
      ? (row.decision as (typeof GATE_C_DECISIONS)[number])
      : null;
  return {
    edgeId: row.edgeId,
    status,
    decision,
    reviewerNote: row.reviewerNote,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    isiRelationshipId: row.isiRelationshipId,
    pmid: row.pmid,
    autoApprove: false,
    hsiGradeFlipped: false,
  };
}

async function loadChecklistAndDecisions(origin?: string) {
  assertIsiNeonHostForGateC(process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED);
  const consume = await loadHsiDiscoveryConsume({
    origin,
    preferLocal: true,
  });
  const checklist = consume.gateC;
  const db = getDb();
  const edgeIds = buildGateCQueue(checklist, []).items.map((i) => i.edgeId);
  let decisions: GateCStoredDecision[] = [];
  if (edgeIds.length) {
    const rows = await db
      .select()
      .from(hsiGateCDecisions)
      .where(inArray(hsiGateCDecisions.edgeId, edgeIds));
    decisions = rows.map(toStored);
  }
  return { checklist, decisions, consume };
}

/** Reviewer: pending Gate C queue merged with autumn-snow decisions. */
export const listHsiGateCQueue = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        origin: z.string().url().optional(),
      })
      .optional()
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertCanReview(context.userId);
    try {
      const origin =
        data?.origin ||
        process.env.VITE_SITE_ORIGIN ||
        process.env.E2E_BASE_URL ||
        undefined;
      const { checklist, decisions } = await loadChecklistAndDecisions(origin);
      const queue = buildGateCQueue(checklist, decisions);
      return {
        queue,
        autoApprove: false as const,
        mayFlipHsiGrade: false as const,
        notCds: true as const,
        neonTarget: "autumn-snow" as const,
      };
    } catch (err) {
      if (err instanceof Error && /Only scientific|refusing HSI|DATABASE_URL/.test(err.message)) {
        throw err;
      }
      if (missingRelation(err)) {
        throw new Error(
          "Gate C decisions table missing — apply migration 0028 (bun run db:hsi-gate-c-decisions).",
        );
      }
      throw new Error(
        err instanceof Error ? err.message : "Failed to load Gate C queue.",
      );
    }
  });

/**
 * Human approve / reject / defer for a pending HSI checklist edge.
 * Persists on ISI autumn-snow only. Never auto-approves; never flips hsiGrade.
 */
export const recordHsiGateCDecision = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        edgeId: z.string().min(3).max(120),
        decision: z.enum(GATE_C_DECISIONS),
        reviewerNote: z.string().max(2000).optional(),
        origin: z.string().url().optional(),
        /** Must be false / omitted — true is rejected below. */
        autoApprove: z.boolean().optional(),
        flipHsiGrade: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCanReview(context.userId);
    const powers = await loadAccountPowers(context.userId);
    assertIsiNeonHostForGateC(process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED);

    if (data.autoApprove === true) {
      throw new Error("autoApprove is forbidden for Gate C.");
    }
    if (data.flipHsiGrade === true) {
      throw new Error("Gate C must not flip hsiGrade.");
    }

    try {
      const origin =
        data.origin ||
        process.env.VITE_SITE_ORIGIN ||
        process.env.E2E_BASE_URL ||
        undefined;
      const { checklist, decisions } = await loadChecklistAndDecisions(origin);
      const queue = buildGateCQueue(checklist, decisions);
      const item = queue.items.find((i) => i.edgeId === data.edgeId);
      if (!item) {
        throw new Error(
          "Edge is not an actionable pending Gate C checklist row (mapped + pending only).",
        );
      }

      const transition = applyGateCDecision({
        currentStatus: item.effectiveStatus,
        decision: data.decision,
        actorIsReviewer: powers.reviewer,
        autoApprove: false,
        flipHsiGrade: false,
      });
      if (!transition.ok) throw new Error(transition.error);
      if (transition.autoApproved) {
        throw new Error("Auto-approval of Gate C is forbidden.");
      }
      if (transition.hsiGradeFlipped) {
        throw new Error("hsiGrade flip from Gate C is forbidden.");
      }

      const actor = context.email ?? context.userId;
      const db = getDb();
      const now = new Date();
      const note = data.reviewerNote?.trim() || null;

      const [existing] = await db
        .select()
        .from(hsiGateCDecisions)
        .where(eq(hsiGateCDecisions.edgeId, data.edgeId))
        .limit(1);

      if (existing) {
        await db
          .update(hsiGateCDecisions)
          .set({
            claimId: item.claimId,
            isiRelationshipId: item.isiRelationshipId,
            pmid: item.pmid,
            doi: item.doi,
            spoNote: item.spoNote,
            assertion: item.assertion,
            status: transition.to,
            decision: transition.decision,
            reviewerNote: note,
            reviewedBy: actor,
            reviewedAt: now,
            autoApprove: false,
            hsiGradeFlipped: false,
            previousStatus: existing.status,
            updatedAt: now,
          })
          .where(eq(hsiGateCDecisions.id, existing.id));
      } else {
        await db.insert(hsiGateCDecisions).values({
          edgeId: item.edgeId,
          claimId: item.claimId,
          isiRelationshipId: item.isiRelationshipId,
          pmid: item.pmid,
          doi: item.doi,
          spoNote: item.spoNote,
          assertion: item.assertion,
          pinSource: "hsi-discovery",
          status: transition.to,
          decision: transition.decision,
          reviewerNote: note,
          reviewedBy: actor,
          reviewedAt: now,
          autoApprove: false,
          hsiGradeFlipped: false,
          previousStatus: item.effectiveStatus,
        });
      }

      return {
        edgeId: data.edgeId,
        previousStatus: item.effectiveStatus,
        newStatus: transition.to,
        decision: transition.decision,
        autoApproved: false as const,
        hsiGradeFlipped: false as const,
        neonTarget: "autumn-snow" as const,
        note:
          transition.decision === "approve"
            ? "Human Gate C approve recorded on ISI Neon. Evidence claim Check→supports→Approve on the mapped REL remains a separate curator step when publishing cites."
            : "Human Gate C decision recorded on ISI Neon.",
      };
    } catch (err) {
      if (
        err instanceof Error &&
        /Only scientific|forbidden|pending|actionable|refusing HSI|DATABASE_URL|must not flip|autoApprove/i.test(
          err.message,
        )
      ) {
        throw err;
      }
      if (missingRelation(err)) {
        throw new Error(
          "Gate C decisions table missing — apply migration 0028 (bun run db:hsi-gate-c-decisions).",
        );
      }
      throw new Error(err instanceof Error ? err.message : "Gate C decision failed.");
    }
  });

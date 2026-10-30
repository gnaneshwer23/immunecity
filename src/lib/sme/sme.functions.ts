/**
 * SME workspace server functions — reviewer-gated.
 * Rematch requires PMID+DOI+passage; decisions are audited; never auto-approves Gate C.
 */
import { createServerFn } from "@tanstack/react-start";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireNeonAuth } from "@/integrations/neon/auth-middleware";
import { assertCanReview, loadAccountPowers } from "@/lib/access/roles.server";
import { getDb } from "@/lib/db.server";
import {
  evidenceAuditEvents,
  evidenceRecords,
  researchGaps,
  smeGoldLabels,
  smeWorkItemEvents,
} from "@/lib/db/schema.server";
import { detectDiscoveryCandidates } from "@/lib/discovery/detect";
import type { OpportunityStatus, ResearchGapClass } from "@/lib/discovery/gapClass";
import type { ResearchGapCandidate } from "@/lib/discovery/types";
import { edgeByRel } from "@/lib/immune/engine";
import { computeEvidenceUpdate } from "@/lib/immune/evidenceInvariants";
import { buildScientificReviewQueue } from "@/lib/immune/scientificReviewQueue";
import { runSmeEvalHarness } from "@/lib/sme/evalRunner";
import {
  SME_GOLD_LABELS,
  SME_GOLD_SET_SCAFFOLD,
  summariseSmeGoldSet,
  type SmeGoldCase,
  type SmeGoldLabel,
} from "@/lib/sme/goldSet";
import { smeDecisionAuditReason, validateSmeCitationRematch } from "@/lib/sme/rematch";
import {
  buildSmeMelanomaWorkQueue,
  buildSmePriorityQueues,
  buildSmeUnifiedWorkQueue,
  summariseSmeWorkQueue,
} from "@/lib/sme/workQueue";

function auditSnapshot(r: typeof evidenceRecords.$inferSelect) {
  return {
    curation: r.curation,
    claim_support: r.claimSupport,
    relationship_id: r.relationshipId,
    pmid: r.pmid,
    doi: r.doi,
    source_ref: r.sourceRef,
    check_status: r.checkStatus,
    notes: r.notes,
  };
}

/** Snapshot of SME workspace: melanoma queue + priority KEYNOTE/R011 + gold scaffold + eval. */
export const getSmeWorkspaceSnapshot = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .handler(async ({ context }) => {
    const powers = await loadAccountPowers(context.userId);
    const canReview = powers.reviewer || powers.administrator;
    // Priority: research_opportunity → scientific_evidence_gap → isi_curation_gap.
    // Gold-set expected labels remain null until SME fills them. No auto-approve.
    const allDetected = detectDiscoveryCandidates();
    const byKey = new Map<string, ResearchGapCandidate>();
    for (const g of allDetected) byKey.set(g.gapKey, g);
    if (canReview) {
      try {
        const db = getDb();
        const neonOpp = await db
          .select()
          .from(researchGaps)
          .where(
            inArray(researchGaps.gapClass, [
              "research_opportunity",
              "scientific_evidence_gap",
            ]),
          )
          .limit(30);
        for (const row of neonOpp) {
          const shaped: ResearchGapCandidate = {
            gapKey: row.gapKey,
            title: row.title,
            summary: row.summary,
            status:
              row.status === "coverage_insufficient" ? "coverage_insufficient" : "candidate",
            gapClass: (row.gapClass as ResearchGapClass) ?? undefined,
            opportunityStatus: (row.opportunityStatus as OpportunityStatus) ?? undefined,
            classReason: row.classReason ?? undefined,
            pilot:
              row.pilot === "melanoma_a" || row.pilot === "coverage_b" ? row.pilot : null,
            subjectId: row.subjectId,
            objectId: row.objectId,
            relationshipId: row.relationshipId,
            diseaseId: row.diseaseId,
            whyItMatters: row.whyItMatters ?? "",
            searchScope:
              (row.searchScopeJson as ResearchGapCandidate["searchScope"]) ?? {
                corpus: "neon",
                method: "persisted",
                dateScope: "",
                note: "Persisted Discovery gap",
              },
            detectionSource:
              row.detectionSource === "conflict" ||
              row.detectionSource === "trial_signal" ||
              row.detectionSource === "melanoma_matrix"
                ? row.detectionSource
                : "evidence_gap",
            detectionDetail: (row.detectionDetail as Record<string, unknown>) ?? {},
            coverageLabel: row.coverageLabel,
            autoReviewed: false,
          };
          byKey.set(row.gapKey, shaped);
        }
      } catch {
        /* Neon optional when migration pending */
      }
    }
    const discoveryGaps = [...byKey.values()]
      .sort((a, b) => {
        const rank = (c: string | undefined) =>
          c === "research_opportunity" ? 0 : c === "scientific_evidence_gap" ? 1 : 2;
        return rank(a.gapClass) - rank(b.gapClass);
      })
      .slice(0, 25);
    const workItems = buildSmeUnifiedWorkQueue({ discoveryGaps, includeMatrix: true });
    const priority = buildSmePriorityQueues();
    const goldSummary = summariseSmeGoldSet();
    const evalReport = runSmeEvalHarness({ workItems });

    let neonGold: SmeGoldCase[] = [...SME_GOLD_SET_SCAFFOLD];
    let workEvents: {
      workItemId: string;
      action: string;
      actor: string;
      rationale: string;
      createdAt: string;
    }[] = [];
    let persistent = false;

    if (canReview) {
      try {
        const db = getDb();
        const labels = await db.select().from(smeGoldLabels).orderBy(asc(smeGoldLabels.caseId)).limit(200);
        if (labels.length) {
          const byId = new Map(labels.map((l) => [l.caseId, l]));
          neonGold = SME_GOLD_SET_SCAFFOLD.map((c) => {
            const row = byId.get(c.id);
            if (!row || !row.label) return { ...c };
            return {
              ...c,
              label: row.label as SmeGoldLabel,
              smeScore: row.smeScore,
              notes: row.notes ?? c.notes,
              status: "labelled_by_sme" as const,
            };
          });
          for (const row of labels) {
            if (neonGold.some((c) => c.id === row.caseId)) continue;
            neonGold.push({
              id: row.caseId,
              workItemId: row.workItemId,
              gapKey: row.gapKey,
              pilot: null,
              label: (row.label as SmeGoldLabel | null) ?? null,
              smeScore: row.smeScore,
              status: row.label ? "labelled_by_sme" : "pending_sme",
              notes: row.notes ?? "",
            });
          }
        }
        const events = await db
          .select()
          .from(smeWorkItemEvents)
          .orderBy(desc(smeWorkItemEvents.createdAt))
          .limit(80);
        workEvents = events.map((e) => ({
          workItemId: e.workItemId,
          action: e.action,
          actor: e.actor,
          rationale: e.rationale,
          createdAt: e.createdAt.toISOString(),
        }));
        persistent = true;
      } catch {
        persistent = false;
      }
    }

    return {
      canReview,
      educationalNotCds: true as const,
      autoApprove: false as const,
      autoRematch: false as const,
      trialIntelligenceEnabled: false as const,
      workItems,
      priority,
      workSummary: summariseSmeWorkQueue(workItems),
      goldCases: neonGold,
      goldSummary: summariseSmeGoldSet(neonGold),
      evalReport: runSmeEvalHarness({ goldCases: neonGold, workItems }),
      workEvents,
      persistent,
      scaffoldEval: evalReport,
      note: "Human scientific review required. Rematch needs PMID+DOI+passage. No bulk Gate C approve.",
    };
  });

/** Neon scientific review queue slice for the SME panel (reuse Phase C builder). */
export const listSmeEvidenceQueueSlice = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        relationshipIds: z.array(z.string().min(1).max(200)).max(40).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      })
      .optional()
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertCanReview(context.userId);
    const limit = data?.limit ?? 60;
    const want = data?.relationshipIds?.length ? new Set(data.relationshipIds) : null;
    const db = getDb();
    const rows = await db
      .select()
      .from(evidenceRecords)
      .where(eq(evidenceRecords.curation, "unreviewed"))
      .orderBy(asc(evidenceRecords.evidenceId))
      .limit(limit * 2);
    const filtered = want
      ? rows.filter((r) => r.relationshipId && want.has(r.relationshipId))
      : rows;
    const queue = buildScientificReviewQueue(
      filtered.slice(0, limit).map((r) => ({
        evidence_id: r.evidenceId,
        node_id: r.nodeId,
        relationship_id: r.relationshipId,
        claim_support: r.claimSupport,
        curation: r.curation,
        check_status: r.checkStatus,
        pmid: r.pmid,
        doi: r.doi,
        label: r.sourceRef ?? r.pmid ?? r.doi ?? r.evidenceId,
        url: r.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/` : undefined,
        claim_text: r.notes,
        passage_span: r.notes?.includes("[passage_locator]")
          ? r.notes.split("[passage_locator]")[1]?.split("\n")[0]?.trim() ?? null
          : null,
        reviewed_at: r.reviewedAt?.toISOString() ?? null,
      })),
    );
    const idByEvidence: Record<string, string> = {};
    for (const r of filtered.slice(0, limit)) idByEvidence[r.evidenceId] = r.id;
    return { queue, idByEvidence, persistent: true as const, autoApprove: false as const };
  });

/**
 * Record approve / reject / request_changes on an evidence row via SME workspace.
 * Approve still goes through computeEvidenceUpdate invariants (no silent Gate C).
 */
export const recordSmeWorkDecision = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        workItemId: z.string().min(1).max(80),
        evidenceUuid: z.string().uuid(),
        action: z.enum(["approve", "reject", "request_changes"]),
        rationale: z.string().min(8).max(2000),
        claim_support: z
          .enum(["unassessed", "supports", "partial", "contradicts", "unrelated"])
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCanReview(context.userId);
    const actor = context.email ?? context.userId;
    const db = getDb();
    const [existing] = await db
      .select()
      .from(evidenceRecords)
      .where(eq(evidenceRecords.id, data.evidenceUuid))
      .limit(1);
    if (!existing) throw new Error("Evidence record not found.");

    const curation =
      data.action === "approve" ? "approved" : data.action === "reject" ? "rejected" : "unreviewed";
    const claim_support =
      data.action === "request_changes"
        ? (data.claim_support ?? existing.claimSupport)
        : data.action === "reject"
          ? (data.claim_support ?? "unrelated")
          : (data.claim_support ?? "supports");

    const notes =
      data.action === "request_changes"
        ? [`[sme_request_changes] ${data.rationale}`, existing.notes].filter(Boolean).join("\n")
        : existing.notes;

    const result = computeEvidenceUpdate(
      {
        curation: existing.curation,
        claimSupport: existing.claimSupport,
        relationshipId: existing.relationshipId,
        pmid: existing.pmid,
        doi: existing.doi,
        sourceRef: existing.sourceRef,
        checkStatus: existing.checkStatus,
      },
      {
        curation,
        claim_support: claim_support as "unassessed" | "supports" | "partial" | "contradicts" | "unrelated",
        notes,
      },
      actor,
    );
    if (result.error) throw new Error(result.error);
    if (!Object.keys(result.set).length && data.action !== "request_changes") {
      throw new Error("No evidence fields changed.");
    }

    const previous = auditSnapshot(existing);
    await db.transaction(async (tx) => {
      let updated = existing;
      if (Object.keys(result.set).length) {
        const [u] = await tx
          .update(evidenceRecords)
          .set(result.set)
          .where(eq(evidenceRecords.id, existing.id))
          .returning();
        if (!u) throw new Error("Evidence update failed.");
        updated = u;
        await tx.insert(evidenceAuditEvents).values({
          evidenceRecordId: existing.id,
          evidenceId: existing.evidenceId,
          actor,
          reason: smeDecisionAuditReason(data.action),
          previousState: previous,
          newState: auditSnapshot(updated),
        });
      } else if (data.action === "request_changes") {
        const [u] = await tx
          .update(evidenceRecords)
          .set({ notes, updatedAt: new Date() })
          .where(eq(evidenceRecords.id, existing.id))
          .returning();
        if (!u) throw new Error("Evidence update failed.");
        updated = u;
        await tx.insert(evidenceAuditEvents).values({
          evidenceRecordId: existing.id,
          evidenceId: existing.evidenceId,
          actor,
          reason: smeDecisionAuditReason("request_changes"),
          previousState: previous,
          newState: auditSnapshot(updated),
        });
      }
      await tx.insert(smeWorkItemEvents).values({
        workItemId: data.workItemId,
        relationshipId: existing.relationshipId,
        evidenceId: existing.evidenceId,
        actor,
        action: data.action,
        rationale: data.rationale,
        payloadJson: {
          curation,
          claim_support,
          autoApprove: false,
        },
      });
    });

    return { ok: true as const, autoApprove: false as const, action: data.action };
  });

/**
 * Rematch a citation onto a relationship — requires PMID + DOI + passage locator.
 * Source edit resets approval; never auto-approves Gate C.
 */
export const recordSmeCitationRematch = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        workItemId: z.string().min(1).max(80),
        evidenceUuid: z.string().uuid(),
        relationshipId: z
          .string()
          .min(1)
          .max(200)
          .refine((v) => !!edgeByRel[v], "Unknown relationship ID"),
        pmid: z.string().min(6).max(20),
        doi: z.string().min(6).max(200),
        passageLocator: z.string().min(12).max(4000),
        notes: z.string().max(2000).nullable().optional(),
        rationale: z.string().min(8).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCanReview(context.userId);
    const validated = validateSmeCitationRematch({
      evidenceUuid: data.evidenceUuid,
      relationshipId: data.relationshipId,
      pmid: data.pmid,
      doi: data.doi,
      passageLocator: data.passageLocator,
      notes: data.notes,
    });
    if (!validated.ok) throw new Error(validated.reason);

    const actor = context.email ?? context.userId;
    const db = getDb();
    const [existing] = await db
      .select()
      .from(evidenceRecords)
      .where(eq(evidenceRecords.id, data.evidenceUuid))
      .limit(1);
    if (!existing) throw new Error("Evidence record not found.");

    const result = computeEvidenceUpdate(
      {
        curation: existing.curation,
        claimSupport: existing.claimSupport,
        relationshipId: existing.relationshipId,
        pmid: existing.pmid,
        doi: existing.doi,
        sourceRef: existing.sourceRef,
        checkStatus: existing.checkStatus,
      },
      {
        pmid: validated.normalised.pmid,
        doi: validated.normalised.doi,
        source_ref: `PMID ${validated.normalised.pmid}; DOI ${validated.normalised.doi}`,
        relationship_id: data.relationshipId,
        notes: validated.normalised.notes,
        curation: "unreviewed",
        claim_support: "unassessed",
      },
      actor,
    );
    if (result.error) throw new Error(result.error);

    const previous = auditSnapshot(existing);
    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(evidenceRecords)
        .set(result.set)
        .where(eq(evidenceRecords.id, existing.id))
        .returning();
      if (!updated) throw new Error("Rematch write failed.");
      await tx.insert(evidenceAuditEvents).values({
        evidenceRecordId: existing.id,
        evidenceId: existing.evidenceId,
        actor,
        reason: smeDecisionAuditReason("rematch_citation"),
        previousState: previous,
        newState: auditSnapshot(updated),
      });
      await tx.insert(smeWorkItemEvents).values({
        workItemId: data.workItemId,
        relationshipId: data.relationshipId,
        evidenceId: existing.evidenceId,
        actor,
        action: "rematch_citation",
        rationale: data.rationale,
        payloadJson: {
          pmid: validated.normalised.pmid,
          doi: validated.normalised.doi,
          passageLocator: validated.normalised.passageLocator,
          autoApprove: false,
          autoRematch: false,
        },
      });
    });

    return {
      ok: true as const,
      autoApprove: false as const,
      curation: "unreviewed" as const,
      note: "Rematch stored; identifier check + human approve still required before Gate C.",
    };
  });

/** Upsert an SME gold-set label. Score optional; null until SME fills. */
export const upsertSmeGoldLabel = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        caseId: z.string().min(1).max(80),
        workItemId: z.string().max(80).nullable().optional(),
        gapKey: z.string().max(200).nullable().optional(),
        label: z.enum(SME_GOLD_LABELS),
        smeScore: z.number().min(0).max(1).nullable().optional(),
        notes: z.string().max(4000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCanReview(context.userId);
    const reviewer = context.email ?? context.userId;
    const db = getDb();
    const now = new Date();
    const [existing] = await db
      .select()
      .from(smeGoldLabels)
      .where(eq(smeGoldLabels.caseId, data.caseId))
      .limit(1);

    if (existing) {
      await db
        .update(smeGoldLabels)
        .set({
          workItemId: data.workItemId ?? existing.workItemId,
          gapKey: data.gapKey ?? existing.gapKey,
          label: data.label,
          smeScore: data.smeScore === undefined ? existing.smeScore : data.smeScore,
          notes: data.notes ?? existing.notes,
          reviewer,
          reviewedAt: now,
          updatedAt: now,
        })
        .where(eq(smeGoldLabels.id, existing.id));
    } else {
      await db.insert(smeGoldLabels).values({
        caseId: data.caseId,
        workItemId: data.workItemId ?? null,
        gapKey: data.gapKey ?? null,
        label: data.label,
        smeScore: data.smeScore ?? null,
        notes: data.notes ?? null,
        reviewer,
        reviewedAt: now,
      });
    }

    return { ok: true as const, inventsScores: false as const };
  });

/** List recent SME work-item audit events (append-only). */
export const listSmeWorkItemEvents = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        workItemId: z.string().min(1).max(80).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      })
      .optional()
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertCanReview(context.userId);
    const db = getDb();
    const limit = data?.limit ?? 50;
    const rows = data?.workItemId
      ? await db
          .select()
          .from(smeWorkItemEvents)
          .where(eq(smeWorkItemEvents.workItemId, data.workItemId))
          .orderBy(desc(smeWorkItemEvents.createdAt))
          .limit(limit)
      : await db.select().from(smeWorkItemEvents).orderBy(desc(smeWorkItemEvents.createdAt)).limit(limit);
    return {
      immutable: true as const,
      events: rows.map((e) => ({
        id: e.id,
        workItemId: e.workItemId,
        relationshipId: e.relationshipId,
        evidenceId: e.evidenceId,
        actor: e.actor,
        action: e.action,
        rationale: e.rationale,
        payload: e.payloadJson,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  });

/**
 * Neon-backed evidence collections for the Research Workbench.
 * Writes never touch evidence_records curation, roles, or the knowledge graph.
 */
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireNeonAuth } from "@/integrations/neon/auth-middleware";
import { requireMember } from "@/lib/community/rules";
import { getDb } from "@/lib/db.server";
import { evidenceCollections } from "@/lib/db/schema.server";
import {
  MAX_COLLECTIONS_PER_MEMBER,
  planEvidenceCollection,
  type EvidenceCollectionRow,
} from "@/lib/research/collections";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function memberId(userId: string | null | undefined): string {
  const member = requireMember(userId);
  if (!member.ok) throw new Error("Sign in to manage evidence collections.");
  if (!UUID_RE.test(member.userId)) throw new Error("Sign in to manage evidence collections.");
  return member.userId;
}

function missingRelation(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  if (code === "42P01" || code === "42703") return true;
  const msg = err instanceof Error ? err.message : "";
  return /does not exist/i.test(msg);
}

function mapError(err: unknown): Error {
  if (missingRelation(err)) return new Error("Evidence collections are not available on this database yet.");
  return new Error("Evidence collection request failed.");
}

function toRow(row: {
  id: string;
  userId: string;
  name: string;
  conceptIds: string[] | null;
  evidenceRefs: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}): EvidenceCollectionRow {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    conceptIds: row.conceptIds ?? [],
    evidenceRefs: row.evidenceRefs ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    kgWrite: false,
  };
}

const createInput = z.object({
  name: z.string().min(1).max(120),
  conceptIds: z.array(z.string().min(1).max(40)).min(1).max(40),
  evidenceRefs: z.array(z.string().min(1).max(80)).max(40).optional(),
});

export const listEvidenceCollections = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .handler(async ({ context }) => {
    const userId = memberId(context.userId);
    try {
      const db = getDb();
      const rows = await db
        .select()
        .from(evidenceCollections)
        .where(eq(evidenceCollections.userId, userId))
        .orderBy(desc(evidenceCollections.updatedAt))
        .limit(MAX_COLLECTIONS_PER_MEMBER);
      return { available: true as const, collections: rows.map(toRow), kgWrite: false as const };
    } catch (err) {
      if (missingRelation(err)) return { available: false as const, collections: [] as EvidenceCollectionRow[], kgWrite: false as const };
      console.error("evidence_collections_list_failed", (err as { code?: string })?.code ?? "error");
      throw mapError(err);
    }
  });

export const createEvidenceCollection = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = memberId(context.userId);
    const plan = planEvidenceCollection({
      userId,
      name: data.name,
      conceptIds: data.conceptIds,
      evidenceRefs: data.evidenceRefs,
    });
    if (!plan.ok) throw new Error(plan.error);
    const db = getDb();
    try {
      const existing = await db
        .select({ id: evidenceCollections.id })
        .from(evidenceCollections)
        .where(eq(evidenceCollections.userId, userId));
      if (existing.length >= MAX_COLLECTIONS_PER_MEMBER) {
        throw new Error(`Limit of ${MAX_COLLECTIONS_PER_MEMBER} collections reached.`);
      }
      const [row] = await db
        .insert(evidenceCollections)
        .values({
          userId,
          name: plan.name,
          conceptIds: plan.conceptIds,
          evidenceRefs: plan.evidenceRefs,
        })
        .returning();
      if (!row) throw new Error("Evidence collection could not be saved.");
      return { collection: toRow(row), kgWrite: false as const };
    } catch (err) {
      if (err instanceof Error && /Sign in|Limit of|at least one|Collection name|Unknown concept/.test(err.message)) {
        throw err;
      }
      console.error("evidence_collections_create_failed", (err as { code?: string })?.code ?? "error");
      throw mapError(err);
    }
  });

export const deleteEvidenceCollection = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = memberId(context.userId);
    try {
      const db = getDb();
      await db
        .delete(evidenceCollections)
        .where(and(eq(evidenceCollections.id, data.id), eq(evidenceCollections.userId, userId)));
      return { deleted: true as const, kgWrite: false as const };
    } catch (err) {
      console.error("evidence_collections_delete_failed", (err as { code?: string })?.code ?? "error");
      throw mapError(err);
    }
  });

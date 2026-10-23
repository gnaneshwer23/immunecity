/* Read-only match against approved evidence identifiers.
   Does not insert, update, or approve evidence rows. */
import { and, eq, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db.server";
import { evidenceRecords } from "@/lib/db/schema.server";

export async function matchApprovedPaper(input: { pmid: string | null; doi: string | null }): Promise<boolean> {
  if (!input.pmid && !input.doi) return false;
  const db = getDb();
  const parts = [];
  if (input.pmid) parts.push(eq(evidenceRecords.pmid, input.pmid));
  if (input.doi) parts.push(sql`lower(${evidenceRecords.doi}) = ${input.doi.toLowerCase()}`);
  if (!parts.length) return false;
  const [row] = await db
    .select({ id: evidenceRecords.id })
    .from(evidenceRecords)
    .where(and(eq(evidenceRecords.curation, "approved"), or(...parts)))
    .limit(1);
  return Boolean(row);
}

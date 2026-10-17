import { z } from "zod";

export const evidencePageSchema = z.object({
  after: z.string().max(250).optional(),
  q: z.string().max(200).default(""),
  status: z.string().max(50).default("all"),
  type: z.string().max(50).default("all"),
  curation: z.enum(["all", "unreviewed", "approved", "rejected"]).default("all"),
  limit: z.number().int().min(1).max(100).default(50),
});

export function evidencePage<T extends { evidenceId: string }>(rows: T[], limit: number) {
  const items = rows.slice(0, limit);
  return { items, nextCursor: rows.length > limit ? items.at(-1)?.evidenceId ?? null : null };
}
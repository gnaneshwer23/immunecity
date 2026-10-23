import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireNeonAuth } from "@/integrations/neon/auth-middleware";
import { normaliseProgress, type AcademyProgress } from "@/lib/academy/progress";
import { getDb } from "@/lib/db.server";
import { academyMemberProgress } from "@/lib/db/schema.server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const progressInput = z.object({
  visitedLessonIds: z.array(z.string().max(80)).max(200),
  quizCorrect: z.array(z.string().max(80)).max(500),
});

function missingTable(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  if (code === "42P01") return true;
  const msg = err instanceof Error ? err.message : "";
  return /does not exist/i.test(msg) && /academy_member_progress/i.test(msg);
}

export const getAcademyProgress = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .handler(async ({ context }): Promise<{ available: boolean; progress: AcademyProgress | null }> => {
    if (!UUID_RE.test(context.userId)) return { available: false, progress: null };
    try {
      const db = getDb();
      const [row] = await db
        .select({ progress: academyMemberProgress.progress })
        .from(academyMemberProgress)
        .where(eq(academyMemberProgress.userId, context.userId))
        .limit(1);
      if (!row) return { available: true, progress: normaliseProgress(null) };
      return { available: true, progress: normaliseProgress(row.progress) };
    } catch (err) {
      if (missingTable(err)) return { available: false, progress: null };
      console.error("academy_progress_read_failed", (err as { code?: string })?.code ?? "error");
      return { available: false, progress: null };
    }
  });

export const saveAcademyProgress = createServerFn({ method: "POST" })
  .middleware([requireNeonAuth])
  .inputValidator((d: unknown) => progressInput.parse(d))
  .handler(async ({ data, context }): Promise<{ available: boolean }> => {
    if (!UUID_RE.test(context.userId)) return { available: false };
    const progress = normaliseProgress(data);
    try {
      const db = getDb();
      await db
        .insert(academyMemberProgress)
        .values({ userId: context.userId, progress, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: academyMemberProgress.userId,
          set: { progress, updatedAt: new Date() },
        });
      return { available: true };
    } catch (err) {
      if (missingTable(err)) return { available: false };
      console.error("academy_progress_write_failed", (err as { code?: string })?.code ?? "error");
      return { available: false };
    }
  });

import { createServerFn } from "@tanstack/react-start";
import { requireNeonAuth } from "@/integrations/neon/auth-middleware";
import { assertAdministrator } from "@/lib/access/roles.server";
import { loadAskQualitySummary } from "@/lib/askEvaluation.server";
import type { AskQualitySummary } from "@/lib/askQualityDashboard";

/**
 * Admin-only Ask quality summary over ai_evaluation_runs.
 * Returns outcome rates by prompt version — never question text.
 */
export const getAskQualityDashboard = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .handler(async ({ context }): Promise<AskQualitySummary & { available: boolean }> => {
    await assertAdministrator(context.userId);
    return loadAskQualitySummary();
  });

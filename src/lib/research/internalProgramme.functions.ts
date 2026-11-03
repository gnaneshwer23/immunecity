import { createServerFn } from "@tanstack/react-start";
import { requireNeonAuth } from "@/integrations/neon/auth-middleware";
import { assertAdministrator } from "@/lib/access/roles.server";
import { generateSyntheticProgramme } from "./syntheticProgramme";

export const requireInternalResearchAccess = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .handler(async ({ context }) => {
    await assertAdministrator(context.userId);
    return { allowed: true as const };
  });

/** Internal testing data: authentication and stored admin role are checked on the server. */
export const loadInternalResearchProgramme = createServerFn({ method: "GET" })
  .middleware([requireNeonAuth])
  .handler(async ({ context }) => {
    await assertAdministrator(context.userId);
    return generateSyntheticProgramme();
  });

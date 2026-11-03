import { verifyNeonRequest } from "@/integrations/neon/verify-request.server";
import { loadAccountPowers } from "@/lib/access/roles.server";
import { isiInvestigationDatabase } from "./investigation-db.server";
import { isiInvestigationReleases, loadIsiInvestigationRelease } from "./investigation-corpus.server";
import { createOwnedInvestigationBackend, readInvestigationRequest, investigationError, investigationJson } from "./vendor/investigationBackend";
export async function handleIsiInvestigationRequest(request: Request) {
  let userId: string;
  try { ({ userId } = await verifyNeonRequest(request)); }
  catch { return investigationJson({ error: "sign_in_required" }, 401); }
  try {
    const powers = await loadAccountPowers(userId);
    // Internal tools remain admin-only. Every row is still private to its creator; no admin list-all.
    if (!powers.administrator) return investigationJson({ error: "administrator_access_required" }, 403);
    const command = await readInvestigationRequest(request);
    const backend = createOwnedInvestigationBackend({ database: isiInvestigationDatabase(userId), schema: "public",
      principal: { ownerId: userId, actor: { id: userId, role: "admin" } }, releases: isiInvestigationReleases, loadRelease: loadIsiInvestigationRelease,
    });
    return investigationJson(await backend.execute(command));
  } catch (error) { return investigationError(error); }
}

import { createFileRoute } from "@tanstack/react-router";
import { handleIsiInvestigationRequest } from "@/lib/hsi/investigation.api.server";
export const Route = createFileRoute("/api/internal/investigations")({
  server: { handlers: { POST: ({ request }) => handleIsiInvestigationRequest(request) } },
});

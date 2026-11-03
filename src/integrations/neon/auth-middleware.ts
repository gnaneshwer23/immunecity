import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { attachNeonAuth } from "./auth-attacher";
import { verifyNeonRequest } from "./verify-request.server";
export type { NeonAuthClaims } from "./verify-request.server";

/** Client attaches a Neon token; shared server verification also protects internal research APIs. */
export const requireNeonAuth = createMiddleware({ type: "function" })
  .middleware([attachNeonAuth])
  .server(async ({ next }) => {
    const request = getRequest();
    if (!request?.headers) throw new Error("Unauthorized: No request headers available");
    return next({ context: await verifyNeonRequest(request) });
  });

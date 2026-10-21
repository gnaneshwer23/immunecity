import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { attachNeonAuth } from "./auth-attacher";

function resolveAuthBaseUrl(): string {
  const raw = process.env["NEON_AUTH_BASE_URL"] || process.env["VITE_NEON_AUTH_URL"] || "";
  const url = raw.replace(/\/+$/, "");
  if (!url) {
    throw new Error(
      "Missing NEON_AUTH_BASE_URL (or VITE_NEON_AUTH_URL). Set from Neon Console → Auth → Configuration.",
    );
  }
  return url;
}

declare global {
  // eslint-disable-next-line no-var
  var __immuneCityJwks: ReturnType<typeof createRemoteJWKSet> | undefined;
  // eslint-disable-next-line no-var
  var __immuneCityJwksUrl: string | undefined;
}

function getJwks(baseUrl: string) {
  const jwksUrl = process.env["NEON_AUTH_JWKS_URL"] || `${baseUrl}/.well-known/jwks.json`;
  if (!globalThis.__immuneCityJwks || globalThis.__immuneCityJwksUrl !== jwksUrl) {
    globalThis.__immuneCityJwks = createRemoteJWKSet(new URL(jwksUrl));
    globalThis.__immuneCityJwksUrl = jwksUrl;
  }
  return globalThis.__immuneCityJwks;
}

export type NeonAuthClaims = JWTPayload & {
  sub: string;
  email?: string;
  name?: string;
  id?: string;
};

/** Attaches the Neon Auth JWT client-side (only for functions that require auth), then verifies it server-side. */
export const requireNeonAuth = createMiddleware({ type: "function" })
  .middleware([attachNeonAuth])
  .server(async ({ next }) => {
  const baseUrl = resolveAuthBaseUrl();
  const request = getRequest();
  if (!request?.headers) throw new Error("Unauthorized: No request headers available");

  const authHeader = request.headers.get("authorization");
  if (!authHeader) throw new Error("Unauthorized: No authorization header provided");
  if (!authHeader.startsWith("Bearer ")) throw new Error("Unauthorized: Only Bearer tokens are supported");

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token || token.split(".").length !== 3) throw new Error("Unauthorized: Invalid token");

  const issuer = new URL(baseUrl).origin;
  let payload: NeonAuthClaims;
  try {
    const verified = await jwtVerify(token, getJwks(baseUrl), {
      issuer,
      algorithms: ["EdDSA"],
    });
    payload = verified.payload as NeonAuthClaims;
  } catch {
    throw new Error("Unauthorized: Invalid token");
  }

  const userId = payload.sub || payload.id;
  if (!userId) throw new Error("Unauthorized: No user ID found in token");

  return next({
    context: {
      userId: String(userId),
      claims: payload,
      email: typeof payload.email === "string" ? payload.email : null,
    },
  });
});

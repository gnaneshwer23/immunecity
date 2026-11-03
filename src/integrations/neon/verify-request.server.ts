import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";

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

/** Shared by server functions and private research HTTP routes. */
export async function verifyNeonBearer(token: string, issuer: string, jwks: JWTVerifyGetKey): Promise<NeonAuthClaims> {
  const verified = await jwtVerify(token, jwks, { issuer, algorithms: ["EdDSA"] });
  const payload = verified.payload as NeonAuthClaims;
  if (!(payload.sub || payload.id)) throw new Error("Unauthorized: No user ID found in token");
  return payload;
}
export async function verifyNeonRequest(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = header.slice(7).trim();
  if (!token || token.split(".").length !== 3) throw new Error("Unauthorized");
  const baseUrl = resolveAuthBaseUrl();
  let claims: NeonAuthClaims;
  try { claims = await verifyNeonBearer(token, new URL(baseUrl).origin, getJwks(baseUrl)); }
  catch { throw new Error("Unauthorized"); }
  return { userId: String(claims.sub || claims.id), claims, email: typeof claims.email === "string" ? claims.email : null };
}

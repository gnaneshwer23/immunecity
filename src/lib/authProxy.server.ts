/**
 * Same-origin proxy for Neon Auth.
 * Google returns the browser to this site with a one-time verifier. Redeeming
 * it needs the challenge cookie set when sign-in started. That cookie has to
 * live on this host; a cross-site cookie is dropped by the browser.
 */

const PREFIX = "/api/auth/";

/** Cookie names Neon Auth sets on sign-in / OAuth (including known typo variant). */
const NEON_AUTH_COOKIE_NAMES = [
  "__Secure-neon-auth.session_token",
  "__Secure-neon-auth.session_challenge",
  "__Secure-neon-auth.session_challange",
] as const;

export function authProxySuffix(pathname: string): string | null {
  if (!pathname.startsWith(PREFIX)) return null;
  const rest = pathname.slice(PREFIX.length);
  if (!rest || rest.includes("..") || rest.includes("\\") || !/^[a-zA-Z0-9._/-]+$/.test(rest)) return null;
  return rest;
}

/** Read every Set-Cookie even when getSetCookie is missing or empty. */
export function collectSetCookies(headers: Headers): string[] {
  if (typeof headers.getSetCookie === "function") {
    const list = headers.getSetCookie();
    if (list.length) return list;
  }
  const out: string[] = [];
  headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") out.push(value);
  });
  return out;
}

/**
 * Store Neon Auth cookies as first-party on this host.
 * Drop Domain (Neon points at its own host) and CHIPS Partitioned + SameSite=None
 * so browsers that restrict partitioned third-party-style cookies still keep the session.
 * Force Path=/ and Secure so `__Secure-` cookies are valid on www.
 */
export function rewriteAuthSetCookie(cookie: string): string {
  const parts = cookie
    .split(";")
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) return false;
      const lower = part.toLowerCase();
      if (lower.startsWith("domain=")) return false;
      if (lower.startsWith("samesite=")) return false;
      if (lower === "partitioned") return false;
      if (lower.startsWith("path=")) return false;
      if (lower === "secure") return false;
      return true;
    });
  parts.push("Path=/");
  parts.push("Secure");
  parts.push("SameSite=Lax");
  return parts.join("; ");
}

/**
 * Expire leftover CHIPS / SameSite=None copies of Neon cookies.
 * An earlier proxy left Partitioned cookies that some browsers keep in a
 * separate jar and then fail to replace with a first-party Lax session.
 */
export function clearStalePartitionedAuthCookies(): string[] {
  return NEON_AUTH_COOKIE_NAMES.map(
    (name) => `${name}=; Max-Age=0; Path=/; Secure; SameSite=None; Partitioned`,
  );
}

function authBase(): string {
  const raw = process.env["NEON_AUTH_BASE_URL"] || process.env["VITE_NEON_AUTH_URL"] || "";
  return raw.replace(/\/+$/, "");
}

export async function proxyNeonAuth(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const suffix = authProxySuffix(url.pathname);
  if (!suffix) return Response.json({ message: "Not found" }, { status: 404 });

  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "POST") {
    return Response.json({ message: "Method not allowed" }, { status: 405 });
  }

  const base = authBase();
  if (!base) {
    return Response.json(
      { message: "Sign-in is currently unavailable. The app owner needs to check the sign-in service configuration." },
      { status: 503 },
    );
  }

  const target = new URL(`${base}/${suffix}`);
  target.search = url.search;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const origin = request.headers.get("origin");
  if (origin) headers.set("origin", origin);
  const referer = request.headers.get("referer");
  if (referer) headers.set("referer", referer);
  headers.set("accept", request.headers.get("accept") || "application/json");

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body: method === "GET" ? undefined : await request.arrayBuffer(),
      redirect: "manual",
    });
  } catch {
    return Response.json({ message: "Sign-in could not reach the account service." }, { status: 502 });
  }

  const out = new Headers();
  out.set("cache-control", "private, no-store");
  const responseType = upstream.headers.get("content-type");
  if (responseType) out.set("content-type", responseType);
  const location = upstream.headers.get("location");
  if (location) out.set("location", location);

  const cookies = collectSetCookies(upstream.headers);
  const setsSession = cookies.some((c) => /session_token=/i.test(c));
  if (setsSession) {
    for (const stale of clearStalePartitionedAuthCookies()) out.append("set-cookie", stale);
  }
  for (const cookieHeader of cookies) out.append("set-cookie", rewriteAuthSetCookie(cookieHeader));

  return new Response(upstream.body, { status: upstream.status, headers: out });
}

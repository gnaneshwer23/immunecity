/**
 * Lightweight Neon Managed Better Auth client (fetch-only).
 * Avoids @neondatabase/neon-js install weight; talks to the Auth REST API.
 *
 * Env: VITE_NEON_AUTH_URL (browser) or NEON_AUTH_BASE_URL (SSR).
 * Base URL looks like: https://ep-xxx.neonauth….neon.tech/neondb/auth
 */

export type NeonAuthUser = {
  id: string;
  email: string;
  name?: string | null;
  emailVerified?: boolean;
  image?: string | null;
};

export type NeonAuthSession = {
  id?: string;
  userId?: string;
  expiresAt?: string;
  token?: string;
};

type AuthResult<T> = { data: T | null; error: { message: string } | null };

/** One-time handoff Neon appends to the app callback after Google consent. */
export const NEON_AUTH_SESSION_VERIFIER = "neon_auth_session_verifier";
const VERIFIER_MAX = 8_192;

export function configuredAuthUrl(): string {
  const raw =
    (typeof import.meta !== "undefined" && import.meta.env?.["VITE_NEON_AUTH_URL"]) ||
    (typeof process !== "undefined" && process.env?.["NEON_AUTH_BASE_URL"]) ||
    (typeof process !== "undefined" && process.env?.["VITE_NEON_AUTH_URL"]) ||
    "";
  return String(raw).replace(/\/+$/, "");
}

/**
 * Browser calls go through the same-origin `/api/auth` proxy so the OAuth
 * challenge cookie is first-party. Server calls use the Neon Auth base URL.
 * The browser path does not need VITE_NEON_AUTH_URL — the server proxy holds it.
 */
function authBaseUrl(): string {
  if (typeof window !== "undefined") return "/api/auth";
  const url = configuredAuthUrl();
  if (!url) {
    throw new Error(
      "Missing VITE_NEON_AUTH_URL (or NEON_AUTH_BASE_URL). Set from Neon Console → Auth → Configuration.",
    );
  }
  return url;
}

/** Home and empty redirects land on My Workspace so new members find their dashboard. */
export function postAuthPath(redirect: string): string {
  const path = redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
  return path === "/" ? "/workspace" : path;
}

/** Browser event so Shell and page hooks re-read the session after login/logout. */
export const NEON_AUTH_CHANGED_EVENT = "isi:neon-auth-changed";

export function notifyAuthChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NEON_AUTH_CHANGED_EVENT));
}

/**
 * Full page load after email/Google handoff so every `useMember` remounts with
 * the new session cookie. Client-side navigate left the header on "Sign in".
 */
export function goPostAuth(redirect: string): void {
  const path = postAuthPath(redirect);
  notifyAuthChanged();
  window.location.assign(path);
}

export function sessionRequestPath(verifier?: string): string {
  const token = verifier?.trim() ?? "";
  if (!token || token.length > VERIFIER_MAX) return "/get-session";
  return `/get-session?${NEON_AUTH_SESSION_VERIFIER}=${encodeURIComponent(token)}`;
}

/**
 * Google sign-in and sign-up share this call. `requestSignUp` lets a new
 * Google account be created. The database trigger still stores only `user`.
 */
export function googleSignInBody(callbackURL: string) {
  return {
    provider: "google" as const,
    callbackURL,
    errorCallbackURL: callbackURL,
    newUserCallbackURL: callbackURL,
    disableRedirect: true,
    requestSignUp: true,
  };
}

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${authBaseUrl()}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
}

async function parseJson<T>(res: Response): Promise<AuthResult<T>> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const msg: string = (
      (body && typeof body === "object" && "message" in body && String((body as { message: unknown }).message)) ||
      (body && typeof body === "object" && "error" in body && String((body as { error: unknown }).error)) ||
      res.statusText ||
      "Auth request failed") as string;
    return { data: null, error: { message: msg } };
  }
  return { data: body as T, error: null };
}

export const neonAuth = {
  async getSession(verifier?: string): Promise<AuthResult<{ session: NeonAuthSession | null; user: NeonAuthUser | null }>> {
    try {
    const res = await authFetch(sessionRequestPath(verifier), { method: "GET" });
    const parsed = await parseJson<{ session?: NeonAuthSession | null; user?: NeonAuthUser | null } | null>(res);
    if (parsed.error) return { data: null, error: parsed.error };
    const payload = parsed.data;
    return {
      data: {
        session: payload?.session ?? null,
        user: payload?.user ?? null,
      },
      error: null,
    };
    } catch {
      return { data: null, error: { message: "Sign-in is currently unavailable. The app owner needs to check the sign-in service configuration." } };
    }
  },

  async getUser(verifier?: string): Promise<AuthResult<{ user: NeonAuthUser | null }>> {
    const session = await neonAuth.getSession(verifier);
    if (session.error) return { data: null, error: session.error };
    return { data: { user: session.data?.user ?? null }, error: null };
  },

  async signInEmail(email: string, password: string): Promise<AuthResult<{ user: NeonAuthUser }>> {
    const res = await authFetch("/sign-in/email", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const parsed = await parseJson<{ user: NeonAuthUser }>(res);
    if (!parsed.error) notifyAuthChanged();
    return parsed;
  },

  async signUpEmail(email: string, password: string, name?: string): Promise<AuthResult<{ user: NeonAuthUser; session?: NeonAuthSession | null }>> {
    const res = await authFetch("/sign-up/email", {
      method: "POST",
      body: JSON.stringify({ email, password, name: name || email.split("@")[0] || "User" }),
    });
    const parsed = await parseJson<{ user: NeonAuthUser; session?: NeonAuthSession | null }>(res);
    if (!parsed.error) notifyAuthChanged();
    return parsed;
  },

  async signOut(): Promise<AuthResult<{ success: boolean }>> {
    const res = await authFetch("/sign-out", { method: "POST", body: "{}" });
    if (!res.ok && res.status !== 204) return parseJson(res);
    notifyAuthChanged();
    return { data: { success: true }, error: null };
  },

  /** Short-lived JWT for Authorization: Bearer on server functions (EdDSA, ~15m). */
  async token(): Promise<AuthResult<{ token: string }>> {
    const res = await authFetch("/token", { method: "GET" });
    const parsed = await parseJson<{ token?: string }>(res);
    if (parsed.error) return { data: null, error: parsed.error };
    if (!parsed.data?.token) return { data: null, error: { message: "No JWT returned from Neon Auth /token" } };
    return { data: { token: parsed.data.token }, error: null };
  },

  /** Starts Google OAuth. New accounts stay members; the role trigger does not grant admin. */
  async signInWithGoogle(callbackURL: string): Promise<AuthResult<{ redirected: true }>> {
    const res = await authFetch("/sign-in/social", {
      method: "POST",
      body: JSON.stringify(googleSignInBody(callbackURL)),
    });
    const parsed = await parseJson<{ url?: string; redirect?: boolean }>(res);
    if (parsed.error) return { data: null, error: parsed.error };
    const dest = parsed.data?.url;
    if (!dest) return { data: null, error: { message: "Google sign-in did not return a redirect URL" } };
    window.location.assign(dest);
    return { data: { redirected: true }, error: null };
  },
};

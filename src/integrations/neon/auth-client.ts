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

function authBaseUrl(): string {
  const raw =
    (typeof import.meta !== "undefined" && import.meta.env?.["VITE_NEON_AUTH_URL"]) ||
    (typeof process !== "undefined" && process.env?.["NEON_AUTH_BASE_URL"]) ||
    (typeof process !== "undefined" && process.env?.["VITE_NEON_AUTH_URL"]) ||
    "";
  const url = String(raw).replace(/\/+$/, "");
  if (!url) {
    throw new Error(
      "Missing VITE_NEON_AUTH_URL (or NEON_AUTH_BASE_URL). Set from Neon Console → Auth → Configuration.",
    );
  }
  return url;
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
    const msg =
      (body && typeof body === "object" && "message" in body && String((body as { message: unknown }).message)) ||
      (body && typeof body === "object" && "error" in body && String((body as { error: unknown }).error)) ||
      res.statusText ||
      "Auth request failed";
    return { data: null, error: { message: msg } };
  }
  return { data: body as T, error: null };
}

export const neonAuth = {
  async getSession(): Promise<AuthResult<{ session: NeonAuthSession | null; user: NeonAuthUser | null }>> {
    const res = await authFetch("/get-session", { method: "GET" });
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
  },

  async getUser(): Promise<AuthResult<{ user: NeonAuthUser | null }>> {
    const session = await neonAuth.getSession();
    if (session.error) return { data: null, error: session.error };
    return { data: { user: session.data?.user ?? null }, error: null };
  },

  async signInEmail(email: string, password: string): Promise<AuthResult<{ user: NeonAuthUser }>> {
    const res = await authFetch("/sign-in/email", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return parseJson(res);
  },

  async signUpEmail(email: string, password: string, name?: string): Promise<AuthResult<{ user: NeonAuthUser; session?: NeonAuthSession | null }>> {
    const res = await authFetch("/sign-up/email", {
      method: "POST",
      body: JSON.stringify({ email, password, name: name || email.split("@")[0] || "User" }),
    });
    return parseJson(res);
  },

  async signOut(): Promise<AuthResult<{ success: boolean }>> {
    const res = await authFetch("/sign-out", { method: "POST", body: "{}" });
    if (!res.ok && res.status !== 204) return parseJson(res);
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

  /** Starts Google OAuth via Neon shared credentials; redirects when Auth returns a URL. */
  async signInWithGoogle(callbackURL: string): Promise<AuthResult<{ redirected: true }>> {
    const res = await authFetch("/sign-in/social", {
      method: "POST",
      body: JSON.stringify({ provider: "google", callbackURL }),
    });
    const parsed = await parseJson<{ url?: string; redirect?: boolean }>(res);
    if (parsed.error) return { data: null, error: parsed.error };
    const dest = parsed.data?.url;
    if (!dest) return { data: null, error: { message: "Google sign-in did not return a redirect URL" } };
    window.location.assign(dest);
    return { data: { redirected: true }, error: null };
  },
};

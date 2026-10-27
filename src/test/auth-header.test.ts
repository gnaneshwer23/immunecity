import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { googleSignInBody, neonAuth, postAuthPath, sessionRequestPath } from "@/integrations/neon/auth-client";
import {
  authProxySuffix,
  clearStalePartitionedAuthCookies,
  collectSetCookies,
  rewriteAuthSetCookie,
} from "@/lib/authProxy.server";

describe("Google sign-in handoff", () => {
  afterEach(() => {
    vi.unstubAllGlobals?.();
    vi.unstubAllEnvs?.();
    vi.restoreAllMocks?.();
  });

  it("asks Neon to create a member account without granting a higher role", () => {
    const body = googleSignInBody("https://www.immune-super-intelligence.co.uk/auth?redirect=%2F");
    expect(body.provider).toBe("google");
    expect(body.requestSignUp).toBe(true);
    expect(body.disableRedirect).toBe(true);
    expect(body.callbackURL).toContain("/auth?redirect=");
    expect(body.errorCallbackURL).toBe(body.callbackURL);
    expect(JSON.stringify(body)).not.toMatch(/admin|moderator|reviewer/);
  });

  it("sends the one-time verifier on get-session and ignores an empty one", () => {
    expect(sessionRequestPath("hand-off")).toBe("/get-session?neon_auth_session_verifier=hand-off");
    expect(sessionRequestPath("")).toBe("/get-session");
    expect(sessionRequestPath(" ")).toBe("/get-session");
    expect(sessionRequestPath("a".repeat(8193))).toBe("/get-session");
  });

  it("posts Google sign-in through the same-origin auth proxy", async () => {
    vi.stubEnv("VITE_NEON_AUTH_URL", "https://auth.example.test/neondb/auth");
    vi.stubEnv("NEON_AUTH_BASE_URL", "https://auth.example.test/neondb/auth");
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ url: "https://accounts.google.com/o/oauth" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window.location, "assign").mockImplementation(() => undefined);
    const result = await neonAuth.signInWithGoogle("https://www.example.test/auth?redirect=%2F");
    expect(result.error).toBeNull();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/auth/sign-in/social");
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body.requestSignUp).toBe(true);
    expect(body.disableRedirect).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/admin|moderator/);
  });

  it("redeems the verifier through the same-origin proxy", async () => {
    vi.stubEnv("VITE_NEON_AUTH_URL", "https://auth.example.test/neondb/auth");
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ session: { id: "s" }, user: { id: "u", email: "a@example.test" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await neonAuth.getUser("hand-off");
    expect(result.error).toBeNull();
    expect(result.data?.user?.email).toBe("a@example.test");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/auth/get-session?neon_auth_session_verifier=hand-off");
  });

  it("keeps the auth page able to read the verifier and still stores only the member role", () => {
    const auth = readFileSync(resolve(process.cwd(), "src/routes/auth.tsx"), "utf8");
    expect(auth).toContain("NEON_AUTH_SESSION_VERIFIER");
    expect(auth).toContain("getUser(verifier");
    expect(auth).not.toMatch(/role:\s*["']admin["']/);
    const client = readFileSync(resolve(process.cwd(), "src/integrations/neon/auth-client.ts"), "utf8");
    expect(client).toContain("requestSignUp: true");
    const trigger = readFileSync(resolve(process.cwd(), "drizzle/neon/0000_immune_city_public_schema.sql"), "utf8");
    expect(trigger).toContain("VALUES (NEW.id, 'user')");
    expect(trigger).not.toMatch(/VALUES \(NEW\.id, 'admin'\)/);
  });
});

describe("auth proxy cookies", () => {
  it("stores Neon cookies as first-party Lax and refuses path escape", () => {
    expect(
      rewriteAuthSetCookie(
        "__Secure-neon-auth.session_challenge=1; Path=/neondb/auth; Domain=auth.example.test; Secure; HttpOnly; SameSite=None; Partitioned",
      ),
    ).toBe("__Secure-neon-auth.session_challenge=1; HttpOnly; Path=/; Secure; SameSite=Lax");
    expect(
      rewriteAuthSetCookie("__Secure-neon-auth.session_token=abc; HttpOnly; SameSite=None; Partitioned"),
    ).toBe("__Secure-neon-auth.session_token=abc; HttpOnly; Path=/; Secure; SameSite=Lax");
    expect(clearStalePartitionedAuthCookies().some((c) => c.includes("session_token=") && c.includes("Partitioned"))).toBe(
      true,
    );
    const headers = new Headers();
    headers.append("set-cookie", "a=1");
    headers.append("set-cookie", "b=2");
    expect(collectSetCookies(headers)).toEqual(["a=1", "b=2"]);
    expect(authProxySuffix("/api/auth/get-session")).toBe("get-session");
    expect(authProxySuffix("/api/auth/sign-in/social")).toBe("sign-in/social");
    expect(authProxySuffix("/api/auth/../secret")).toBeNull();
    expect(authProxySuffix("/api/other")).toBeNull();
  });
});

describe("post-auth landing", () => {
  it("sends bare home redirects to My Workspace and keeps deep links", () => {
    expect(postAuthPath("/")).toBe("/workspace");
    expect(postAuthPath("")).toBe("/workspace");
    expect(postAuthPath("//evil.example")).toBe("/workspace");
    expect(postAuthPath("/community/new")).toBe("/community/new");
    expect(postAuthPath("/workspace")).toBe("/workspace");
    const auth = readFileSync(resolve(process.cwd(), "src/routes/auth.tsx"), "utf8");
    expect(auth).toContain("postAuthPath");
    expect(auth).toContain("goPostAuth");
    expect(auth).toContain("sessionReady");
    expect(auth).toContain("SESSION_COOKIE_MSG");
    expect(auth).toContain('default("/workspace")');
    const client = readFileSync(resolve(process.cwd(), "src/integrations/neon/auth-client.ts"), "utf8");
    expect(client).toMatch(/if \(typeof window !== "undefined"\) return "\/api\/auth"/);
    expect(client).toContain("NEON_AUTH_CHANGED_EVENT");
  });

  it("hard-navigates after auth so the header remounts with the session", () => {
    const client = readFileSync(resolve(process.cwd(), "src/integrations/neon/auth-client.ts"), "utf8");
    expect(client).toContain("function goPostAuth");
    expect(client).toContain("window.location.assign(path)");
    expect(client).toContain("notifyAuthChanged");
    const auth = readFileSync(resolve(process.cwd(), "src/routes/auth.tsx"), "utf8");
    expect(auth).toContain("goPostAuth(target)");
    expect(auth).not.toMatch(/navigate\(\{\s*to:\s*target/);
  });
});

describe("ivory header", () => {
  it("keeps the words and Sign in on the laptop bar", () => {
    const css = readFileSync(resolve(process.cwd(), "src/biotech.css"), "utf8");
    expect(css).not.toMatch(/\.journey-main \.nav-label \{[^}]*clip:/);
    expect(css).toContain("min-width: 1200px) and (max-width: 1479px)");
    expect(css).toContain("max-width: 1199px");
    expect(css).toContain(".header-signin, .header-account");
    const shell = readFileSync(resolve(process.cwd(), "src/components/immune/Shell.tsx"), "utf8");
    expect(shell).toContain("<Youtube size={16}");
    const header = shell.slice(shell.indexOf("<header"), shell.indexOf("</header>"));
    expect(header).toContain("HeaderAccount");
    expect(header).not.toContain("My Workspace");
    expect(header).not.toContain("Ask Immune");
    const account = shell.slice(shell.indexOf("function HeaderAccount"), shell.indexOf("function PillarMenu"));
    expect(account).toContain("My Workspace");
    expect(account).toContain("Logout");
    expect(account).toContain('to="/community/profile"');
    const chrome = readFileSync(resolve(process.cwd(), "src/components/immune/community/chrome.tsx"), "utf8");
    expect(chrome).toContain("NEON_AUTH_CHANGED_EVENT");
  });
});

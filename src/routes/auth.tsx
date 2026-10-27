import { seoHead } from "@/lib/seo";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useState } from "react";
import { NEON_AUTH_SESSION_VERIFIER, neonAuth, postAuthPath } from "@/integrations/neon/auth-client";
import { PageHead } from "@/components/immune/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  validateSearch: zodValidator(z.object({
    redirect: fallback(z.string(), "/workspace").default("/workspace"),
    [NEON_AUTH_SESSION_VERIFIER]: fallback(z.string().max(8192), "").optional(),
    error: fallback(z.string().max(80), "").optional(),
  })),
  head: () => seoHead({ title: "Sign in — Immune Super Intelligence", description: "Sign in to Immune Super Intelligence. Educational account for community, workspace and saved concepts. Not clinical decision support.", path: "/auth", noIndex: true }),
  component: AuthPage,
});

function googleReturnMessage(code: string): string {
  if (code === "signup_disabled" || code === "unable_to_create_user") {
    return "Google could not create the account. Try email instead, or ask the site owner to enable Google sign-up and add this site as a trusted origin in Neon Auth → Configuration.";
  }
  if (code === "state_not_found" || code === "please_restart_the_process") {
    return "Google sign-in expired. Please try Continue with Google again.";
  }
  return "Google sign-in could not be completed. Please try again.";
}

function AuthPage() {
  const search = Route.useSearch();
  const { redirect } = search;
  const verifier = search[NEON_AUTH_SESSION_VERIFIER] ?? "";
  const oauthError = search.error ?? "";
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(true);
  const target = postAuthPath(redirect);

  useEffect(() => {
    let cancelled = false;
    neonAuth.getUser(verifier || undefined).then(({ data, error }) => {
      if (cancelled) return;
      setAvailable(!error);
      if (error) setMsg(error.message);
      else if (data?.user) {
        navigate({ to: target, replace: true });
        return;
      } else if (verifier) {
        setMsg("Google sign-in did not finish. Please try Continue with Google again.");
      } else if (oauthError) {
        setMsg(googleReturnMessage(oauthError));
      }
      if (verifier || oauthError) {
        navigate({ to: "/auth", search: { redirect: target }, replace: true });
      }
    });
    return () => { cancelled = true; };
  }, [navigate, oauthError, target, verifier]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
    if (mode === "in") {
      const { error } = await neonAuth.signInEmail(email, password);
      if (error) setMsg(error.message);
      else navigate({ to: target });
    } else {
      const { data, error } = await neonAuth.signUpEmail(email, password);
      if (error) setMsg(error.message);
      else if (!data?.session && !data?.user) setMsg("Account created. Sign in to continue.");
      else navigate({ to: target });
    }
    } catch {
      setMsg("Sign-in could not be completed. Please try again later.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    setMsg("");
    try {
    sessionStorage.setItem("postAuth", target);
    const { error } = await neonAuth.signInWithGoogle(
      window.location.origin + "/auth?redirect=" + encodeURIComponent(target),
    );
    if (error) {
      setMsg(error.message);
      setBusy(false);
    }
    } catch {
      setMsg("Google sign-in is currently unavailable. Please try again later.");
      setBusy(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 440 }}>
      <PageHead
        kicker="Account"
        title={mode === "in" ? "Sign in" : "Create an account"}
        lede="Sign in for your personal workspace and community discussion. After sign-in you land on My Workspace. New accounts are members only — review and moderation are granted separately. This is an educational resource, not clinical decision support."
      />
      <div className="card">
        <Button variant="outline" className="w-full" disabled={busy || !available} onClick={google}>
          Continue with Google
        </Button>
        <p className="xs muted" style={{ textAlign: "center", margin: "14px 0" }}>
          or with email
        </p>
        <form onSubmit={submit} className="stack" style={{ gap: 12 }}>
          <label className="field">
            Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <Button disabled={busy || !available} type="submit">
            {mode === "in" ? "Sign in" : "Create account"}
          </Button>
        </form>
        {msg ? <p className="callout" role="status" style={{ marginTop: 12 }}>{msg}</p> : null}
        <p className="small" style={{ marginTop: 14 }}>
          {mode === "in" ? "No account yet? " : "Already registered? "}
          <Button variant="link" disabled={busy || !available} onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "Create one" : "Sign in"}
          </Button>
        </p>
      </div>
    </div>
  );
}

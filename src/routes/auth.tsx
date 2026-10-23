import { seoHead } from "@/lib/seo";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useState } from "react";
import { neonAuth } from "@/integrations/neon/auth-client";
import { PageHead } from "@/components/immune/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  validateSearch: zodValidator(z.object({ redirect: fallback(z.string(), "/").default("/") })),
  head: () => seoHead({ title: "Sign in — Immune Super Intelligence", description: "Sign in to Immune Super Intelligence. Educational account for community, workspace and saved concepts. Not clinical decision support.", path: "/auth", noIndex: true }),
  component: AuthPage,
});

const safePath = (p: string) => (p.startsWith("/") && !p.startsWith("//") ? p : "/");

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(false);
  const target = safePath(redirect);

  useEffect(() => {
    neonAuth.getUser().then(({ data, error }) => {
      setAvailable(!error);
      if (error) setMsg(error.message);
      if (data?.user) navigate({ to: target });
    });
  }, [navigate, target]);

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
        lede="Sign in for community discussion, your workspace and saved concepts. New accounts are members. Review and moderation are granted separately, not at sign-up. This is an educational resource, not clinical decision support."
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

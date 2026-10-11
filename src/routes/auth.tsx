import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { PageHead } from "@/components/immune/ui";

export const Route = createFileRoute("/auth")({
  validateSearch: zodValidator(z.object({ redirect: fallback(z.string(), "/curation").default("/curation") })),
  head: () => ({
    meta: [
      { title: "Sign in — Immune City" },
      { name: "description", content: "Sign in to curate the Immune City citation layer." },
      { property: "og:title", content: "Sign in — Immune City" },
      { property: "og:description", content: "Sign in to curate the atlas citation layer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const safePath = (p: string) => (p.startsWith("/") && !p.startsWith("//") ? p : "/curation");

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const target = safePath(redirect);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: target }); });
    const { data: sub } = supabase.auth.onAuthStateChange((e) => { if (e === "SIGNED_IN") navigate({ to: target }); });
    return () => sub.subscription.unsubscribe();
  }, [navigate, target]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg("");
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + target } });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg("Check your email to confirm your account, then sign in.");
    }
    setBusy(false);
  };

  const google = async () => {
    sessionStorage.setItem("postAuth", target);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth?redirect=" + encodeURIComponent(target) });
    if (r.error) setMsg(r.error.message);
  };

  return (
    <div className="page" style={{ maxWidth: 440 }}>
      <PageHead kicker="Curation · Access" title={mode === "in" ? "Sign in" : "Create an account"} lede="Curation is open to signed-in readers. The first account created becomes the atlas admin." />
      <div className="card">
        <button className="btn" style={{ width: "100%", justifyContent: "center" }} onClick={google}>Continue with Google</button>
        <p className="xs muted" style={{ textAlign: "center", margin: "14px 0" }}>or with email</p>
        <form onSubmit={submit} className="stack" style={{ gap: 12 }}>
          <label className="field">Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="field">Password<input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <button className="btn primary" disabled={busy} type="submit">{mode === "in" ? "Sign in" : "Create account"}</button>
        </form>
        {msg ? <p className="callout" style={{ marginTop: 12 }}>{msg}</p> : null}
        <p className="small" style={{ marginTop: 14 }}>
          {mode === "in" ? "No account yet? " : "Already registered? "}
          <button className="nodelink" onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? "Create one" : "Sign in"}</button>
        </p>
      </div>
    </div>
  );
}

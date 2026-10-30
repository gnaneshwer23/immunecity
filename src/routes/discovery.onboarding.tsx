import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { PageHead } from "@/components/immune/ui";
import { useMember, safeClientError } from "@/components/immune/community/chrome";
import { PRODUCT_NAME } from "@/lib/brand";
import { upsertMyResearchProfile } from "@/lib/discovery/profiles.functions";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/discovery/onboarding")({
  head: () =>
    seoHead({
      title: `Discovery onboarding | ${PRODUCT_NAME}`,
      description: "Set research focus for the Discovery Radar. No sensitive PII required. Does not write the knowledge graph.",
      path: "/discovery/onboarding",
      noIndex: true,
    }),
  component: DiscoveryOnboardingPage,
});

function DiscoveryOnboardingPage() {
  const member = useMember();
  const navigate = useNavigate();
  const upsert = useServerFn(upsertMyResearchProfile);
  const [label, setLabel] = useState("");
  const [diseases, setDiseases] = useState("D012");
  const [domains, setDomains] = useState("checkpoint");
  const [modalities, setModalities] = useState("pd1");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!member) {
      setMsg("Sign in to save a research profile.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      await upsert({
        data: {
          displayLabel: label || null,
          focusDiseases: diseases.split(/[\s,]+/).filter(Boolean),
          focusDomains: domains.split(/[\s,]+/).filter(Boolean),
          modalities: modalities.split(/[\s,]+/).filter(Boolean),
          interests: { onboarding: true, topics: ["melanoma", "checkpoint"] },
        },
      });
      await navigate({ to: "/discovery" });
    } catch (err) {
      setMsg(safeClientError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <PageHead
        kicker="Investigate · Research Radar"
        title="Set a research focus"
        lede="Tell ISI which disease and modality lenses matter for your radar. We do not require sensitive personal data. Profiles never write the curated knowledge graph."
      />
      {member === undefined ? <p className="small muted">Checking your account…</p> : null}
      {member === null ? (
        <p>
          <Link to="/auth" search={{ redirect: "/discovery/onboarding" }}>
            Sign in to continue onboarding
          </Link>
        </p>
      ) : (
        <form className="isi-form" onSubmit={save} style={{ maxWidth: 520 }}>
          <label>
            Display label (optional)
            <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder="e.g. Melanoma IO" />
          </label>
          <label>
            Focus disease concept ids
            <input value={diseases} onChange={(e) => setDiseases(e.target.value)} placeholder="D012" />
          </label>
          <label>
            Focus domains
            <input value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="checkpoint" />
          </label>
          <label>
            Modalities
            <input value={modalities} onChange={(e) => setModalities(e.target.value)} placeholder="pd1" />
          </label>
          <p className="small muted">
            Entitlement starts at <code>free</code> (server-side stub). Billing is not activated.
          </p>
          {msg ? (
            <p className="callout" role="alert">
              {msg}
            </p>
          ) : null}
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save and open Radar"}
          </button>
        </form>
      )}
    </div>
  );
}

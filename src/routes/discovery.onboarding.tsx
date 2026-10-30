import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import ConceptIdPicker from "@/components/immune/ConceptIdPicker";
import ExpertDetails from "@/components/immune/ExpertDetails";
import { PageHead } from "@/components/immune/ui";
import { Section } from "@/components/immune/page";
import { useMember, safeClientError } from "@/components/immune/community/chrome";
import { PRODUCT_NAME } from "@/lib/brand";
import { upsertMyResearchProfile } from "@/lib/discovery/profiles.functions";
import { seoHead } from "@/lib/seo";
import { paidPlanAvailabilityCopy } from "@/lib/uxLanguage";

export const Route = createFileRoute("/discovery/onboarding")({
  head: () =>
    seoHead({
      title: `Discovery onboarding | ${PRODUCT_NAME}`,
      description:
        "Set research focus for the Discovery Radar. No sensitive PII required. Does not write the knowledge graph.",
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
  const [diseaseIds, setDiseaseIds] = useState<string[]>([]);
  const [domains, setDomains] = useState("");
  const [modalities, setModalities] = useState("");
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
      const domainList = domains.split(/[\s,]+/).filter(Boolean);
      const modalityList = modalities.split(/[\s,]+/).filter(Boolean);
      await upsert({
        data: {
          displayLabel: label || null,
          focusDiseases: diseaseIds,
          focusDomains: domainList,
          modalities: modalityList,
          interests: {
            onboarding: true,
            topics: [...domainList, ...modalityList].slice(0, 12),
          },
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
    <main className="page isi-auth-page">
      <PageHead
        kicker="Investigate · Research Radar"
        title="Set a research focus"
        lede="Tell ISI which disease and modality lenses matter for your radar. We do not require sensitive personal data. Profiles never write the curated knowledge graph."
        stats={[
          { v: "Free", l: "Starting plan" },
          { v: "No PII", l: "Required" },
        ]}
      />
      {member === undefined ? <p className="small muted">Checking your account…</p> : null}
      {member === null ? (
        <div className="isi-auth-sign-in">
          <p>
            <Link to="/auth" search={{ redirect: "/discovery/onboarding" }}>
              Sign in to continue onboarding
            </Link>
          </p>
        </div>
      ) : (
        <Section
          id="focus"
          title="Research focus"
          lede="Search atlas concepts for diseases. Add short domain or modality labels if helpful."
        >
          <form className="isi-auth-form isi-form" onSubmit={save}>
            <label>
              Display label (optional)
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={80}
                placeholder="e.g. Melanoma immuno-oncology"
              />
            </label>
            <ConceptIdPicker
              selected={diseaseIds}
              onChange={setDiseaseIds}
              label="Focus diseases"
              placeholder="Search diseases (e.g. melanoma)"
              max={12}
            />
            <label>
              Focus domains (optional keywords)
              <input
                value={domains}
                onChange={(e) => setDomains(e.target.value)}
                placeholder="e.g. checkpoint, exhaustion"
              />
            </label>
            <label>
              Modalities (optional keywords)
              <input
                value={modalities}
                onChange={(e) => setModalities(e.target.value)}
                placeholder="e.g. PD-1, LAG-3"
              />
            </label>
            <ExpertDetails summary="Technical details" testId="onboarding-expert-panel">
              <p className="xs muted">
                Entitlement starts at free. {paidPlanAvailabilityCopy()}. Concept ids stored for ranking:{" "}
                {diseaseIds.length ? diseaseIds.join(", ") : "none yet"}.
              </p>
            </ExpertDetails>
            {msg ? (
              <p className="callout" role="alert">
                {msg}
              </p>
            ) : null}
            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save and open Radar"}
            </button>
          </form>
        </Section>
      )}
    </main>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { PageHead } from "@/components/immune/ui";
import { PageToc, Section, Facts } from "@/components/immune/page";
import { useMember, safeClientError } from "@/components/immune/community/chrome";
import { PRODUCT_NAME } from "@/lib/brand";
import {
  getMyResearchProfile,
  upsertMyResearchProfile,
} from "@/lib/discovery/profiles.functions";
import type { ResearchProfileRow } from "@/lib/discovery/types";
import ExpertDetails from "@/components/immune/ExpertDetails";
import { seoHead } from "@/lib/seo";
import { paidPlanAvailabilityCopy } from "@/lib/uxLanguage";

const TOC = [
  { id: "plan", label: "Plan & quotas" },
  { id: "preferences", label: "Preferences" },
];

export const Route = createFileRoute("/discovery/profile")({
  head: () =>
    seoHead({
      title: `Research profile | ${PRODUCT_NAME}`,
      description: "Your Discovery Radar research profile. Ownership-scoped. No knowledge-graph writes.",
      path: "/discovery/profile",
      noIndex: true,
    }),
  component: DiscoveryProfilePage,
});

type EntitlementSummary = Awaited<ReturnType<typeof getMyResearchProfile>>["entitlement"];
type TeamSummary = Awaited<ReturnType<typeof getMyResearchProfile>>["team"];

function DiscoveryProfilePage() {
  const member = useMember();
  const load = useServerFn(getMyResearchProfile);
  const upsert = useServerFn(upsertMyResearchProfile);
  const [profile, setProfile] = useState<ResearchProfileRow | null>(null);
  const [radarLimit, setRadarLimit] = useState(25);
  const [entitlement, setEntitlement] = useState<EntitlementSummary | null>(null);
  const [team, setTeam] = useState<TeamSummary | null>(null);
  const [label, setLabel] = useState("");
  const [diseases, setDiseases] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!member) return;
    let cancel = false;
    load()
      .then((res) => {
        if (cancel) return;
        setProfile(res.profile);
        setRadarLimit(res.radarLimit);
        setEntitlement(res.entitlement);
        setTeam(res.team);
        if (res.profile) {
          setLabel(res.profile.displayLabel ?? "");
          setDiseases(res.profile.focusDiseases.join(", "));
        }
      })
      .catch((err) => {
        if (!cancel) setMsg(safeClientError(err));
      });
    return () => {
      cancel = true;
    };
  }, [member, load]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      const res = await upsert({
        data: {
          displayLabel: label || null,
          focusDiseases: diseases.split(/[\s,]+/).filter(Boolean),
          focusDomains: profile?.focusDomains ?? [],
          modalities: profile?.modalities ?? [],
          interests: profile?.interests ?? {},
        },
      });
      setProfile(res.profile);
      setMsg("Saved. Plan entitlements cannot be changed from this form.");
    } catch (err) {
      setMsg(safeClientError(err));
    }
  }

  const quotas = entitlement?.quotas;

  return (
    <main className="page isi-auth-page">
      <PageHead
        kicker="Research · Research Radar"
        title="Research profile"
        lede="Account-isolated preferences for Discovery Radar. Sensitive PII is not required. Profiles never write the curated knowledge graph."
        stats={
          member
            ? [
                { v: entitlement?.label ?? profile?.entitlement ?? "free", l: "Plan" },
                { v: String(radarLimit), l: "Radar limit" },
              ]
            : undefined
        }
      />
      {member === null ? (
        <div className="isi-auth-sign-in">
          <p>
            <Link to="/auth" search={{ redirect: "/discovery/profile" }}>
              Sign in to view your profile
            </Link>
          </p>
        </div>
      ) : null}
      {member ? (
        <>
          <PageToc items={TOC} />
          <Section
            id="plan"
            title="Plan & quotas"
            lede={`Entitlements are server-checked and separate from account roles. ${paidPlanAvailabilityCopy()}.`}
          >
            <Facts
              items={[
                {
                  label: "Plan",
                  children: entitlement?.label ?? profile?.entitlement ?? "free",
                },
                { label: "Radar limit", children: String(radarLimit) },
                {
                  label: "Availability",
                  children: paidPlanAvailabilityCopy(),
                },
              ]}
            />
            {quotas ? (
              <ul className="isi-library-list" style={{ marginTop: "var(--isi-space-3)" }}>
                <li>
                  <span>
                    <strong>Followed research questions</strong>
                    <span className="muted"> · up to {quotas.maxFollowedGaps} (server-enforced)</span>
                  </span>
                </li>
                <li>
                  <span>
                    <strong>Monitor runs / day</strong>
                    <span className="muted"> · up to {quotas.maxMonitorRunsPerDay}</span>
                  </span>
                </li>
                <li>
                  <span>
                    <strong>Dossier exports / day</strong>
                    <span className="muted"> · up to {quotas.maxExportsPerDay}</span>
                  </span>
                </li>
                <li>
                  <span>
                    <strong>Team shared profiles</strong>
                    <span className="muted">
                      {" "}
                      · {team?.policy.activated ? "active" : "not available yet"}
                    </span>
                  </span>
                </li>
              </ul>
            ) : null}
            <ExpertDetails summary="Technical details" testId="profile-billing-expert">
              <p className="xs muted">
                {entitlement?.billingCopy ?? "Researcher Pro — billing not activated"}
                {team ? ` · team: ${team.policy.activated ? "active" : "scaffolding"}` : ""}
                {" · "}
                Account roles stay orthogonal to Discovery plans.
              </p>
            </ExpertDetails>
          </Section>

          <Section
            id="preferences"
            title="Preferences"
            lede="Display label and focus diseases for Radar ranking. No sensitive personal data required."
          >
            <form className="isi-auth-form isi-form" onSubmit={save}>
              <label>
                Display label
                <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} />
              </label>
              <label>
                Focus diseases
                <input value={diseases} onChange={(e) => setDiseases(e.target.value)} />
              </label>
              <button className="btn primary" type="submit">
                Update profile
              </button>
            </form>
            {msg ? (
              <p className="callout" role="status">
                {msg}
              </p>
            ) : null}
            <nav className="isi-auth-links" aria-label="Related Discovery pages">
              <Link to="/discovery">Back to Radar</Link>
              <Link to="/discovery/alerts">Alerts</Link>
              <Link to="/discovery/onboarding">Onboarding</Link>
            </nav>
          </Section>
        </>
      ) : null}
    </main>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { PageHead } from "@/components/immune/ui";
import { useMember, safeClientError } from "@/components/immune/community/chrome";
import { PRODUCT_NAME } from "@/lib/brand";
import {
  getMyResearchProfile,
  upsertMyResearchProfile,
} from "@/lib/discovery/profiles.functions";
import type { ResearchProfileRow } from "@/lib/discovery/types";
import { seoHead } from "@/lib/seo";

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

function DiscoveryProfilePage() {
  const member = useMember();
  const load = useServerFn(getMyResearchProfile);
  const upsert = useServerFn(upsertMyResearchProfile);
  const [profile, setProfile] = useState<ResearchProfileRow | null>(null);
  const [radarLimit, setRadarLimit] = useState(25);
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
      setMsg("Saved. Entitlement was not changed from the client.");
    } catch (err) {
      setMsg(safeClientError(err));
    }
  }

  return (
    <div className="page">
      <PageHead
        kicker="Investigate · Research Radar"
        title="Research profile"
        lede="Account-isolated preferences for Discovery Radar. Sensitive PII is not required."
      />
      {member === null ? (
        <p>
          <Link to="/auth" search={{ redirect: "/discovery/profile" }}>
            Sign in to view your profile
          </Link>
        </p>
      ) : null}
      {member ? (
        <>
          <p className="small muted">
            Plan: <code>{profile?.entitlement ?? "free"}</code> · Radar limit: {radarLimit} · Billing: not activated
          </p>
          <form className="isi-form" onSubmit={save} style={{ maxWidth: 520 }}>
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
          {msg ? <p className="callout">{msg}</p> : null}
          <p style={{ marginTop: 16 }}>
            <Link to="/discovery">Back to Radar</Link>
          </p>
        </>
      ) : null}
    </div>
  );
}

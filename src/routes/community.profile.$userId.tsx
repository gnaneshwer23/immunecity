import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/immune/ui";
import { safeClientError, useMember } from "@/components/immune/community/chrome";
import { getMemberCommunityProfile, getPublicCommunityProfile } from "@/lib/community/phase3.functions";
import { PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/community/profile/$userId")({
  loader: ({ params }) => getPublicCommunityProfile({ data: { userId: params.userId } }),
  head: ({ params }) =>
    seoHead({
      title: `Profile — Community — ${PRODUCT_NAME}`,
      description: "Community profile. Members-only profiles stay hidden from visitors. Credentials are not verified.",
      path: `/community/profile/${params.userId}`,
      noIndex: true,
    }),
  component: PublicProfile,
});

function PublicProfile() {
  const initial = Route.useLoaderData();
  const { userId } = Route.useParams();
  const member = useMember();
  const loadMember = useServerFn(getMemberCommunityProfile);
  const [view, setView] = useState(initial);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setView(initial);
  }, [initial]);

  useEffect(() => {
    if (!member || initial.access !== "restricted") return;
    loadMember({ data: { userId } })
      .then((next) => setView(next))
      .catch((err) => setMsg(safeClientError(err)));
  }, [member, initial.access, userId, loadMember]);

  if (!view.available) {
    return (
      <div className="page">
        <PageHead kicker="Community" title="Profile unavailable" lede="Community storage is not available on this database yet." />
      </div>
    );
  }
  if (view.access === "missing") {
    return (
      <div className="page">
        <PageHead kicker="Community" title="Profile not found" lede="This member has not saved a community profile." />
        <Link to="/community">Topics</Link>
      </div>
    );
  }
  if (view.access === "restricted") {
    return (
      <div className="page community-page">
        <PageHead kicker="Community" title="Members only" lede="This profile is visible to signed-in members." />
        {member === null ? <p><Link to="/auth" search={{ redirect: `/community/profile/${userId}` }}>Sign in</Link></p> : null}
        {msg ? <p className="callout" role="status">{msg}</p> : null}
      </div>
    );
  }
  const profile = view.profile;
  return (
    <div className="page community-page">
      <PageHead kicker="Community" title={profile.displayName} lede={profile.visibility === "members" ? "Visible to signed-in members." : "Public community profile."} />
      {profile.bio ? <p className="community-body">{profile.bio}</p> : null}
      {view.interestTitles.length ? <p className="small">Interests: {view.interestTitles.join(", ")}</p> : null}
      {profile.affiliation ? <p className="small">Affiliation: {profile.affiliation}</p> : null}
      {profile.credential ? (
        <p className="small">Credential: {profile.credential} <span className="badge">unverified</span></p>
      ) : null}
      <p className="xs muted">Credentials are not checked and are never marked verified.</p>
      <p><Link to="/community">Topics</Link></p>
    </div>
  );
}

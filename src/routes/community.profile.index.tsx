import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/immune/ui";
import { CommunityBar, safeClientError, useMember, useUnreadCount } from "@/components/immune/community/chrome";
import { appealCommunityTarget, editCommunityPost, getMyCommunityProfile, updateMyCommunityProfile } from "@/lib/community/phase3.functions";
import { deleteMyData, exportMyData } from "@/lib/privacy.functions";
import { DELETE_CONFIRMATION } from "@/lib/privacy";
import { PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/community/profile/")({
  head: () =>
    seoHead({
      title: `Profile — Community — ${PRODUCT_NAME}`,
      description: "Edit your community display name, interests and visibility. Credentials are not verified.",
      path: "/community/profile",
      noIndex: true,
    }),
  component: ProfileEditor,
});

type Mine = Awaited<ReturnType<typeof getMyCommunityProfile>>;

function ProfileEditor() {
  const member = useMember();
  const unread = useUnreadCount(member);
  const load = useServerFn(getMyCommunityProfile);
  const save = useServerFn(updateMyCommunityProfile);
  const appeal = useServerFn(appealCommunityTarget);
  const edit = useServerFn(editCommunityPost);
  const download = useServerFn(exportMyData);
  const remove = useServerFn(deleteMyData);
  const [mine, setMine] = useState<Mine | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [credential, setCredential] = useState("");
  const [visibility, setVisibility] = useState<"public" | "members">("public");
  const [paused, setPaused] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function refresh() {
    const data = await load();
    setMine(data);
    setDisplayName(data.profile.displayName);
    setBio(data.profile.bio ?? "");
    setAffiliation(data.profile.affiliation ?? "");
    setCredential(data.profile.credential ?? "");
    setVisibility(data.profile.visibility);
    setPaused(data.profile.notificationsPaused);
    setInterests(data.profile.interests);
  }

  useEffect(() => {
    if (!member) return;
    refresh().catch((err) => setMsg(safeClientError(err)));
  }, [member]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await save({ data: { displayName, bio, affiliation, credential, visibility, notificationsPaused: paused, interests } });
      setMsg("Profile saved. A credential is stored as unverified.");
      await refresh();
    } catch (err) {
      setMsg(safeClientError(err));
    } finally {
      setBusy(false);
    }
  }

  function toggleInterest(slug: string) {
    setInterests((current) => current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]);
  }

  return (
    <div className="page community-page">
      <PageHead
        kicker="Community"
        title="Your profile"
        lede="Display name, interests and visibility. A credential is optional and is not checked."
      />
      <CommunityBar unread={unread} />
      {member === null ? <p><Link to="/auth" search={{ redirect: "/community/profile" }}>Sign in</Link></p> : null}
      {member && mine ? (
        <form onSubmit={onSave} className="card community-card community-form">
          <label className="field">Display name<input className="community-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={80} /></label>
          <label className="field">Bio<textarea className="community-input" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} /></label>
          <fieldset>
            <legend>Interests</legend>
            <div className="community-checks">
              {mine.topics.map((topic) => (
                <label key={topic.slug}>
                  <input type="checkbox" checked={interests.includes(topic.slug)} onChange={() => toggleInterest(topic.slug)} />
                  {topic.title}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="field">Affiliation <span className="xs muted">(optional)</span><input className="community-input" value={affiliation} onChange={(e) => setAffiliation(e.target.value)} maxLength={120} /></label>
          <label className="field">Credential <span className="xs muted">(optional, unverified)</span><input className="community-input" value={credential} onChange={(e) => setCredential(e.target.value)} maxLength={160} /></label>
          <p className="xs muted">This site does not check credentials. Saved credentials stay unverified.</p>
          <label className="field">Visibility
            <select className="community-input" value={visibility} onChange={(e) => setVisibility(e.target.value === "members" ? "members" : "public")}>
              <option value="public">Public</option>
              <option value="members">Members only</option>
            </select>
          </label>
          <label>
            <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} /> Pause notifications
          </label>
          <p className="xs muted">Notifications are on for replies to posts you follow and for appeal decisions, unless you pause them.</p>
          <button className="btn sm primary" type="submit" disabled={busy}>Save profile</button>
        </form>
      ) : null}
      {mine?.hiddenPosts.length ? (
        <section className="card community-card" aria-label="Hidden posts">
          <h2>Your hidden posts</h2>
          <ul className="community-stack">
            {mine.hiddenPosts.map((post) => (
              <li key={post.id}>
                <p>{post.title}</p>
                <p className="xs muted">Hidden posts stay hidden until a moderator restores them.</p>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const nextBody = String(new FormData(e.currentTarget).get("body") ?? "");
                  setBusy(true);
                  try {
                    await edit({ data: { postId: post.id, body: nextBody } });
                    setMsg("Edit stored. The post is still hidden.");
                  } catch (err) { setMsg(safeClientError(err)); } finally { setBusy(false); }
                }}>
                  <label className="field">Correct the body
                    <textarea className="community-input" name="body" defaultValue={post.body} maxLength={8000} />
                  </label>
                  <button className="btn sm" type="submit" disabled={busy}>Save edit</button>
                </form>
                {post.appealOpen ? <p className="xs">Appeal pending.</p> : (
                  <button type="button" className="btn sm" disabled={busy || appealReason.trim().length < 8} onClick={async () => {
                    setBusy(true);
                    try {
                      await appeal({ data: { targetType: "post", targetId: post.id, reason: appealReason } });
                      setMsg("Appeal sent.");
                      await refresh();
                    } catch (err) { setMsg(safeClientError(err)); } finally { setBusy(false); }
                  }}>Appeal this post</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {mine?.hiddenComments.length ? (
        <section className="card community-card" aria-label="Hidden replies">
          <h2>Your hidden replies</h2>
          <ul>
            {mine.hiddenComments.map((comment) => (
              <li key={comment.id}>
                <p className="community-body">{comment.body}</p>
                {comment.appealOpen ? <p className="xs">Appeal pending.</p> : (
                  <button type="button" className="btn sm" disabled={busy || appealReason.trim().length < 8} onClick={async () => {
                    setBusy(true);
                    try {
                      await appeal({ data: { targetType: "comment", targetId: comment.id, reason: appealReason } });
                      setMsg("Appeal sent.");
                      await refresh();
                    } catch (err) { setMsg(safeClientError(err)); } finally { setBusy(false); }
                  }}>Appeal this reply</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {member && (mine?.hiddenPosts.length || mine?.hiddenComments.length) ? (
        <label className="field">Appeal reason
          <textarea className="community-input" value={appealReason} onChange={(e) => setAppealReason(e.target.value)} minLength={8} maxLength={500} />
        </label>
      ) : null}
      {member ? (
        <section className="card community-card" aria-label="Your data">
          <h2>Your data</h2>
          <p className="xs muted">
            Download a JSON file of your profile, posts, replies, saves, follows, notifications and concept saves.
            This file does not include other people’s private data or evidence records.
          </p>
          <button type="button" className="btn sm" disabled={busy} onClick={async () => {
            setBusy(true);
            setMsg("");
            try {
              const data = await download();
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "immune-super-intelligence-data.json";
              link.click();
              URL.revokeObjectURL(url);
            } catch (err) {
              setMsg(safeClientError(err));
            } finally {
              setBusy(false);
            }
          }}>Download my data</button>
          <h3 style={{ marginTop: 18 }}>Delete personal data</h3>
          <p className="xs muted">
            This clears your display name, bio, affiliation and credential, and deletes your notifications, saves and follows.
            Your posts stay in the community with the name removed. Evidence records, the knowledge graph and other members are left as they are.
          </p>
          {confirmDelete ? (
            <button type="button" className="btn sm" disabled={busy} onClick={async () => {
              setBusy(true);
              setMsg("");
              try {
                await remove({ data: { confirm: DELETE_CONFIRMATION } });
                setConfirmDelete(false);
                setMsg("Personal data removed. Your posts remain, without your display name.");
                await refresh();
              } catch (err) {
                setMsg(safeClientError(err));
              } finally {
                setBusy(false);
              }
            }}>Confirm deletion</button>
          ) : (
            <button type="button" className="btn sm" disabled={busy} onClick={() => setConfirmDelete(true)}>Delete my personal data</button>
          )}
        </section>
      ) : null}
      {msg ? <p className="callout" role="status">{msg}</p> : null}
    </div>
  );
}

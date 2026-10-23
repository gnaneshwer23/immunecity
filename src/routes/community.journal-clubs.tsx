import { seoHead } from "@/lib/seo";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/immune/ui";
import { CommunityBar, CommunityNote, safeClientError, useMember, useUnreadCount } from "@/components/immune/community/chrome";
import { createCommunityJournalClub, listCommunityJournalClubs } from "@/lib/community/phase3.functions";
import { listCommunityTopics } from "@/lib/community.functions";
import { PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/community/journal-clubs")({
  loader: () => listCommunityJournalClubs({ data: {} }),
  head: () =>
    seoHead({
      title: `Journal clubs — Community — ${PRODUCT_NAME}`,
      description: "Scheduled journal-club discussions. The time is stored. There is no live video room.",
      path: "/community/journal-clubs",
    }),
  component: JournalClubsPage,
});

function paperLabel(status: string): string {
  if (status === "matched") return "Paper matched to an approved record";
  if (status === "unverified") return "Paper not verified";
  return "Paper status unavailable";
}

function JournalClubsPage() {
  const data = Route.useLoaderData();
  const member = useMember();
  const unread = useUnreadCount(member);
  const navigate = useNavigate();
  const create = useServerFn(createCommunityJournalClub);
  const [topics, setTopics] = useState<{ slug: string; title: string }[]>([]);
  const [topicSlug, setTopicSlug] = useState("");
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [pmid, setPmid] = useState("");
  const [doi, setDoi] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listCommunityTopics().then((result) => {
      setTopics(result.topics.map((topic) => ({ slug: topic.slug, title: topic.title })));
      setTopicSlug((current) => current || result.topics[0]?.slug || "");
    }).catch(() => setTopics([]));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const created = await create({
        data: { topicSlug, title, agenda, scheduledAt: new Date(scheduledAt).toISOString(), pmid, doi },
      });
      await navigate({ to: "/community/post/$postId", params: { postId: created.postId } });
    } catch (err) {
      setMsg(safeClientError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page community-page">
      <PageHead
        kicker="Community"
        title="Journal clubs"
        lede="A moderator schedules a discussion in a topic. Members reply on that thread. There is no live video room."
      />
      <CommunityNote />
      <CommunityBar unread={unread} />
      {!data.available ? <p className="callout" role="status">Journal clubs are not available on this database yet.</p> : null}
      {data.clubs.length ? (
        <ul className="community-stack">
          {data.clubs.map((club) => (
            <li key={club.id} className="card community-card">
              <p className="xs muted">{club.topicTitle} · {club.scheduledAt} · {club.facilitatorName}</p>
              <h2><Link to="/community/post/$postId" params={{ postId: club.postId }}>{club.title}</Link></h2>
              <p className="xs muted">{paperLabel(club.paperStatus)}. The facilitator is a moderator.</p>
            </li>
          ))}
        </ul>
      ) : <p className="small muted">No visible journal clubs yet.</p>}
      {member === undefined ? <p className="small muted">Checking your account.</p> : null}
      {member ? (
        <form onSubmit={onSubmit} className="card community-card community-form">
          <h2>Schedule a club</h2>
          <p className="xs muted">Only moderators and administrators can schedule a club.</p>
          <label className="field">Topic
            <select className="community-input" value={topicSlug} onChange={(e) => setTopicSlug(e.target.value)} required>
              {topics.map((topic) => <option key={topic.slug} value={topic.slug}>{topic.title}</option>)}
            </select>
          </label>
          <label className="field">Title<input className="community-input" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={180} /></label>
          <label className="field">Agenda<textarea className="community-input" value={agenda} onChange={(e) => setAgenda(e.target.value)} required minLength={10} maxLength={4000} /></label>
          <label className="field">Scheduled time<input className="community-input" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required /></label>
          <label className="field">PMID <span className="xs muted">(optional, unverified unless already approved)</span><input className="community-input" value={pmid} onChange={(e) => setPmid(e.target.value)} /></label>
          <label className="field">DOI <span className="xs muted">(optional)</span><input className="community-input" value={doi} onChange={(e) => setDoi(e.target.value)} /></label>
          <button className="btn sm primary" type="submit" disabled={busy}>Create journal club</button>
        </form>
      ) : member === null ? <p><Link to="/auth" search={{ redirect: "/community/journal-clubs" }}>Sign in</Link></p> : null}
      {msg ? <p className="callout" role="status">{msg}</p> : null}
    </div>
  );
}

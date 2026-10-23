import { seoHead } from "@/lib/seo";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/immune/ui";
import { CommunityNote, safeClientError, useMember } from "@/components/immune/community/chrome";
import { createCommunityPost, listCommunityTopics } from "@/lib/community.functions";
import { POST_KINDS, POST_KIND_LABEL } from "@/lib/community/rules";
import { byId } from "@/lib/immune/engine";
import { PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/community/new")({
  validateSearch: zodValidator(
    z.object({
      topic: fallback(z.string().max(80), "").default(""),
      concept: fallback(z.string().max(40), "").default(""),
    }),
  ),
  head: () =>
    seoHead({
      title: `New post — Community — ${PRODUCT_NAME}`,
      description: "Publish an educational community post. Not clinical advice and not a knowledge-graph update.",
      path: "/community/new",
      noIndex: true,
    }),
  component: NewPostPage,
});

function NewPostPage() {
  const search = Route.useSearch();
  const member = useMember();
  const navigate = useNavigate();
  const create = useServerFn(createCommunityPost);
  const [topics, setTopics] = useState<{ slug: string; title: string }[]>([]);
  const [topicSlug, setTopicSlug] = useState(search.topic);
  const [kind, setKind] = useState<(typeof POST_KINDS)[number]>("discussion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pmid, setPmid] = useState("");
  const [doi, setDoi] = useState("");
  const [concept, setConcept] = useState(search.concept);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    listCommunityTopics().then((d) => {
      setAvailable(d.available);
      setTopics(d.topics.map((t) => ({ slug: t.slug, title: t.title })));
      setTopicSlug((cur) => cur || d.topics[0]?.slug || "");
    }).catch(() => setAvailable(false));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const conceptIds = concept.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
      const created = await create({
        data: { topicSlug, kind, title, body, pmid, doi, conceptIds },
      });
      await navigate({ to: "/community/post/$postId", params: { postId: created.id } });
    } catch (err) {
      setMsg(safeClientError(err));
    } finally {
      setBusy(false);
    }
  }

  const known = concept.trim() ? byId[concept.trim()] : undefined;

  return (
    <div className="page community-page">
      <PageHead
        kicker="Community"
        title="New post"
        lede="Members can publish. A DOI or PMID that cannot be resolved is stored as unverified. Concept links do not change the knowledge graph."
      />
      <CommunityNote />
      {!available ? <p className="callout">Community storage is not available on this database yet.</p> : null}
      {member === null ? (
        <p><Link to="/auth" search={{ redirect: "/community/new" }}>Sign in to post</Link></p>
      ) : null}
      {member ? (
        <form className="card community-card community-form" onSubmit={onSubmit}>
          <label className="field">
            Topic
            <select value={topicSlug} onChange={(e) => setTopicSlug(e.target.value)} required aria-label="Topic">
              {topics.map((t) => <option key={t.slug} value={t.slug}>{t.title}</option>)}
            </select>
          </label>
          <label className="field">
            Type
            <select value={kind} onChange={(e) => setKind(e.target.value as (typeof POST_KINDS)[number])} aria-label="Post type">
              {POST_KINDS.map((k) => <option key={k} value={k}>{POST_KIND_LABEL[k]}</option>)}
            </select>
          </label>
          <label className="field">
            Title
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={180} />
          </label>
          <label className="field">
            Body
            <textarea className="community-input" value={body} onChange={(e) => setBody(e.target.value)} required minLength={10} maxLength={8000} />
          </label>
          <label className="field">
            PMID (optional)
            <input type="text" value={pmid} onChange={(e) => setPmid(e.target.value)} inputMode="numeric" placeholder="Digits only" />
          </label>
          <label className="field">
            DOI (optional)
            <input type="text" value={doi} onChange={(e) => setDoi(e.target.value)} placeholder="10.xxxx/…" />
          </label>
          <label className="field">
            Concept id (optional)
            <input type="text" value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Graph id, for example M001" />
          </label>
          {concept.trim() ? (
            <p className="xs muted">{known ? `Links to ${known.name}. This does not edit the graph.` : "Unknown ids are rejected. Nothing is added to the graph."}</p>
          ) : null}
          <button className="btn primary" type="submit" disabled={busy || !available}>Publish</button>
        </form>
      ) : null}
      {msg ? <p className="callout" role="alert">{msg}</p> : null}
    </div>
  );
}

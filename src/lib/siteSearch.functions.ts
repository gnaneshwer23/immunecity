import { createServerFn } from "@tanstack/react-start";
import { and, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db.server";
import { communityPosts, communityTopics, evidenceRecords } from "@/lib/db/schema.server";
import type { DiscussionHit, PublicationHit } from "@/lib/siteSearch";

const querySchema = z.object({ q: z.string().trim().min(2).max(80) });

function likeTerm(q: string): string {
  return `%${q.replace(/[\\%_]/g, "\\$&")}%`;
}

function publicationTitle(row: {
  nodeName: string;
  pmid: string | null;
  doi: string | null;
  sourceRef: string | null;
  evidenceId: string;
}): string {
  const id = row.pmid ? `PMID ${row.pmid}` : row.doi ? `DOI ${row.doi}` : row.sourceRef;
  return id ? `${row.nodeName} — ${id}` : row.nodeName || row.evidenceId;
}

/** Approved citation records only. No open-web lookup and no invented identifiers. */
export async function searchApprovedPublications(query: string, limit = 6): Promise<
  { state: "ready" | "empty"; items: PublicationHit[] } | { state: "unavailable"; items: [] }
> {
  try {
    const db = getDb();
    const term = likeTerm(query);
    const rows = await db
      .select({
        evidenceId: evidenceRecords.evidenceId,
        nodeId: evidenceRecords.nodeId,
        nodeName: evidenceRecords.nodeName,
        pmid: evidenceRecords.pmid,
        doi: evidenceRecords.doi,
        sourceRef: evidenceRecords.sourceRef,
        curation: evidenceRecords.curation,
        claimSupport: evidenceRecords.claimSupport,
      })
      .from(evidenceRecords)
      .where(and(
        eq(evidenceRecords.curation, "approved"),
        or(
          ilike(evidenceRecords.nodeName, term),
          ilike(evidenceRecords.pmid, term),
          ilike(evidenceRecords.doi, term),
          ilike(evidenceRecords.sourceRef, term),
          ilike(evidenceRecords.evidenceId, term),
        ),
      ))
      .limit(limit);
    const items: PublicationHit[] = rows.map((row) => ({
      kind: "publication",
      id: row.evidenceId,
      title: publicationTitle(row),
      nodeId: row.nodeId,
      status: `${row.curation} · ${row.claimSupport}`,
    }));
    return { state: items.length ? "ready" : "empty", items };
  } catch {
    return { state: "unavailable", items: [] };
  }
}

/** Visible community topics and posts. A failed query is an empty-unavailable bucket, not zero hits. */
export async function searchDiscussions(query: string, limit = 6): Promise<
  { state: "ready" | "empty"; items: DiscussionHit[] } | { state: "unavailable"; items: [] }
> {
  try {
    const db = getDb();
    const term = likeTerm(query);
    const topics = await db
      .select({
        id: communityTopics.id,
        slug: communityTopics.slug,
        title: communityTopics.title,
      })
      .from(communityTopics)
      .where(or(ilike(communityTopics.title, term), ilike(communityTopics.description, term)))
      .limit(limit);
    const posts = await db
      .select({
        id: communityPosts.id,
        title: communityPosts.title,
        slug: communityTopics.slug,
      })
      .from(communityPosts)
      .innerJoin(communityTopics, eq(communityPosts.topicId, communityTopics.id))
      .where(and(
        eq(communityPosts.status, "visible"),
        or(ilike(communityPosts.title, term), ilike(communityPosts.body, term)),
      ))
      .limit(limit);
    const items: DiscussionHit[] = [
      ...topics.map((topic) => ({
        kind: "discussion" as const,
        id: topic.id,
        title: topic.title,
        subtype: "Topic" as const,
        topicSlug: topic.slug,
        postId: null,
        status: null,
      })),
      ...posts.map((post) => ({
        kind: "discussion" as const,
        id: post.id,
        title: post.title,
        subtype: "Post" as const,
        topicSlug: post.slug,
        postId: post.id,
        status: null,
      })),
    ].slice(0, limit);
    return { state: items.length ? "ready" : "empty", items };
  } catch {
    return { state: "unavailable", items: [] };
  }
}

export const searchPublicCatalog = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => querySchema.parse(data))
  .handler(async ({ data }) => {
    const [publications, discussions] = await Promise.all([
      searchApprovedPublications(data.q),
      searchDiscussions(data.q),
    ]);
    return { publications, discussions };
  });

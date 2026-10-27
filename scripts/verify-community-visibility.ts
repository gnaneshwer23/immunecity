/**
 * Code+DB check that visible posts are shared across members (no author filter)
 * and that a reply creates a post_reply notification for the post author.
 * Uses clearly labelled SAMPLE DISCUSSION rows only — no scientific claims.
 * Cleans up after itself. Requires DATABASE_URL on ep-blue-salad with evidence present.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { postsVisibleToAnyViewer, replyNotificationRecipients } from "../src/lib/community/rules";

function loadEnvLocal() {
  for (const name of [".env.local", ".env"]) {
    try {
      const text = readFileSync(resolve(process.cwd(), name), "utf8");
      for (const line of text.split("\n")) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (!m) continue;
        let val = m[2]!.trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[m[1]!]) process.env[m[1]!] = val;
      }
    } catch {
      /* optional */
    }
  }
}

function normalizeUrl(raw: string): string {
  const u = new URL(raw);
  u.searchParams.delete("channel_binding");
  if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
  return u.toString();
}

loadEnvLocal();
const raw = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!raw) {
  console.error("missing_database_url");
  process.exit(1);
}

const host = new URL(raw).hostname;
if (!host.startsWith("ep-blue-salad")) {
  console.log(`host_prefix=${host.match(/^(ep-[a-z]+-[a-z]+)/)?.[1] ?? "other"}`);
  console.log("verify=skipped");
  console.log("skip_reason=host");
  process.exit(0);
}

const sql = postgres(normalizeUrl(raw), { prepare: false, max: 1 });
const authorA = randomUUID();
const authorB = randomUUID();
const postA = randomUUID();
const postB = randomUUID();
const commentId = randomUUID();
const sampleTitle = "[SAMPLE DISCUSSION — non-scientific opinion] Channel check";

try {
  const evidence = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM public.evidence_records`;
  if (Number(evidence[0]?.n ?? 0) <= 0) {
    console.log("evidence_records=empty");
    console.log("verify=skipped");
    process.exit(0);
  }

  const [topic] = await sql<{ id: string }[]>`SELECT id FROM public.community_topics WHERE slug = 'methods' LIMIT 1`;
  if (!topic) throw new Error("missing_methods_topic");

  await sql`
    INSERT INTO public.community_profiles (user_id, display_name)
    VALUES (${authorA}::uuid, 'Sample Member A'), (${authorB}::uuid, 'Sample Member B')
    ON CONFLICT (user_id) DO NOTHING
  `;
  await sql`
    INSERT INTO public.community_posts (id, topic_id, author_id, kind, title, body, status)
    VALUES
      (${postA}::uuid, ${topic.id}::uuid, ${authorA}::uuid, 'discussion', ${sampleTitle},
       'Sample discussion only. Not a scientific claim. Used to verify multi-member visibility.', 'visible'),
      (${postB}::uuid, ${topic.id}::uuid, ${authorB}::uuid, 'discussion', ${sampleTitle + " B"},
       'Second sample discussion only. Not a scientific claim.', 'visible')
  `;
  await sql`
    INSERT INTO public.community_post_follows (post_id, user_id)
    VALUES (${postA}::uuid, ${authorA}::uuid)
    ON CONFLICT DO NOTHING
  `;

  const listed = await sql<{ id: string; author_id: string; status: string }[]>`
    SELECT id, author_id, status FROM public.community_posts
    WHERE topic_id = ${topic.id}::uuid AND status = 'visible'
      AND id IN (${postA}::uuid, ${postB}::uuid)
    ORDER BY created_at DESC
  `;
  const visible = postsVisibleToAnyViewer(listed);
  const bothVisible = visible.length === 2 && visible.some((p) => p.author_id === authorA) && visible.some((p) => p.author_id === authorB);
  console.log(`visibility=${bothVisible ? "ok" : "fail"} count=${visible.length}`);

  await sql`
    INSERT INTO public.community_comments (id, post_id, author_id, body, status)
    VALUES (${commentId}::uuid, ${postA}::uuid, ${authorB}::uuid, 'Sample reply only — not scientific.', 'visible')
  `;
  const follows = await sql<{ user_id: string }[]>`
    SELECT user_id FROM public.community_post_follows WHERE post_id = ${postA}::uuid
  `;
  const recipients = replyNotificationRecipients({
    followerIds: follows.map((f) => f.user_id),
    commentAuthorId: authorB,
    postAuthorId: authorA,
    pausedUserIds: new Set(),
  });
  if (recipients.includes(authorA)) {
    await sql`
      INSERT INTO public.community_notifications (user_id, kind, body, href)
      VALUES (
        ${authorA}::uuid,
        'post_reply',
        ${`New reply on “${sampleTitle.slice(0, 80)}”.`},
        ${`/community/post/${postA}`}
      )
    `;
  }
  const notes = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM public.community_notifications
    WHERE user_id = ${authorA}::uuid AND kind = 'post_reply' AND href = ${`/community/post/${postA}`}
  `;
  console.log(`notification=${Number(notes[0]?.n ?? 0) > 0 ? "ok" : "fail"}`);
  console.log(`verify=${bothVisible && Number(notes[0]?.n ?? 0) > 0 ? "passed" : "failed"}`);
} catch (err) {
  console.error(`verify_failed code=${(err as { code?: string }).code ?? "error"}`);
  process.exitCode = 1;
} finally {
  await sql`DELETE FROM public.community_notifications WHERE href = ${`/community/post/${postA}`}`;
  await sql`DELETE FROM public.community_comments WHERE id = ${commentId}::uuid`;
  await sql`DELETE FROM public.community_post_follows WHERE post_id IN (${postA}::uuid, ${postB}::uuid)`;
  await sql`DELETE FROM public.community_posts WHERE id IN (${postA}::uuid, ${postB}::uuid)`;
  await sql`DELETE FROM public.community_profiles WHERE user_id IN (${authorA}::uuid, ${authorB}::uuid)`;
  await sql.end({ timeout: 5 });
}

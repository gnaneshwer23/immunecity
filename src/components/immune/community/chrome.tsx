import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { neonAuth, type NeonAuthUser } from "@/integrations/neon/auth-client";
import { getCommunityUnreadCount } from "@/lib/community/phase3.functions";
import { COMMUNITY_DISCLAIMER, JOURNAL_CLUB_POST_KIND, POST_KIND_LABEL, type PostKind } from "@/lib/community/rules";

export function CommunityNote() {
  return <p className="callout community-note">{COMMUNITY_DISCLAIMER}</p>;
}

export function useMember(): NeonAuthUser | null | undefined {
  const [user, setUser] = useState<NeonAuthUser | null | undefined>(undefined);
  useEffect(() => {
    neonAuth.getUser().then(({ data }) => setUser(data?.user ?? null)).catch(() => setUser(null));
  }, []);
  return user;
}

export function kindLabel(kind: string): string {
  if (kind === JOURNAL_CLUB_POST_KIND) return "Journal club";
  return kind in POST_KIND_LABEL ? POST_KIND_LABEL[kind as PostKind] : kind;
}

export function useUnreadCount(member: NeonAuthUser | null | undefined): number {
  const load = useServerFn(getCommunityUnreadCount);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!member) {
      setCount(0);
      return;
    }
    let cancelled = false;
    load()
      .then((result) => {
        if (!cancelled) setCount(result.count);
      })
      .catch(() => {
        if (!cancelled) setCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [member, load]);
  return count;
}

export function CommunityBar({ unread = 0 }: { unread?: number }) {
  return (
    <p className="row community-bar">
      <Link className="btn sm" to="/community">Topics</Link>
      <Link className="btn sm" to="/community/profile">Profile &amp; privacy</Link>
      <Link className="btn sm" to="/community/saved">Saved</Link>
      <Link className="btn sm" to="/community/notifications">
        Notifications{unread > 0 ? ` (${unread})` : ""}
      </Link>
      <Link className="btn sm" to="/community/journal-clubs">Journal clubs</Link>
      <Link className="btn sm" to="/community/moderation">Moderation</Link>
    </p>
  );
}

export function safeClientError(err: unknown): string {
  const raw = err instanceof Error ? err.message : "Request failed.";
  if (/postgres:|DATABASE_URL|password|failed query/i.test(raw)) return "Request failed.";
  return raw.slice(0, 300);
}

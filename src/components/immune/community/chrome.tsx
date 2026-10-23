import { useEffect, useState } from "react";
import { neonAuth, type NeonAuthUser } from "@/integrations/neon/auth-client";
import { COMMUNITY_DISCLAIMER, POST_KIND_LABEL, type PostKind } from "@/lib/community/rules";

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
  return kind in POST_KIND_LABEL ? POST_KIND_LABEL[kind as PostKind] : kind;
}

export function safeClientError(err: unknown): string {
  const raw = err instanceof Error ? err.message : "Request failed.";
  if (/postgres:|DATABASE_URL|password|failed query/i.test(raw)) return "Request failed.";
  return raw.slice(0, 300);
}

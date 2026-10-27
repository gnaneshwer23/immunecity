import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "bun:test";
import {
  postsVisibleToAnyViewer,
  replyNotificationRecipients,
  shouldAutoFollowPost,
} from "@/lib/community/rules";

const root = process.cwd();

function source(path: string): string {
  return readFileSync(resolve(root, path), "utf8");
}

describe("multi-user post visibility", () => {
  it("shows every visible post to any viewer and hides hidden ones", () => {
    const feed = postsVisibleToAnyViewer([
      { id: "a", authorId: "member-a", status: "visible", title: "A" },
      { id: "b", authorId: "member-b", status: "visible", title: "B" },
      { id: "c", authorId: "member-a", status: "hidden", title: "Hidden" },
    ]);
    expect(feed.map((p) => p.id)).toEqual(["a", "b"]);
    // Member B's post is not filtered by author — it is in the shared feed.
    expect(feed.some((p) => p.authorId === "member-b")).toBe(true);
  });

  it("lists topic and recent feeds without an author_id filter", () => {
    const server = source("src/lib/community.functions.ts");
    expect(server).toContain("listRecentCommunityPosts");
    expect(server).toContain('eq(communityPosts.status, "visible")');
    // Author filter would break multi-person discovery.
    expect(server).not.toMatch(/eq\(communityPosts\.authorId,\s*(data|context|member)/);
    const topicSelect = server.slice(server.indexOf("getCommunityTopic"), server.indexOf("getCommunityPost"));
    expect(topicSelect).toContain('eq(communityPosts.status, "visible")');
    // WHERE must be topic + visible only — join on authorId for the display name is fine.
    expect(topicSelect).toContain(".where(and(eq(communityPosts.topicId, topic.id), eq(communityPosts.status, \"visible\")))");
    expect(topicSelect).not.toMatch(/\.where\([^)]*communityPosts\.authorId/);
  });
});

describe("multi-user reply notifications", () => {
  it("auto-follows the author on create and notifies them on a stranger's reply", () => {
    expect(shouldAutoFollowPost({ actorId: "member-a", postAuthorId: "member-a" })).toBe(true);
    expect(shouldAutoFollowPost({ actorId: "member-b", postAuthorId: "member-a" })).toBe(false);

    const recipients = replyNotificationRecipients({
      followerIds: ["member-a"],
      commentAuthorId: "member-b",
      postAuthorId: "member-a",
      pausedUserIds: new Set(),
    });
    expect(recipients).toEqual(["member-a"]);

    const server = source("src/lib/community.functions.ts");
    expect(server).toContain("shouldAutoFollowPost");
    expect(server).toContain("communityPostFollows");
    expect(server).toContain("commentAuthorId: member.userId");
    expect(server).toContain("postAuthorId: post.authorId");

    const phase3 = source("src/lib/community/phase3.functions.ts");
    expect(phase3).toContain("postAuthorId: input.postAuthorId");
    expect(phase3).toContain('kind: "post_reply"');
  });

  it("keeps Community public and Workspace personal in copy", () => {
    const index = source("src/routes/community.index.tsx");
    expect(index).toContain("not your personal dashboard");
    expect(index).toContain("My Workspace");
    expect(index).toContain("listRecentCommunityPosts");
    expect(index).toContain("Recent discussions");
    expect(source("src/routes/workspace.tsx")).toContain("personal dashboard");
  });
});

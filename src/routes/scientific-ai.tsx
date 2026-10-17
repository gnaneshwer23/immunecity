import { createFileRoute, redirect } from "@tanstack/react-router";

/** Scientific AI merged into Reasoning & AI — keep old links working. */
export const Route = createFileRoute("/scientific-ai")({
  beforeLoad: () => {
    throw redirect({ to: "/reasoning", hash: "how-ai-works" });
  },
});

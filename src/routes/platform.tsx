import { createFileRoute, redirect } from "@tanstack/react-router";

/** Blueprint URL alias → live Platform / Overview page. */
export const Route = createFileRoute("/platform")({
  beforeLoad: () => {
    throw redirect({ to: "/overview" });
  },
});

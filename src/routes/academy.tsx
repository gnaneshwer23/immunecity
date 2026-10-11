import { createFileRoute, redirect } from "@tanstack/react-router";

/** Blueprint URL alias → Mechanism / Academy foundation track. */
export const Route = createFileRoute("/academy")({
  beforeLoad: () => {
    throw redirect({ to: "/mechanism" });
  },
});

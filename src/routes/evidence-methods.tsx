import { createFileRoute, redirect } from "@tanstack/react-router";

/** Blueprint URL alias → Methods & trust. */
export const Route = createFileRoute("/evidence-methods")({
  beforeLoad: () => {
    throw redirect({ to: "/methods" });
  },
});

import { createFileRoute, redirect } from "@tanstack/react-router";

/** Blueprint URL alias → Research workbench layer. */
export const Route = createFileRoute("/research-workbench")({
  beforeLoad: () => {
    throw redirect({ to: "/research" });
  },
});

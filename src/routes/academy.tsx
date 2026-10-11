import { createFileRoute, redirect } from "@tanstack/react-router";
import { CONTENT } from "@/data/content";

/** Blueprint URL alias → first Mechanism lesson (same landing as /mechanism). */
export const Route = createFileRoute("/academy")({
  beforeLoad: () => {
    throw redirect({ to: "/mechanism/$id", params: { id: CONTENT.lessons[0]!.id } });
  },
});

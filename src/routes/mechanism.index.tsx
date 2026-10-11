import { createFileRoute, redirect } from "@tanstack/react-router";
import { CONTENT } from "@/data/content";

export const Route = createFileRoute("/mechanism/")({
  beforeLoad: () => {
    throw redirect({ to: "/mechanism/$id", params: { id: CONTENT.lessons[0]!.id } });
  },
});

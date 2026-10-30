import { Link } from "@tanstack/react-router";
import { lessonTitle, resolveLessonId } from "@/lib/academy/graphBridge";

/** Banner when arriving at Atlas/graph from an Academy lesson — progress stays in Academy storage. */
export default function LessonReturn({ fromLesson }: { fromLesson?: string | null }) {
  const lessonId = resolveLessonId(fromLesson);
  if (!lessonId) return null;
  const title = lessonTitle(lessonId) ?? lessonId;
  return (
    <p className="callout lesson-return" role="status" data-testid="lesson-return">
      Exploring from Academy lesson.{" "}
      <Link to="/mechanism/$id" params={{ id: lessonId }}>
        Return to {title.split(":")[0]}
      </Link>
      . Quiz and visit progress stay in your browser or signed-in Academy record — this hop does not reset them.
    </p>
  );
}

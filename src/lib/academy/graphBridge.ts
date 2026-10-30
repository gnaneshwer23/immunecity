/**
 * Academy ↔ Immune City graph bridge.
 * Uses existing curriculum graphIds and CONTENT lesson.nodes only — never invents biology.
 * Progress stays in Academy localStorage / server sync; deep links do not reset it.
 */
import { ACADEMY_TRACKS, moduleForLesson } from "@/data/academyCurriculum";
import { CONTENT } from "@/data/content";
import { byId, lessonsForNode } from "@/lib/immune/engine";

/** Existing Mechanism lesson ids (CONTENT), not invented. */
export function isKnownLessonId(lessonId: string): boolean {
  return (CONTENT.lessons as { id: string }[]).some((l) => l.id === lessonId);
}

export function resolveLessonId(raw: string | null | undefined): string | null {
  const id = (raw ?? "").trim();
  if (!id || !isKnownLessonId(id)) return null;
  return id;
}

/**
 * Canonical graph concept ids for a lesson: Academy module graphIds first,
 * then lesson.nodes from CONTENT — both filtered to ids present in the KG.
 */
export function knownGraphIdsForLesson(lessonId: string): string[] {
  if (!isKnownLessonId(lessonId)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (id: string) => {
    if (!byId[id] || seen.has(id)) return;
    seen.add(id);
    out.push(id);
  };
  const mod = moduleForLesson(lessonId)?.module;
  for (const id of mod?.graphIds ?? []) push(id);
  const lesson = (CONTENT.lessons as { id: string; nodes?: string[] }[]).find((l) => l.id === lessonId);
  for (const id of lesson?.nodes ?? []) push(id);
  return out;
}

/** Atlas / graph search payload preserving the lesson for return navigation. */
export function fromLessonSearch(lessonId: string): { fromLesson: string } | Record<string, never> {
  const id = resolveLessonId(lessonId);
  return id ? { fromLesson: id } : {};
}

export function lessonTitle(lessonId: string): string | null {
  const id = resolveLessonId(lessonId);
  if (!id) return null;
  const lesson = (CONTENT.lessons as { id: string; title: string }[]).find((l) => l.id === id);
  return lesson?.title ?? id;
}

/** Prefer Academy module that lists this graph id, else first CONTENT lesson that maps the node. */
export function lessonForGraphConcept(conceptId: string): string | null {
  if (!byId[conceptId]) return null;
  for (const track of ACADEMY_TRACKS) {
    for (const mod of track.modules) {
      if (mod.graphIds.includes(conceptId) && isKnownLessonId(mod.lessonId)) return mod.lessonId;
    }
  }
  const fromEngine = lessonsForNode[conceptId]?.[0];
  return fromEngine && isKnownLessonId(fromEngine) ? fromEngine : null;
}

/**
 * Academy progress rules. Curriculum comes from the existing tracks.
 * Signed-out progress stays in localStorage. Server sync is optional and additive.
 */
import { ACADEMY_TRACKS, type AcademyTrack } from "@/data/academyCurriculum";
import { byId } from "@/lib/immune/engine";

export const ACADEMY_PROGRESS_KEY = "immune-city-academy-progress-v2";

export interface AcademyProgress {
  visitedLessonIds: string[];
  quizCorrect: string[];
}

export const EMPTY_ACADEMY_PROGRESS: AcademyProgress = { visitedLessonIds: [], quizCorrect: [] };

const MISCONCEPTION_MARKER = /\b(misconception|common mistake|often confused|do not confuse)\b/i;

export function normaliseProgress(raw: unknown): AcademyProgress {
  const row = raw && typeof raw === "object" ? (raw as Partial<AcademyProgress>) : {};
  const visited = Array.isArray(row.visitedLessonIds) ? row.visitedLessonIds.filter((id) => typeof id === "string") : [];
  const quiz = Array.isArray(row.quizCorrect) ? row.quizCorrect.filter((id) => typeof id === "string") : [];
  return {
    visitedLessonIds: [...new Set(visited)],
    quizCorrect: [...new Set(quiz)],
  };
}

export function mergeProgress(a: AcademyProgress, b: AcademyProgress): AcademyProgress {
  return normaliseProgress({
    visitedLessonIds: [...a.visitedLessonIds, ...b.visitedLessonIds],
    quizCorrect: [...a.quizCorrect, ...b.quizCorrect],
  });
}

export function loadLocalProgress(): AcademyProgress {
  if (typeof window === "undefined") return { ...EMPTY_ACADEMY_PROGRESS };
  try {
    const raw = localStorage.getItem(ACADEMY_PROGRESS_KEY);
    if (!raw) {
      const legacy = localStorage.getItem("immune-city-academy-foundation-v1");
      return legacy ? normaliseProgress(JSON.parse(legacy)) : { ...EMPTY_ACADEMY_PROGRESS };
    }
    return normaliseProgress(JSON.parse(raw));
  } catch {
    return { ...EMPTY_ACADEMY_PROGRESS };
  }
}

export function saveLocalProgress(progress: AcademyProgress) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACADEMY_PROGRESS_KEY, JSON.stringify(normaliseProgress(progress)));
}

export interface CourseModuleMap {
  id: string;
  lessonId: string;
  title: string;
  prerequisites: { lessonId: string; title: string }[];
}

export interface CourseTrackMap {
  id: string;
  title: string;
  level: AcademyTrack["level"];
  status: AcademyTrack["status"];
  unfinished: boolean;
  modules: CourseModuleMap[];
}

export function courseMap(tracks: readonly AcademyTrack[] = ACADEMY_TRACKS): CourseTrackMap[] {
  const titles = new Map<string, string>();
  for (const track of tracks) {
    for (const module of track.modules) titles.set(module.lessonId, module.title);
  }
  return tracks.map((track) => ({
    id: track.id,
    title: track.title,
    level: track.level,
    status: track.status,
    unfinished: track.status !== "navigable" || track.modules.length === 0,
    modules: track.modules.map((module) => ({
      id: module.id,
      lessonId: module.lessonId,
      title: module.title,
      prerequisites: module.prerequisiteLessonIds.map((lessonId) => ({
        lessonId,
        title: titles.get(lessonId) ?? lessonId,
      })),
    })),
  }));
}

export function lessonComplete(lessonId: string, progress: AcademyProgress, tracks: readonly AcademyTrack[] = ACADEMY_TRACKS): boolean {
  const module = tracks.flatMap((track) => track.modules).find((item) => item.lessonId === lessonId);
  if (!module || module.quiz.length === 0) return false;
  if (!progress.visitedLessonIds.includes(lessonId)) return false;
  return module.quiz.every((item) => progress.quizCorrect.includes(item.id));
}

/** Completed existing lessons only. Not a spaced-review schedule and not new curriculum. */
export function reviewDueLessons(progress: AcademyProgress, tracks: readonly AcademyTrack[] = ACADEMY_TRACKS) {
  const due: { lessonId: string; title: string; trackTitle: string }[] = [];
  for (const track of tracks) {
    for (const module of track.modules) {
      if (!lessonComplete(module.lessonId, progress, tracks)) continue;
      due.push({ lessonId: module.lessonId, title: module.title, trackTitle: track.title });
    }
  }
  return due;
}

type LessonLike = {
  steps?: Array<Record<string, unknown>>;
  perturbations?: Array<Record<string, unknown>>;
};

/** Returns lesson sentences that already name a misconception. Does not rewrite them. */
export function statedMisconceptions(lesson: LessonLike | null | undefined): string[] {
  if (!lesson) return [];
  const chunks: string[] = [];
  for (const step of lesson.steps ?? []) {
    for (const key of ["name", "desc", "fn", "clinical", "absent"]) {
      const value = step[key];
      if (typeof value === "string") chunks.push(value);
    }
  }
  for (const item of lesson.perturbations ?? []) {
    if (typeof item.q === "string") chunks.push(item.q);
    if (typeof item.clinical === "string") chunks.push(item.clinical);
    if (Array.isArray(item.chain)) {
      for (const line of item.chain) if (typeof line === "string") chunks.push(line);
    }
  }
  return chunks.filter((line) => MISCONCEPTION_MARKER.test(line));
}

/** Start-discussion search for a graph id that already exists. Does not create a thread. */
export function discussionStartSearch(conceptId: string): { topic: ""; concept: string } | null {
  if (!byId[conceptId]) return null;
  return { topic: "", concept: conceptId };
}

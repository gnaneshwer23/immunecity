/**
 * Saved research paths — ordered lists of existing KG concept ids only.
 * Browser localStorage; does not duplicate scientific facts or write the knowledge graph.
 */
import { byId } from "@/lib/immune/engine";

export const RESEARCH_PATHS_KEY = "isi-research-paths-v1";
export const MAX_PATH_CONCEPTS = 8;
export const MAX_SAVED_PATHS = 12;

/**
 * Phase E — Canonical melanoma investigation path seeds (local path sync).
 * Cap respects MAX_PATH_CONCEPTS; does not auto-write localStorage or the KG.
 */
export const MELANOMA_INVESTIGATION_PATH_SEEDS = [
  "D012",
  "R011",
  "I008",
  "B011",
  "TR003",
  "TR020",
] as const;

export type ResearchPath = {
  id: string;
  /** Display label; may be derived from concept names */
  title: string;
  /** Ordered existing graph concept ids */
  conceptIds: string[];
  savedAt: string;
};

/** Keep only known graph ids, drop consecutive duplicates, cap length. */
export function sanitizePathConceptIds(ids: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of ids) {
    const id = typeof raw === "string" ? raw.trim() : "";
    if (!id || !byId[id]) continue;
    if (out[out.length - 1] === id) continue;
    out.push(id);
    if (out.length >= MAX_PATH_CONCEPTS) break;
  }
  return out;
}

export function pathTitleFromIds(conceptIds: readonly string[]): string {
  const names = conceptIds.map((id) => byId[id]?.name).filter(Boolean) as string[];
  if (!names.length) return "Empty path";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} → ${names[1]}`;
  return `${names[0]} → … → ${names[names.length - 1]} (${names.length})`;
}

function normalisePath(raw: unknown): ResearchPath | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<ResearchPath>;
  const conceptIds = sanitizePathConceptIds(Array.isArray(row.conceptIds) ? row.conceptIds : []);
  if (conceptIds.length < 2) return null;
  const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : `path-${conceptIds.join("-")}`;
  const title =
    typeof row.title === "string" && row.title.trim() ? row.title.trim().slice(0, 120) : pathTitleFromIds(conceptIds);
  const savedAt = typeof row.savedAt === "string" && row.savedAt ? row.savedAt : new Date(0).toISOString();
  return { id, title, conceptIds, savedAt };
}

export function loadSavedPaths(): ResearchPath[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RESEARCH_PATHS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: ResearchPath[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      const path = normalisePath(item);
      if (!path || seen.has(path.id)) continue;
      seen.add(path.id);
      out.push(path);
      if (out.length >= MAX_SAVED_PATHS) break;
    }
    return out;
  } catch {
    return [];
  }
}

function persist(paths: ResearchPath[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(RESEARCH_PATHS_KEY, JSON.stringify(paths.slice(0, MAX_SAVED_PATHS)));
}

/** Save an ordered path of existing concept ids. Returns null if fewer than 2 known ids. */
export function saveResearchPath(conceptIds: readonly string[], title?: string): ResearchPath | null {
  const ids = sanitizePathConceptIds(conceptIds);
  if (ids.length < 2) return null;
  const path: ResearchPath = {
    id: `path-${Date.now().toString(36)}-${ids.join(".")}`,
    title: title?.trim() ? title.trim().slice(0, 120) : pathTitleFromIds(ids),
    conceptIds: ids,
    savedAt: new Date().toISOString(),
  };
  const prev = loadSavedPaths().filter((p) => p.conceptIds.join(",") !== ids.join(","));
  persist([path, ...prev].slice(0, MAX_SAVED_PATHS));
  return path;
}

export function removeResearchPath(id: string): ResearchPath[] {
  const next = loadSavedPaths().filter((p) => p.id !== id);
  persist(next);
  return next;
}

/** Deep-link search for the first concept on the path (graph explorer). */
export function pathGraphSearch(path: ResearchPath): { focus: string } | Record<string, never> {
  const first = path.conceptIds.find((id) => byId[id]);
  return first ? { focus: first } : {};
}

/**
 * Build (but do not persist) the melanoma investigation research path.
 * Use `saveResearchPath(ids)` explicitly when the member opts in — never community→KG.
 */
export function melanomaInvestigationResearchPath(title?: string): ResearchPath | null {
  const conceptIds = sanitizePathConceptIds(MELANOMA_INVESTIGATION_PATH_SEEDS);
  if (conceptIds.length < 2) return null;
  return {
    id: "path-melanoma-pd1-investigation",
    title: title?.trim()
      ? title.trim().slice(0, 120)
      : pathTitleFromIds(conceptIds),
    conceptIds,
    savedAt: new Date(0).toISOString(),
  };
}

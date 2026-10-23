/**
 * Header search grouping. Concepts and courses are local.
 * Publications and discussions are filled by the server and may be empty or unavailable.
 * Groups stay separate so a concept is never presented as a publication.
 */
import { ACADEMY_TRACKS } from "@/data/academyCurriculum";
import { KG, TYPES, type KGNode } from "@/lib/immune/engine";

export const SEARCH_GROUP_ORDER = ["concepts", "publications", "courses", "discussions"] as const;
export type SearchGroupId = (typeof SEARCH_GROUP_ORDER)[number];

export type BucketState = "ready" | "empty" | "unavailable" | "pending";

export interface ConceptHit {
  kind: "concept";
  id: string;
  title: string;
  typeLabel: string;
  /** Draft concepts are labelled. Core concepts have no separate review badge here. */
  status: "Draft" | null;
}

export interface CourseHit {
  kind: "course";
  id: string;
  title: string;
  lessonId: string | null;
  /** Scaffolds are not finished courses. Navigable means the lesson path exists. */
  status: "Not finished" | "Navigable";
}

export interface PublicationHit {
  kind: "publication";
  id: string;
  title: string;
  nodeId: string | null;
  /** Stored curation and claim support. Never invented. */
  status: string;
}

export interface DiscussionHit {
  kind: "discussion";
  id: string;
  title: string;
  subtype: "Topic" | "Post";
  topicSlug: string | null;
  postId: string | null;
  status: null;
}

export type SearchHit = ConceptHit | CourseHit | PublicationHit | DiscussionHit;

export interface SearchGroup {
  id: SearchGroupId;
  label: string;
  state: BucketState;
  note: string | null;
  items: SearchHit[];
}

const GROUP_LABEL: Record<SearchGroupId, string> = {
  concepts: "Concepts",
  publications: "Publications",
  courses: "Courses",
  discussions: "Discussions",
};

function norm(q: string): string {
  return q.trim().toLowerCase();
}

function conceptScore(node: KGNode, q: string): number {
  const name = node.name.toLowerCase();
  const id = node.id.toLowerCase();
  if (name === q || id === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 60;
  if (id.includes(q)) return 40;
  if (node.desc.toLowerCase().includes(q)) return 20;
  return 0;
}

export function searchConcepts(query: string, limit = 6): ConceptHit[] {
  const q = norm(query);
  if (q.length < 2) return [];
  return KG.nodes
    .map((node) => ({ node, score: conceptScore(node, q) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.node.name.localeCompare(b.node.name))
    .slice(0, limit)
    .map(({ node }) => ({
      kind: "concept" as const,
      id: node.id,
      title: node.name,
      typeLabel: TYPES[node.node_type]?.label ?? "Concept",
      status: node.draft ? "Draft" : null,
    }));
}

export function searchCourses(query: string, limit = 6): CourseHit[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const hits: CourseHit[] = [];
  for (const track of ACADEMY_TRACKS) {
    const trackText = `${track.title} ${track.summary}`.toLowerCase();
    const status = track.status === "scaffold" ? "Not finished" : "Navigable";
    if (trackText.includes(q)) {
      hits.push({ kind: "course", id: track.id, title: track.title, lessonId: null, status });
    }
    for (const mod of track.modules) {
      const text = `${mod.title} ${mod.lessonId} ${mod.objectives.join(" ")}`.toLowerCase();
      if (!text.includes(q)) continue;
      hits.push({
        kind: "course",
        id: mod.id,
        title: mod.title,
        lessonId: mod.lessonId,
        status: track.status === "scaffold" ? "Not finished" : "Navigable",
      });
    }
  }
  return hits.slice(0, limit);
}

export function bucketNote(group: SearchGroupId, state: BucketState): string | null {
  if (state === "ready") return null;
  if (state === "pending") {
    if (group === "publications") return "Searching approved publications…";
    if (group === "discussions") return "Searching discussions…";
    return null;
  }
  if (state === "unavailable") {
    if (group === "publications") return "Publication search is unavailable.";
    if (group === "discussions") return "Discussion search is unavailable.";
    return "This search is unavailable.";
  }
  if (group === "concepts") return "No concepts match.";
  if (group === "publications") return "No approved publications match. This search does not use the open web.";
  if (group === "courses") return "No Academy entries match.";
  return "No discussions match.";
}

export function catalogGroups(input: {
  concepts: ConceptHit[];
  courses: CourseHit[];
  publications: { state: Exclude<BucketState, "pending">; items: PublicationHit[] };
  discussions: { state: Exclude<BucketState, "pending">; items: DiscussionHit[] };
}): SearchGroup[] {
  const conceptsState: BucketState = input.concepts.length ? "ready" : "empty";
  const coursesState: BucketState = input.courses.length ? "ready" : "empty";
  const publicationsState: BucketState = input.publications.state === "unavailable"
    ? "unavailable"
    : input.publications.items.length ? "ready" : "empty";
  const discussionsState: BucketState = input.discussions.state === "unavailable"
    ? "unavailable"
    : input.discussions.items.length ? "ready" : "empty";
  const items: Record<SearchGroupId, SearchHit[]> = {
    concepts: input.concepts,
    publications: input.publications.items,
    courses: input.courses,
    discussions: input.discussions.items,
  };
  const states: Record<SearchGroupId, BucketState> = {
    concepts: conceptsState,
    publications: publicationsState,
    courses: coursesState,
    discussions: discussionsState,
  };
  return SEARCH_GROUP_ORDER.map((id) => ({
    id,
    label: GROUP_LABEL[id],
    state: states[id],
    note: bucketNote(id, states[id]),
    items: items[id],
  }));
}

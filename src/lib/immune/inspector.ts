import { useSyncExternalStore } from "react";

/* One shared target for the Scientific Inspector drawer, opened from any layer. */
export type InspectTarget = { kind: "concept"; id: string } | { kind: "relationship"; id: string } | null;

let current: InspectTarget = null;
const subs = new Set<() => void>();

export function inspect(t: InspectTarget) {
  current = t;
  subs.forEach((f) => f());
}
export function useInspected(): InspectTarget {
  return useSyncExternalStore(
    (f) => { subs.add(f); return () => { subs.delete(f); }; },
    () => current,
    () => null,
  );
}

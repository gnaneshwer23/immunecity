/**
 * Phase B — Bounded neighbourhood API (server fn wrapping browser-safe helper).
 * Same single KG as the client; depth/edge caps enforced in neighbourhood.ts.
 */
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import {
  NEIGHBOURHOOD_DEFAULT_DEPTH,
  NEIGHBOURHOOD_DEFAULT_MAX_EDGES,
  NEIGHBOURHOOD_HARD_MAX_EDGES,
  NEIGHBOURHOOD_MAX_DEPTH,
  getGraphNeighbourhood,
  type GraphNeighbourhood,
} from "@/lib/immune/neighbourhood";

const inputSchema = z.object({
  seedId: z.string().min(1).max(32),
  depth: z.number().int().min(0).max(NEIGHBOURHOOD_MAX_DEPTH).optional(),
  maxEdges: z.number().int().min(1).max(NEIGHBOURHOOD_HARD_MAX_EDGES).optional(),
  includeDraft: z.boolean().optional(),
  direction: z.enum(["both", "out", "in"]).optional(),
});

export type NeighbourhoodQuery = z.infer<typeof inputSchema>;

export interface NeighbourhoodRead {
  neighbourhood: GraphNeighbourhood | null;
  /** True when seed id is not in the curated/runtime graph. */
  unknownSeed: boolean;
}

export function resolveGraphNeighbourhood(query: NeighbourhoodQuery): NeighbourhoodRead {
  const neighbourhood = getGraphNeighbourhood(query.seedId, {
    depth: query.depth ?? NEIGHBOURHOOD_DEFAULT_DEPTH,
    maxEdges: query.maxEdges ?? NEIGHBOURHOOD_DEFAULT_MAX_EDGES,
    includeDraft: query.includeDraft,
    direction: query.direction,
  });
  return {
    neighbourhood,
    unknownSeed: neighbourhood === null,
  };
}

export const getGraphNeighbourhoodFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => resolveGraphNeighbourhood(data));

export function graphNeighbourhoodQuery(seedId: string, opts?: Omit<NeighbourhoodQuery, "seedId">) {
  return queryOptions({
    queryKey: ["graph-neighbourhood", seedId, opts ?? {}],
    queryFn: () => getGraphNeighbourhoodFn({ data: { seedId, ...opts } }),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Curated Trial Intelligence reads (migration 0015).
 * When Postgres has seeded rows, the DB is authoritative for arm/endpoint fields.
 * Fixtures in src/data/trialIntelligence.ts remain the seed / import source of truth
 * and supply publication bibliography (not stored in 0015 tables).
 */
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  MELANOMA_PILOT_TRIALS,
  trialIntelligenceByGraphNode,
  type ClinicalTrialRecord,
  type ComparatorRole,
  type EndpointResultRecord,
  type EndpointType,
  type TrialArmRecord,
  type VerificationState,
} from "@/data/trialIntelligence";
import { getDb } from "@/lib/db.server";
import { clinicalTrials, endpointResults, trialArms } from "@/lib/db/schema.server";
import { endpointPassesHonesty } from "@/lib/immune/trialProvenance";

export type TrialIntelligenceDataSource = "postgres" | "fixture";

export interface TrialIntelligenceRead {
  trial: ClinicalTrialRecord | null;
  source: TrialIntelligenceDataSource;
  /** True when the DB could not be queried; caller should use fixture fallback. */
  unavailable?: boolean;
}

const VERIFICATION = new Set<VerificationState>(["verified", "partial", "unverified"]);
const ROLES = new Set<ComparatorRole>(["experimental", "active_comparator", "placebo", "control", "other"]);
const ENDPOINT_TYPES = new Set<EndpointType>([
  "orr",
  "pfs",
  "os",
  "pfs_rate",
  "os_rate",
  "cr",
  "dor",
  "safety_grade_3_4",
  "safety_grade_3_5",
  "other",
]);

function asVerification(v: string | null | undefined): VerificationState | null {
  return v && VERIFICATION.has(v as VerificationState) ? (v as VerificationState) : null;
}

function asRole(v: string | null | undefined): ComparatorRole | null {
  return v && ROLES.has(v as ComparatorRole) ? (v as ComparatorRole) : null;
}

function asEndpointType(v: string | null | undefined): EndpointType | null {
  return v && ENDPOINT_TYPES.has(v as EndpointType) ? (v as EndpointType) : null;
}

function sourcesForTrial(trialId: string) {
  return MELANOMA_PILOT_TRIALS.find((t) => t.trialId === trialId)?.sources ?? [];
}

/**
 * Load one pilot trial from Postgres and assemble a ClinicalTrialRecord.
 * Returns null when the row is missing or fails honesty / shape validation.
 */
export async function loadTrialIntelligenceFromDb(graphNodeId: string): Promise<ClinicalTrialRecord | null> {
  const db = getDb();
  const [trialRow] = await db
    .select()
    .from(clinicalTrials)
    .where(eq(clinicalTrials.graphNodeId, graphNodeId))
    .limit(1);
  if (!trialRow) return null;

  const verificationState = asVerification(trialRow.verificationState);
  if (!verificationState || !trialRow.nctId || !trialRow.trialId) return null;

  const armRows = await db
    .select()
    .from(trialArms)
    .where(eq(trialArms.trialId, trialRow.trialId))
    .orderBy(asc(trialArms.sortOrder));
  if (armRows.length < 2) return null;

  const arms: TrialArmRecord[] = [];
  for (const armRow of armRows) {
    const role = asRole(armRow.comparatorRole);
    if (!role) return null;
    const epRows = await db
      .select()
      .from(endpointResults)
      .where(eq(endpointResults.armId, armRow.armId));
    const endpoints: EndpointResultRecord[] = [];
    for (const ep of epRows) {
      const endpointType = asEndpointType(ep.endpointType);
      const epVerification = asVerification(ep.verificationState);
      if (!endpointType || !epVerification) return null;
      const mapped: EndpointResultRecord = {
        resultId: ep.resultId,
        endpointType,
        label: ep.label,
        valueNum: ep.valueNum,
        valueText: ep.valueText,
        unit: ep.unit,
        ciLower: ep.ciLower,
        ciUpper: ep.ciUpper,
        pValue: ep.pValue,
        timepoint: ep.timepoint,
        analysisSet: ep.analysisSet ?? "",
        followUp: ep.followUp,
        populationNote: ep.populationNote,
        verificationState: epVerification,
        sourcePmid: ep.sourcePmid,
        sourceDoi: ep.sourceDoi,
        sourceLocator: ep.sourceLocator,
        notes: ep.notes,
      };
      if (!endpointPassesHonesty(mapped)) return null;
      endpoints.push(mapped);
    }
    arms.push({
      armId: armRow.armId,
      label: armRow.label,
      regimen: armRow.regimen,
      doseSchedule: armRow.doseSchedule,
      comparatorRole: role,
      enrolledN: armRow.enrolledN,
      treatedN: armRow.treatedN,
      sortOrder: armRow.sortOrder,
      endpoints,
    });
  }

  return {
    trialId: trialRow.trialId,
    graphNodeId: trialRow.graphNodeId,
    nctId: trialRow.nctId,
    acronym: trialRow.acronym,
    title: trialRow.title,
    phase: trialRow.phase ?? "",
    design: trialRow.design ?? "",
    sponsor: trialRow.sponsor,
    status: trialRow.status ?? "",
    conditionLabel: trialRow.conditionLabel ?? "",
    populationSummary: trialRow.populationSummary ?? "",
    analysisSetNote: trialRow.analysisSetNote ?? "",
    // Fixture-curated treatmentLine (no DB column in 0015) — never infer from free text.
    treatmentLine: MELANOMA_PILOT_TRIALS.find((t) => t.trialId === trialRow.trialId)?.treatmentLine ?? null,
    verificationState,
    primaryPmid: trialRow.primaryPmid ?? "",
    primaryDoi: trialRow.primaryDoi ?? "",
    notes: trialRow.notes,
    sources: sourcesForTrial(trialRow.trialId),
    arms,
    // Assays not stored in 0015 — keep empty stub; graph biomarkers resolve in UI.
    biomarkerContext: MELANOMA_PILOT_TRIALS.find((t) => t.trialId === trialRow.trialId)?.biomarkerContext ?? [],
  };
}

/** Prefer validated Postgres; fall back to fixtures when DB is down or incomplete. */
export async function resolveTrialIntelligence(graphNodeId: string): Promise<TrialIntelligenceRead> {
  try {
    const fromDb = await loadTrialIntelligenceFromDb(graphNodeId);
    if (fromDb) return { trial: fromDb, source: "postgres" };
  } catch {
    const fixture = trialIntelligenceByGraphNode(graphNodeId) ?? null;
    return { trial: fixture, source: "fixture", unavailable: true };
  }
  const fixture = trialIntelligenceByGraphNode(graphNodeId) ?? null;
  return { trial: fixture, source: "fixture" };
}

export const getTrialIntelligenceByGraphNode = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ graphNodeId: z.string().regex(/^TR\d{3}$/) }).parse(d))
  .handler(async ({ data }) => resolveTrialIntelligence(data.graphNodeId));

export function trialIntelligenceQuery(graphNodeId: string) {
  return queryOptions({
    queryKey: ["trial-intelligence", graphNodeId],
    queryFn: () => getTrialIntelligenceByGraphNode({ data: { graphNodeId } }),
    staleTime: 5 * 60 * 1000,
  });
}

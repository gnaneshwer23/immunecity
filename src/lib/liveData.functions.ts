/* Live metadata for trials (ClinicalTrials.gov v2) and proteins (UniProt REST).
   Public read-only lookups; results are trimmed to plain DTOs and cached in
   memory. Any failure returns nulls so pages fall back to curated data. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TRIAL_REGISTRY, ctgStudyUrl } from "@/data/trialRegistry";
import { KG } from "@/lib/immune/engine";
import { registryTerm } from "@/lib/immune/translational";

/* Live registry queries accept only terms the graph itself would send, so these public
   endpoints cannot be used as an open proxy to ClinicalTrials.gov or to grow the cache. */
const ALLOWED_CONDITIONS = new Set(KG.nodes.filter((n) => n.node_type === "DISEASE").map((n) => registryTerm(n.name)));
const ALLOWED_INTERVENTIONS = new Set(
  KG.nodes.filter((n) => n.node_type === "INTERVENTION" && !/\(class\)/i.test(n.name)).map((n) => n.name),
);
const condition = z.string().refine((v) => ALLOWED_CONDITIONS.has(v), "unknown condition");
const intervention = z.string().refine((v) => ALLOWED_INTERVENTIONS.has(v), "unknown intervention");

/** One registered study, fetched from ClinicalTrials.gov by its verified NCT ID. */
export interface LiveStudy { nctId: string; label: string; phase: string | null; status: string | null; url: string; unavailable?: boolean }
/** Registry view of one curated TRIAL concept. */
export interface LiveTrial { nodeId: string; studies: LiveStudy[]; unregisteredReason: string | null; note: string | null }
/** A currently active interventional study returned by a live registry query (not curated). */
export interface ActiveStudy { nctId: string; title: string; phase: string | null; status: string; sponsor: string | null; url: string; interventions: string[] }
export interface ActiveTrials { total: number; studies: ActiveStudy[]; query: { condition: string | null; intervention: string | null }; unavailable?: boolean }
export interface LiveProtein { gene: string; protein: string | null; accession: string | null; size: number | null; url: string | null; unavailable?: boolean }

const cache = new Map<string, { at: number; value: unknown }>();
const TTL = 6 * 60 * 60 * 1000; // 6 h
/** Inputs are allowlisted, so this only bounds worst-case memory per warm instance. */
const CACHE_MAX = 600;
async function cached<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as T;
  try {
    const value = await fn();
    cache.delete(key);
    cache.set(key, { at: Date.now(), value });
    while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
    return value;
  } catch {
    return null;
  }
}

const CTG = "https://clinicaltrials.gov/api/v2/studies";
const UNIPROT = "https://rest.uniprot.org/uniprotkb/search";

const phaseLabel = (phases: string[] | undefined) =>
  (phases ?? []).map((p) => p.replace(/^PHASE/, "").replace(/^EARLY_/, "early ")).join("/") || null;

async function fetchStudy(nctId: string, label: string): Promise<LiveStudy> {
  const url = ctgStudyUrl(nctId);
  return (
    (await cached(`study:${nctId}`, async () => {
      const res = await fetch(`${CTG}/${nctId}?fields=NCTId,Phase,OverallStatus`, {
        headers: { "User-Agent": "ImmuneSuperIntelligence/1.0" },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`ClinicalTrials.gov ${res.status}`);
      const p: any = (await res.json()).protocolSection ?? {};
      if (p.identificationModule?.nctId !== nctId) throw new Error("registry returned a different study");
      return { nctId, label, url, phase: phaseLabel(p.designModule?.phases), status: p.statusModule?.overallStatus ?? null } as LiveStudy;
    })) ?? { nctId, label, url, phase: null, status: null, unavailable: true }
  );
}

async function fetchTrial(nodeId: string): Promise<LiveTrial> {
  const reg = TRIAL_REGISTRY[nodeId];
  if (!reg) return { nodeId, studies: [], unregisteredReason: null, note: null };
  const studies = await Promise.all(reg.studies.map((s) => fetchStudy(s.nctId, s.label)));
  return { nodeId, studies, unregisteredReason: reg.unregisteredReason ?? null, note: reg.note ?? null };
}

const ACTIVE = "RECRUITING,NOT_YET_RECRUITING,ACTIVE_NOT_RECRUITING,ENROLLING_BY_INVITATION";

async function fetchActive(condition: string | null, intervention: string | null, pageSize = 6): Promise<ActiveTrials> {
  const query = { condition, intervention };
  return (
    (await cached(`active:${condition ?? ""}|${intervention ?? ""}|${pageSize}`, async () => {
      // Exact-phrase match on the registry's own Condition / InterventionName fields: free-text
      // query.cond expands synonyms and pulls in loosely related studies. Default sort is relevance.
      const phrase = (v: string) => `"${v.replace(/"/g, "")}"`;
      const clauses = [
        "AREA[StudyType]INTERVENTIONAL",
        "(AREA[Phase]PHASE2 OR AREA[Phase]PHASE3 OR AREA[Phase]PHASE4)",
        ...(condition ? [`AREA[Condition]${phrase(condition)}`] : []),
        ...(intervention ? [`AREA[InterventionName]${phrase(intervention)}`] : []),
      ];
      const params = new URLSearchParams({
        "filter.overallStatus": ACTIVE,
        "filter.advanced": clauses.join(" AND "),
        countTotal: "true",
        pageSize: String(pageSize),
        fields: "NCTId,BriefTitle,Phase,OverallStatus,LeadSponsorName,InterventionName",
      });
      const res = await fetch(`${CTG}?${params}`, { headers: { "User-Agent": "ImmuneSuperIntelligence/1.0" }, signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error(`ClinicalTrials.gov ${res.status}`);
      const j: any = await res.json();
      const studies: ActiveStudy[] = (j.studies ?? []).map((st: any) => {
        const p = st.protocolSection ?? {};
        const id = p.identificationModule?.nctId as string;
        return {
          nctId: id,
          title: p.identificationModule?.briefTitle ?? id,
          phase: phaseLabel(p.designModule?.phases),
          status: p.statusModule?.overallStatus ?? "UNKNOWN",
          sponsor: p.sponsorCollaboratorsModule?.leadSponsor?.name ?? null,
          url: ctgStudyUrl(id),
          interventions: (p.armsInterventionsModule?.interventions ?? []).map((i: any) => String(i.name ?? "")).filter(Boolean),
        };
      }).filter((x: ActiveStudy) => /^NCT\d{8}$/.test(x.nctId));
      return { total: Number(j.totalCount ?? studies.length), studies, query } as ActiveTrials;
    })) ?? { total: 0, studies: [], query, unavailable: true }
  );
}

async function fetchProtein(gene: string): Promise<LiveProtein> {
  const empty: LiveProtein = { gene, protein: null, accession: null, size: null, url: null };
  return (
    (await cached(`prot:${gene}`, async () => {
      const q = encodeURIComponent(`gene_exact:${gene} AND organism_id:9606 AND reviewed:true`);
      const res = await fetch(`${UNIPROT}?query=${q}&size=1&fields=accession,protein_name,gene_names,length`, {
        headers: { "User-Agent": "ImmuneSuperIntelligence/1.0" },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`UniProt ${res.status}`);
      const j: any = await res.json();
      const e = j.results?.[0];
      if (!e) return empty;
      const acc = e.primaryAccession ?? null;
      return {
        gene,
        protein: e.proteinDescription?.recommendedName?.fullName?.value ?? null,
        accession: acc,
        size: e.sequence?.length ?? null,
        url: acc ? `https://www.uniprot.org/uniprotkb/${acc}` : null,
      } as LiveProtein;
    })) ?? { ...empty, unavailable: true }
  );
}

export const getLiveTrials = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().regex(/^TR\d{3}$/)).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const out: Record<string, LiveTrial> = {};
    for (let i = 0; i < data.ids.length; i += 6) {
      const batch = await Promise.all(data.ids.slice(i, i + 6).map(fetchTrial));
      batch.forEach((trial) => { out[trial.nodeId] = trial; });
    }
    return out;
  });

/** Live, uncurated view of active phase 2–4 interventional studies for a condition and/or intervention. */
export const getActiveTrials = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({ condition: condition.nullable(), intervention: intervention.nullable() })
      .refine((v) => v.condition || v.intervention, "condition or intervention required")
      .parse(d),
  )
  .handler(async ({ data }) => fetchActive(data.condition, data.intervention));

/** Up to 100 most relevant active phase 2–4 interventional studies for one condition (pipeline pages). */
export const getPipelineTrials = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ condition }).parse(d))
  .handler(async ({ data }) => fetchActive(data.condition, null, 100));

export const getLiveProteins = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ genes: z.array(z.string().regex(/^[A-Za-z0-9-]{1,20}$/)).max(30) }).parse(d))
  .handler(async ({ data }) => {
    const out: Record<string, LiveProtein> = {};
    for (const gene of data.genes) out[gene] = await fetchProtein(gene);
    return out;
  });

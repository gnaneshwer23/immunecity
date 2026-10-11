/* Live metadata for trials (ClinicalTrials.gov v2) and proteins (UniProt REST).
   Public read-only lookups; results are trimmed to plain DTOs and cached in
   memory. Any failure returns nulls so pages fall back to curated data. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface LiveTrial { name: string; nctId: string | null; phase: string | null; status: string | null; url: string | null }
export interface LiveProtein { gene: string; protein: string | null; accession: string | null; size: number | null; url: string | null }

const cache = new Map<string, { at: number; value: unknown }>();
const TTL = 6 * 60 * 60 * 1000; // 6 h
async function cached<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as T;
  try {
    const value = await fn();
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch {
    return null;
  }
}

const CTG = "https://clinicaltrials.gov/api/v2/studies";
const UNIPROT = "https://rest.uniprot.org/uniprotkb/search";

async function fetchTrial(name: string): Promise<LiveTrial> {
  const empty: LiveTrial = { name, nctId: null, phase: null, status: null, url: null };
  return (
    (await cached(`trial:${name}`, async () => {
      const url = `${CTG}?query.term=${encodeURIComponent(name)}&pageSize=1&fields=NCTId,BriefTitle,Phase,OverallStatus`;
      const res = await fetch(url, { headers: { "User-Agent": "ImmuneCity/1.0" } });
      if (!res.ok) throw new Error(`ClinicalTrials.gov ${res.status}`);
      const j: any = await res.json();
      const s = j.studies?.[0];
      if (!s) return empty;
      const p = s.protocolSection ?? {};
      const id = p.identificationModule?.nctId ?? null;
      return {
        name,
        nctId: id,
        phase: (p.designModule?.phases ?? []).join("/") || null,
        status: p.statusModule?.overallStatus ?? null,
        url: id ? `https://clinicaltrials.gov/study/${id}` : null,
      } as LiveTrial;
    })) ?? empty
  );
}

async function fetchProtein(gene: string): Promise<LiveProtein> {
  const empty: LiveProtein = { gene, protein: null, accession: null, size: null, url: null };
  return (
    (await cached(`prot:${gene}`, async () => {
      const q = encodeURIComponent(`gene_exact:${gene} AND organism_id:9606 AND reviewed:true`);
      const res = await fetch(`${UNIPROT}?query=${q}&size=1&fields=accession,protein_name,gene_names,length`, {
        headers: { "User-Agent": "ImmuneCity/1.0" },
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
    })) ?? empty
  );
}

export const getLiveTrials = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ names: z.array(z.string().max(80)).max(30) }).parse(d))
  .handler(async ({ data }) => {
    const out: Record<string, LiveTrial> = {};
    for (const name of data.names) out[name] = await fetchTrial(name);
    return out;
  });

export const getLiveProteins = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ genes: z.array(z.string().max(20)).max(30) }).parse(d))
  .handler(async ({ data }) => {
    const out: Record<string, LiveProtein> = {};
    for (const gene of data.genes) out[gene] = await fetchProtein(gene);
    return out;
  });

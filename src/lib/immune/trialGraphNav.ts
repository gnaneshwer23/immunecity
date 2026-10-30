/**
 * Graph → Trial Intelligence deep links for the melanoma PD-1 pilot neighbourhood.
 * Uses curated graph edges + pilot fixtures only — never invents trial–concept links.
 */
import { byId, inn, out, type KGNode } from "@/lib/immune/engine";
import {
  MELANOMA_PILOT_TRIALS,
  trialIntelligenceByGraphNode,
  type ClinicalTrialRecord,
} from "@/data/trialIntelligence";
import { translationalPath } from "@/lib/immune/translational";

const PILOT_TRIAL_IDS = new Set(MELANOMA_PILOT_TRIALS.map((t) => t.graphNodeId));

/** Concept IDs that should surface pilot Trial Intelligence deep links when the flag is on. */
export const MELANOMA_PILOT_NAV_SEEDS = [
  "D012", // Melanoma
  "R011", // PD-1
  "R012", // PD-L1
  "I008", // Pembrolizumab
  "I009", // Nivolumab
  "I025", // Ipilimumab
  "C015", // CD8 CTL
  "C027", // Exhausted CTL
  "B011", // PD-L1 expression (graph biomarker — no invented assay)
  "TR003",
  "TR020",
] as const;

export interface TrialGraphNavLink {
  graphNodeId: string;
  acronym: string;
  nctId: string;
  /** Atlas deep link into the Trial Intelligence panel. */
  hrefPath: `/atlas/${string}`;
  hash: "trial-intelligence";
  reason: string;
}

export interface TrialBiomarkerStub {
  /** Graph BIOMARKER node when linked via translational / graph edges. */
  graphNodeId: string | null;
  name: string | null;
  /** Assay / cut-off from fixtures — null until curated (never invent). */
  assayLabel: string | null;
  notes: string | null;
}

/** Fixture-level biomarker slots (empty in P2 — schema stub only). */
export function trialBiomarkerStubs(trial: ClinicalTrialRecord): TrialBiomarkerStub[] {
  const raw = trial.biomarkerContext ?? [];
  if (!raw.length) return [];
  return raw.map((b) => ({
    graphNodeId: b.biomarkerGraphNodeId,
    name: b.label,
    assayLabel: b.assayLabel,
    notes: b.notes,
  }));
}

/**
 * Graph biomarkers linked to therapies evaluated by this trial (selection edges).
 * Does not invent assays — names the BIOMARKER node only when the graph has it.
 */
export function graphBiomarkersForTrial(graphNodeId: string): TrialBiomarkerStub[] {
  const trial = trialIntelligenceByGraphNode(graphNodeId);
  if (!trial) return [];
  const therapyIds = new Set<string>();
  for (const e of [...(out[graphNodeId] ?? []), ...(inn[graphNodeId] ?? [])]) {
    const other = e.subject_id === graphNodeId ? e.object_id : e.subject_id;
    if (byId[other]?.node_type === "INTERVENTION") therapyIds.add(other);
  }
  const seen = new Set<string>();
  const outStubs: TrialBiomarkerStub[] = [];
  for (const tid of therapyIds) {
    for (const row of translationalPath(tid)) {
      for (const s of row.selection) {
        if (seen.has(s.node.id)) continue;
        seen.add(s.node.id);
        outStubs.push({
          graphNodeId: s.node.id,
          name: s.node.name,
          assayLabel: null,
          notes: `Graph link: ${s.node.name} → ${row.therapy.name} (${s.edge.relation}). No curated assay cut-off in this release.`,
        });
      }
    }
  }
  return outStubs;
}

function reasonForSeed(seed: KGNode, trialId: string): string {
  const trial = byId[trialId];
  if (!trial) return "Melanoma pilot trial";
  if (seed.id === trialId) return "This concept is the trial node";
  if (seed.node_type === "DISEASE") return `Landmark trial in the ${seed.name} clinical context`;
  if (seed.node_type === "INTERVENTION") return `Evaluates ${seed.name} in the melanoma pilot`;
  if (seed.node_type === "RECEPTOR" || seed.node_type === "MOLECULE")
    return `PD-1 pathway neighbourhood → ${trial.name}`;
  if (seed.node_type === "BIOMARKER") return `Biomarker neighbourhood for melanoma PD-1 therapy trials`;
  if (seed.node_type === "CELL") return `Effector-cell context on the melanoma PD-1 teaching path`;
  return `Linked via the melanoma PD-1 pilot neighbourhood`;
}

/**
 * Pilot Trial Intelligence destinations reachable from a concept.
 * Returns empty when the concept is outside the curated seed set and has no
 * translational landmark trial among TR003/TR020.
 */
export function trialIntelligenceNavFromConcept(conceptId: string): TrialGraphNavLink[] {
  const seed = byId[conceptId];
  if (!seed) return [];

  const trialIds = new Set<string>();

  if (PILOT_TRIAL_IDS.has(conceptId)) trialIds.add(conceptId);

  // Direct graph neighbours that are pilot trials.
  for (const e of [...(out[conceptId] ?? []), ...(inn[conceptId] ?? [])]) {
    const other = e.subject_id === conceptId ? e.object_id : e.subject_id;
    if (PILOT_TRIAL_IDS.has(other)) trialIds.add(other);
  }

  // Translational landmark trials for disease / therapy / target pages.
  for (const row of translationalPath(conceptId)) {
    for (const t of row.trials) {
      if (PILOT_TRIAL_IDS.has(t.id)) trialIds.add(t.id);
    }
  }

  // Curated seed neighbourhood (PD-1 / melanoma mechanism) even when the edge
  // path is longer than one hop — only for explicit seed IDs.
  if ((MELANOMA_PILOT_NAV_SEEDS as readonly string[]).includes(conceptId)) {
    for (const id of PILOT_TRIAL_IDS) {
      // Prefer therapy-specific: pembrolizumab → TR003, nivo/ipi → TR020.
      if (conceptId === "I008") {
        trialIds.add("TR003");
        continue;
      }
      if (conceptId === "I009" || conceptId === "I025") {
        trialIds.add("TR020");
        continue;
      }
      if (conceptId === "B011") {
        trialIds.add("TR003");
        continue;
      }
      trialIds.add(id);
    }
  }

  const links: TrialGraphNavLink[] = [];
  for (const id of [...trialIds].sort()) {
    const trial = trialIntelligenceByGraphNode(id);
    if (!trial) continue;
    links.push({
      graphNodeId: id,
      acronym: trial.acronym,
      nctId: trial.nctId,
      hrefPath: `/atlas/${id}`,
      hash: "trial-intelligence",
      reason: reasonForSeed(seed, id),
    });
  }
  return links;
}

export function isMelanomaPilotTrialNode(graphNodeId: string): boolean {
  return PILOT_TRIAL_IDS.has(graphNodeId);
}

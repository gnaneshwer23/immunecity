/**
 * Phase E — Source-traceable melanoma immunotherapy investigation path.
 * Connects disease → mechanism → interventions → pilot trials → endpoints
 * using existing graph IDs + typed relations. Never invents PMIDs, assays,
 * or clinical conclusions. Educational — not CDS.
 */
import { byId, human, type KGNode } from "@/lib/immune/engine";
import {
  MELANOMA_PILOT_TRIALS,
  type ClinicalTrialRecord,
  type EndpointResultRecord,
} from "@/data/trialIntelligence";
import { typeRelationshipById, typedIncidentRelations, type TypedRelation } from "@/lib/immune/typedRelations";
import { graphBiomarkersForTrial, trialIntelligenceNavFromConcept } from "@/lib/immune/trialGraphNav";
import { conceptProvenance, relationshipProvenance } from "@/lib/immune/graphProvenance";

/** Canonical ordered seeds for the pilot investigation (existing KG ids only). */
export const MELANOMA_INVESTIGATION_SEEDS = [
  "D012", // Melanoma
  "R011", // PD-1
  "R012", // PD-L1
  "I008", // Pembrolizumab
  "I009", // Nivolumab
  "I025", // Ipilimumab
  "B011", // PD-L1 expression (graph biomarker — no assay cut-off)
  "TR003", // KEYNOTE-006
  "TR020", // CheckMate 067
] as const;

export type MelanomaPathHopKind =
  | "disease"
  | "mechanism"
  | "intervention"
  | "biomarker"
  | "trial"
  | "endpoint"
  | "relation";

export interface MelanomaPathHop {
  kind: MelanomaPathHopKind;
  id: string;
  label: string;
  detail: string;
  /** Typed relation id when this hop is an edge. */
  relId?: string;
  polarity?: string;
  clinicalConclusion: false;
}

export interface MelanomaInvestigationPath {
  kind: "melanoma_immunotherapy_investigation_path";
  schemaVersion: "mip-1";
  educationalOnly: true;
  clinicalConclusion: false;
  kgWrite: false;
  question: string;
  seeds: string[];
  hops: MelanomaPathHop[];
  typedRelations: TypedRelation[];
  trials: Array<{
    graphNodeId: string;
    acronym: string;
    nctId: string;
    treatmentLine: string | null;
    populationSummary: string;
    endpointCount: number;
    primaryEndpoints: Array<{ resultId: string; label: string; endpointType: string }>;
  }>;
  graphBiomarkers: Array<{ graphNodeId: string | null; name: string | null; assayLabel: null }>;
  /** Explicit honesty: assay cut-offs are not invented. */
  biomarkerAssayStance: "empty_stub_no_invented_cutoffs";
  provenance: {
    concepts: ReturnType<typeof conceptProvenance>[];
    relationships: ReturnType<typeof relationshipProvenance>[];
  };
  unknowns: string[];
  disclaimer: string;
}

function nodeHop(kind: MelanomaPathHopKind, node: KGNode, detail: string): MelanomaPathHop {
  return {
    kind,
    id: node.id,
    label: node.name,
    detail,
    clinicalConclusion: false,
  };
}

function primaryEndpoints(trial: ClinicalTrialRecord): EndpointResultRecord[] {
  const out: EndpointResultRecord[] = [];
  for (const arm of trial.arms) {
    for (const ep of arm.endpoints) {
      if (ep.endpointType === "orr" || ep.endpointType === "pfs" || ep.endpointType === "os") {
        out.push(ep);
      }
    }
  }
  return out.slice(0, 6);
}

/**
 * Build the melanoma PD-1 immunotherapy investigation path from the single KG
 * + melanoma pilot fixtures. Fail closed if core seeds are missing from the graph.
 */
export function buildMelanomaInvestigationPath(input?: {
  question?: string;
}): MelanomaInvestigationPath | { ok: false; reason: string } {
  const missing = MELANOMA_INVESTIGATION_SEEDS.filter((id) => !byId[id]);
  if (missing.length) {
    return { ok: false, reason: `Missing graph seeds: ${missing.join(", ")}` };
  }

  const question =
    input?.question?.trim() ||
    "In metastatic melanoma, which immune-escape mechanisms associate with PD-1 inhibitor context, which biomarkers and trials support those relationships, and what is unknown — without clinical conclusions.";

  const hops: MelanomaPathHop[] = [];
  const typed: TypedRelation[] = [];
  const seenRel = new Set<string>();

  const d012 = byId["D012"]!;
  const r011 = byId["R011"]!;
  const i008 = byId["I008"]!;
  const i009 = byId["I009"]!;
  const b011 = byId["B011"]!;

  hops.push(nodeHop("disease", d012, "Disease context for the melanoma immunotherapy pilot."));
  hops.push(nodeHop("mechanism", r011, "PD-1 receptor — immune checkpoint mechanism neighbourhood."));

  // Typed relations among seeds (incident edges that stay within the seed set).
  const seedSet = new Set<string>(MELANOMA_INVESTIGATION_SEEDS);
  for (const seed of MELANOMA_INVESTIGATION_SEEDS) {
    for (const rel of typedIncidentRelations(seed)) {
      if (!seedSet.has(rel.subjectId) || !seedSet.has(rel.objectId)) continue;
      if (seenRel.has(rel.relId)) continue;
      seenRel.add(rel.relId);
      typed.push(rel);
      hops.push({
        kind: "relation",
        id: rel.relId,
        label: `${rel.subjectId} —${rel.predicateLabel}→ ${rel.objectId}`,
        detail: `Typed relation polarity=${rel.polarity}; context=${rel.context ?? "none"}.`,
        relId: rel.relId,
        polarity: rel.polarity,
        clinicalConclusion: false,
      });
    }
  }

  hops.push(nodeHop("intervention", i008, "PD-1 inhibitor intervention evaluated in KEYNOTE-006 (TR003)."));
  hops.push(nodeHop("intervention", i009, "PD-1 inhibitor intervention evaluated in CheckMate 067 (TR020)."));
  hops.push(
    nodeHop(
      "biomarker",
      b011,
      "Graph BIOMARKER node only — no curated assay cut-off; biomarkerContext remains empty stub.",
    ),
  );

  const trials: MelanomaInvestigationPath["trials"] = [];
  for (const pilot of MELANOMA_PILOT_TRIALS) {
    const trialNode = byId[pilot.graphNodeId];
    if (!trialNode) continue;
    hops.push(
      nodeHop(
        "trial",
        trialNode,
        `${pilot.acronym} · ${pilot.nctId} · line: ${pilot.treatmentLine ?? "not recorded"} · ${pilot.populationSummary}`,
      ),
    );
    const primaries = primaryEndpoints(pilot);
    for (const ep of primaries.slice(0, 3)) {
      hops.push({
        kind: "endpoint",
        id: ep.resultId,
        label: ep.label,
        detail: `${pilot.acronym} · ${ep.endpointType} · verification=${ep.verificationState} · PMID ${ep.sourcePmid ?? pilot.primaryPmid}`,
        clinicalConclusion: false,
      });
    }
    trials.push({
      graphNodeId: pilot.graphNodeId,
      acronym: pilot.acronym,
      nctId: pilot.nctId,
      treatmentLine: pilot.treatmentLine ?? null,
      populationSummary: pilot.populationSummary,
      endpointCount: pilot.arms.reduce((n, a) => n + a.endpoints.length, 0),
      primaryEndpoints: primaries.map((ep) => ({
        resultId: ep.resultId,
        label: ep.label,
        endpointType: ep.endpointType,
      })),
    });
  }

  const graphBiomarkers = [
    ...graphBiomarkersForTrial("TR003"),
    ...graphBiomarkersForTrial("TR020"),
  ].map((b) => ({
    graphNodeId: b.graphNodeId,
    name: b.name,
    assayLabel: null as null,
  }));

  const concepts = MELANOMA_INVESTIGATION_SEEDS.map((id) => conceptProvenance(id)).filter(Boolean);
  const relationships = typed
    .map((r) => relationshipProvenance(r.relId))
    .filter(Boolean);

  const unknowns: string[] = [
    "Assay cut-offs and companion-diagnostic thresholds are not curated in this release (biomarkerContext empty stub).",
    "Cross-trial superiority / causal ranking is not supported — endpoints are educational and non-causal.",
    "Gate C approved+supports density for every relation remains SME-gated; unreviewed claims stay unapproved.",
    "Ask / brief outputs that sound clinical must abstain — this path does not authorise treatment decisions.",
  ];

  // Nav sanity: disease and PD-1 should reach both pilots when flag-agnostic nav is used.
  const fromDisease = trialIntelligenceNavFromConcept("D012");
  if (!fromDisease.some((l) => l.graphNodeId === "TR003")) {
    unknowns.push("Nav gap: D012 did not resolve TR003 in trialIntelligenceNavFromConcept.");
  }

  return {
    kind: "melanoma_immunotherapy_investigation_path",
    schemaVersion: "mip-1",
    educationalOnly: true,
    clinicalConclusion: false,
    kgWrite: false,
    question,
    seeds: [...MELANOMA_INVESTIGATION_SEEDS],
    hops,
    typedRelations: typed,
    trials,
    graphBiomarkers,
    biomarkerAssayStance: "empty_stub_no_invented_cutoffs",
    provenance: { concepts, relationships },
    unknowns,
    disclaimer:
      "Source-traceable educational investigation path. Not clinical decision support. kgWrite=false. No unsupported clinical conclusions.",
  };
}

/** Concept id list suitable for collections / saved paths / brief retrieval. */
export function melanomaInvestigationConceptIds(): string[] {
  return MELANOMA_INVESTIGATION_SEEDS.filter((id) => byId[id]);
}

/** Human-readable one-line hop summary for exports. */
export function summariseMelanomaPathHop(hop: MelanomaPathHop): string {
  if (hop.kind === "relation" && hop.relId) {
    const typed = typeRelationshipById(hop.relId);
    if (typed) return `${typed.subjectId} —${human(typed.predicate)}→ ${typed.objectId}`;
  }
  return `${hop.kind}:${hop.id} — ${hop.label}`;
}

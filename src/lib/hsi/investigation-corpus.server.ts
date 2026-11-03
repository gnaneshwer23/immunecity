import { byId } from "@/lib/immune/engine";
import { getGraphNeighbourhood } from "@/lib/immune/neighbourhood";
import { graphReleaseSnapshot } from "@/lib/immune/graphRelease";
import { parseResearchBundle, RESEARCH_CONTRACT_VERSION, type ResearchBundle, type ResearchEntity } from "./vendor/researchContracts";
import { InvestigationRequestError, type InvestigationRelease } from "./vendor/investigationBackend";
import {
  RA_RELEASE_ID,
  buildRaEvidenceBundle,
  raEvidenceReleaseListing,
  RaEvidenceUnavailableError,
} from "./vendor/raEvidenceRelease";
import {
  RA_DEMO_RELEASE_ID,
  buildRaDemoEvidenceBundle,
  raDemoEvidenceReleaseListing,
} from "./vendor/raDemoEvidenceRelease";
import raReleaseArtifact from "@/data/hsi/ra-anti-tnf/release.json";
import raGraphContext from "@/data/hsi/ra-anti-tnf/graph-context.json";
import raDemoReleaseArtifact from "@/data/hsi/ra-anti-tnf-demo/release.json";

const typeMap: Record<string, ResearchEntity["type"]> = {
  CELL: "cell",
  MOLECULE: "molecule",
  RECEPTOR: "receptor",
  PATHWAY: "pathway",
  COMPARTMENT: "tissue",
  DISEASE: "disease",
  BIOMARKER: "biomarker",
  INTERVENTION: "intervention",
  TRIAL: "trial",
};

const coreRelease: InvestigationRelease = {
  id: "isi-core-graph",
  title: "ISI core knowledge graph",
  description:
    "Existing graph identities only. Exact source passages require a rights-verified release; unlicensed quotes are not copied.",
  readiness: {
    available: true,
    sources: 0,
    passages: 0,
    version: graphReleaseSnapshot().coreVersion,
    scientificReview: "unreviewed",
    reason: "Graph neighbourhood only; no licensed exact passages in this corpus.",
  },
};

const raListing = raEvidenceReleaseListing(raReleaseArtifact);
const raDemoListing = raDemoEvidenceReleaseListing(raDemoReleaseArtifact);

export const isiInvestigationReleases: InvestigationRelease[] = [coreRelease, raDemoListing, raListing];

export async function loadIsiInvestigationRelease(id: string, conceptId: string | null): Promise<ResearchBundle> {
  if (id === RA_DEMO_RELEASE_ID) {
    // Synthetic SYN-* mirrors only — not the rights-verified release and not original KG rows.
    return buildRaDemoEvidenceBundle(raDemoReleaseArtifact);
  }
  if (id === RA_RELEASE_ID) {
    try {
      // Preserve original ISI KG identifiers from the exported graph-context working set.
      return buildRaEvidenceBundle(parseResearchBundle(raGraphContext), raReleaseArtifact);
    } catch (error) {
      if (error instanceof RaEvidenceUnavailableError) {
        throw new InvestigationRequestError(422, "evidence_not_ready");
      }
      throw error;
    }
  }
  if (id !== "isi-core-graph") throw new InvestigationRequestError(400, "unknown_research_release");
  const selected = conceptId ?? "D001";
  if (!byId[selected] || byId[selected].draft) throw new InvestigationRequestError(400, "unknown_core_concept");
  // Match the service's depth and cap. No second KG or inferred species/assay fields.
  const graph = getGraphNeighbourhood(selected, { depth: 1, maxEdges: 120, includeDraft: false })!;
  if (graph.truncated) throw new InvestigationRequestError(400, "graph_seed_exceeds_investigation_limit");
  const release = graphReleaseSnapshot();
  const provenance = {
    product: "isi" as const,
    datasetId: "isi-core-graph",
    version: release.coreVersion,
    retrievedAt: new Date().toISOString(),
  };
  return parseResearchBundle({
    schemaVersion: RESEARCH_CONTRACT_VERSION,
    containsPhi: false,
    clinicalAdvice: false,
    kgWrite: false,
    context: {
      id: "ISI-RESEARCH-CONTEXT",
      question: `What verified research evidence maps to ${byId[selected].name}?`,
      conceptIds: [selected],
      dataClass: "public_real",
      purpose: "research_only",
      containsPhi: false,
      provenance,
    },
    entities: graph.nodes.map((node) => ({
      id: node.id,
      label: node.name,
      type: typeMap[node.node_type] ?? "other",
      dataClass: "public_real",
      provenance,
    })),
    relationships: graph.edges.map((edge) => ({
      id: edge.relId,
      subjectId: edge.subjectId,
      predicate: edge.predicate,
      objectId: edge.objectId,
      dataClass: "public_real",
      context: { species: null, experimentalSystem: null, tissueId: null, assay: null, timepoint: null },
      provenance,
    })),
    // KG bibliographic pointers are not licensed exact passages or claim-level human approvals.
    sources: [],
    passages: [],
    claims: [],
    runs: [],
  });
}

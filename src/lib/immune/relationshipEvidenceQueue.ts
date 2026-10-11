/* Build relationship-level curation candidates from KG bibliographic source_refs.
   Never invents PMIDs/DOIs and never marks curation approved — that is a human step. */
import {
  KG,
  REF_PLACEHOLDER,
  byId,
  relId,
  type KGEdge,
  type KGNode,
} from "./engine";

export interface RelationshipEvidenceSlot {
  evidence_id: string;
  source_ref: string;
  status: "candidate";
  source_type: "kg_source_ref";
  search_query: string;
  relationship_id: string;
  claim_support: "unassessed";
  claim_text: string;
  pmid?: string;
  doi?: string;
}

export interface RelationshipEvidenceGroup {
  node_id: string;
  node_type: string;
  node_name: string;
  evidence: RelationshipEvidenceSlot[];
}

export interface RelationshipEvidenceManifest {
  meta: {
    kind: "relationship_evidence_queue";
    curation: "unreviewed";
    based_on_kg: string;
    generatedAt: string;
    note: string;
    stats: {
      relationshipsWithCite: number;
      candidateSlots: number;
      uniqueCiteStrings: number;
      withPmid: number;
      runtimeRelationships: number;
      remainingWithoutCite: number;
    };
  };
  evidence_records: RelationshipEvidenceGroup[];
}

function nonPlaceholderCites(edge: KGEdge): string[] {
  const out: string[] = [];
  for (const r of edge.source_refs || []) {
    if (r && r !== REF_PLACEHOLDER) out.push(r.trim());
  }
  const ref = (edge.reference || "").trim();
  if (ref && ref !== REF_PLACEHOLDER) out.push(ref);
  return [...new Set(out)];
}

function slotId(relationshipId: string, citeIndex: number): string {
  const base = `RELQ-${relationshipId}-C${citeIndex + 1}`.replace(/[^A-Za-z0-9._-]/g, "_");
  return base.slice(0, 120);
}

/** Pure builder from the loaded runtime graph (core + draft extensions). */
export function buildRelationshipEvidenceQueue(opts?: {
  generatedAt?: string;
  pmidByCite?: Record<string, string>;
  doiByCite?: Record<string, string>;
}): RelationshipEvidenceManifest {
  const groups = new Map<string, RelationshipEvidenceGroup>();
  let relationshipsWithCite = 0;
  let candidateSlots = 0;
  const uniqueCites = new Set<string>();
  let withPmid = 0;

  for (const edge of KG.relationships) {
    const cites = nonPlaceholderCites(edge);
    if (!cites.length) continue;
    relationshipsWithCite++;
    const rid = relId(edge);
    const subject = byId[edge.subject_id] as KGNode | undefined;
    if (!subject) continue;

    if (!groups.has(subject.id)) {
      groups.set(subject.id, {
        node_id: subject.id,
        node_type: subject.node_type,
        node_name: subject.name,
        evidence: [],
      });
    }

    cites.forEach((cite, i) => {
      uniqueCites.add(cite);
      const pmid = opts?.pmidByCite?.[cite];
      const doi = opts?.doiByCite?.[cite];
      if (pmid) withPmid++;
      candidateSlots++;
      groups.get(subject.id)!.evidence.push({
        evidence_id: slotId(rid, i),
        source_ref: cite,
        status: "candidate",
        source_type: "kg_source_ref",
        search_query: cite,
        relationship_id: rid,
        claim_support: "unassessed",
        claim_text: edge.mechanism || `${subject.name} ${edge.relation} ${byId[edge.object_id]?.name ?? edge.object_id}`,
        ...(pmid ? { pmid } : {}),
        ...(doi ? { doi } : {}),
      });
    });
  }

  return {
    meta: {
      kind: "relationship_evidence_queue",
      curation: "unreviewed",
      based_on_kg: "immunology_os_kg_v0_3 + extensions",
      generatedAt: opts?.generatedAt ?? new Date().toISOString(),
      note:
        "Candidates only. Import via /curation does not approve claims. claim_support stays unassessed until a human curator assesses the directional link. Bulk approval of empty RESEARCH_REQUIRED slots is forbidden.",
      stats: {
        relationshipsWithCite,
        candidateSlots,
        uniqueCiteStrings: uniqueCites.size,
        withPmid,
        runtimeRelationships: KG.relationships.length,
        remainingWithoutCite: KG.relationships.length - relationshipsWithCite,
      },
    },
    evidence_records: [...groups.values()],
  };
}

export function relationshipQueueCoverageSummary(manifest: RelationshipEvidenceManifest) {
  const mapped = new Set(
    manifest.evidence_records.flatMap((g) => g.evidence.map((e) => e.relationship_id)),
  );
  return {
    mappedRelationships: mapped.size,
    candidateSlots: manifest.meta.stats.candidateSlots,
    runtimeRelationships: manifest.meta.stats.runtimeRelationships,
    pctMapped: Math.round((mapped.size / Math.max(1, manifest.meta.stats.runtimeRelationships)) * 1000) / 10,
    approvedClaimLinks: 0,
    note: "Approved claim-linked coverage remains 0 until a human sets claim_support=supports and curation=approved.",
  };
}
